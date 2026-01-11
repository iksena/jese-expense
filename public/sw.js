// Service Worker for Gym Tracker Timer
// iOS PWA Compatible Version

let activeTimerId = null;

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_TIMER') {
    // Clear any existing timer
    if (activeTimerId) {
      clearTimeout(activeTimerId);
    }

    const delay = event.data.delay; // milliseconds
    const endTime = Date.now() + delay;
    
    // Store timer end time in IndexedDB for persistence
    storeTimerEndTime(endTime);
    
    // Keep service worker alive using event.waitUntil with a promise
    event.waitUntil(
      scheduleNotification(delay, endTime)
    );
  }
  
  if (event.data && event.data.type === 'CANCEL_TIMER') {
    if (activeTimerId) {
      clearTimeout(activeTimerId);
      activeTimerId = null;
    }
    clearTimerEndTime();
  }
});

// Schedule notification with iOS-compatible approach
function scheduleNotification(delay, endTime) {
  return new Promise((resolve) => {
    // For iOS compatibility: Use shorter intervals and check remaining time
    // iOS may kill long-running timers, so we use a polling approach
    const maxInterval = 30000; // Check every 30 seconds max
    
    function checkAndNotify() {
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        // Timer complete - show notification
        self.registration.showNotification("Rest Complete! 💪", {
          body: "Time to crush the next set",
          icon: "/icon-192.png",
          badge: "/badge-72.png",
          vibrate: [200, 100, 200, 100, 200],
          tag: 'rest-timer',
          requireInteraction: false,
          silent: false,
          data: { type: 'timer-complete' }
        }).then(() => {
          // Notify all open clients
          return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'TIMER_DONE' });
          });
          clearTimerEndTime();
          resolve();
        });
      } else if (remaining > maxInterval) {
        // Still have time - schedule next check
        activeTimerId = setTimeout(checkAndNotify, Math.min(remaining, maxInterval));
      } else {
        // Final stretch - schedule exact completion
        activeTimerId = setTimeout(checkAndNotify, remaining);
      }
    }
    
    checkAndNotify();
  });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing window or open new one
        for (let client of clients) {
          if (client.url.includes('/gym') && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/gym');
        }
      })
  );
});

// IndexedDB helpers for timer persistence (iOS compatible)
function storeTimerEndTime(endTime) {
  // Use Cache API as fallback for simple key-value storage on iOS
  if (self.caches) {
    const timerData = new Response(JSON.stringify({ endTime }));
    caches.open('timer-state').then(cache => {
      cache.put('/timer-end', timerData);
    });
  }
}

function clearTimerEndTime() {
  if (self.caches) {
    caches.open('timer-state').then(cache => {
      cache.delete('/timer-end');
    });
  }
}

// On service worker wake-up, check for expired timers
self.addEventListener('fetch', (event) => {
  // Don't intercept, just use as wake-up trigger
  if (event.request.url.includes('/gym')) {
    checkExpiredTimer();
  }
});

function checkExpiredTimer() {
  if (self.caches) {
    caches.open('timer-state').then(cache => {
      cache.match('/timer-end').then(response => {
        if (response) {
          response.json().then(data => {
            const now = Date.now();
            if (data.endTime && data.endTime < now) {
              // Timer expired while app was closed
              self.registration.showNotification("Rest Complete! 💪", {
                body: "Your rest period is over",
                icon: "/icon-192.png",
                tag: 'rest-timer'
              });
              clearTimerEndTime();
            }
          });
        }
      });
    });
  }
}
