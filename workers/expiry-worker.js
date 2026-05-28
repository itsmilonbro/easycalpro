// Web Worker for background expiry tracking
let expiryCheckInterval;
let isOnline = navigator.onLine;

// Listen for online/offline events
self.addEventListener('message', (event) => {
  const { action, data } = event.data;
  
  switch (action) {
    case 'START_TRACKING':
      startExpiryTracking(data.userData);
      break;
    case 'STOP_TRACKING':
      stopExpiryTracking();
      break;
    case 'UPDATE_USER_DATA':
      updateUserData(data);
      break;
    case 'NETWORK_STATUS':
      isOnline = data.isOnline;
      break;
  }
});

function startExpiryTracking(userData) {
  // Clear any existing interval
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
  }
  
  // Check expiry every minute
  expiryCheckInterval = setInterval(() => {
    checkExpiryStatus(userData);
  }, 60000); // Check every minute
  
  // Immediate check
  checkExpiryStatus(userData);
}

function stopExpiryTracking() {
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
  }
}

function checkExpiryStatus(userData) {
  const now = new Date();
  const expiryDate = new Date(userData.subscription.expiryDate);
  
  // Calculate days remaining
  const timeDiff = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // Create notification object
  const notification = {
    type: 'expiry_update',
    data: {
      daysRemaining,
      isExpired: daysRemaining <= 0,
      expiryDate: userData.subscription.expiryDate,
      userId: userData.id,
      timestamp: now.toISOString()
    }
  };
  
  // Store notification in IndexedDB
  storeOfflineNotification(notification);
  
  // Send notification to main thread
  self.postMessage({
    type: 'EXPIRY_UPDATE',
    data: notification.data
  });
  
  // Check for urgent notifications (expiring in 3 days or less)
  if (daysRemaining <= 3 && daysRemaining > 0) {
    sendUrgentNotification(userData, daysRemaining);
  }
  
  // If expired and online, prepare for redirect
  if (daysRemaining <= 0 && isOnline) {
    self.postMessage({
      type: 'EXPIRY_REDIRECT',
      data: { userId: userData.id }
    });
  }
}

async function storeOfflineNotification(notification) {
  // Store in IndexedDB for offline access
  try {
    const db = await openIndexedDB();
    await db.add('offlineNotifications', notification);
  } catch (error) {
    console.error('Failed to store offline notification:', error);
  }
}

function sendUrgentNotification(userData, daysRemaining) {
  self.postMessage({
    type: 'URGENT_NOTIFICATION',
    data: {
      title: 'Subscription Expiring Soon!',
      body: `Your subscription expires in ${daysRemaining} day(s)`,
      userId: userData.id,
      daysRemaining
    }
  });
}

// Helper function to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EasyCalOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('offlineNotifications')) {
        const store = db.createObjectStore('offlineNotifications', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('pendingUpdates')) {
        db.createObjectStore('pendingUpdates', {
          keyPath: 'id',
          autoIncrement: true
        });
      }
    };
  });
}