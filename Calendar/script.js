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
    serverTimestamp
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

console.log("Firebase connected!");
const elements = {
  teamNameTitle: document.getElementById("teamNameTitle"),
  editTeamButton: document.getElementById("editTeamButton"),
  teamEditDialog: document.getElementById("teamEditDialog"),
  closeTeamEditButton: document.getElementById("closeTeamEditButton"),
  cancelTeamEditButton: document.getElementById("cancelTeamEditButton"),
  teamEditForm: document.getElementById("teamEditForm"),
  teamNameInput: document.getElementById("teamNameInput"),
  memberNameInput: document.getElementById("memberNameInput"),
  teamEditMessage: document.getElementById("teamEditMessage"),
  monthTitle: document.getElementById("monthTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonthButton: document.getElementById("prevMonthButton"),
  nextMonthButton: document.getElementById("nextMonthButton"),
  todayButton: document.getElementById("todayButton"),
  dragHint: document.getElementById("dragHint"),
  calendarMenuList: document.getElementById("calendarMenuList"),
  logoutButton: document.getElementById("logoutButton"),

  selectedDateTitle: document.getElementById("selectedDateTitle"),
  setGoalDateButton: document.getElementById("setGoalDateButton"),
  scheduleCount: document.getElementById("scheduleCount"),
  scheduleInput: document.getElementById("scheduleInput"),
  addScheduleButton: document.getElementById("addScheduleButton"),
  scheduleList: document.getElementById("scheduleList"),
  progressSummary: document.getElementById("progressSummary"),
  completionRate: document.getElementById("completionRate"),
  completionMeter: document.getElementById("completionMeter"),
  memberCount: document.getElementById("memberCount"),
  memberList: document.getElementById("memberList")
};

const today = new Date();

let displayYear = today.getFullYear();
let displayMonth = today.getMonth();
let selectedDate = null;
let currentTeamCode = null;
let currentUser = null;
let targetDate = null;
const schedules = {};
const onlineTimeoutMs = 2 * 60 * 1000;
let onlineUpdateTimer = null;
async function getMyTeamCode(user) {

    const userRef = doc(
        db,
        "users",
        user.uid
    );

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {

        console.error(
            "ユーザー情報が見つかりません"
        );

        return null;
    }

    const userData = snapshot.data();

    console.log(
        "ユーザー情報:",
        userData
    );

    const requestedTeamCode = new URLSearchParams(window.location.search).get("team");
    const teamCodes = Array.isArray(userData.teamCodes)
      ? userData.teamCodes
      : userData.teamCode
        ? [userData.teamCode]
        : [];

    if (requestedTeamCode && teamCodes.includes(requestedTeamCode)) {
      return requestedTeamCode;
    }

    return teamCodes[0] || null;
} 

async function renderCalendarMenu(user) {
  const userSnapshot = await getDoc(doc(db, "users", user.uid));
  const userData = userSnapshot.data() || {};
  const teamCodes = Array.isArray(userData.teamCodes)
    ? userData.teamCodes
    : userData.teamCode
      ? [userData.teamCode]
      : [];

  elements.calendarMenuList.innerHTML = "";

  if (teamCodes.length === 0) {
    const emptyMessage = document.createElement("span");
    emptyMessage.textContent = "所属チームがありません";
    elements.calendarMenuList.appendChild(emptyMessage);
    return;
  }

  const teamEntries = await Promise.all(teamCodes.map(async (teamCode) => {
    const teamSnapshot = await getDoc(doc(db, "teams", teamCode));
    return {
      code: teamCode,
      name: teamSnapshot.data()?.name || teamCode
    };
  }));

  teamEntries.forEach(({ code, name }) => {
    const calendarLink = document.createElement("a");
    calendarLink.href = `calendar.html?team=${encodeURIComponent(code)}`;
    calendarLink.textContent = name;
    calendarLink.title = `ID: ${code}`;
    if (code === currentTeamCode) {
      calendarLink.classList.add("current-calendar");
    }
    elements.calendarMenuList.appendChild(calendarLink);
  });
}
elements.prevMonthButton.addEventListener("click", () => {
  displayMonth--;

  if (displayMonth < 0) {
    displayMonth = 11;
    displayYear--;
  }

  renderCalendar();
});

elements.nextMonthButton.addEventListener("click", () => {
  displayMonth++;

  if (displayMonth > 11) {
    displayMonth = 0;
    displayYear++;
  }

  renderCalendar();
});

elements.todayButton.addEventListener("click", () => {
  selectDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
});

elements.addScheduleButton.addEventListener("click", addSchedule);
elements.setGoalDateButton.addEventListener("click", toggleGoalDate);
elements.editTeamButton.addEventListener("click", openTeamEditDialog);
elements.closeTeamEditButton.addEventListener("click", closeTeamEditDialog);
elements.cancelTeamEditButton.addEventListener("click", closeTeamEditDialog);
elements.teamEditForm.addEventListener("submit", saveTeamSettings);
elements.logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "../login/first.html";
  } catch (error) {
    console.error("ログアウトに失敗:", error);
  }
});

