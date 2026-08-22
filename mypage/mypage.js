import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
	getFirestore,
	doc,
	getDoc,
	setDoc,
	arrayUnion,
	arrayRemove,
	deleteField,
	deleteDoc
} from "firebase/firestore";

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
const teamList = document.getElementById("teamList");
const teamName = document.getElementById("teamName");
const editTeamButton = document.getElementById("editTeamButton");
const createTeamButton = document.getElementById("createTeamButton");
const joinTeamCode = document.getElementById("joinTeamCode");
const joinTeamButton = document.getElementById("joinTeamButton");
const teamMessage = document.getElementById("teamMessage");
const usernameElement = document.getElementById("username");

let currentUser = null;
let teamCodes = [];
let isEditingTeams = false;

onAuthStateChanged(auth, async (user) => {
	currentUser = user;

	if (!user) {
		renderTeamList([]);
		teamMessage.textContent = "ログインしてください。";
		createTeamButton.disabled = true;
		joinTeamButton.disabled = true;
		editTeamButton.disabled = true;
		return;
	}

	const userSnapshot = await getDoc(doc(db, "users", user.uid));
	const userData = userSnapshot.data() || {};

    usernameElement.textContent = userData.username || "名前未設定";
    
	teamCodes = Array.isArray(userData.teamCodes)
		? userData.teamCodes
		: userData.teamCode
			? [userData.teamCode]
			: [];

	if (teamCodes.length > 0) {
		const teamEntries = await loadTeamEntries(teamCodes);
		renderTeamList(teamEntries);
		teamMessage.textContent = "所属しているチームです。";
	} else {
		renderTeamList([]);
	}
});

editTeamButton.addEventListener("click", () => {
	isEditingTeams = !isEditingTeams;
	editTeamButton.textContent = isEditingTeams ? "完了" : "編集";
	loadTeamEntries(teamCodes).then(renderTeamList);
});

joinTeamButton.addEventListener("click", async () => {
	if (!currentUser) {
		teamMessage.textContent = "ログインしてください。";
		return;
	}

	const requestedTeamCode = joinTeamCode.value.trim().toUpperCase();
	if (!requestedTeamCode) {
		teamMessage.textContent = "参加するチームIDを入力してください。";
		return;
	}

	if (teamCodes.includes(requestedTeamCode)) {
		teamMessage.textContent = "すでに参加しているチームです。";
		return;
	}

	joinTeamButton.disabled = true;
	teamMessage.textContent = "チームを確認しています...";

	try {
		const teamReference = doc(db, "teams", requestedTeamCode);
		const teamSnapshot = await getDoc(teamReference);

		if (!teamSnapshot.exists()) {
			teamMessage.textContent = "そのチームは見つかりませんでした。";
			return;
		}

		await setDoc(teamReference, {
			members: arrayUnion(currentUser.uid)
		}, { merge: true });

		teamCodes = [...teamCodes, requestedTeamCode];
		await setDoc(doc(db, "users", currentUser.uid), {
			teamCode: requestedTeamCode,
			teamCodes
		}, { merge: true });

		renderTeamList([
			...await loadTeamEntries(teamCodes)
		]);
		joinTeamCode.value = "";
		teamMessage.textContent = "チームに参加しました。";
	} catch (error) {
		console.error("チーム参加失敗:", error);
		teamMessage.textContent = "チームへの参加に失敗しました。";
	} finally {
		joinTeamButton.disabled = false;
	}
});

async function loadTeamEntries(codes) {
	return Promise.all(codes.map(async (code) => {
		const teamSnapshot = await getDoc(doc(db, "teams", code));
		return {
			code,
			name: teamSnapshot.data()?.name || code
		};
	}));
}

