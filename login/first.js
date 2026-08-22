console.log("first.js loaded!");
// Firebaseから必要な機能を読み込む
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  arrayUnion
} from "firebase/firestore";

// Firebaseの設定
const firebaseConfig = {
  // ここはFirebaseのコンソールから取得する
apiKey: "AIzaSyBb1MFjAYNHJpit7tCE6z7pIF7Wiz9CdRA",
authDomain: "friendar-4596d.firebaseapp.com",
projectId: "friendar-4596d",
storageBucket: "friendar-4596d.firebasestorage.app",
messagingSenderId: "480147429975",
appId: "1:480147429975:web:a106ebffc6e57e1b4ba112",
measurementId: "G-HJWDCTB70X"
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);

// 認証機能
const auth = getAuth(app);
const db = getFirestore(app);
console.log("Firebase connected!");
const registerButton = document.getElementById("registerButton");

registerButton.addEventListener("click", async () => {

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        console.log("登録成功！");

const uid = userCredential.user.uid;

await setDoc(doc(db, "users", uid), {
    username: username,
    email: email
});

console.log("ユーザー情報を保存しました！");
console.log("are");
document.getElementById("teamSection").style.display = "block";
console.log("iketeruhazu")
    } catch (error) {

        console.error("登録失敗:", error);

    }

});
const loginButton = document.getElementById("loginButton");

loginButton.addEventListener("click", async () => {

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        console.log("ログイン成功！");

        const user = userCredential.user;

        console.log("ユーザーID:", user.uid);
        console.log("メールアドレス:", user.email);

        // チーム画面を表示
        document.getElementById("teamSection").style.display = "block";

    } catch (error) {

        console.error("ログイン失敗:", error);

    }

});
const teamId =document.getElementById("teamId");
const createTeamButton = document.getElementById("createTeamButton");
createTeamButton.addEventListener("click", async () => {

    try {

        // 6文字のチームコードを作る
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let teamCode = "";

        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            teamCode += characters[randomIndex];
        }

        console.log("チームコード:", teamCode);

        // 現在ログインしているユーザーのUID
        const user = auth.currentUser;

        if (!user) {
            console.error("ログインしているユーザーがいません");
            return;
        }

        // Firestoreにチームを保存
await setDoc(doc(db, "teams", teamCode), {
    owner: user.uid,
    members: [user.uid],
    createdAt: new Date()
});

await setDoc(
    doc(db, "users", user.uid),
    {
        teamCode: teamCode
    },
    { merge: true }
);

        console.log("チーム作成成功！");
        console.log("チームコード:", teamCode);
        teamId.textContent = teamCode;

    } catch (error) {

        console.error("チーム作成失敗:", error);

    }

});

const joinTeamButton = document.getElementById("joinTeamButton");
joinTeamButton.addEventListener("click", async () => {

    // 入力されたチームコードを取得
    const teamCode = document.getElementById("teamCode").value.trim();

    // コードが空なら終了
    if (teamCode === "") {
        console.log("チームコードを入力してください");
        return;
    }

    try {

        // Firestoreからチームを探す
        const teamRef = doc(db, "teams", teamCode);
        const teamSnapshot = await getDoc(teamRef);

        // チームが存在するか確認
       if (teamSnapshot.exists()) {

    console.log("チームが見つかりました！");

    // 現在ログインしているユーザーを取得
    const user = auth.currentUser;

    if (!user) {
        console.log("ログインしているユーザーがいません");
        return;
    }

    // チームに自分のUIDを追加
    await setDoc(teamRef, {
        members: arrayUnion(user.uid)
    }, { merge: true });
    await setDoc(
    doc(db, "users", user.uid),
    {
        teamCode: teamCode
    },
    { merge: true }
);

    console.log("チームに参加しました！");
    console.log("あなたのUID:", user.uid);
    window.location.href = "../Calendar/calendar.html";
} else {

    console.log("チームが見つかりません");

}

    } catch (error) {

        console.error("チーム検索失敗:", error);

    }

});
