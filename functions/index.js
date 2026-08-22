const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

exports.sendScheduleNotifications = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1"
  },
  async () => {
    const scheduleDocuments = await db.collectionGroup("schedules").get();
    const now = Date.now();

    for (const scheduleDocument of scheduleDocuments.docs) {
      if (scheduleDocument.id !== "data") {
        continue;
      }

      const scheduleData = scheduleDocument.data();
      for (const [dateKey, items] of Object.entries(scheduleData)) {
        if (!Array.isArray(items)) {
          continue;
        }

        for (const [index, schedule] of items.entries()) {
          const notificationTime = Date.parse(schedule.notificationAt || "");
          const memberIds = Array.isArray(schedule.notificationMemberIds)
            ? schedule.notificationMemberIds
            : [];
          const notificationId = `${dateKey}-${index}-${schedule.notificationAt}`;

          if (
            Number.isNaN(notificationTime)
            || notificationTime > now
            || notificationTime <= now - 10 * 60 * 1000
            || memberIds.length === 0
          ) {
            continue;
          }

          const sentReference = scheduleDocument.ref
            .collection("sentNotifications")
            .doc(notificationId);
          const sentSnapshot = await sentReference.get();
          if (sentSnapshot.exists) {
            continue;
          }

          const tokenSnapshots = await Promise.all(
            memberIds.map((memberId) => (
              db.collection("users")
                .doc(memberId)
                .collection("fcmTokens")
                .get()
            ))
          );
          const tokens = [...new Set(
            tokenSnapshots.flatMap((snapshot) => (
              snapshot.docs.map((tokenDocument) => tokenDocument.data().token)
            ))
          )].filter(Boolean);

          if (tokens.length > 0) {
            const response = await messaging.sendEachForMulticast({
              tokens,
              data: {
                title: "予定の通知",
                body: schedule.text || "予定の時間になりました。",
                scheduleText: schedule.text || ""
              }
            });
            console.log(`通知送信: ${response.successCount}件成功、${response.failureCount}件失敗`);
          }

          await sentReference.set({
            sentAt: new Date(),
            tokenCount: tokens.length
          });
        }
      }
    }
  }
);
