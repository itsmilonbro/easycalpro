class AdminFunctions {
    constructor() {
        this.selectedUsers = new Set();
        this.init();
    }
    
    init() {
        this.loadAdminStats();
        this.setupEventListeners();
    }
    
    async loadAdminStats() {
        try {
            const stats = await window.database.getAdminStats();
            this.updateStatsUI(stats);
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }
    
    updateStatsUI(stats) {
        // Update counters in UI
        const elements = {
            'totalUsersCount': stats.totalUsers,
            'activeUsersCount': stats.activeUsers
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    setupEventListeners() {
        // User search and filter
        this.setupUserFilters();
        
        // Bulk actions
        this.setupBulkActions();
        
        // User actions
        this.setupUserActions();
    }
    
    setupUserFilters() {
        // Search functionality
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers();
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('filterStatus');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterUsers();
            });
        }
        
        // Plan filter
        const planFilter = document.getElementById('filterPlan');
        if (planFilter) {
            planFilter.addEventListener('change', () => {
                this.filterUsers();
            });
        }
        
        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }
    }
    
    async filterUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        const planFilter = document.getElementById('filterPlan')?.value || '';
        
        try {
            const allUsers = await window.database.getAllUsers();
            
            const filteredUsers = allUsers.filter(user => {
                // Search filter
                const matchesSearch = 
                    user.name.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.phone.includes(searchTerm) ||
                    user.id.toLowerCase().includes(searchTerm);
                
                // Status filter
                const matchesStatus = !statusFilter || user.subscription.status === statusFilter;
                
                // Plan filter
                const matchesPlan = !planFilter || user.subscription.plan === planFilter;
                
                return matchesSearch && matchesStatus && matchesPlan;
            });
            
            this.renderFilteredUsers(filteredUsers);
            
        } catch (error) {
            console.error('Error filtering users:', error);
        }
    }
    
    renderFilteredUsers(users) {
        const tableBody = document.querySelector('.users-table tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td><input type="checkbox" class="user-checkbox" value="${user.id}" 
                    ${this.selectedUsers.has(user.id) ? 'checked' : ''}></td>
                <td>${user.id}</td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-small">
                            ${user.name.charAt(0).toUpperCase()}
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
                        <button class="btn-icon" onclick="admin.viewUser('${user.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="admin.editUser('${user.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="admin.deleteUser('${user.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Update checkbox event listeners
        this.setupCheckboxListeners();
        
        // Update selected count
        this.updateSelectedCount();
    }
    
    setupCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const userId = e.target.value;
                if (e.target.checked) {
                    this.selectedUsers.add(userId);
                } else {
                    this.selectedUsers.delete(userId);
                    
                    // Uncheck select all if any checkbox is unchecked
                    const selectAll = document.getElementById('selectAll');
                    if (selectAll) {
                        selectAll.checked = false;
                    }
                }
                this.updateSelectedCount();
            });
        });
    }
    
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const userId = checkbox.value;
            
            if (checked) {
                this.selectedUsers.add(userId);
            } else {
                this.selectedUsers.delete(userId);
            }
        });
        
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            selectedCount.textContent = this.selectedUsers.size;
        }
    }
    
    setupBulkActions() {
        // Bulk email
        const sendBulkEmailBtn = document.querySelector('[onclick*="sendBulkEmail"]');
        if (sendBulkEmailBtn) {
            sendBulkEmailBtn.addEventListener('click', () => this.sendBulkEmail());
        }
        
        // Bulk status update
        const updateBulkStatusBtn = document.querySelector('[onclick*="updateBulkStatus"]');
        if (updateBulkStatusBtn) {
            updateBulkStatusBtn.addEventListener('click', () => this.updateBulkStatus());
        }
        
        // Bulk delete
        const deleteBulkUsersBtn = document.querySelector('[onclick*="deleteBulkUsers"]');
        if (deleteBulkUsersBtn) {
            deleteBulkUsersBtn.addEventListener('click', () => this.deleteBulkUsers());
        }
    }
    
    async sendBulkEmail() {
        if (this.selectedUsers.size === 0) {
            this.showToast('Please select users first', 'warning');
            return;
        }
        
        const modal = this.createBulkEmailModal();
        document.body.appendChild(modal);
    }
    
    createBulkEmailModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-envelope"></i> Send Bulk Email</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Sending email to ${this.selectedUsers.size} selected users</p>
                    
                    <div class="form-group">
                        <label for="emailSubject">Subject</label>
                        <input type="text" id="emailSubject" placeholder="Enter email subject" value="Important Update from EasyCal">
                    </div>
                    
                    <div class="form-group">
                        <label for="emailTemplate">Email Template</label>
                        <select id="emailTemplate">
                            <option value="">Custom Message</option>
                            <option value="subscription_reminder">Subscription Reminder</option>
                            <option value="payment_due">Payment Due Notice</option>
                            <option value="welcome">Welcome Email</option>
                            <option value="system_update">System Update</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="emailMessage">Message</label>
                        <textarea id="emailMessage" rows="6" placeholder="Enter your message..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox">
                            <input type="checkbox" id="includePaymentLink" checked>
                            <span>Include payment link for users with due payments</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" id="sendCopyToAdmin">
                            <span>Send a copy to admin</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelBulkEmail">Cancel</button>
                    <button class="btn-primary" id="sendBulkEmailConfirm">
                        <i class="fas fa-paper-plane"></i> Send Emails
                    </button>
                </div>
            </div>
        `;
        
        // Template selection
        const templateSelect = modal.querySelector('#emailTemplate');
        const messageTextarea = modal.querySelector('#emailMessage');
        
        const templates = {
            'subscription_reminder': 'Dear {name},\n\nYour subscription for {plan} plan is expiring on {expiryDate}. Please renew to continue uninterrupted service.\n\nBest regards,\nEasyCal Team',
            'payment_due': 'Dear {name},\n\nPayment for your {plan} plan is due. Amount: {amount} {currency}\n\nPlease complete payment using this link: {paymentLink}\n\nBest regards,\nEasyCal Team',
            'welcome': 'Dear {name},\n\nWelcome to EasyCal! Your account has been activated with {plan} plan.\n\nLogin: {phone}\nPassword: {password}\n\nBest regards,\nEasyCal Team',
            'system_update': 'Dear {name},\n\nImportant system update: {message}\n\nBest regards,\nEasyCal Team'
        };
        
        templateSelect.addEventListener('change', (e) => {
            if (templates[e.target.value]) {
                messageTextarea.value = templates[e.target.value];
            }
        });
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#cancelBulkEmail').addEventListener('click', () => {
            modal.remove();
        });
        
        // Send emails
        modal.querySelector('#sendBulkEmailConfirm').addEventListener('click', async () => {
            const subject = modal.querySelector('#emailSubject').value;
            const message = modal.querySelector('#emailMessage').value;
            
            if (!subject || !message) {
                this.showToast('Please fill in all fields', 'warning');
                return;
            }
            
            const sendBtn = modal.querySelector('#sendBulkEmailConfirm');
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            sendBtn.disabled = true;
            
            try {
                // Simulate sending emails
                await this.sendBulkEmailsToUsers(subject, message);
                modal.remove();
                this.showToast(`Emails sent to ${this.selectedUsers.size} users`, 'success');
            } catch (error) {
                this.showToast('Failed to send emails', 'error');
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Emails';
                sendBtn.disabled = false;
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
    
    async sendBulkEmailsToUsers(subject, message) {
        // In a real app, this would connect to an email service
        // For demo, we'll simulate with a timeout
        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`Sending bulk email: "${subject}" to ${this.selectedUsers.size} users`);
                resolve();
            }, 2000);
        });
    }
    
    async updateBulkStatus() {
        if (this.selectedUsers.size === 0) {
            this.showToast('Please select users first', 'warning');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-sync-alt"></i> Update User Status</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Update status for ${this.selectedUsers.size} selected users</p>
                    
                    <div class="form-group">
                        <label for="newStatus">New Status</label>
                        <select id="newStatus">
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="suspended">Suspended</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="statusReason">Reason (Optional)</label>
                        <input type="text" id="statusReason" placeholder="Enter reason for status change">
                    </div>
                    
                    <div class="form-group">
                        <label for="sendNotification">Send Notification</label>
                        <select id="sendNotification">
                            <option value="none">Don't Send</option>
                            <option value="email">Email Only</option>
                            <option value="sms">SMS Only</option>
                            <option value="both" selected>Email & SMS</option>
                        </select>
                    </div>
                    
                    <div class="warning-box">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>This action will affect ${this.selectedUsers.size} users. Are you sure?</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelStatusUpdate">Cancel</button>
                    <button class="btn-primary" id="confirmStatusUpdate">Update Status</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#cancelStatusUpdate').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#confirmStatusUpdate').addEventListener('click', async () => {
            const newStatus = modal.querySelector('#newStatus').value;
            const reason = modal.querySelector('#statusReason').value;
            const sendNotification = modal.querySelector('#sendNotification').value;
            
            const confirmBtn = modal.querySelector('#confirmStatusUpdate');
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            confirmBtn.disabled = true;
            
            try {
                await this.updateUsersStatus(newStatus, reason, sendNotification);
                modal.remove();
                this.showToast(`Status updated for ${this.selectedUsers.size} users`, 'success');
                this.filterUsers(); // Refresh the list
            } catch (error) {
                this.showToast('Failed to update status', 'error');
                confirmBtn.innerHTML = 'Update Status';
                confirmBtn.disabled = false;
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async updateUsersStatus(newStatus, reason, sendNotification) {
        // Update each selected user
        for (const userId of this.selectedUsers) {
            try {
                const user = await window.database.getUser(userId);
                if (user) {
                    await window.database.updateUser(userId, {
                        subscription: {
                            ...user.subscription,
                            status: newStatus
                        }
                    });
                    
                    // Add notification
                    await window.database.addNotification({
                        userId: userId,
                        title: 'Account Status Updated',
                        message: `Your account status has been changed to ${newStatus}. ${reason ? `Reason: ${reason}` : ''}`,
                        type: 'system'
                    });
                    
                    // Simulate sending notification
                    if (sendNotification !== 'none') {
                        console.log(`Notifying user ${userId} about status change to ${newStatus}`);
                    }
                }
            } catch (error) {
                console.error(`Failed to update user ${userId}:`, error);
            }
        }
    }
    
    async deleteBulkUsers() {
        if (this.selectedUsers.size === 0) {
            this.showToast('Please select users first', 'warning');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-trash"></i> Delete Users</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="danger-box">
                        <i class="fas fa-exclamation-circle"></i>
                        <h4>Warning: This action cannot be undone!</h4>
                        <p>You are about to delete ${this.selectedUsers.size} users. This will permanently remove:</p>
                        <ul>
                            <li>User accounts</li>
                            <li>Subscription information</li>
                            <li>Payment history</li>
                            <li>All associated data</li>
                        </ul>
                        <p><strong>Are you absolutely sure?</strong></p>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmDelete">Type "DELETE" to confirm</label>
                        <input type="text" id="confirmDelete" placeholder="Type DELETE here">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelDelete">Cancel</button>
                    <button class="btn-danger" id="confirmDeleteBtn" disabled>
                        <i class="fas fa-trash"></i> Delete Users
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const confirmInput = modal.querySelector('#confirmDelete');
        const confirmBtn = modal.querySelector('#confirmDeleteBtn');
        
        confirmInput.addEventListener('input', (e) => {
            confirmBtn.disabled = e.target.value.toUpperCase() !== 'DELETE';
        });
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#cancelDelete').addEventListener('click', () => {
            modal.remove();
        });
        
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            confirmBtn.disabled = true;
            
            try {
                await this.deleteSelectedUsers();
                modal.remove();
                this.showToast(`${this.selectedUsers.size} users deleted successfully`, 'success');
                this.selectedUsers.clear();
                this.filterUsers(); // Refresh the list
            } catch (error) {
                this.showToast('Failed to delete users', 'error');
                confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Users';
                confirmBtn.disabled = false;
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async deleteSelectedUsers() {
        // Delete each selected user
        for (const userId of this.selectedUsers) {
            try {
                await window.database.deleteUser(userId);
            } catch (error) {
                console.error(`Failed to delete user ${userId}:`, error);
                throw error;
            }
        }
    }
    
    setupUserActions() {
        // These will be called from inline onclick handlers in the HTML
    }
    
    async viewUser(userId) {
        try {
            const user = await window.database.getUser(userId);
            if (!user) {
                this.showToast('User not found', 'error');
                return;
            }
            
            this.showUserModal(user, 'view');
        } catch (error) {
            console.error('Error viewing user:', error);
            this.showToast('Failed to load user details', 'error');
        }
    }
    
    async editUser(userId) {
        try {
            const user = await window.database.getUser(userId);
            if (!user) {
                this.showToast('User not found', 'error');
                return;
            }
            
            this.showUserModal(user, 'edit');
        } catch (error) {
            console.error('Error editing user:', error);
            this.showToast('Failed to load user details', 'error');
        }
    }
    
    async deleteUser(userId) {
        try {
            const user = await window.database.getUser(userId);
            if (!user) {
                this.showToast('User not found', 'error');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-trash"></i> Delete User</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="user-delete-preview">
                            <div class="user-avatar-large">
                                ${user.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="user-details">
                                <h4>${user.name}</h4>
                                <p>${user.email}</p>
                                <p>${user.phone}</p>
                                <p class="user-plan">${user.subscription.plan} Plan • ${user.subscription.status}</p>
                            </div>
                        </div>
                        
                        <div class="warning-box">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                        </div>
                        
                        <div class="form-group">
                            <label for="deleteReason">Reason for deletion (optional)</label>
                            <input type="text" id="deleteReason" placeholder="Enter reason">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelSingleDelete">Cancel</button>
                        <button class="btn-danger" id="confirmSingleDelete">
                            <i class="fas fa-trash"></i> Delete User
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.querySelector('#cancelSingleDelete').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.querySelector('#confirmSingleDelete').addEventListener('click', async () => {
                const deleteBtn = modal.querySelector('#confirmSingleDelete');
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                deleteBtn.disabled = true;
                
                try {
                    await window.database.deleteUser(userId);
                    modal.remove();
                    this.showToast('User deleted successfully', 'success');
                    this.filterUsers(); // Refresh the list
                } catch (error) {
                    this.showToast('Failed to delete user', 'error');
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete User';
                    deleteBtn.disabled = false;
                }
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
        } catch (error) {
            console.error('Error in delete user:', error);
            this.showToast('Error loading user details', 'error');
        }
    }
    
    showUserModal(user, mode = 'view') {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-${mode === 'view' ? 'eye' : 'edit'}"></i>
                        ${mode === 'view' ? 'View User' : 'Edit User'}
                    </h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="user-modal-tabs">
                        <button class="tab-btn active" data-tab="details">Details</button>
                        <button class="tab-btn" data-tab="subscription">Subscription</button>
                        <button class="tab-btn" data-tab="payments">Payments</button>
                        <button class="tab-btn" data-tab="activity">Activity</button>
                    </div>
                    
                    <div class="tab-content active" id="detailsTab">
                        ${this.getUserDetailsTab(user, mode)}
                    </div>
                    
                    <div class="tab-content" id="subscriptionTab">
                        ${this.getUserSubscriptionTab(user, mode)}
                    </div>
                    
                    <div class="tab-content" id="paymentsTab">
                        ${this.getUserPaymentsTab(user)}
                    </div>
                    
                    <div class="tab-content" id="activityTab">
                        ${this.getUserActivityTab(user)}
                    </div>
                </div>
                <div class="modal-footer">
                    ${mode === 'edit' ? `
                        <button class="btn-secondary" id="cancelEdit">Cancel</button>
                        <button class="btn-primary" id="saveChanges">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    ` : `
                        <button class="btn-secondary" id="closeView">Close</button>
                        <button class="btn-primary" onclick="admin.editUser('${user.id}')">
                            <i class="fas fa-edit"></i> Edit User
                        </button>
                    `}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Tab switching
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabContents = modal.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                
                // Update active tab
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show corresponding content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabName}Tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        const closeBtn = modal.querySelector('#closeView') || modal.querySelector('#cancelEdit');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        // Save changes
        const saveBtn = modal.querySelector('#saveChanges');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.saveUserChanges(user.id, modal);
            });
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    getUserDetailsTab(user, mode) {
        const isEditable = mode === 'edit';
        
        return `
            <div class="user-details-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label>User ID</label>
                        <input type="text" value="${user.id}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label>Full Name ${isEditable ? '*' : ''}</label>
                        <input type="text" id="editUserName" value="${user.name}" 
                            ${!isEditable ? 'readonly' : ''}>
                    </div>
                    
                    <div class="form-group">
                        <label>Email ${isEditable ? '*' : ''}</label>
                        <input type="email" id="editUserEmail" value="${user.email}" 
                            ${!isEditable ? 'readonly' : ''}>
                    </div>
                    
                    <div class="form-group">
                        <label>Phone ${isEditable ? '*' : ''}</label>
                        <input type="tel" id="editUserPhone" value="${user.phone}" 
                            pattern="^\+8801[0-9]{9}$" ${!isEditable ? 'readonly' : ''}>
                    </div>
                    
                    <div class="form-group">
                        <label>Role</label>
                        <select id="editUserRole" ${!isEditable ? 'disabled' : ''}>
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Account Status</label>
                        <select id="editAccountStatus" ${!isEditable ? 'disabled' : ''}>
                            <option value="active" ${user.accountStatus === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${user.accountStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="suspended" ${user.accountStatus === 'suspended' ? 'selected' : ''}>Suspended</option>
                        </select>
                    </div>
                </div>
                
                ${isEditable ? `
                    <div class="form-section">
                        <h4>Change Password</h4>
                        <div class="form-group">
                            <label for="editPassword">New Password</label>
                            <input type="password" id="editPassword" placeholder="Leave blank to keep current">
                        </div>
                        <div class="form-group">
                            <label for="editConfirmPassword">Confirm New Password</label>
                            <input type="password" id="editConfirmPassword">
                        </div>
                    </div>
                ` : ''}
                
                <div class="info-box">
                    <p><strong>Created:</strong> ${this.formatDate(user.createdAt)}</p>
                    <p><strong>Last Updated:</strong> ${this.formatDate(user.updatedAt)}</p>
                    <p><strong>Last Login:</strong> ${user.lastLogin ? this.formatDate(user.lastLogin) : 'Never'}</p>
                </div>
            </div>
        `;
    }
    
    getUserSubscriptionTab(user, mode) {
        const isEditable = mode === 'edit';
        const daysRemaining = this.calculateDaysRemaining(user.subscription.expiryDate);
        
        return `
            <div class="subscription-details-form">
                <div class="subscription-overview">
                    <div class="subscription-header">
                        <h4>Current Subscription</h4>
                        <span class="subscription-status ${user.subscription.status}">
                            ${user.subscription.status}
                        </span>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Plan</label>
                            <select id="editSubscriptionPlan" ${!isEditable ? 'disabled' : ''}>
                                <option value="basic" ${user.subscription.plan === 'basic' ? 'selected' : ''}>Basic</option>
                                <option value="standard" ${user.subscription.plan === 'standard' ? 'selected' : ''}>Standard</option>
                                <option value="premium" ${user.subscription.plan === 'premium' ? 'selected' : ''}>Premium</option>
                                <option value="custom" ${user.subscription.plan === 'custom' ? 'selected' : ''}>Custom</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Price (${user.subscription.currency})</label>
                            <input type="number" id="editSubscriptionPrice" 
                                value="${user.subscription.price}" 
                                ${!isEditable ? 'readonly' : ''}>
                        </div>
                        
                        <div class="form-group">
                            <label>Status</label>
                            <select id="editSubscriptionStatus" ${!isEditable ? 'disabled' : ''}>
                                <option value="active" ${user.subscription.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="expired" ${user.subscription.status === 'expired' ? 'selected' : ''}>Expired</option>
                                <option value="cancelled" ${user.subscription.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                <option value="pending" ${user.subscription.status === 'pending' ? 'selected' : ''}>Pending</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" id="editSubscriptionStart" 
                                value="${user.subscription.startDate.split('T')[0]}" 
                                ${!isEditable ? 'readonly' : ''}>
                        </div>
                        
                        <div class="form-group">
                            <label>Expiry Date</label>
                            <input type="date" id="editSubscriptionExpiry" 
                                value="${user.subscription.expiryDate.split('T')[0]}" 
                                ${!isEditable ? 'readonly' : ''}>
                        </div>
                        
                        <div class="form-group">
                            <label>Auto Renew</label>
                            <select id="editAutoRenew" ${!isEditable ? 'disabled' : ''}>
                                <option value="true" ${user.subscription.autoRenew ? 'selected' : ''}>Yes</option>
                                <option value="false" ${!user.subscription.autoRenew ? 'selected' : ''}>No</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="subscription-stats">
                        <div class="stat">
                            <label>Days Remaining</label>
                            <div class="value ${daysRemaining <= 0 ? 'expired' : daysRemaining <= 7 ? 'warning' : 'success'}">
                                ${daysRemaining}
                            </div>
                        </div>
                        <div class="stat">
                            <label>Next Payment</label>
                            <div class="value">${this.formatDate(user.subscription.expiryDate)}</div>
                        </div>
                        <div class="stat">
                            <label>Total Paid</label>
                            <div class="value">${this.calculateTotalPaid(user.id)} ${user.subscription.currency}</div>
                        </div>
                    </div>
                    
                    ${isEditable ? `
                        <div class="action-buttons">
                            <button type="button" class="btn-secondary" id="extendSubscription">
                                <i class="fas fa-calendar-plus"></i> Extend Subscription
                            </button>
                            <button type="button" class="btn-warning" id="sendReminder">
                                <i class="fas fa-bell"></i> Send Reminder
                            </button>
                            <button type="button" class="btn-primary" id="generatePaymentLink">
                                <i class="fas fa-link"></i> Generate Payment Link
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    getUserPaymentsTab(user) {
        return `
            <div class="payments-history">
                <div class="table-header">
                    <h4>Payment History</h4>
                    <button class="btn-secondary btn-sm">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                
                <div class="payments-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th>Transaction ID</th>
                                <th>Invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generatePaymentsRows(user.id)}
                        </tbody>
                    </table>
                </div>
                
                <div class="payment-summary">
                    <div class="summary-item">
                        <span>Total Paid:</span>
                        <strong>${this.calculateTotalPaid(user.id)} ${user.subscription.currency}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Last Payment:</span>
                        <strong>${this.getLastPaymentDate(user.id)}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Pending Amount:</span>
                        <strong>${user.subscription.price} ${user.subscription.currency}</strong>
                    </div>
                </div>
            </div>
        `;
    }
    
    getUserActivityTab(user) {
        return `
            <div class="user-activity">
                <div class="activity-filters">
                    <select class="filter-select">
                        <option>All Activities</option>
                        <option>Logins</option>
                        <option>Payments</option>
                        <option>Profile Updates</option>
                    </select>
                    <input type="date" class="date-filter">
                    <input type="date" class="date-filter">
                </div>
                
                <div class="activity-list">
                    ${this.generateActivityLog(user.id)}
                </div>
            </div>
        `;
    }
    
    async saveUserChanges(userId, modal) {
        const saveBtn = modal.querySelector('#saveChanges');
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            // Collect updated data
            const updates = {
                name: modal.querySelector('#editUserName').value,
                email: modal.querySelector('#editUserEmail').value,
                phone: modal.querySelector('#editUserPhone').value,
                role: modal.querySelector('#editUserRole').value,
                accountStatus: modal.querySelector('#editAccountStatus').value,
                subscription: {
                    plan: modal.querySelector('#editSubscriptionPlan').value,
                    price: parseFloat(modal.querySelector('#editSubscriptionPrice').value),
                    status: modal.querySelector('#editSubscriptionStatus').value,
                    startDate: modal.querySelector('#editSubscriptionStart').value,
                    expiryDate: modal.querySelector('#editSubscriptionExpiry').value,
                    autoRenew: modal.querySelector('#editAutoRenew').value === 'true'
                }
            };
            
            // Check password change
            const newPassword = modal.querySelector('#editPassword').value;
            const confirmPassword = modal.querySelector('#editConfirmPassword').value;
            
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                if (newPassword.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                updates.password = newPassword;
            }
            
            // Update user
            await window.database.updateUser(userId, updates);
            
            // Show success and close
            this.showToast('User updated successfully', 'success');
            modal.remove();
            this.filterUsers(); // Refresh the list
            
        } catch (error) {
            this.showToast(error.message || 'Failed to update user', 'error');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            saveBtn.disabled = false;
        }
    }
    
    // Utility methods
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    calculateDaysRemaining(expiryDate) {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    async calculateTotalPaid(userId) {
        try {
            const payments = await window.database.getPayments(userId);
            return payments
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + (p.amount || 0), 0);
        } catch (error) {
            return 0;
        }
    }
    
    async getLastPaymentDate(userId) {
        try {
            const payments = await window.database.getPayments(userId);
            const completedPayments = payments.filter(p => p.status === 'completed');
            if (completedPayments.length === 0) return 'N/A';
            
            const lastPayment = completedPayments.sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            )[0];
            
            return this.formatDate(lastPayment.date);
        } catch (error) {
            return 'N/A';
        }
    }
    
    generatePaymentsRows(userId) {
        // This would be populated with actual payment data
        return `
            <tr>
                <td>${this.formatDate(new Date().toISOString())}</td>
                <td>500 BDT</td>
                <td>BKash</td>
                <td><span class="status-badge active">Completed</span></td>
                <td>TRX123456</td>
                <td><button class="btn-icon"><i class="fas fa-download"></i></button></td>
            </tr>
        `;
    }
    
    generateActivityLog(userId) {
        // This would be populated with actual activity data
        return `
            <div class="activity-item">
                <i class="fas fa-sign-in-alt"></i>
                <div class="activity-content">
                    <p>User logged in</p>
                    <small>${this.timeAgo(new Date(Date.now() - 3600000).toISOString())}</small>
                </div>
            </div>
            <div class="activity-item">
                <i class="fas fa-credit-card"></i>
                <div class="activity-content">
                    <p>Payment completed</p>
                    <small>${this.timeAgo(new Date(Date.now() - 86400000).toISOString())}</small>
                </div>
            </div>
        `;
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
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        });
    }
}

// Initialize admin functions
const admin = new AdminFunctions();

// Make available globally for onclick handlers
window.admin = admin;
