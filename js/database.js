class Database {
    constructor() {
        this.dbName = 'EasyCalDB';
        this.dbVersion = 3;
        this.db = null;
        this.init();
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database initialized');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createObjectStores(db);
            };
        });
    }
    
    createObjectStores(db) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'id' });
            usersStore.createIndex('phone', 'phone', { unique: true });
            usersStore.createIndex('email', 'email', { unique: true });
            usersStore.createIndex('subscription.status', 'subscription.status', { unique: false });
            usersStore.createIndex('subscription.expiryDate', 'subscription.expiryDate', { unique: false });
        }
        
        // Notifications store
        if (!db.objectStoreNames.contains('notifications')) {
            const notificationsStore = db.createObjectStore('notifications', {
                keyPath: 'id',
                autoIncrement: true
            });
            notificationsStore.createIndex('userId', 'userId', { unique: false });
            notificationsStore.createIndex('read', 'read', { unique: false });
            notificationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Payments store
        if (!db.objectStoreNames.contains('payments')) {
            const paymentsStore = db.createObjectStore('payments', {
                keyPath: 'id',
                autoIncrement: true
            });
            paymentsStore.createIndex('userId', 'userId', { unique: false });
            paymentsStore.createIndex('status', 'status', { unique: false });
            paymentsStore.createIndex('date', 'date', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Offline sync store
        if (!db.objectStoreNames.contains('offlineSync')) {
            db.createObjectStore('offlineSync', {
                keyPath: 'id',
                autoIncrement: true
            });
        }
    }
    
    // User methods
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            // Generate user ID
            const userId = `USR${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 10);
            const user = {
                id: userId,
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const request = store.add(user);
            
            request.onsuccess = () => {
                resolve(user);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async getUser(userId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(userId);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async getUserByPhone(phone) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('phone');
            const request = index.get(phone);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async updateUser(userId, updates) {
        return new Promise(async (resolve, reject) => {
            const user = await this.getUser(userId);
            if (!user) {
                reject(new Error('User not found'));
                return;
            }
            
            const updatedUser = {
                ...user,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.put(updatedUser);
            
            request.onsuccess = () => {
                resolve(updatedUser);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async deleteUser(userId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.delete(userId);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    // Notification methods
    async addNotification(notification) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notifications'], 'readwrite');
            const store = transaction.objectStore('notifications');
            
            const notificationData = {
                ...notification,
                timestamp: new Date().toISOString(),
                read: false
            };
            
            const request = store.add(notificationData);
            
            request.onsuccess = (event) => {
                resolve({ ...notificationData, id: event.target.result });
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async getNotifications(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notifications'], 'readonly');
            const store = transaction.objectStore('notifications');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            request.onsuccess = (event) => {
                const notifications = event.target.result
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, limit);
                resolve(notifications);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async markNotificationAsRead(notificationId) {
        return new Promise(async (resolve, reject) => {
            const notification = await this.getNotification(notificationId);
            if (!notification) {
                reject(new Error('Notification not found'));
                return;
            }
            
            const updatedNotification = {
                ...notification,
                read: true
            };
            
            const transaction = this.db.transaction(['notifications'], 'readwrite');
            const store = transaction.objectStore('notifications');
            const request = store.put(updatedNotification);
            
            request.onsuccess = () => {
                resolve(updatedNotification);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async markAllNotificationsAsRead(userId) {
        return new Promise(async (resolve, reject) => {
            const notifications = await this.getNotifications(userId);
            const transaction = this.db.transaction(['notifications'], 'readwrite');
            const store = transaction.objectStore('notifications');
            
            notifications.forEach(notification => {
                if (!notification.read) {
                    notification.read = true;
                    store.put(notification);
                }
            });
            
            transaction.oncomplete = () => {
                resolve(true);
            };
            
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    // Payment methods
    async addPayment(paymentData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['payments'], 'readwrite');
            const store = transaction.objectStore('payments');
            
            const payment = {
                ...paymentData,
                date: new Date().toISOString(),
                status: 'completed'
            };
            
            const request = store.add(payment);
            
            request.onsuccess = (event) => {
                resolve({ ...payment, id: event.target.result });
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async getPayments(userId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['payments'], 'readonly');
            const store = transaction.objectStore('payments');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            request.onsuccess = (event) => {
                const payments = event.target.result
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(payments);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    // Settings methods
    async getSetting(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = (event) => {
                resolve(event.target.result ? event.target.result.value : defaultValue);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    // Admin stats
    async getAdminStats() {
        const users = await this.getAllUsers();
        
        const totalUsers = users.length;
        const activeUsers = users.filter(user => 
            user.subscription.status === 'active'
        ).length;
        
        const expiringSoon = users.filter(user => {
            const expiryDate = new Date(user.subscription.expiryDate);
            const now = new Date();
            const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            return diffDays <= 7 && diffDays > 0;
        }).length;
        
        const monthlyRevenue = users
            .filter(user => user.subscription.status === 'active')
            .reduce((sum, user) => sum + (user.subscription.price || 0), 0);
        
        return {
            totalUsers,
            activeUsers,
            expiringSoon,
            monthlyRevenue
        };
    }
    
    // Initialize with sample data (for demo)
    async initializeSampleData() {
        // Check if data already exists
        const users = await this.getAllUsers();
        if (users.length > 0) return;
        
        // Sample users
        const sampleUsers = [
            {
                id: 'USR001',
                name: 'Admin -Milon',
                email: 'admin@easycal.com',
                phone: '+8801955255066',
                password: '123456',
                role: 'admin',
                subscription: {
                    plan: 'premium',
                    price: 0,
                    currency: 'BDT',
                    startDate: new Date().toISOString(),
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                    autoRenew: true
                }
            },
            {
                id: 'USR002',
                name: 'User -Milon',
                email: 'john@example.com',
                phone: '+8801400115520',
                password: '123456',
                role: 'user',
                subscription: {
                    plan: 'standard',
                    price: 500,
                    currency: 'BDT',
                    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                    autoRenew: true
                }
            },
            {
                id: 'USR003',
                name: 'User -Shila',
                email: 'jane@example.com',
                phone: '+8801727235669',
                password: '123456',
                role: 'user',
                subscription: {
                    plan: 'premium',
                    price: 800,
                    currency: 'BDT',
                    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                    expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'expired',
                    autoRenew: false
                }
            }
        ];
        
        // Add sample users
        for (const user of sampleUsers) {
            await this.createUser(user);
        }
        
        // Add sample notifications
        await this.addNotification({
            userId: 'USR001',
            title: 'Welcome to EasyCal!',
            message: 'Your Admin Dashboard is ready to use.',
            type: 'system'
        });
        
        console.log('Sample data initialized');
    }
    
    // Utility method
    async getNotification(notificationId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notifications'], 'readonly');
            const store = transaction.objectStore('notifications');
            const request = store.get(notificationId);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
}

// Initialize database and expose globally
window.database = new Database();

// Initialize sample data when database is ready
window.database.init().then(() => {
    window.database.initializeSampleData();
});