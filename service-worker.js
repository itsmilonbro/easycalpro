/**
 * EasyCal - Service Worker
 * Version: 1.2.0
 * Last Updated: 2024
 * Offline-first Progressive Web App
 */

// Cache configuration
const CACHE_NAME = 'easycal-v1.2';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'easycal-api-v1';

// Files to cache on install
const STATIC_ASSETS = [
  // Core pages
  '/',
  '/index.html',
  '/dashboard.html',
  '/offline.html',
  '/manifest.json',
  
  // CSS files
  '/css/style.css',
  '/css/auth.css',
  '/css/dashboard.css',
  '/css/components.css',
  '/css/responsive.css',
  
  // JavaScript files
  '/js/main.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/admin.js',
  '/js/user.js',
  '/js/database.js',
  '/js/offline-manager.js',
  
  // Web Workers
  '/workers/expiry-worker.js',
  '/workers/sync-worker.js',
  
  // Icons (cache essential icons)
  '/assets/favicon.ico',
  '/assets/icons/icon-72x72.png',
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-128x128.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// ==================== INSTALL EVENT ====================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim();
    })
    .catch((error) => {
      console.error('[Service Worker] Activation failed:', error);
    })
  );
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const requestUrl = new URL(event.request.url);
  
  // Handle API requests with network-first strategy
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.includes('api')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  event.respondWith(handleStaticRequest(event.request));
});

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed for API, trying cache:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // No cache, return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const requestUrl = new URL(request.url);
  
  // Skip cross-origin requests
  if (requestUrl.origin !== self.location.origin) {
    return fetch(request);
  }
  
  // Navigation request - try network first
  if (request.mode === 'navigate') {
    try {
      const networkResponse = await fetch(request);
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
      return networkResponse;
    } catch (error) {
      // Network failed, try cache
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;
      
      // No cache, show offline page
      return caches.match(OFFLINE_URL);
    }
  }
  
  // Static assets - cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      })
      .catch(() => {
        // Silent fail for background update
      });
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Can't fetch, return appropriate error
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50" y="50" text-anchor="middle" fill="#666">Image</text></svg>',
        {
          headers: { 'Content-Type': 'image/svg+xml' }
        }
      );
    }
    
    throw error;
  }
}

// ==================== BACKGROUND SYNC ====================
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-expiry-data') {
    event.waitUntil(syncExpiryData());
  }
  
  if (event.tag === 'sync-all-data') {
    event.waitUntil(syncAllData());
  }
  
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

async function syncExpiryData() {
  try {
    console.log('[Service Worker] Syncing expiry data...');
    
    const db = await openDatabase();
    const pendingUpdates = await getAllPendingData('pendingExpiry');
    
    if (pendingUpdates.length === 0) {
      console.log('[Service Worker] No expiry data to sync');
      return;
    }
    
    let successCount = 0;
    
    for (const update of pendingUpdates) {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 90% success rate for demo
        if (Math.random() < 0.9) {
          await removePendingData('pendingExpiry', update.id);
          successCount++;
          
          // Notify clients of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'EXPIRY_SYNC_SUCCESS',
              data: {
                id: update.id,
                timestamp: new Date().toISOString()
              }
            });
          });
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync expiry update:', error);
      }
    }
    
    console.log(`[Service Worker] Expiry sync complete: ${successCount}/${pendingUpdates.length} successful`);
    
  } catch (error) {
    console.error('[Service Worker] Expiry sync failed:', error);
  }
}