function renderTeamList(teamEntries) {
	teamList.innerHTML = "";

	if (teamEntries.length === 0) {
		const emptyMessage = document.createElement("p");
		emptyMessage.textContent = "所属しているチームはありません。";
		teamList.appendChild(emptyMessage);
		return;
	}

	teamEntries.forEach(({ code, name }) => {
		const teamItem = document.createElement("div");
		teamItem.className = "team-item";

		const teamLabel = document.createElement("div");
		teamLabel.className = "team-label";
		const teamNameLabel = document.createElement("strong");
		teamNameLabel.textContent = name;
		const teamCodeLabel = document.createElement("small");
		teamCodeLabel.textContent = `ID: ${code}`;
		teamLabel.append(teamNameLabel, teamCodeLabel);

		const calendarButton = document.createElement("button");
		calendarButton.className = "calendar-button";
		calendarButton.textContent = "→ カレンダー";
		calendarButton.setAttribute("aria-label", `${name}のカレンダーを開く`);
		calendarButton.addEventListener("click", () => {
			const encodedTeamCode = encodeURIComponent(code);
			window.location.href = `../Calendar/calendar.html?team=${encodedTeamCode}`;
		});

		const teamActions = document.createElement("div");
		teamActions.className = "team-actions";
		teamActions.appendChild(calendarButton);

		if (isEditingTeams) {
			const leaveButton = document.createElement("button");
			leaveButton.className = "leave-button";
			leaveButton.textContent = "脱退";
			leaveButton.setAttribute("aria-label", `${name}から脱退`);
			leaveButton.addEventListener("click", () => leaveTeam(code));
			teamActions.appendChild(leaveButton);
		}

		teamItem.append(teamLabel, teamActions);
		teamList.appendChild(teamItem);
	});
}

async function leaveTeam(teamCode) {
	if (!currentUser || !teamCodes.includes(teamCode)) {
		return;
	}

	try {
		const teamReference = doc(db, "teams", teamCode);
		const teamSnapshot = await getDoc(teamReference);
		const currentMembers = teamSnapshot.data()?.members || [];
		const isLastMember = currentMembers.length === 1 && currentMembers[0] === currentUser.uid;
		const confirmationMessage = isLastMember
			? "あなたが最後の1人です。脱退すると、このカレンダーのデータは完全に削除されます。よろしいですか？"
			: "このチームから脱退しますか？";

		if (!window.confirm(confirmationMessage)) {
			return;
		}

		await setDoc(teamReference, {
			members: arrayRemove(currentUser.uid)
		}, { merge: true });

		const updatedTeamSnapshot = await getDoc(teamReference);
		const remainingMembers = updatedTeamSnapshot.data()?.members || [];
		if (remainingMembers.length === 0) {
			await deleteDoc(teamReference);
		}

		teamCodes = teamCodes.filter((code) => code !== teamCode);
		const userUpdate = {
			teamCodes,
			teamCode: teamCodes[0] || deleteField()
		};
		await setDoc(doc(db, "users", currentUser.uid), userUpdate, { merge: true });

		renderTeamList(await loadTeamEntries(teamCodes));
		teamMessage.textContent = "チームから脱退しました。";
	} catch (error) {
		console.error("チーム脱退失敗:", error);
		teamMessage.textContent = "チームからの脱退に失敗しました。";
	}
}

createTeamButton.addEventListener("click", async () => {
	if (!currentUser) {
		teamMessage.textContent = "ログインしてください。";
		return;
	}

	createTeamButton.disabled = true;
	teamMessage.textContent = "チームを作成しています...";

	try {
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		const newTeamName = teamName.value.trim();
		if (!newTeamName) {
			teamMessage.textContent = "チーム名を入力してください。";
			createTeamButton.disabled = false;
			return;
		}

		let newTeamCode = "";

		for (let index = 0; index < 6; index++) {
			const randomIndex = Math.floor(Math.random() * characters.length);
			newTeamCode += characters[randomIndex];
		}

		await setDoc(doc(db, "teams", newTeamCode), {
			name: newTeamName,
			owner: currentUser.uid,
			members: [currentUser.uid],
			createdAt: new Date()
		});

		await setDoc(doc(db, "users", currentUser.uid), {
			teamCode: newTeamCode,
			teamCodes: [...teamCodes, newTeamCode]
		}, { merge: true });

		teamCodes = [...teamCodes, newTeamCode];
		renderTeamList([
			...await loadTeamEntries(teamCodes)
		]);
		teamName.value = "";
		teamMessage.textContent = "チームを作成しました。";
		createTeamButton.disabled = false;
	} catch (error) {
		console.error("チーム作成失敗:", error);
		teamMessage.textContent = "チームの作成に失敗しました。";
		createTeamButton.disabled = false;
	}
});

// メニューボタンのイベントリスナー
const calendarMenuButton = document.getElementById("calendarButton");
const logoutMenuButton = document.getElementById("logoutButton");

calendarMenuButton?.addEventListener("click", () => {
	window.location.href = "../Calendar/calendar.html";
});

logoutMenuButton?.addEventListener("click", async () => {
	try {
		const { signOut } = await import("firebase/auth");
		await signOut(auth);
		window.location.href = "../login/first.html";
	} catch (error) {
		console.error("ログアウトに失敗:", error);
	}
});
