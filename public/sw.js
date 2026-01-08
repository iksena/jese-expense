self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_TIMER') {
    const delay = event.data.delay; // milliseconds

    // Schedule the notification
    setTimeout(() => {
      self.registration.showNotification("Rest Complete!", {
        body: "Time to crush the next set.",
        icon: "/favicon.ico",
        vibrate: [200, 100, 200],
        tag: 'rest-timer'
      });

      // Notify the active page (if open) to stop the visual timer
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'TIMER_DONE' });
        });
      });
    }, delay);
  }
});