function openTeamEditDialog() {
  elements.teamEditDialog.hidden = false;
  elements.teamNameInput.focus();
}

function closeTeamEditDialog() {
  elements.teamEditDialog.hidden = true;
  elements.teamEditMessage.textContent = "";
}

async function saveTeamSettings(event) {
  event.preventDefault();

  const teamName = elements.teamNameInput.value.trim();
  const memberName = elements.memberNameInput.value.trim();
  if (!currentUser || !currentTeamCode || !teamName || !memberName) {
    elements.teamEditMessage.textContent = "チーム名と名前を入力してください。";
    return;
  }

  const saveButton = elements.teamEditForm.querySelector(".primary-button");
  saveButton.disabled = true;
  elements.teamEditMessage.textContent = "保存しています...";

  try {
    const teamReference = doc(db, "teams", currentTeamCode);
    const teamSnapshot = await getDoc(teamReference);
    const currentMemberNames = teamSnapshot.data()?.memberNames || {};

    await setDoc(teamReference, {
      name: teamName,
      memberNames: {
        ...currentMemberNames,
        [currentUser.uid]: memberName
      }
    }, { merge: true });

    elements.teamNameTitle.textContent = teamName;
    await loadMembers(currentTeamCode);
    elements.teamEditMessage.textContent = "保存しました。チームメンバーにも表示されます。";
  } catch (error) {
    console.error("チーム情報の保存に失敗:", error);
    elements.teamEditMessage.textContent = `保存に失敗しました（${error.code || "不明なエラー"}）。`;
  } finally {
    saveButton.disabled = false;
  }
}

elements.scheduleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addSchedule();
  }
});

function renderCalendar() {
  elements.monthTitle.textContent =
    `${displayYear}年${displayMonth + 1}月`;

  elements.calendarGrid.innerHTML = "";

  const firstDay = new Date(displayYear, displayMonth, 1);
  const startWeekday = firstDay.getDay();

  const firstCellDate = new Date(
    displayYear,
    displayMonth,
    1 - startWeekday
  );

  for (let i = 0; i < 42; i++) {
    const date = new Date(
      firstCellDate.getFullYear(),
      firstCellDate.getMonth(),
      firstCellDate.getDate() + i
    );

    elements.calendarGrid.appendChild(createDayButton(date));
  }
}

function createDayButton(date) {
  const button = document.createElement("button");
  button.className = "calendar-day";

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();
  const dateKey = formatDateKey(year, month, day);

  button.addEventListener("dragover", (event) => {
    event.preventDefault();
    button.classList.add("drag-over");
  });

  button.addEventListener("dragleave", () => {
    button.classList.remove("drag-over");
  });

  button.addEventListener("drop", (event) => {
    event.preventDefault();
    button.classList.remove("drag-over");
    elements.dragHint.hidden = true;

    const dragData = event.dataTransfer.getData("text/plain");
    if (!dragData) {
      return;
    }

    const { sourceDate, sourceIndex } = JSON.parse(dragData);
    moveSchedule(sourceDate, Number(sourceIndex), dateKey);
  });

  if (month !== displayMonth) {
    button.classList.add("other-month");
  }

  if (weekday === 0) {
    button.classList.add("sunday");
  }

  if (weekday === 6) {
    button.classList.add("saturday");
  }

  if (isToday(date)) {
    button.classList.add("today");
  }

  if (selectedDate === dateKey) {
    button.classList.add("selected");
  }

  if (targetDate === dateKey) {
    button.classList.add("target-date");

    const targetLabel = document.createElement("span");
    targetLabel.className = "target-date-label";
    targetLabel.textContent = "目標日";
    button.appendChild(targetLabel);
  }

  const number = document.createElement("span");
  number.className = "day-number";
  number.textContent = day;
  button.appendChild(number);

  const daySchedules = schedules[dateKey] || [];

  if (daySchedules.length > 0) {
    const dotRow = document.createElement("div");
    dotRow.className = "schedule-dot-row";

    daySchedules.slice(0, 3).forEach(() => {
      const dot = document.createElement("span");
      dot.className = "schedule-dot";
      dotRow.appendChild(dot);
    });

    button.appendChild(dotRow);

    const preview = document.createElement("div");
    preview.className = "schedule-preview";
    preview.textContent = daySchedules[0].text;
    button.appendChild(preview);
  }

  button.addEventListener("click", () => {
    selectDate(year, month, day);
  });

  return button;
}

