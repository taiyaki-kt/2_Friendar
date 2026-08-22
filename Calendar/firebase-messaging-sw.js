importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBb1MFjAYNHJpit7tCE6z7pIF7Wiz9CdRA",
  authDomain: "friendar-4596d.firebaseapp.com",
  projectId: "friendar-4596d",
  storageBucket: "friendar-4596d.firebasestorage.app",
  messagingSenderId: "480147429975",
  appId: "1:480147429975:web:a106ebffc6e57e1b4ba112"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.data?.title || "予定の通知",
    {
      body: payload.data?.body || "予定の時間になりました。",
      icon: "/favicon.ico"
    }
  );
});
