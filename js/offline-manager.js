class OfflineManager {
  constructor() {
    this.expiryWorker = null;
    this.isOnline = navigator.onLine;
    this.init();
  }
  
  init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }
    
    // Set up network listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Initialize IndexedDB
    this.initIndexedDB();
    
    // Check for pending sync
    this.checkPendingSync();
  }
  
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('Service Worker update found!');
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  
  startExpiryTracking(userData) {
    // Start Web Worker for background expiry tracking
    if (window.Worker) {
      this.expiryWorker = new Worker('/workers/expiry-worker.js');
      
      // Set up message listener
      this.expiryWorker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
      
      // Send initial data to worker
      this.expiryWorker.postMessage({
        action: 'START_TRACKING',
        data: { userData }
      });
      
      // Send network status
      this.expiryWorker.postMessage({
        action: 'NETWORK_STATUS',
        data: { isOnline: this.isOnline }
      });
    } else {
      // Fallback to setInterval if Web Workers not supported
      this.startFallbackTracking(userData);
    }
  }
  
  handleWorkerMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'EXPIRY_UPDATE':
        this.updateUIWithExpiryData(data);
        break;
        
      case 'URGENT_NOTIFICATION':
        this.showNotification(data);
        break;
        
      case 'EXPIRY_REDIRECT':
        if (this.isOnline) {
          this.redirectToPayment(data.userId);
        } else {
          this.scheduleRedirect(data.userId);
        }
        break;
    }
  }
  
  updateUIWithExpiryData(data) {
    // Update dashboard UI with expiry information
    const expiryElement = document.getElementById('expiry-display');
    if (expiryElement) {
      const daysText = data.daysRemaining > 0 
        ? `${data.daysRemaining} days remaining`
        : 'EXPIRED';
      
      expiryElement.innerHTML = `
        <div class="expiry-alert ${data.daysRemaining <= 3 ? 'warning' : ''} ${data.isExpired ? 'expired' : ''}">
          <i class="fas ${data.isExpired ? 'fa-exclamation-triangle' : 'fa-clock'}"></i>
          <span>${daysText}</span>
          ${data.isExpired ? '<button class="renew-btn">Renew Now</button>' : ''}
        </div>
      `;
    }
    
    // Store locally for offline access
    this.storeExpiryData(data);
  }
  
  showNotification(data) {
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.body,
        icon: '/assets/icons/icon-192x192.png',
        tag: 'expiry-notification'
      });
    }
    
    // Show in-app notification
    this.showInAppNotification(data);
  }
  
  showInAppNotification(data) {
    const notificationContainer = document.getElementById('notification-container') || 
      this.createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = 'in-app-notification warning';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>${data.title}</strong>
          <p>${data.body}</p>
        </div>
        <button class="close-notification">&times;</button>
      </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
    
    // Close button
    notification.querySelector('.close-notification').addEventListener('click', () => {
      notification.remove();
    });
  }
  
  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
  }
  
  redirectToPayment(userId) {
    // Store redirect intent
    localStorage.setItem('pendingRedirect', JSON.stringify({
      userId,
      timestamp: new Date().toISOString(),
      reason: 'subscription_expired'
    }));
    
    // Redirect to payment page
    window.location.href = `/payment.html?userId=${userId}&reason=expired`;
  }
  
  scheduleRedirect(userId) {
    // Store for when online
    this.storePendingAction({
      type: 'redirect',
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Show offline message
    this.showOfflineMessage('Your subscription has expired. You will be redirected to payment when online.');
  }
  
  handleOnline() {
    this.isOnline = true;
    
    // Notify worker
    if (this.expiryWorker) {
      this.expiryWorker.postMessage({
        action: 'NETWORK_STATUS',
        data: { isOnline: true }
      });
    }
    
    // Process pending actions
    this.processPendingActions();
    
    // Sync offline data
    this.syncOfflineData();
    
    // Update UI
    this.showOnlineStatus();
  }
  
  handleOffline() {
    this.isOnline = false;
    
    // Notify worker
    if (this.expiryWorker) {
      this.expiryWorker.postMessage({
        action: 'NETWORK_STATUS',
        data: { isOnline: false }
      });
    }
    
    // Update UI
    this.showOfflineStatus();
    
    // Load cached expiry data
    this.loadCachedExpiryData();
  }
  
  async syncOfflineData() {
    try {
      // Get registration for background sync
      const registration = await navigator.serviceWorker.ready;
      
      // Register for sync
      await registration.sync.register('sync-expiry-updates');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
  
  async storeExpiryData(data) {
    // Store in IndexedDB for offline access
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['expiryData'], 'readwrite');
      const store = transaction.objectStore('expiryData');
      
      await store.put({
        id: data.userId,
        ...data,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to store expiry data:', error);
    }
  }
  
  async loadCachedExpiryData() {
    try {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) return;
      
      const db = await this.getDB();
      const transaction = db.transaction(['expiryData'], 'readonly');
      const store = transaction.objectStore('expiryData');
      const request = store.get(userId);
      
      request.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          this.updateUIWithExpiryData(data);
        }
      };
    } catch (error) {
      console.error('Failed to load cached expiry data:', error);
    }
  }
  
  // Fallback methods for browsers without Web Workers
  startFallbackTracking(userData) {
    setInterval(() => {
      this.checkExpiryFallback(userData);
    }, 60000);
    this.checkExpiryFallback(userData);
  }
  
  checkExpiryFallback(userData) {
    const now = new Date();
    const expiryDate = new Date(userData.subscription.expiryDate);
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 3600 * 24));
    
    if (daysRemaining <= 0 && this.isOnline) {
      this.redirectToPayment(userData.id);
    }
    
    this.updateUIWithExpiryData({
      daysRemaining,
      isExpired: daysRemaining <= 0,
      expiryDate: userData.subscription.expiryDate,
      userId: userData.id
    });
  }
  
  // IndexedDB initialization
  initIndexedDB() {
    const request = indexedDB.open('EasyCalDB', 2);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
    };
    
    request.onsuccess = (event) => {
      this.db = event.target.result;
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('expiryData')) {
        db.createObjectStore('expiryData', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', {
          keyPath: 'id',
          autoIncrement: true
        });
      }
      
      if (!db.objectStoreNames.contains('offlineUsers')) {
        const userStore = db.createObjectStore('offlineUsers', { keyPath: 'id' });
        userStore.createIndex('phone', 'phone', { unique: true });
      }
    };
  }
  
  getDB() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
      } else {
        const request = indexedDB.open('EasyCalDB', 2);
        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };
        request.onerror = (event) => {
          reject(event.target.error);
        };
      }
    });
  }
  
  showOnlineStatus() {
    const statusElement = document.getElementById('network-status') || 
      this.createStatusElement();
    statusElement.className = 'network-status online';
    statusElement.innerHTML = '<i class="fas fa-wifi"></i> Online';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusElement.classList.add('fade-out');
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 500);
    }, 3000);
  }
  
  showOfflineStatus() {
    const statusElement = document.getElementById('network-status') || 
      this.createStatusElement();
    statusElement.className = 'network-status offline';
    statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Working Offline';
    statusElement.style.display = 'block';
  }
  
  createStatusElement() {
    const element = document.createElement('div');
    element.id = 'network-status';
    document.body.appendChild(element);
    return element;
  }
}

// Initialize Offline Manager
const offlineManager = new OfflineManager();

// Export for use in other modules
window.offlineManager = offlineManager;