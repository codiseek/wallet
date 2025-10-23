
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register(window.STATIC_URL + "service-worker.js")
    .then(() => {
      return navigator.serviceWorker.ready;
    })
    .then(async (reg) => {
      const appServerKey = urlBase64ToUint8Array(window.VAPID_KEY);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey
      });

      await fetch("/webpush/save_information/?group=notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": window.CSRF_TOKEN
        },
        body: JSON.stringify(subscription)
      });
    })
    .catch(err => console.error("❌ Ошибка подписки:", err));
}



self.addEventListener("push", (event) => {
  console.log("📩 PUSH EVENT получен от заметки:", event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error("Ошибка парсинга данных уведомления:", e);
      return;
    }
  }

  // Проверяем, что это уведомление от заметки
  if (data.type !== 'note_reminder') {
    console.log('Пропускаем уведомление не от заметки:', data.type);
    return;
  }

  const title = data.title || "Напоминание о заметке";
  const options = {
    body: data.body || "У вас есть напоминание",
    icon: "/static/main/icons/icon-192x192.png",
    badge: "/static/main/icons/icon-192x192.png",
    data: { 
      url: data.url || "/",
      noteId: data.noteId,
      type: 'note_reminder'
    },
    vibrate: [100, 50, 100],
    requireInteraction: true,
    tag: `note-reminder-${data.noteId}`, // Группируем уведомления по ID заметки
    actions: [
      {
        action: 'open',
        title: 'Открыть заметку'
      },
      {
        action: 'dismiss',
        title: 'Отложить'
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const noteId = event.notification.data?.noteId;
  const targetUrl = event.notification.data?.url || "/";
  
  console.log("🔗 Клик по уведомлению заметки:", noteId);

  // Обработка действий в уведомлении
  if (event.action === 'open') {
    // Открываем заметку
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            // Отправляем сообщение для открытия заметки
            client.postMessage({
              type: 'OPEN_NOTE',
              noteId: noteId
            });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Помечаем напоминание как отложенное
    event.waitUntil(
      fetch(`/api/notes/${noteId}/snooze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }).catch(err => console.error('Ошибка откладывания:', err))
    );
  } else {
    // Обычный клик по уведомлению
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            client.postMessage({
              type: 'OPEN_NOTE',
              noteId: noteId
            });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});

// Обработка сообщений от главного окна
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});