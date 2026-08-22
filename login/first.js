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
    setDoc
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
window.location.href = "../mypage/mypage.html";
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

        window.location.href = "../mypage/mypage.html";

    } catch (error) {

        console.error("ログイン失敗:", error);

    }

});
