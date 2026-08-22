import { initializeApp } from "firebase/app";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "firebase/auth";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    where,
    orderBy,
    addDoc,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";

// ========================================
// Firebase設定
// ========================================
const firebaseConfig = {
    apiKey: "AIzaSyBb1MFjAYNHJpit7tCE6z7pIF7Wiz9CdRA",
    authDomain: "friendar-4596d.firebaseapp.com",
    projectId: "friendar-4596d",
    storageBucket: "friendar-4596d.firebasestorage.app",
    messagingSenderId: "480147429975",
    appId: "1:480147429975:web:a106ebffc6e57e1b4ba112",
    measurementId: "G-HJWDCTB70X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========================================
// DOM要素
// ========================================
const elements = {
    timerDisplay: document.getElementById("timerDisplay"),
    timerLabel: document.getElementById("timerLabel"),
    startButton: document.getElementById("startButton"),
    pauseButton: document.getElementById("pauseButton"),
    resetButton: document.getElementById("resetButton"),
    sessionCount: document.getElementById("sessionCount"),
    totalTimeToday: document.getElementById("totalTimeToday"),
    memberCount: document.getElementById("memberCount"),
    memberList: document.getElementById("memberList"),
    chatMessages: document.getElementById("chatMessages"),
    chatInput: document.getElementById("chatInput"),
    sendButton: document.getElementById("sendButton"),
    backButton: document.getElementById("backButton"),
    logoutButton: document.getElementById("logoutButton"),
    roomCode: document.getElementById("roomCode"),
};

// ========================================
// タイマー変数
// ========================================
let timerInterval = null;
let timeRemaining = 25 * 60;
let currentMode = "work";
let isRunning = false;
let sessionsCompleted = 0;
let totalStudyTimeToday = 0;
let sessionStartTime = null;
let currentUser = null;
let roomCode = null;
let unsubscribeMembersList = null;
let unsubscribeChat = null;

const TIMER_DURATIONS = {
    work: 25 * 60,
    break: 5 * 60,
    longBreak: 15 * 60
};

// ========================================
// 初期化
// ========================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
        elements.chatInput.disabled = true;
        elements.sendButton.disabled = true;
        elements.startButton.disabled = true;
        window.location.href = "../login/first.html";
        return;
    }

    // URLからroomCodeを取得
    const params = new URLSearchParams(window.location.search);
    roomCode = params.get("room");

    if (!roomCode) {
        roomCode = "default";
    }

    elements.roomCode.textContent = roomCode;

    // チャット入力を有効化
    elements.chatInput.disabled = false;
    elements.sendButton.disabled = false;
    elements.startButton.disabled = false;

    // メンバーリスト購読
    subscribeMembersList(roomCode);

    // チャット購読
    subscribeToChat(roomCode);

    // ユーザーを自習室に追加
    await addUserToStudyRoom(roomCode);

    // 本日のデータを読み込み
    await loadTodayStats();
});

// ========================================
// タイマー機能
// ========================================
elements.startButton.addEventListener("click", startTimer);
elements.pauseButton.addEventListener("click", pauseTimer);
elements.resetButton.addEventListener("click", resetTimer);

function startTimer() {
    if (isRunning) return;

    isRunning = true;
    sessionStartTime = Date.now();
    elements.startButton.disabled = true;
    elements.pauseButton.disabled = false;

    timerInterval = setInterval(() => {
        timeRemaining--;

        if (timeRemaining < 0) {
            completeSession();
            return;
        }

        updateTimerDisplay();
    }, 1000);

    updateTimerDisplay();
}

function pauseTimer() {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(timerInterval);
    elements.startButton.disabled = false;
    elements.pauseButton.disabled = true;

    // 今のセッション時間を記録
    if (sessionStartTime) {
        const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
        totalStudyTimeToday += sessionTime;
        updateStudyStats();
    }
}

function resetTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    timeRemaining = TIMER_DURATIONS[currentMode];
    updateTimerDisplay();
    elements.startButton.disabled = false;
    elements.pauseButton.disabled = true;
    sessionStartTime = null;
}

function completeSession() {
    clearInterval(timerInterval);
    isRunning = false;

    if (currentMode === "work") {
        sessionsCompleted++;
        totalStudyTimeToday += TIMER_DURATIONS.work;
        
        // 休憩モードに切り替え
        if (sessionsCompleted % 4 === 0) {
            currentMode = "longBreak";
            document.querySelector('input[value="longBreak"]').checked = true;
        } else {
            currentMode = "break";
            document.querySelector('input[value="break"]').checked = true;
        }
    } else {
        // 勉強モードに戻す
        currentMode = "work";
        document.querySelector('input[value="work"]').checked = true;
    }

    timeRemaining = TIMER_DURATIONS[currentMode];
    updateTimerDisplay();
    updateStudyStats();
    elements.startButton.disabled = false;
    elements.pauseButton.disabled = true;

    // 通知
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("タイマー完了！", {
            body: `${currentMode === "work" ? "勉強" : "休憩"}の時間です`
        });
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    elements.timerDisplay.textContent = 
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const labels = {
        work: "勉強中",
        break: "休憩中",
        longBreak: "長休憩中"
    };
    elements.timerLabel.textContent = labels[currentMode];
}

// タイマーモードを変更
document.querySelectorAll('input[name="timerMode"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
        if (!isRunning) {
            currentMode = e.target.value;
            timeRemaining = TIMER_DURATIONS[currentMode];
            updateTimerDisplay();
        }
    });
});

