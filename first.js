console.log("first.js loaded!");
// Firebaseから必要な機能を読み込む
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

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

console.log("Firebase connected!");