function selectDate(year, month, day) {
  selectedDate = formatDateKey(year, month, day);
  displayYear = year;
  displayMonth = month;

  elements.selectedDateTitle.textContent =
    `${year}年${month + 1}月${day}日`;
  elements.setGoalDateButton.hidden = false;
  updateGoalDateButton();

  elements.scheduleInput.disabled = false;
  elements.addScheduleButton.disabled = false;

  renderCalendar();
  renderSchedules();
}

function updateGoalDateButton() {
  elements.setGoalDateButton.textContent = targetDate === selectedDate
    ? "目標日を解除する"
    : "目標日に設定する";
}

async function toggleGoalDate() {
  if (!selectedDate || !currentTeamCode) {
    return;
  }

  targetDate = targetDate === selectedDate ? null : selectedDate;
  updateGoalDateButton();
  renderCalendar();
  updateCompletionRate();

  try {
    const schedulesRef = doc(db, "teams", currentTeamCode, "schedules", "data");
    await setDoc(schedulesRef, { targetDate }, { merge: true });
  } catch (error) {
    console.error("目標日の保存に失敗:", error);
  }
}

async function addSchedule() {
    
    if (!selectedDate) {
        return;
    }

    if (!currentTeamCode) {
        console.log("チームコードが取得できていません");
        return;
    }

    const text = elements.scheduleInput.value.trim();

    if (!text) {
        return;
    }

    if (!schedules[selectedDate]) {
        schedules[selectedDate] = [];
    }

    schedules[selectedDate].push({
      text,
      completed: false
    });

    elements.scheduleInput.value = "";

    renderCalendar();
    renderSchedules();

    try {

        const schedulesRef = doc(
            db,
            "teams",
            currentTeamCode,
            "schedules",
            "data"
        );

        await setDoc(
          schedulesRef,
          { ...schedules, ...(targetDate ? { targetDate } : {}) },
          { merge: true }
        );

        console.log("予定をFirebaseに保存しました！");

    } catch (error) {

        console.error(
            "予定の保存に失敗:",
            error
        );

    }
}

function renderSchedules() {
  if (!selectedDate) {
    elements.scheduleCount.textContent = "0件";
    updateCompletionRate();
    return;
  }

  const items = schedules[selectedDate] || [];

  elements.scheduleCount.textContent = `${items.length}件`;
  updateCompletionRate();
  elements.scheduleList.innerHTML = "";

  if (items.length === 0) {
    elements.scheduleList.innerHTML = `
      <div class="empty-schedule">
        この日の予定はありません。
      </div>
    `;
    return;
  }

  items.forEach((schedule, index) => {
    const item = document.createElement("div");
    item.className = "schedule-item";
    item.draggable = true;
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", JSON.stringify({
        sourceDate: selectedDate,
        sourceIndex: index
      }));
      event.dataTransfer.effectAllowed = "move";
      elements.dragHint.hidden = false;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      elements.dragHint.hidden = true;
      item.classList.remove("dragging");
      document.querySelectorAll(".calendar-day.drag-over").forEach((day) => {
        day.classList.remove("drag-over");
      });
    });

    if (schedule.completed) {
      item.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "schedule-checkbox";
    checkbox.checked = schedule.completed;
    checkbox.setAttribute("aria-label", `${schedule.text}の完了状態`);
    checkbox.addEventListener("change", () => {
      toggleSchedule(index);
    });

    const scheduleText = document.createElement("span");
    scheduleText.className = "schedule-text";
    scheduleText.textContent = schedule.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", "予定を削除");

    deleteButton.addEventListener("click", () => {
      deleteSchedule(index);
    });

    item.appendChild(checkbox);
    item.appendChild(scheduleText);
    item.appendChild(deleteButton);

    elements.scheduleList.appendChild(item);
  });
}

