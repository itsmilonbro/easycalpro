class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'overview';
        this.isAdmin = false;
        this.notifications = [];
        this.init();
    }
    
    async init() {
        // Load user data
        await this.loadUserData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial page
        this.loadPage(this.currentPage);
        
        // Load notifications
        this.loadNotifications();
        
        // Update sidebar stats
        this.updateSidebarStats();
        
        // Check offline status
        this.checkOfflineStatus();
        
        // Start expiry tracking
        this.startExpiryTracking();
        
        console.log('Dashboard initialized for:', this.currentUser.name);
    }
    
    async loadUserData() {
        try {
            // Get user ID from localStorage
            const userId = localStorage.getItem('currentUserId');
            if (!userId) {
                throw new Error('No user ID found');
            }
            
            // Load user from database
            const user = await window.database.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            this.currentUser = user;
            this.isAdmin = user.role === 'admin';
            
            // Update UI
            this.updateUserUI();
            
            // Show/hide admin section
            this.toggleAdminSection();
            
            return user;
        } catch (error) {
            console.error('Error loading user data:', error);
            this.redirectToLogin();
        }
    }
    
    updateUserUI() {
        // Update user name
        const userNameElements = document.querySelectorAll('#userName, #userFullName');
        userNameElements.forEach(el => {
            el.textContent = this.currentUser.name;
        });
        
        // Update user email
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = this.currentUser.email;
        }
        
        // Update user role
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = this.isAdmin ? 'Administrator' : 'User';
        }
    }
    
    toggleAdminSection() {
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            adminSection.style.display = this.isAdmin ? 'block' : 'none';
        }
    }
    
    setupEventListeners() {
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('show');
                mobileOverlay.classList.toggle('show');
            });
        }
        
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                sidebar.classList.remove('show');
                mobileOverlay.classList.remove('show');
            });
        }
        
        // Sidebar toggle (collapse/expand)
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
        
        // Navigation links
        const navLinks = document.querySelectorAll('.nav-links a[data-page]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.loadPage(page);
                
                // Update active state
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                link.parentElement.classList.add('active');
                
                // Close mobile menu if open
                sidebar.classList.remove('show');
                mobileOverlay.classList.remove('show');
            });
        });
        
        // Notification dropdown
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationPanel = document.getElementById('notificationPanel');
        
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationPanel.classList.toggle('show');
                
                // Close user panel if open
                const userPanel = document.getElementById('userPanel');
                userPanel.classList.remove('show');
            });
        }
        
        // User dropdown
        const userBtn = document.getElementById('userBtn');
        const userPanel = document.getElementById('userPanel');
        
        if (userBtn) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userPanel.classList.toggle('show');
                
                // Close notification panel if open
                notificationPanel.classList.remove('show');
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            notificationPanel.classList.remove('show');
            userPanel.classList.remove('show');
        });
        
        // Prevent dropdowns from closing when clicking inside
        notificationPanel.addEventListener('click', (e) => e.stopPropagation());
        userPanel.addEventListener('click', (e) => e.stopPropagation());
        
        // Mark all as read
        const markAllRead = document.getElementById('markAllRead');
        if (markAllRead) {
            markAllRead.addEventListener('click', () => {
                this.markAllNotificationsAsRead();
            });
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Retry connection
        const retryConnection = document.getElementById('retryConnection');
        if (retryConnection) {
            retryConnection.addEventListener('click', () => {
                this.retryConnection();
            });
        }
        
        // Network status
        window.addEventListener('online', () => this.updateNetworkStatus(true));
        window.addEventListener('offline', () => this.updateNetworkStatus(false));
    }
    
    async loadPage(page) {
        this.currentPage = page;
        
        // Update breadcrumb
        this.updateBreadcrumb(page);
        
        // Show loading
        const contentContainer = document.getElementById('contentContainer');
        contentContainer.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Loading ${page.replace('-', ' ')}...</p>
            </div>
        `;
        
        try {
            // Load page content based on page name
            let content = '';
            
            switch (page) {
                case 'overview':
                    content = await this.loadOverviewPage();
                    break;
                case 'all-users':
                    if (this.isAdmin) {
                        content = await this.loadAllUsersPage();
                    } else {
                        content = this.loadAccessDeniedPage();
                    }
                    break;
                case 'add-user':
                    if (this.isAdmin) {
                        content = await this.loadAddUserPage();
                    } else {
                        content = this.loadAccessDeniedPage();
                    }
                    break;
                case 'active-users':
                    if (this.isAdmin) {
                        content = await this.loadActiveUsersPage();
                    } else {
                        content = this.loadAccessDeniedPage();
                    }
                    break;
                case 'my-subscription':
                    content = await this.loadMySubscriptionPage();
                    break;
                case 'payments':
                    content = await this.loadPaymentsPage();
                    break;
                case 'payment-links':
                    content = await this.loadPaymentLinksPage();
                    break;
                case 'analytics':
                    content = await this.loadAnalyticsPage();
                    break;
                case 'revenue':
                    content = await this.loadRevenuePage();
                    break;
                case 'user-growth':
                    content = await this.loadUserGrowthPage();
                    break;
                case 'expiry-report':
                    content = await this.loadExpiryReportPage();
                    break;
                case 'profile':
                    content = await this.loadProfilePage();
                    break;
                case 'settings':
                    content = await this.loadSettingsPage();
                    break;
                default:
                    content = await this.loadOverviewPage();
            }
            
            // Update content
            contentContainer.innerHTML = content;
            
            // Initialize page-specific JavaScript
            this.initializePageScripts(page);
            
        } catch (error) {
            console.error('Error loading page:', error);
            contentContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Page</h3>
                    <p>${error.message}</p>
                    <button onclick="dashboard.loadPage('${page}')" class="btn-retry">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
        
        // Update last update time
        this.updateLastUpdateTime();
    }
    
    updateBreadcrumb(page) {
        const breadcrumb = document.getElementById('breadcrumb');
        const pageNames = {
            'overview': 'Overview',
            'all-users': 'All Users',
            'add-user': 'Add New User',
            'active-users': 'Active Users',
            'my-subscription': 'My Subscription',
            'payments': 'Payments',
            'payment-links': 'Payment Links',
            'analytics': 'Analytics',
            'revenue': 'Revenue Report',
            'user-growth': 'User Growth',
            'expiry-report': 'Expiry Report',
            'profile': 'Profile Settings',
            'settings': 'Settings'
        };
        
        const pageName = pageNames[page] || 'Dashboard';
        
        if (breadcrumb) {
            breadcrumb.querySelector('ol').innerHTML = `
                <li><a href="#" data-page="overview">Dashboard</a></li>
                <li>${pageName}</li>
            `;
        }
    }
    
    async loadOverviewPage() {
        // Load user-specific or admin-specific overview
        let content = '';
        
        if (this.isAdmin) {
            const stats = await this.getAdminStats();
            content = this.generateAdminOverview(stats);
        } else {
            const subscription = await this.getUserSubscription();
            content = this.generateUserOverview(subscription);
        }
        
        return content;
    }
    
    generateAdminOverview(stats) {
        return `
            <div class="overview-page">
                <div class="page-header">
                    <h2>Welcome back, ${this.currentUser.name}!</h2>
                    <p>Here's what's happening with your business today.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.totalUsers}</h3>
                            <p>Total Users</p>
                        </div>
                        <div class="stat-trend">
                            <i class="fas fa-arrow-up"></i>
                            <span>12%</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.activeUsers}</h3>
                            <p>Active Users</p>
                        </div>
                        <div class="stat-trend">
                            <i class="fas fa-arrow-up"></i>
                            <span>8%</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card warning">
                            <div class="stat-icon warning">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${stats.expiringSoon}</h3>
                                <p>Expiring Soon</p>
                            </div>
                            <div class="stat-trend">
                                <i class="fas fa-exclamation-circle"></i>
                                <span>Need Attention</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon info">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.monthlyRevenue}</h3>
                            <p>Monthly Revenue</p>
                        </div>
                        <div class="stat-trend">
                            <i class="fas fa-arrow-up"></i>
                            <span>15%</span>
                        </div>
                    </div>
                </div>
                
                <div class="content-grid">
                    <div class="chart-container">
                        <div class="chart-header">
                            <h3>Revenue Overview</h3>
                            <select class="chart-period">
                                <option>Last 7 days</option>
                                <option selected>Last 30 days</option>
                                <option>Last 90 days</option>
                            </select>
                        </div>
                        <div class="chart-placeholder">
                            <canvas id="revenueChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="recent-activity">
                        <div class="activity-header">
                            <h3>Recent Activity</h3>
                            <a href="#" data-page="payments">View All</a>
                        </div>
                        <div class="activity-list">
                            ${this.generateRecentActivity()}
                        </div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <h3>Quick Actions</h3>
                    <div class="actions-grid">
                        <button class="action-btn" onclick="dashboard.loadPage('add-user')">
                            <i class="fas fa-user-plus"></i>
                            <span>Add New User</span>
                        </button>
                        <button class="action-btn" onclick="dashboard.loadPage('payment-links')">
                            <i class="fas fa-link"></i>
                            <span>Generate Payment Link</span>
                        </button>
                        <button class="action-btn" onclick="dashboard.generateReport()">
                            <i class="fas fa-file-export"></i>
                            <span>Export Report</span>
                        </button>
                        <button class="action-btn" onclick="dashboard.sendBulkNotifications()">
                            <i class="fas fa-bullhorn"></i>
                            <span>Send Notifications</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateUserOverview(subscription) {
        const daysRemaining = this.calculateDaysRemaining(subscription.expiryDate);
        const statusClass = daysRemaining <= 0 ? 'expired' : daysRemaining <= 3 ? 'warning' : 'success';
        
        return `
            <div class="overview-page">
                <div class="page-header">
                    <h2>Welcome, ${this.currentUser.name}!</h2>
                    <p>Manage your subscription and payments.</p>
                </div>
                
                <div class="subscription-overview">
                    <div class="subscription-card ${statusClass}">
                        <div class="subscription-header">
                            <h3>${subscription.plan} Plan</h3>
                            <span class="subscription-status">${subscription.status}</span>
                        </div>
                        
                        <div class="subscription-details">
                            <div class="detail">
                                <i class="fas fa-calendar"></i>
                                <div>
                                    <small>Started On</small>
                                    <strong>${this.formatDate(subscription.startDate)}</strong>
                                </div>
                            </div>
                            
                            <div class="detail">
                                <i class="fas fa-calendar-times"></i>
                                <div>
                                    <small>Expires On</small>
                                    <strong>${this.formatDate(subscription.expiryDate)}</strong>
                                </div>
                            </div>
                            
                            <div class="detail">
                                <i class="fas fa-clock"></i>
                                <div>
                                    <small>Days Remaining</small>
                                    <strong>${daysRemaining} days</strong>
                                </div>
                            </div>
                            
                            <div class="detail">
                                <i class="fas fa-money-bill-wave"></i>
                                <div>
                                    <small>Amount</small>
                                    <strong>${subscription.price} ${subscription.currency}</strong>
                                </div>
                            </div>
                        </div>
                        
                        ${daysRemaining <= 0 ? `
                            <div class="expiry-alert expired">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Your subscription has expired!</span>
                                <button class="btn-renew" onclick="dashboard.renewSubscription()">
                                    Renew Now
                                </button>
                            </div>
                        ` : daysRemaining <= 3 ? `
                            <div class="expiry-alert warning">
                                <i class="fas fa-exclamation-circle"></i>
                                <span>Your subscription expires in ${daysRemaining} days</span>
                                <button class="btn-renew" onclick="dashboard.renewSubscription()">
                                    Renew Early
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="quick-links">
                        <div class="link-card">
                            <i class="fas fa-credit-card"></i>
                            <h4>Make Payment</h4>
                            <p>Pay your subscription fee</p>
                            <button class="btn-payment" onclick="dashboard.makePayment()">
                                Pay Now
                            </button>
                        </div>
                        
                        <div class="link-card">
                            <i class="fas fa-history"></i>
                            <h4>Payment History</h4>
                            <p>View your payment records</p>
                            <button class="btn-history" onclick="dashboard.loadPage('payments')">
                                View History
                            </button>
                        </div>
                        
                        <div class="link-card">
                            <i class="fas fa-download"></i>
                            <h4>Download Invoice</h4>
                            <p>Get your payment receipts</p>
                            <button class="btn-invoice" onclick="dashboard.downloadInvoice()">
                                Download
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="recent-payments">
                    <h3>Recent Payments</h3>
                    <div class="payments-table">
                        ${this.generateRecentPayments()}
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadAllUsersPage() {
        const users = await window.database.getAllUsers();
        
        return `
            <div class="users-page">
                <div class="page-header">
                    <h2>All Users</h2>
                    <div class="page-actions">
                        <button class="btn-primary" onclick="dashboard.loadPage('add-user')">
                            <i class="fas fa-user-plus"></i> Add User
                        </button>
                        <button class="btn-secondary" onclick="dashboard.exportUsers()">
                            <i class="fas fa-file-export"></i> Export
                        </button>
                    </div>
                </div>
                
                <div class="search-filter">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="userSearch" placeholder="Search users...">
                    </div>
                    <div class="filter-options">
                        <select id="filterStatus">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="pending">Pending</option>
                        </select>
                        <select id="filterPlan">
                            <option value="">All Plans</option>
                            <option value="basic">Basic</option>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                        </select>
                    </div>
                </div>
                
                <div class="table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox" id="selectAll">
                                </th>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Plan</th>
                                <th>Amount</th>
                                <th>Expiry Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td><input type="checkbox" class="user-checkbox" value="${user.id}"></td>
                                    <td>${user.id}</td>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar-small">
                                                ${user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <strong>${user.name}</strong>
                                                <small>${user.email}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${user.phone}</td>
                                    <td>
                                        <span class="plan-badge ${user.subscription.plan}">
                                            ${user.subscription.plan}
                                        </span>
                                    </td>
                                    <td>${user.subscription.price} ${user.subscription.currency}</td>
                                    <td>
                                        ${this.formatDate(user.subscription.expiryDate)}
                                        <br>
                                        <small class="text-muted">
                                            ${this.calculateDaysRemaining(user.subscription.expiryDate)} days left
                                        </small>
                                    </td>
                                    <td>
                                        <span class="status-badge ${user.subscription.status}">
                                            ${user.subscription.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="btn-icon" onclick="dashboard.viewUser('${user.id}')" title="View">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn-icon" onclick="dashboard.editUser('${user.id}')" title="Edit">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn-icon" onclick="dashboard.deleteUser('${user.id}')" title="Delete">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="table-footer">
                    <div class="selected-count">
                        <span id="selectedCount">0</span> users selected
                    </div>
                    <div class="bulk-actions">
                        <button class="btn-bulk" onclick="dashboard.sendBulkEmail()">
                            <i class="fas fa-envelope"></i> Send Email
                        </button>
                        <button class="btn-bulk" onclick="dashboard.updateBulkStatus()">
                            <i class="fas fa-sync-alt"></i> Update Status
                        </button>
                        <button class="btn-bulk btn-danger" onclick="dashboard.deleteBulkUsers()">
                            <i class="fas fa-trash"></i> Delete Selected
                        </button>
                    </div>
                    <div class="pagination">
                        <button class="page-btn" disabled><i class="fas fa-chevron-left"></i></button>
                        <span class="page-info">Page 1 of 1</span>
                        <button class="page-btn" disabled><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadAddUserPage() {
        return `
            <div class="add-user-page">
                <div class="page-header">
                    <h2>Add New User</h2>
                    <p>Create a new user account</p>
                </div>
                
                <form id="addUserForm" class="user-form">
                    <div class="form-grid">
                        <div class="form-section">
                            <h3><i class="fas fa-user"></i> Personal Information</h3>
                            
                            <div class="form-group">
                                <label for="newUserName">
                                    <i class="fas fa-user"></i> Full Name *
                                </label>
                                <input type="text" id="newUserName" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="newUserEmail">
                                    <i class="fas fa-envelope"></i> Email Address *
                                </label>
                                <input type="email" id="newUserEmail" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="newUserPhone">
                                    <i class="fas fa-phone"></i> Phone Number *
                                </label>
                                <input type="tel" id="newUserPhone" pattern="^\+8801[0-9]{9}$" required>
                                <small class="hint">Format: +8801XXXXXXXXX</small>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="fas fa-credit-card"></i> Subscription Details</h3>
                            
                            <div class="form-group">
                                <label for="subscriptionPlan">
                                    <i class="fas fa-cube"></i> Subscription Plan *
                                </label>
                                <select id="subscriptionPlan" required>
                                    <option value="">Select Plan</option>
                                    <option value="basic">Basic - 300 BDT/month</option>
                                    <option value="standard">Standard - 500 BDT/month</option>
                                    <option value="premium">Premium - 800 BDT/month</option>
                                    <option value="custom">Custom Plan</option>
                                </select>
                            </div>
                            
                            <div class="form-group custom-price" id="customPriceGroup" style="display: none;">
                                <label for="customPrice">
                                    <i class="fas fa-money-bill-wave"></i> Custom Price *
                                </label>
                                <input type="number" id="customPrice" min="100" step="50">
                            </div>
                            
                            <div class="form-group">
                                <label for="subscriptionDuration">
                                    <i class="fas fa-calendar"></i> Subscription Duration *
                                </label>
                                <select id="subscriptionDuration" required>
                                    <option value="30">1 Month</option>
                                    <option value="90">3 Months</option>
                                    <option value="180">6 Months</option>
                                    <option value="365">1 Year</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="startDate">
                                    <i class="fas fa-calendar-alt"></i> Start Date *
                                </label>
                                <input type="date" id="startDate" required value="${this.getTodayDate()}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="fas fa-lock"></i> Account Security</h3>
                        
                        <div class="form-group">
                            <label for="userPassword">
                                <i class="fas fa-key"></i> Password *
                            </label>
                            <div class="password-input">
                                <input type="password" id="userPassword" required minlength="6">
                                <button type="button" class="toggle-password">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <small class="hint">Minimum 6 characters</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmPassword">
                                <i class="fas fa-key"></i> Confirm Password *
                            </label>
                            <input type="password" id="confirmPassword" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" id="sendWelcomeEmail">
                                <span>Send welcome email with login details</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" id="generatePaymentLink">
                                <span>Generate payment link for user</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="dashboard.loadPage('all-users')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn-secondary" onclick="dashboard.resetUserForm()">
                            <i class="fas fa-redo"></i> Reset
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Create User
                        </button>
                    </div>
                </form>
                
                <div class="preview-section">
                    <h3><i class="fas fa-eye"></i> Preview</h3>
                    <div class="user-preview" id="userPreview">
                        <p>User details will appear here...</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Other page loading methods would continue here...
    // loadActiveUsersPage(), loadMySubscriptionPage(), loadPaymentsPage(), etc.
    
    initializePageScripts(page) {
        switch (page) {
            case 'overview':
                this.initOverviewScripts();
                break;
            case 'all-users':
                this.initAllUsersScripts();
                break;
            case 'add-user':
                this.initAddUserScripts();
                break;
            // Initialize scripts for other pages
        }
    }
    
    initOverviewScripts() {
        if (this.isAdmin) {
            this.initAdminOverviewCharts();
        } else {
            this.initUserOverviewScripts();
        }
    }
    
    initAllUsersScripts() {
        // Initialize search functionality
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsersTable(e.target.value);
            });
        }
        
        // Initialize status filter
        const statusFilter = document.getElementById('filterStatus');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterUsersTable();
            });
        }
        
        // Initialize plan filter
        const planFilter = document.getElementById('filterPlan');
        if (planFilter) {
            planFilter.addEventListener('change', (e) => {
                this.filterUsersTable();
            });
        }
        
        // Initialize select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.toggleSelectAllUsers(e.target.checked);
            });
        }
    }
    
    initAddUserScripts() {
        // Show/hide custom price field
        const planSelect = document.getElementById('subscriptionPlan');
        if (planSelect) {
            planSelect.addEventListener('change', (e) => {
                const customPriceGroup = document.getElementById('customPriceGroup');
                if (e.target.value === 'custom') {
                    customPriceGroup.style.display = 'block';
                } else {
                    customPriceGroup.style.display = 'none';
                }
                this.updateUserPreview();
            });
        }
        
        // Update preview on input
        const formInputs = document.querySelectorAll('#addUserForm input, #addUserForm select');
        formInputs.forEach(input => {
            input.addEventListener('input', () => this.updateUserPreview());
            input.addEventListener('change', () => this.updateUserPreview());
        });
        
        // Form submission
        const form = document.getElementById('addUserForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitUserForm();
            });
        }
    }
    
    async loadNotifications() {
        try {
            this.notifications = await window.database.getNotifications(this.currentUser.id);
            this.renderNotifications();
            this.updateNotificationCount();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    renderNotifications() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;
        
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        notificationList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 onclick="dashboard.viewNotification('${notification.id}')">
                <div class="notification-icon ${notification.type}">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.timeAgo(notification.timestamp)}</div>
                </div>
            </div>
        `).join('');
        
        if (this.notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
        }
    }
    
    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const notificationCount = document.getElementById('notificationCount');
        if (notificationCount) {
            notificationCount.textContent = unreadCount;
            notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }
    
    async markAllNotificationsAsRead() {
        try {
            await window.database.markAllNotificationsAsRead(this.currentUser.id);
            this.notifications.forEach(n => n.read = true);
            this.renderNotifications();
            this.updateNotificationCount();
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }
    
    updateSidebarStats() {
        // Update expiry days
        const expiryDays = this.calculateDaysRemaining(this.currentUser.subscription.expiryDate);
        const sidebarExpiryDays = document.getElementById('sidebarExpiryDays');
        if (sidebarExpiryDays) {
            sidebarExpiryDays.textContent = `${expiryDays} days`;
        }
        
        // Update next payment date
        const sidebarNextPayment = document.getElementById('sidebarNextPayment');
        if (sidebarNextPayment) {
            sidebarNextPayment.textContent = this.formatDate(this.currentUser.subscription.expiryDate);
        }
        
        // Update user counts for admin
        if (this.isAdmin) {
            this.updateAdminSidebarStats();
        }
    }
    
    async updateAdminSidebarStats() {
        try {
            const stats = await this.getAdminStats();
            
            const totalUsersCount = document.getElementById('totalUsersCount');
            if (totalUsersCount) {
                totalUsersCount.textContent = stats.totalUsers;
            }
            
            const activeUsersCount = document.getElementById('activeUsersCount');
            if (activeUsersCount) {
                activeUsersCount.textContent = stats.activeUsers;
            }
        } catch (error) {
            console.error('Error updating admin sidebar stats:', error);
        }
    }
    
    updateLastUpdateTime() {
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) {
            lastUpdate.innerHTML = `<i class="fas fa-sync-alt"></i> Updated ${this.timeAgo(new Date().toISOString())}`;
        }
    }
    
    checkOfflineStatus() {
        const isOnline = navigator.onLine;
        this.updateNetworkStatus(isOnline);
    }
    
    updateNetworkStatus(isOnline) {
        const networkIndicator = document.getElementById('networkIndicator');
        const offlineWarning = document.getElementById('offlineWarning');
        
        if (networkIndicator) {
            networkIndicator.className = isOnline ? 'network-indicator' : 'network-indicator offline';
            networkIndicator.innerHTML = `
                <i class="fas fa-${isOnline ? 'wifi' : 'wifi-slash'}"></i>
                <span>${isOnline ? 'Online' : 'Offline'}</span>
            `;
        }
        
        if (offlineWarning) {
            offlineWarning.style.display = isOnline ? 'none' : 'flex';
        }
        
        // Notify expiry worker
        if (window.offlineManager && window.offlineManager.expiryWorker) {
            window.offlineManager.expiryWorker.postMessage({
                action: 'NETWORK_STATUS',
                data: { isOnline }
            });
        }
    }
    
    async retryConnection() {
        const isOnline = navigator.onLine;
        if (isOnline) {
            this.updateNetworkStatus(true);
            
            // Try to sync data
            try {
                await this.syncData();
                this.showToast('Data synced successfully!', 'success');
            } catch (error) {
                this.showToast('Failed to sync data', 'error');
            }
        } else {
            this.showToast('Still offline. Please check your connection.', 'warning');
        }
    }
    
    startExpiryTracking() {
        if (window.offlineManager) {
            window.offlineManager.startExpiryTracking(this.currentUser);
        }
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }
    
    async logout() {
        try {
            // Clear session
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('currentUserId');
            
            // Stop expiry tracking
            if (window.offlineManager && window.offlineManager.expiryWorker) {
                window.offlineManager.expiryWorker.postMessage({
                    action: 'STOP_TRACKING'
                });
            }
            
            // Redirect to login
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error during logout:', error);
            window.location.href = 'login.html';
        }
    }
    
    redirectToLogin() {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUserId');
        window.location.href = 'login.html';
    }
    
    // Utility methods
    calculateDaysRemaining(expiryDate) {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }
    
    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + " year" + (interval === 1 ? "" : "s") + " ago";
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + " month" + (interval === 1 ? "" : "s") + " ago";
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + " day" + (interval === 1 ? "" : "s") + " ago";
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + " hour" + (interval === 1 ? "" : "s") + " ago";
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + " minute" + (interval === 1 ? "" : "s") + " ago";
        
        return "just now";
    }
    
    getNotificationIcon(type) {
        const icons = {
            'payment': 'money-bill-wave',
            'expiry': 'clock',
            'system': 'cog',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'danger': 'exclamation-circle'
        };
        return icons[type] || 'bell';
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
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
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        });
    }
    
    // Additional methods for specific functionality would continue here...
}

// Initialize dashboard when page loads
function initializeDashboard() {
    window.dashboard = new Dashboard();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}