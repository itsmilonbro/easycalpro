/**
 * EasyCal - Main Application File
 * Core functionality and initialization
 */

class EasyCalApp {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('EasyCal App Initializing...');
        
        // Initialize theme
        this.initTheme();
        
        // Initialize service worker
        this.initServiceWorker();
        
        // Setup global event listeners
        this.setupGlobalListeners();
        
        // Check authentication status
        this.checkAuthStatus();
        
        // Initialize network status
        this.initNetworkStatus();
        
        console.log('EasyCal App Initialized');
    }
    
    initTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Apply theme
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
        }
        
        // Store theme preference
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }
    
    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('ServiceWorker registered:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('ServiceWorker update found!');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Show update notification
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }
    
    setupGlobalListeners() {
        // Theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle')) {
                this.toggleTheme();
            }
        });
        
        // Logout button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logoutBtn')) {
                e.preventDefault();
                this.logout();
            }
        });
        
        // Network status
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Before unload - save state
        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    checkAuthStatus() {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const currentPage = window.location.pathname;
        
        // Redirect rules
        if (currentPage.includes('dashboard')) {
            if (!isAuthenticated) {
                window.location.href = '/';
            }
        } else if (currentPage === '/' || currentPage.includes('index.html')) {
            if (isAuthenticated) {
                window.location.href = 'dashboard.html';
            }
        }
    }
    
    initNetworkStatus() {
        const isOnline = navigator.onLine;
        this.updateNetworkUI(isOnline);
    }
    
    updateNetworkUI(isOnline) {
        const indicators = document.querySelectorAll('.network-indicator, .network-status-indicator');
        
        indicators.forEach(indicator => {
            if (isOnline) {
                indicator.innerHTML = '<i class="fas fa-wifi"></i> Online';
                indicator.classList.remove('offline');
                indicator.classList.add('online');
            } else {
                indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
                indicator.classList.remove('online');
                indicator.classList.add('offline');
            }
        });
    }
    
    handleOnline() {
        console.log('App is online');
        this.updateNetworkUI(true);
        
        // Show toast notification
        this.showToast('Back online. Syncing data...', 'success');
        
        // Trigger data sync
        if (window.offlineManager) {
            window.offlineManager.syncOfflineData();
        }
    }
    
    handleOffline() {
        console.log('App is offline');
        this.updateNetworkUI(false);
        
        // Show toast notification
        this.showToast('You are now offline. Some features may be limited.', 'warning');
        
        // Load cached data
        if (window.offlineManager) {
            window.offlineManager.loadCachedExpiryData();
        }
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        // Show feedback
        this.showToast(`Switched to ${isDarkMode ? 'dark' : 'light'} mode`, 'info');
    }
    
    logout() {
        // Clear all auth data
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('rememberedPhone');
        localStorage.removeItem('lastLogin');
        
        // Stop any running workers
        if (window.offlineManager && window.offlineManager.expiryWorker) {
            window.offlineManager.expiryWorker.postMessage({
                action: 'STOP_TRACKING'
            });
        }
        
        // Redirect to login
        window.location.href = '/';
    }
    
    saveAppState() {
        // Save current page state
        const state = {
            currentPage: window.location.pathname,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('lastAppState', JSON.stringify(state));
    }
    
    handleKeyboardShortcuts(e) {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl/Cmd + D = Toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.toggleTheme();
        }
        
        // Ctrl/Cmd + L = Logout
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            this.logout();
        }
        
        // Ctrl/Cmd + S = Search
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-box input, #userSearch');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }
    
    showUpdateNotification() {
        // Create update notification
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <i class="fas fa-sync-alt"></i>
                <div>
                    <h4>New Update Available</h4>
                    <p>A new version of EasyCal is available</p>
                </div>
                <button class="btn-update" id="updateApp">Update Now</button>
                <button class="btn-dismiss" id="dismissUpdate">Dismiss</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Update button
        document.getElementById('updateApp').addEventListener('click', () => {
            window.location.reload();
        });
        
        // Dismiss button
        document.getElementById('dismissUpdate').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto dismiss after 30 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 30000);
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                               type === 'error' ? 'exclamation-circle' : 
                               type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        // Add to container or create one
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        });
    }
    
    // Utility Methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatCurrency(amount, currency = 'BDT') {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // API Methods (simulated for demo)
    async apiRequest(endpoint, method = 'GET', data = null) {
        const baseUrl = 'https://api.easycal.com'; // This would be your real API URL
        
        // For demo, simulate API calls
        console.log(`API Request: ${method} ${endpoint}`, data);
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate network delay
                if (Math.random() < 0.95) { // 95% success rate
                    resolve({
                        success: true,
                        data: this.getMockData(endpoint, method, data)
                    });
                } else {
                    reject(new Error('API request failed'));
                }
            }, 500);
        });
    }
    
    getMockData(endpoint, method, data) {
        // Return mock data based on endpoint
        switch(endpoint) {
            case '/users':
                return this.generateMockUsers();
            case '/payments':
                return this.generateMockPayments();
            case '/stats':
                return this.generateMockStats();
            default:
                return { message: 'Mock data for ' + endpoint };
        }
    }
    
    generateMockUsers(count = 50) {
        const users = [];
        const plans = ['basic', 'standard', 'premium'];
        const statuses = ['active', 'expired', 'pending'];
        
        for (let i = 1; i <= count; i++) {
            const plan = plans[Math.floor(Math.random() * plans.length)];
            const price = plan === 'basic' ? 300 : plan === 'standard' ? 500 : 800;
            
            users.push({
                id: `USR${String(i).padStart(4, '0')}`,
                name: `User ${i}`,
                email: `user${i}@example.com`,
                phone: `+8801${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
                subscription: {
                    plan,
                    price,
                    currency: 'BDT',
                    startDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                    expiryDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    autoRenew: Math.random() > 0.5
                },
                createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
        }
        
        return users;
    }
    
    generateMockPayments(count = 100) {
        const payments = [];
        const methods = ['bkash', 'nagad', 'card', 'bank'];
        const statuses = ['completed', 'pending', 'failed'];
        
        for (let i = 1; i <= count; i++) {
            payments.push({
                id: `PAY${String(i).padStart(6, '0')}`,
                userId: `USR${String(Math.floor(Math.random() * 50) + 1).padStart(4, '0')}`,
                amount: [300, 500, 800][Math.floor(Math.random() * 3)],
                currency: 'BDT',
                method: methods[Math.floor(Math.random() * methods.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                description: 'Subscription payment'
            });
        }
        
        return payments;
    }
    
    generateMockStats() {
        return {
            totalUsers: Math.floor(Math.random() * 1000) + 100,
            activeUsers: Math.floor(Math.random() * 800) + 50,
            expiredUsers: Math.floor(Math.random() * 200) + 10,
            monthlyRevenue: Math.floor(Math.random() * 500000) + 100000,
            todayPayments: Math.floor(Math.random() * 50) + 5,
            expiringThisWeek: Math.floor(Math.random() * 30) + 5
        };
    }
}

// Initialize the app
window.EasyCal = new EasyCalApp();

// Make utility methods globally available
window.formatDate = (dateString) => window.EasyCal.formatDate(dateString);
window.formatCurrency = (amount, currency) => window.EasyCal.formatCurrency(amount, currency);
window.showToast = (message, type) => window.EasyCal.showToast(message, type);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EasyCalApp;
}