async function syncAllData() {
  try {
    console.log('[Service Worker] Starting full data sync...');
    
    // Notify clients sync started
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_STARTED',
        data: { timestamp: new Date().toISOString() }
      });
    });
    
    // Sync all data types
    const dataTypes = [
      { name: 'expiry', tag: 'pendingExpiry' },
      { name: 'users', tag: 'pendingUsers' },
      { name: 'payments', tag: 'pendingPayments' },
      { name: 'notifications', tag: 'pendingNotifications' }
    ];
    
    const results = {};
    
    for (const dataType of dataTypes) {
      try {
        const pendingData = await getAllPendingData(dataType.tag);
        results[dataType.name] = {
          total: pendingData.length,
          synced: 0
        };
        
        if (pendingData.length > 0) {
          console.log(`[Service Worker] Syncing ${pendingData.length} ${dataType.name} items`);
          
          // Simulate sync process
          await new Promise(resolve => {
            setTimeout(() => {
              // 85% success rate for demo
              const syncedCount = Math.floor(pendingData.length * 0.85);
              results[dataType.name].synced = syncedCount;
              resolve();
            }, 1000);
          });
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to sync ${dataType.name}:`, error);
        results[dataType.name] = { error: error.message };
      }
    }
    
    // Update last sync time
    await setLastSyncTime();
    
    // Notify clients sync completed
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        data: {
          timestamp: new Date().toISOString(),
          results: results,
          message: 'Background sync completed'
        }
      });
    });
    
    console.log('[Service Worker] Full data sync completed:', results);
    
  } catch (error) {
    console.error('[Service Worker] Full data sync failed:', error);
    
    // Notify clients of error
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_ERROR',
        data: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    });
  }
}

async function syncPayments() {
  try {
    console.log('[Service Worker] Syncing payments...');
    
    const pendingPayments = await getAllPendingData('pendingPayments');
    
    if (pendingPayments.length === 0) {
      console.log('[Service Worker] No payments to sync');
      return;
    }
    
    let successCount = 0;
    
    for (const payment of pendingPayments) {
      try {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 95% success rate for demo
        if (Math.random() < 0.95) {
          await removePendingData('pendingPayments', payment.id);
          successCount++;
          
          // Send payment confirmation
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'PAYMENT_CONFIRMED',
              data: {
                paymentId: payment.id,
                amount: payment.data?.amount || 0,
                userId: payment.data?.userId || 'unknown',
                timestamp: new Date().toISOString()
              }
            });
          });
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync payment:', error);
      }
    }
    
    console.log(`[Service Worker] Payments sync complete: ${successCount}/${pendingPayments.length} successful`);
    
  } catch (error) {
    console.error('[Service Worker] Payments sync failed:', error);
  }
}

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  if (!event.data) {
    console.log('[Service Worker] Push event has no data');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
  } catch (error) {
    data = {
      title: 'EasyCal',
      body: event.data.text() || 'New notification',
      icon: '/assets/icons/icon-192x192.png'
    };
  }
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type || 'general',
      timestamp: new Date().toISOString()
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'EasyCal', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.data);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.data);
});

// ==================== PERIODIC SYNC ====================
// (If browser supports it)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'periodic-data-sync') {
      console.log('[Service Worker] Periodic sync triggered');
      event.waitUntil(syncAllData());
    }
  });
}

// ==================== DATABASE HELPERS ====================
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EasyCalSyncDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for different data types
      const stores = [
        { name: 'pendingExpiry', keyPath: 'id' },
        { name: 'pendingUsers', keyPath: 'id' },
        { name: 'pendingPayments', keyPath: 'id' },
        { name: 'pendingNotifications', keyPath: 'id' },
        { name: 'offlineUsers', keyPath: 'id' },
        { name: 'syncMetadata', keyPath: 'key' }
      ];
      
      stores.forEach(store => {
        if (!db.objectStoreNames.contains(store.name)) {
          db.createObjectStore(store.name, store);
        }
      });
    };
  });
}

async function getAllPendingData(storeName) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`[Service Worker] Error getting ${storeName}:`, error);
    return [];
  }
}

async function removePendingData(storeName, id) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`[Service Worker] Error removing from ${storeName}:`, error);
    return false;
  }
}

async function setLastSyncTime() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['syncMetadata'], 'readwrite');
    const store = transaction.objectStore('syncMetadata');
    const request = store.put({
      key: 'lastSyncTime',
      value: new Date().toISOString()
    });
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Service Worker] Error setting last sync time:', error);
    return false;
  }
}

// ==================== MESSAGE HANDLING ====================
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      clearCache();
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0].postMessage(info);
      });
      break;
      
    case 'TRIGGER_SYNC':
      syncAllData();
      break;
      
    case 'CHECK_UPDATES':
      checkForUpdates();
      break;
  }
});

async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[Service Worker] Cache cleared');
}

async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const cacheInfo = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    cacheInfo[cacheName] = {
      size: requests.length,
      urls: requests.map(req => req.url)
    };
  }
  
  return cacheInfo;
}

async function checkForUpdates() {
  // Check for new service worker version
  self.registration.update();
  
  // Notify clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'UPDATE_CHECKED',
      data: { timestamp: new Date().toISOString() }
    });
  });
}

// ==================== ERROR HANDLING ====================
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});

// ==================== STARTUP ====================
console.log('[Service Worker] EasyCal Service Worker loaded successfully');