async function moveSchedule(sourceDate, sourceIndex, destinationDate) {
  if (!currentTeamCode) {
    return;
  }

  const sourceSchedules = schedules[sourceDate];
  if (!Array.isArray(sourceSchedules) || !sourceSchedules[sourceIndex]) {
    return;
  }

  if (sourceDate === destinationDate) {
    return;
  }

  const [schedule] = sourceSchedules.splice(sourceIndex, 1);
  if (sourceSchedules.length === 0) {
    delete schedules[sourceDate];
  }

  if (!schedules[destinationDate]) {
    schedules[destinationDate] = [];
  }
  schedules[destinationDate].push(schedule);

  selectedDate = destinationDate;
  const [year, month, day] = destinationDate.split("-").map(Number);
  displayYear = year;
  displayMonth = month - 1;
  elements.selectedDateTitle.textContent = `${year}年${month}月${day}日`;
  elements.scheduleInput.disabled = false;
  elements.addScheduleButton.disabled = false;
  elements.setGoalDateButton.hidden = false;
  updateGoalDateButton();
  renderCalendar();
  renderSchedules();

  try {
    const schedulesRef = doc(db, "teams", currentTeamCode, "schedules", "data");
    await setDoc(schedulesRef, {
      ...schedules,
      ...(targetDate ? { targetDate } : {})
    });
  } catch (error) {
    console.error("予定の日付変更の保存に失敗:", error);
  }
}

function updateCompletionRate() {
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const isVisible = targetDate && todayKey <= targetDate && selectedDate && selectedDate <= targetDate;

  elements.progressSummary.hidden = !isVisible;

  if (!isVisible) {
    return;
  }

  const targetSchedules = Object.entries(schedules)
    .filter(([dateKey, items]) => dateKey <= targetDate && Array.isArray(items))
    .flatMap(([, items]) => items);
  const completedCount = targetSchedules.filter((schedule) => schedule.completed).length;
  const completionRate = targetSchedules.length === 0
    ? 100
    : Math.round((completedCount / targetSchedules.length) * 100);

  elements.completionRate.textContent = `${completionRate}%`;
  elements.completionMeter.style.width = `${completionRate}%`;
  elements.completionMeter.parentElement.setAttribute("aria-valuenow", completionRate);
}

async function toggleSchedule(index) {
  if (!selectedDate || !schedules[selectedDate]?.[index]) {
    return;
  }

  schedules[selectedDate][index].completed = !schedules[selectedDate][index].completed;
  renderCalendar();
  renderSchedules();

  try {
    const schedulesRef = doc(db, "teams", currentTeamCode, "schedules", "data");
    await setDoc(schedulesRef, {
      ...schedules,
      ...(targetDate ? { targetDate } : {})
    });
  } catch (error) {
    console.error("予定の完了状態の保存に失敗:", error);
  }
}

async function deleteSchedule(index) {

    if (!selectedDate || !schedules[selectedDate]) {
        return;
    }

    if (!currentTeamCode) {
        console.log("チームコードが取得できていません");
        return;
    }

    schedules[selectedDate].splice(index, 1);

    if (schedules[selectedDate].length === 0) {
        delete schedules[selectedDate];
    }

    renderCalendar();
    renderSchedules();

    try {

        const schedulesRef = doc(
            db,
            "teams",
            currentTeamCode,
            "schedules",
            "data"
        );

        await setDoc(
          schedulesRef,
          { ...schedules, ...(targetDate ? { targetDate } : {}) }
        );

        console.log("予定をFirebaseから更新しました！");

    } catch (error) {

        console.error(
            "予定の削除に失敗:",
            error
        );

    }
}