function updateStudyStats() {
    elements.sessionCount.textContent = sessionsCompleted;
    elements.totalTimeToday.textContent = `${Math.floor(totalStudyTimeToday / 60)}分`;

    // Firestoreに保存
    if (currentUser) {
        const today = new Date().toISOString().split("T")[0];
        updateDoc(doc(db, "users", currentUser.uid), {
            [`dailyStats.${today}.studyTime`]: totalStudyTimeToday,
            [`dailyStats.${today}.sessions`]: sessionsCompleted
        }).catch(err => console.error("スタッツ更新エラー:", err));
    }
}

async function loadTodayStats() {
    if (!currentUser) return;

    const today = new Date().toISOString().split("T")[0];
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));

    if (userDoc.exists()) {
        const dailyStats = userDoc.data()?.dailyStats?.[today];
        if (dailyStats) {
            totalStudyTimeToday = dailyStats.studyTime || 0;
            sessionsCompleted = dailyStats.sessions || 0;
            updateStudyStats();
        }
    }
}

// ========================================
// メンバーリスト機能
// ========================================
function subscribeMembersList(room) {
    const membersRef = collection(db, "studyRooms", room, "members");
    
    unsubscribeMembersList = onSnapshot(membersRef, (snapshot) => {
        const members = [];
        snapshot.forEach(doc => {
            members.push({ id: doc.id, ...doc.data() });
        });

        elements.memberCount.textContent = `${members.length}人`;
        renderMembersList(members);
    });
}

function renderMembersList(members) {
    if (members.length === 0) {
        elements.memberList.innerHTML = '<div class="empty-message">メンバーがいません</div>';
        return;
    }

    elements.memberList.innerHTML = members.map(member => `
        <div class="member-item">
            <div class="member-info">
                <p class="member-name">${escapeHtml(member.username || "不明")}</p>
                <p class="member-status">${member.isOnline ? "オンライン" : "オフライン"}</p>
            </div>
            <div class="member-progress">
                <div class="member-progress-bar" style="width: ${(member.progress || 0) * 100}%"></div>
            </div>
        </div>
    `).join("");
}

async function addUserToStudyRoom(room) {
    if (!currentUser) return;

    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const username = userDoc.data()?.username || "Anonymous";

    await setDoc(doc(db, "studyRooms", room, "members", currentUser.uid), {
        username: username,
        isOnline: true,
        progress: 0,
        joinedAt: serverTimestamp()
    }, { merge: true });
}

// ========================================
// チャット機能
// ========================================
elements.sendButton.addEventListener("click", sendMessage);
elements.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

async function sendMessage() {
    const message = elements.chatInput.value.trim();
    if (!message || !currentUser || !roomCode) return;

    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const username = userDoc.data()?.username || "Anonymous";

    try {
        await addDoc(collection(db, "studyRooms", roomCode, "chat"), {
            userId: currentUser.uid,
            username: username,
            message: message,
            timestamp: serverTimestamp()
        });

        elements.chatInput.value = "";
    } catch (error) {
        console.error("メッセージ送信エラー:", error);
    }
}

function subscribeToChat(room) {
    const chatRef = collection(db, "studyRooms", room, "chat");
    const q = query(chatRef, orderBy("timestamp", "asc"));

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
            messages.push({ ...doc.data() });
        });

        renderChatMessages(messages);
    });
}

function renderChatMessages(messages) {
    if (messages.length === 0) {
        elements.chatMessages.innerHTML = '<div class="empty-message">チャットはまだありません</div>';
        return;
    }

    elements.chatMessages.innerHTML = messages.map(msg => {
        const isOwn = msg.userId === currentUser.uid;
        const timestamp = msg.timestamp instanceof Timestamp 
            ? msg.timestamp.toDate() 
            : new Date(msg.timestamp);
        const timeStr = timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

        return `
            <div class="chat-message ${isOwn ? "own" : ""}">
                <div class="chat-author">${escapeHtml(msg.username)} ${timeStr}</div>
                <div class="chat-text">${escapeHtml(msg.message)}</div>
            </div>
        `;
    }).join("");

    // 最新メッセージまでスクロール
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ========================================
// メニュー機能
// ========================================
elements.backButton.addEventListener("click", () => {
    if (roomCode && roomCode !== "default") {
        window.location.href = `../Calendar/calendar.html?team=${encodeURIComponent(roomCode)}`;
    } else {
        window.location.href = "../Calendar/calendar.html";
    }
});

elements.logoutButton.addEventListener("click", async () => {
    try {
        // チャットリスナーを購読解除
        if (unsubscribeMembersList) unsubscribeMembersList();
        if (unsubscribeChat) unsubscribeChat();

        // ユーザーをオフラインに
        if (currentUser && roomCode) {
            await updateDoc(doc(db, "studyRooms", roomCode, "members", currentUser.uid), {
                isOnline: false
            });
        }

        await signOut(auth);
        window.location.href = "../login/first.html";
    } catch (error) {
        console.error("ログアウトエラー:", error);
    }
});

// ========================================
// ユーティリティ
// ========================================
function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ページを離れる時の処理
window.addEventListener("beforeunload", async () => {
    if (currentUser && roomCode) {
        await updateDoc(doc(db, "studyRooms", roomCode, "members", currentUser.uid), {
            isOnline: false
        }).catch(err => console.error("オフライン更新エラー:", err));
    }
});

console.log("Study room initialized!");
