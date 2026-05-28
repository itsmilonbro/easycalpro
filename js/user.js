class UserFunctions {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.startExpiryTracking();
    }
    
    async loadUserData() {
        try {
            const userId = localStorage.getItem('currentUserId');
            if (!userId) {
                throw new Error('User not logged in');
            }
            
            this.currentUser = await window.database.getUser(userId);
            if (!this.currentUser) {
                throw new Error('User not found');
            }
            
            this.updateUserUI();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.redirectToLogin();
        }
    }
    
    updateUserUI() {
        // Update user name in dashboard
        const userNameElements = document.querySelectorAll('#userName, #userFullName');
        userNameElements.forEach(el => {
            if (el) el.textContent = this.currentUser.name;
        });
        
        // Update user email
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = this.currentUser.email;
        }
        
        // Update user role
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = this.currentUser.role === 'admin' ? 'Administrator' : 'User';
        }
        
        // Update subscription status in sidebar
        this.updateSidebarStatus();
    }
    
    updateSidebarStatus() {
        const expiryDays = this.calculateDaysRemaining(this.currentUser.subscription.expiryDate);
        const sidebarExpiryDays = document.getElementById('sidebarExpiryDays');
        if (sidebarExpiryDays) {
            sidebarExpiryDays.textContent = `${expiryDays} days`;
            
            // Add warning class if expiring soon
            if (expiryDays <= 7) {
                sidebarExpiryDays.parentElement.classList.add('warning');
            }
            if (expiryDays <= 0) {
                sidebarExpiryDays.parentElement.classList.add('expired');
            }
        }
        
        const sidebarNextPayment = document.getElementById('sidebarNextPayment');
        if (sidebarNextPayment) {
            sidebarNextPayment.textContent = this.formatDate(this.currentUser.subscription.expiryDate);
        }
    }
    
    setupEventListeners() {
        // Renew subscription button
        const renewBtn = document.querySelector('[onclick*="renewSubscription"]');
        if (renewBtn) {
            renewBtn.addEventListener('click', () => this.renewSubscription());
        }
        
        // Make payment button
        const paymentBtn = document.querySelector('[onclick*="makePayment"]');
        if (paymentBtn) {
            paymentBtn.addEventListener('click', () => this.makePayment());
        }
        
        // Download invoice button
        const invoiceBtn = document.querySelector('[onclick*="downloadInvoice"]');
        if (invoiceBtn) {
            invoiceBtn.addEventListener('click', () => this.downloadInvoice());
        }
        
        // View history button
        const historyBtn = document.querySelector('[onclick*="loadPage(\'payments\')"]');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                if (window.dashboard) {
                    window.dashboard.loadPage('payments');
                }
            });
        }
        
        // Profile update form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }
        
        // Password change form
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }
        
        // Payment method form
        const paymentMethodForm = document.getElementById('paymentMethodForm');
        if (paymentMethodForm) {
            paymentMethodForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePaymentMethod();
            });
        }
    }
    
    startExpiryTracking() {
        if (window.offlineManager) {
            window.offlineManager.startExpiryTracking(this.currentUser);
        }
    }
    
    async renewSubscription() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-credit-card"></i> Renew Subscription</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="renewal-summary">
                        <h4>Current Plan: ${this.currentUser.subscription.plan}</h4>
                        <p>Amount: ${this.currentUser.subscription.price} ${this.currentUser.subscription.currency}</p>
                        <p>Expiry Date: ${this.formatDate(this.currentUser.subscription.expiryDate)}</p>
                        
                        <div class="form-group">
                            <label for="renewalPeriod">Renewal Period</label>
                            <select id="renewalPeriod">
                                <option value="30">1 Month</option>
                                <option value="90">3 Months</option>
                                <option value="180">6 Months</option>
                                <option value="365">1 Year</option>
                            </select>
                        </div>
                        
                        <div class="amount-display">
                            <span>Total Amount:</span>
                            <strong id="renewalAmount">${this.currentUser.subscription.price} ${this.currentUser.subscription.currency}</strong>
                        </div>
                    </div>
                    
                    <div class="payment-methods">
                        <h4>Select Payment Method</h4>
                        <div class="method-options">
                            <label class="method-option">
                                <input type="radio" name="paymentMethod" value="bkash" checked>
                                <div class="method-content">
                                    <i class="fas fa-mobile-alt"></i>
                                    <span>bKash</span>
                                </div>
                            </label>
                            <label class="method-option">
                                <input type="radio" name="paymentMethod" value="nagad">
                                <div class="method-content">
                                    <i class="fas fa-wallet"></i>
                                    <span>Nagad</span>
                                </div>
                            </label>
                            <label class="method-option">
                                <input type="radio" name="paymentMethod" value="card">
                                <div class="method-content">
                                    <i class="fas fa-credit-card"></i>
                                    <span>Credit/Debit Card</span>
                                </div>
                            </label>
                            <label class="method-option">
                                <input type="radio" name="paymentMethod" value="bank">
                                <div class="method-content">
                                    <i class="fas fa-university"></i>
                                    <span>Bank Transfer</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    ${this.currentUser.subscription.status === 'expired' ? `
                        <div class="warning-box">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Your subscription has expired. Renew now to restore access.</p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelRenewal">Cancel</button>
                    <button class="btn-primary" id="proceedToPayment">
                        <i class="fas fa-lock"></i> Proceed to Payment
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Calculate renewal amount based on period
        const periodSelect = modal.querySelector('#renewalPeriod');
        const amountDisplay = modal.querySelector('#renewalAmount');
        
        periodSelect.addEventListener('change', () => {
            const months = parseInt(periodSelect.value) / 30;
            const totalAmount = this.currentUser.subscription.price * months;
            amountDisplay.textContent = `${totalAmount} ${this.currentUser.subscription.currency}`;
        });
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#cancelRenewal').addEventListener('click', () => {
            modal.remove();
        });
        
        // Proceed to payment
        modal.querySelector('#proceedToPayment').addEventListener('click', () => {
            const period = parseInt(periodSelect.value);
            const paymentMethod = modal.querySelector('input[name="paymentMethod"]:checked').value;
            
            modal.remove();
            this.processPayment(period, paymentMethod);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async processPayment(periodDays, paymentMethod) {
        const amount = this.currentUser.subscription.price * (periodDays / 30);
        
        // Show payment processing modal
        const paymentModal = document.createElement('div');
        paymentModal.className = 'modal-overlay';
        paymentModal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-spinner fa-spin"></i> Processing Payment</h3>
                </div>
                <div class="modal-body">
                    <div class="payment-processing">
                        <div class="processing-spinner"></div>
                        <h4>Please wait...</h4>
                        <p>Processing your payment of ${amount} ${this.currentUser.subscription.currency}</p>
                        <p>Method: ${paymentMethod.toUpperCase()}</p>
                        
                        ${this.getPaymentInstructions(paymentMethod)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(paymentModal);
        
        try {
            // Simulate payment processing
            await this.simulatePayment(amount, paymentMethod);
            
            // Update subscription
            const newExpiryDate = new Date(this.currentUser.subscription.expiryDate);
            newExpiryDate.setDate(newExpiryDate.getDate() + periodDays);
            
            await window.database.updateUser(this.currentUser.id, {
                subscription: {
                    ...this.currentUser.subscription,
                    expiryDate: newExpiryDate.toISOString(),
                    status: 'active'
                }
            });
            
            // Record payment
            await window.database.addPayment({
                userId: this.currentUser.id,
                amount: amount,
                currency: this.currentUser.subscription.currency,
                method: paymentMethod,
                period: periodDays,
                description: 'Subscription renewal'
            });
            
            // Add notification
            await window.database.addNotification({
                userId: this.currentUser.id,
                title: 'Payment Successful',
                message: `Your subscription has been renewed for ${periodDays} days. Amount: ${amount} ${this.currentUser.subscription.currency}`,
                type: 'payment'
            });
            
            // Close processing modal
            paymentModal.remove();
            
            // Show success modal
            this.showPaymentSuccess(amount, periodDays);
            
        } catch (error) {
            paymentModal.remove();
            this.showPaymentError(error.message);
        }
    }
    
    getPaymentInstructions(method) {
        const instructions = {
            'bkash': `
                <div class="payment-instructions">
                    <h5>bKash Payment Instructions:</h5>
                    <ol>
                        <li>Go to bKash app or dial *247#</li>
                        <li>Select "Send Money"</li>
                        <li>Enter merchant number: <strong>015XXXXXXXX</strong></li>
                        <li>Enter amount: <strong>${this.currentUser.subscription.price}</strong></li>
                        <li>Enter reference: <strong>${this.currentUser.id}</strong></li>
                    </ol>
                </div>
            `,
            'nagad': `
                <div class="payment-instructions">
                    <h5>Nagad Payment Instructions:</h5>
                    <ol>
                        <li>Go to Nagad app or dial *167#</li>
                        <li>Select "Send Money"</li>
                        <li>Enter merchant number: <strong>018XXXXXXXX</strong></li>
                        <li>Enter amount: <strong>${this.currentUser.subscription.price}</strong></li>
                        <li>Enter reference: <strong>${this.currentUser.id}</strong></li>
                    </ol>
                </div>
            `,
            'card': `
                <div class="payment-instructions">
                    <h5>Card Payment:</h5>
                    <p>You will be redirected to our secure payment gateway.</p>
                </div>
            `,
            'bank': `
                <div class="payment-instructions">
                    <h5>Bank Transfer:</h5>
                    <p>Bank: Example Bank Ltd.</p>
                    <p>Account: 123456789</p>
                    <p>Branch: Main Branch</p>
                    <p>Reference: ${this.currentUser.id}</p>
                </div>
            `
        };
        
        return instructions[method] || '';
    }
    
    simulatePayment(amount, method) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate 90% success rate for demo
                if (Math.random() < 0.9) {
                    resolve();
                } else {
                    reject(new Error('Payment failed. Please try again.'));
                }
            }, 3000);
        });
    }
    
    showPaymentSuccess(amount, periodDays) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header success">
                    <h3><i class="fas fa-check-circle"></i> Payment Successful!</h3>
                </div>
                <div class="modal-body">
                    <div class="success-message">
                        <div class="success-icon">
                            <i class="fas fa-check"></i>
                        </div>
                        <h4>Thank you for your payment!</h4>
                        <p>Your subscription has been successfully renewed.</p>
                        
                        <div class="receipt-details">
                            <div class="receipt-item">
                                <span>Transaction ID:</span>
                                <strong>TRX${Date.now()}</strong>
                            </div>
                            <div class="receipt-item">
                                <span>Amount Paid:</span>
                                <strong>${amount} ${this.currentUser.subscription.currency}</strong>
                            </div>
                            <div class="receipt-item">
                                <span>Period:</span>
                                <strong>${periodDays} days</strong>
                            </div>
                            <div class="receipt-item">
                                <span>New Expiry Date:</span>
                                <strong>${this.formatDate(new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000))}</strong>
                            </div>
                        </div>
                        
                        <div class="receipt-actions">
                            <button class="btn-secondary" id="printReceipt">
                                <i class="fas fa-print"></i> Print Receipt
                            </button>
                            <button class="btn-primary" id="downloadReceipt">
                                <i class="fas fa-download"></i> Download Invoice
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="closeSuccess">Done</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#printReceipt').addEventListener('click', () => {
            window.print();
        });
        
        modal.querySelector('#downloadReceipt').addEventListener('click', () => {
            this.downloadInvoice();
        });
        
        modal.querySelector('#closeSuccess').addEventListener('click', () => {
            modal.remove();
            
            // Refresh user data
            this.loadUserData();
            
            // Reload current page if on dashboard
            if (window.dashboard) {
                window.dashboard.loadPage(window.dashboard.currentPage);
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showPaymentError(errorMessage) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header error">
                    <h3><i class="fas fa-exclamation-circle"></i> Payment Failed</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="error-message">
                        <div class="error-icon">
                            <i class="fas fa-times"></i>
                        </div>
                        <h4>Payment could not be completed</h4>
                        <p>${errorMessage}</p>
                        
                        <div class="error-suggestions">
                            <p><strong>Suggestions:</strong></p>
                            <ul>
                                <li>Check your payment method details</li>
                                <li>Ensure sufficient balance</li>
                                <li>Try a different payment method</li>
                                <li>Contact support if issue persists</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="closeError">Cancel</button>
                    <button class="btn-primary" id="retryPayment">Try Again</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#closeError').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#retryPayment').addEventListener('click', () => {
            modal.remove();
            this.renewSubscription();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async makePayment() {
        // This is similar to renewSubscription but for making a payment
        this.renewSubscription();
    }
    
    async downloadInvoice() {
        try {
            // Generate invoice data
            const invoiceData = {
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                date: new Date().toISOString(),
                amount: this.currentUser.subscription.price,
                currency: this.currentUser.subscription.currency,
                plan: this.currentUser.subscription.plan,
                invoiceNumber: `INV-${Date.now()}`
            };
            
            // Create invoice HTML
            const invoiceHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invoice ${invoiceData.invoiceNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        .invoice-header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                        .company-info { float: right; text-align: right; }
                        .invoice-details { margin: 30px 0; }
                        .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                        .invoice-table th { background: #f5f5f5; }
                        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
                        .footer { margin-top: 50px; text-align: center; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="invoice-header">
                        <h1>INVOICE</h1>
                        <div class="company-info">
                            <h3>EasyCal</h3>
                            <p>Subscription Management System</p>
                            <p>invoice@easycal.com</p>
                            <p>${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div class="invoice-details">
                        <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
                        <p><strong>Date:</strong> ${new Date(invoiceData.date).toLocaleDateString()}</p>
                        <p><strong>User ID:</strong> ${invoiceData.userId}</p>
                        <p><strong>Name:</strong> ${invoiceData.userName}</p>
                    </div>
                    
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Plan</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Monthly Subscription - ${invoiceData.plan} Plan</td>
                                <td>${invoiceData.plan}</td>
                                <td>${invoiceData.amount} ${invoiceData.currency}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="total">
                        Total: ${invoiceData.amount} ${invoiceData.currency}
                    </div>
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                        <p>EasyCal Subscription Management System</p>
                        <p>This is a computer-generated invoice, no signature required.</p>
                    </div>
                </body>
                </html>
            `;
            
            // Create download link
            const blob = new Blob([invoiceHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${invoiceData.invoiceNumber}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Invoice downloaded successfully', 'success');
            
        } catch (error) {
            console.error('Error downloading invoice:', error);
            this.showToast('Failed to download invoice', 'error');
        }
    }
    
    async updateProfile() {
        const form = document.getElementById('profileForm');
        if (!form) return;
        
        const saveBtn = form.querySelector('button[type="submit"]');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            const updates = {
                name: document.getElementById('profileName').value,
                email: document.getElementById('profileEmail').value,
                phone: document.getElementById('profilePhone').value
            };
            
            // Validate phone
            if (!this.validatePhone(updates.phone)) {
                throw new Error('Please enter a valid phone number');
            }
            
            await window.database.updateUser(this.currentUser.id, updates);
            
            // Update current user data
            this.currentUser = { ...this.currentUser, ...updates };
            this.updateUserUI();
            
            this.showToast('Profile updated successfully', 'success');
            
        } catch (error) {
            this.showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    async changePassword() {
        const form = document.getElementById('passwordForm');
        if (!form) return;
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate
        if (currentPassword !== this.currentUser.password) {
            this.showToast('Current password is incorrect', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showToast('New password must be at least 6 characters', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showToast('New passwords do not match', 'error');
            return;
        }
        
        const saveBtn = form.querySelector('button[type="submit"]');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
        saveBtn.disabled = true;
        
        try {
            await window.database.updateUser(this.currentUser.id, {
                password: newPassword
            });
            
            // Update current user
            this.currentUser.password = newPassword;
            
            // Clear form
            form.reset();
            
            this.showToast('Password changed successfully', 'success');
            
        } catch (error) {
            this.showToast('Failed to change password', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    async updatePaymentMethod() {
        // This would update user's preferred payment method
        this.showToast('Payment method updated', 'success');
    }
    
    // Utility methods
    validatePhone(phone) {
        const phoneRegex = /^\+8801[0-9]{9}$/;
        return phoneRegex.test(phone);
    }
    
    formatDate(dateString) {
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
    
    redirectToLogin() {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUserId');
        window.location.href = 'login.html';
    }
}

// Initialize user functions
const userFunctions = new UserFunctions();

// Make available globally
window.userFunctions = userFunctions;