function formatDateKey(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function isToday(date) {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
renderCalendar();
async function loadSchedules(teamCode) {

    try {

        const schedulesRef = doc(
            db,
            "teams",
            teamCode,
            "schedules",
            "data"
        );

        const snapshot = await getDoc(schedulesRef);

        if (!snapshot.exists()) {
            console.log("予定データはまだありません");
            return;
        }

        const data = snapshot.data();

        console.log("Firebaseから取得:", data);

        targetDate = typeof data.targetDate === "string" ? data.targetDate : null;

        Object.entries(data).forEach(([dateKey, items]) => {
          if (dateKey === "targetDate" || !Array.isArray(items)) {
            return;
          }

          schedules[dateKey] = items.map((item) => (
            typeof item === "string"
              ? { text: item, completed: false }
              : { text: item.text || "", completed: item.completed === true }
          ));
        });

        renderCalendar();

        if (selectedDate) {
            renderSchedules();
        }

    } catch (error) {

        console.error(
            "予定の取得に失敗:",
            error
        );

    }
}

async function loadMembers(teamCode) {
  try {
    const teamSnapshot = await getDoc(doc(db, "teams", teamCode));

    if (!teamSnapshot.exists()) {
      renderMembers([]);
      return;
    }

    const memberIds = teamSnapshot.data().members || [];
    const members = await Promise.all(
      memberIds.map(async (uid) => {
        const userSnapshot = await getDoc(doc(db, "users", uid));
        const userData = userSnapshot.exists() ? userSnapshot.data() : {};

        const teamData = teamSnapshot.data();
        return {
          username: teamData.memberNames?.[uid]
            || userData.username
            || "名前未設定",
          email: userData.email || "",
          lastActiveAt: userData.lastActiveAt || null
        };
      })
    );

    renderMembers(members);
  } catch (error) {
    console.error("メンバーの取得に失敗:", error);
    elements.memberList.innerHTML = `
      <div class="empty-schedule">メンバーを取得できませんでした。</div>
    `;
  }
}

function renderMembers(members) {
  elements.memberCount.textContent = `${members.length}人`;
  elements.memberList.innerHTML = "";

  if (members.length === 0) {
    elements.memberList.innerHTML = `
      <div class="empty-schedule">メンバーがいません。</div>
    `;
    return;
  }

  const membersWithStatus = members.map((member) => {
    const lastActiveTime = member.lastActiveAt?.toMillis?.() || 0;
    return {
      member,
      isOnline: Date.now() - lastActiveTime < onlineTimeoutMs
    };
  });

  membersWithStatus.sort((first, second) => (
    Number(second.isOnline) - Number(first.isOnline)
  ));

  membersWithStatus.forEach(({ member, isOnline }) => {
    const item = document.createElement("div");
    item.className = "member-item";

    const name = document.createElement("strong");
    name.textContent = member.username;
    item.appendChild(name);

    const status = document.createElement("span");
    status.className = `member-status ${isOnline ? "online" : "offline"}`;
    status.textContent = isOnline ? "オンライン" : "オフライン";
    item.appendChild(status);

    elements.memberList.appendChild(item);
  });
}

async function updateMyOnlineStatus(user) {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      { lastActiveAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error("オンライン状態の更新に失敗:", error);
  }
}

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        console.log("ログインしているユーザーがいません");
        return;
    }

      currentUser = user;

    console.log("ログイン中のユーザー:", user.uid);

    const teamCode = await getMyTeamCode(user);

    if (!teamCode) {
        console.log("所属チームがありません");
        return;
    }

    currentTeamCode = teamCode;

    console.log("所属チーム:", currentTeamCode);

    await renderCalendarMenu(user);

    const teamSnapshot = await getDoc(doc(db, "teams", currentTeamCode));
    const teamData = teamSnapshot.data() || {};
    const teamName = teamData.name;
    if (teamName) {
      elements.teamNameTitle.textContent = teamName;
    }
    const userSnapshot = await getDoc(doc(db, "users", user.uid));
    const userData = userSnapshot.data() || {};
    elements.teamNameInput.value = teamName || currentTeamCode;
    elements.memberNameInput.value = teamData.memberNames?.[user.uid]
      || userData.username
      || "";
    elements.editTeamButton.hidden = false;

    await updateMyOnlineStatus(user);
    await loadSchedules(currentTeamCode);
    await loadMembers(currentTeamCode);
    const teamCodeElement = document.getElementById("teamCodeDayo");

    if (teamCodeElement) {
      teamCodeElement.textContent = currentTeamCode;
    }

    onlineUpdateTimer = setInterval(async () => {
      await updateMyOnlineStatus(user);
      await loadMembers(currentTeamCode);
    }, 30000);

});
