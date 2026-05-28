class Authentication {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkRememberedUser();
    }
    
    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        // Toggle password visibility
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // Change icon
                const icon = togglePassword.querySelector('i');
                icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            });
        }
        
        // Register link
        const registerLink = document.getElementById('registerLink');
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAdminContact();
            });
        }
        
        // Forgot password
        const forgotPassword = document.querySelector('.forgot-password');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPassword();
            });
        }
        
        // Network status
        this.updateNetworkStatus();
        window.addEventListener('online', () => this.updateNetworkStatus());
        window.addEventListener('offline', () => this.updateNetworkStatus());
    }
    
    async login() {
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Validate phone format
        if (!this.validatePhone(phone)) {
            this.showError('Please enter a valid phone number in format: +8801XXXXXXXXX');
            return;
        }
        
        // Show loading
        const loginBtn = document.getElementById('loginBtn');
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        loginBtn.disabled = true;
        
        try {
            // Check if online
            if (!navigator.onLine) {
                // Try offline authentication
                await this.offlineLogin(phone, password);
            } else {
                // Online authentication
                await this.onlineLogin(phone, password);
            }
            
            // Remember user if checked
            if (rememberMe) {
                localStorage.setItem('rememberedPhone', phone);
            } else {
                localStorage.removeItem('rememberedPhone');
            }
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            // Reset button
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    }
    
    async onlineLogin(phone, password) {
        try {
            // Get user from database
            const user = await window.database.getUserByPhone(phone);
            
            if (!user) {
                throw new Error('User not found. Please contact admin for registration.');
            }
            
            // Check password (in real app, this would be hashed)
            if (user.password !== password) {
                throw new Error('Invalid password. Please try again.');
            }
            
            // Check subscription status
            if (user.subscription.status === 'expired' || user.subscription.status === 'cancelled') {
                this.showSubscriptionWarning(user);
            }
            
            // Set session
            this.setSession(user);
            
        } catch (error) {
            throw error;
        }
    }
    
    async offlineLogin(phone, password) {
        try {
            // Try to get user from local database
            const user = await window.database.getUserByPhone(phone);
            
            if (!user) {
                throw new Error('User not found in local database. Please connect to internet for first login.');
            }
            
            // Check password
            if (user.password !== password) {
                throw new Error('Invalid password. Please try again.');
            }
            
            // Show offline warning
            this.showOfflineWarning();
            
            // Set session
            this.setSession(user);
            
        } catch (error) {
            throw error;
        }
    }
    
    setSession(user) {
        this.currentUser = user;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUserId', user.id);
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('lastLogin', new Date().toISOString());
    }
    
    checkRememberedUser() {
        const rememberedPhone = localStorage.getItem('rememberedPhone');
        if (rememberedPhone) {
            document.getElementById('phone').value = rememberedPhone;
            document.getElementById('rememberMe').checked = true;
        }
    }
    
    validatePhone(phone) {
        const phoneRegex = /^\+8801[0-9]{9}$/;
        return phoneRegex.test(phone);
    }
    
    showError(message) {
        // Remove any existing error
        this.removeError();
        
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button class="alert-close">&times;</button>
        `;
        
        // Insert after form
        const form = document.getElementById('loginForm');
        form.parentNode.insertBefore(errorDiv, form.nextSibling);
        
        // Close button
        errorDiv.querySelector('.alert-close').addEventListener('click', () => {
            errorDiv.remove();
        });
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }
    
    removeError() {
        const existingError = document.querySelector('.alert-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    showSubscriptionWarning(user) {
        const daysRemaining = this.calculateDaysRemaining(user.subscription.expiryDate);
        
        if (daysRemaining <= 0) {
            // Show modal for expired subscription
            this.showExpiredModal(user);
        } else if (daysRemaining <= 7) {
            // Show warning for expiring soon
            this.showWarningToast(`Your subscription expires in ${daysRemaining} days`);
        }
    }
    
    showExpiredModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Subscription Expired</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Your subscription has expired. Please renew to continue using all features.</p>
                    <div class="expiry-details">
                        <p><strong>Plan:</strong> ${user.subscription.plan}</p>
                        <p><strong>Amount:</strong> ${user.subscription.price} ${user.subscription.currency}</p>
                        <p><strong>Expired on:</strong> ${this.formatDate(user.subscription.expiryDate)}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="continueAnyway">Continue Anyway</button>
                    <button class="btn-primary" id="renewNow">Renew Now</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // Continue anyway
        modal.querySelector('#continueAnyway').addEventListener('click', () => {
            modal.remove();
        });
        
        // Renew now
        modal.querySelector('#renewNow').addEventListener('click', () => {
            modal.remove();
            // Redirect to payment page
            localStorage.setItem('pendingPaymentUserId', user.id);
            window.location.href = 'payment.html?renew=true';
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showAdminContact() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-user-plus"></i> Register New Account</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>To create a new account, please contact the administrator:</p>
                    <div class="contact-info">
                        <p><i class="fas fa-phone"></i> <strong>Phone:</strong> +8801XXXXXXXXX</p>
                        <p><i class="fas fa-envelope"></i> <strong>Email:</strong> admin@easycal.com</p>
                        <p><i class="fas fa-clock"></i> <strong>Hours:</strong> 9:00 AM - 6:00 PM (Sunday-Thursday)</p>
                    </div>
                    <div class="registration-note">
                        <h4>Information needed for registration:</h4>
                        <ul>
                            <li>Full Name</li>
                            <li>Phone Number</li>
                            <li>Email Address</li>
                            <li>Subscription Plan Preference</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="closeContact">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#closeContact').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showForgotPassword() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-key"></i> Reset Password</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Enter your registered phone number to reset your password:</p>
                    <div class="form-group">
                        <label for="resetPhone">Phone Number</label>
                        <input type="tel" id="resetPhone" placeholder="+8801XXXXXXXXX" 
                               pattern="^\+8801[0-9]{9}$">
                        <small class="hint">Format: +8801XXXXXXXXX</small>
                    </div>
                    <div class="reset-options">
                        <p><strong>Reset options:</strong></p>
                        <label class="checkbox">
                            <input type="radio" name="resetMethod" value="sms" checked>
                            <span>Send OTP via SMS</span>
                        </label>
                        <label class="checkbox">
                            <input type="radio" name="resetMethod" value="email">
                            <span>Send reset link via Email</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelReset">Cancel</button>
                    <button class="btn-primary" id="submitReset">Send Reset Code</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const resetPhone = modal.querySelector('#resetPhone');
        const submitBtn = modal.querySelector('#submitReset');
        
        resetPhone.addEventListener('input', () => {
            submitBtn.disabled = !this.validatePhone(resetPhone.value);
        });
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#cancelReset').addEventListener('click', () => {
            modal.remove();
        });
        
        submitBtn.addEventListener('click', async () => {
            if (!this.validatePhone(resetPhone.value)) {
                this.showError('Please enter a valid phone number');
                return;
            }
            
            // Show loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            try {
                // Check if user exists
                const user = await window.database.getUserByPhone(resetPhone.value);
                if (!user) {
                    throw new Error('Phone number not registered');
                }
                
                // Simulate sending reset code
                await this.sendResetCode(user);
                
                modal.remove();
                this.showResetCodeModal(user);
                
            } catch (error) {
                this.showError(error.message);
                submitBtn.innerHTML = 'Send Reset Code';
                submitBtn.disabled = false;
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async sendResetCode(user) {
        // In a real app, this would send SMS or email
        // For demo, generate and store code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        localStorage.setItem('resetCode', resetCode);
        localStorage.setItem('resetExpires', expiresAt.toISOString());
        localStorage.setItem('resetPhone', user.phone);
        
        // Simulate delay
        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`Reset code ${resetCode} sent to ${user.phone}`);
                resolve();
            }, 1000);
        });
    }
    
    showResetCodeModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-key"></i> Enter Reset Code</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Enter the 6-digit code sent to your phone:</p>
                    <div class="code-input">
                        <input type="text" maxlength="1" data-index="0">
                        <input type="text" maxlength="1" data-index="1">
                        <input type="text" maxlength="1" data-index="2">
                        <input type="text" maxlength="1" data-index="3">
                        <input type="text" maxlength="1" data-index="4">
                        <input type="text" maxlength="1" data-index="5">
                    </div>
                    <p class="resend-text">
                        Didn't receive code? 
                        <a href="#" id="resendCode">Resend</a>
                        <span id="countdown">(02:00)</span>
                    </p>
                    <div class="new-password" id="newPasswordSection" style="display: none;">
                        <div class="form-group">
                            <label for="newPassword">New Password</label>
                            <input type="password" id="newPassword" minlength="6">
                        </div>
                        <div class="form-group">
                            <label for="confirmNewPassword">Confirm New Password</label>
                            <input type="password" id="confirmNewPassword">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelCode">Cancel</button>
                    <button class="btn-primary" id="verifyCode" disabled>Verify Code</button>
                    <button class="btn-success" id="resetPassword" style="display: none;">Reset Password</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup code input
        const codeInputs = modal.querySelectorAll('.code-input input');
        const verifyBtn = modal.querySelector('#verifyCode');
        const resetBtn = modal.querySelector('#resetPassword');
        const newPasswordSection = modal.querySelector('#newPasswordSection');
        
        let code = '';
        
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                if (value && index < 5) {
                    codeInputs[index + 1].focus();
                }
                
                // Update code
                code = Array.from(codeInputs).map(input => input.value).join('');
                verifyBtn.disabled = code.length !== 6;
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    codeInputs[index - 1].focus();
                }
            });
            
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = e.clipboardData.getData('text').trim();
                if (pasteData.length === 6 && /^\d+$/.test(pasteData)) {
                    pasteData.split('').forEach((char, i) => {
                        if (codeInputs[i]) {
                            codeInputs[i].value = char;
                        }
                    });
                    code = pasteData;
                    verifyBtn.disabled = false;
                    codeInputs[5].focus();
                }
            });
        });
        
        // Countdown timer
        let countdown = 120; // 2 minutes
        const countdownEl = modal.querySelector('#countdown');
        const countdownInterval = setInterval(() => {
            countdown--;
            const minutes = Math.floor(countdown / 60);
            const seconds = countdown % 60;
            countdownEl.textContent = `(${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')})`;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownEl.textContent = '(Expired)';
            }
        }, 1000);
        
        // Resend code
        modal.querySelector('#resendCode').addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (countdown > 0) {
                this.showError(`Please wait ${countdown} seconds before resending`);
                return;
            }
            
            try {
                await this.sendResetCode(user);
                countdown = 120;
                codeInputs.forEach(input => input.value = '');
                code = '';
                verifyBtn.disabled = true;
                this.showSuccess('New code sent successfully');
            } catch (error) {
                this.showError('Failed to resend code');
            }
        });
        
        // Verify code
        verifyBtn.addEventListener('click', () => {
            const storedCode = localStorage.getItem('resetCode');
            const storedExpires = localStorage.getItem('resetExpires');
            const storedPhone = localStorage.getItem('resetPhone');
            
            if (!storedCode || !storedExpires || storedPhone !== user.phone) {
                this.showError('Invalid or expired code');
                return;
            }
            
            if (new Date(storedExpires) < new Date()) {
                this.showError('Code has expired');
                return;
            }
            
            if (code !== storedCode) {
                this.showError('Invalid code. Please try again.');
                return;
            }
            
            // Code verified, show password fields
            newPasswordSection.style.display = 'block';
            verifyBtn.style.display = 'none';
            resetBtn.style.display = 'block';
            codeInputs.forEach(input => input.disabled = true);
        });
        
        // Reset password
        resetBtn.addEventListener('click', async () => {
            const newPassword = modal.querySelector('#newPassword').value;
            const confirmPassword = modal.querySelector('#confirmNewPassword').value;
            
            if (!newPassword || newPassword.length < 6) {
                this.showError('Password must be at least 6 characters');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                this.showError('Passwords do not match');
                return;
            }
            
            try {
                // Update password in database
                await window.database.updateUser(user.id, {
                    password: newPassword
                });
                
                // Clear reset data
                localStorage.removeItem('resetCode');
                localStorage.removeItem('resetExpires');
                localStorage.removeItem('resetPhone');
                
                modal.remove();
                this.showSuccess('Password reset successfully! You can now login with your new password.');
                
            } catch (error) {
                this.showError('Failed to reset password');
            }
        });
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            clearInterval(countdownInterval);
        });
        
        modal.querySelector('#cancelCode').addEventListener('click', () => {
            modal.remove();
            clearInterval(countdownInterval);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                clearInterval(countdownInterval);
            }
        });
    }
    
    showOfflineWarning() {
        const warning = document.createElement('div');
        warning.className = 'offline-warning-modal';
        warning.innerHTML = `
            <div class="warning-content">
                <i class="fas fa-wifi-slash"></i>
                <h3>Offline Mode</h3>
                <p>You're currently offline. Some features may be limited.</p>
                <p>Your subscription expiry information will still be tracked.</p>
                <button class="btn-primary" id="understandOffline">I Understand</button>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        warning.querySelector('#understandOffline').addEventListener('click', () => {
            warning.remove();
        });
    }
    
    updateNetworkStatus() {
        const networkStatus = document.getElementById('networkStatus');
        if (networkStatus) {
            if (navigator.onLine) {
                networkStatus.className = 'network-status-indicator online';
                networkStatus.innerHTML = '<i class="fas fa-wifi"></i> Online';
            } else {
                networkStatus.className = 'network-status-indicator offline';
                networkStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
            }
        }
    }
    
    showSuccess(message) {
        // Create success toast
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
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
    
    showWarningToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-warning';
        toast.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
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
    }
    
    // Utility methods
    calculateDaysRemaining(expiryDate) {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Check authentication on page load
    static checkAuth() {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const currentUserId = localStorage.getItem('currentUserId');
        
        if (!isAuthenticated || !currentUserId) {
            if (window.location.pathname.includes('dashboard')) {
                window.location.href = 'login.html';
            }
        } else {
            if (window.location.pathname.includes('login')) {
                window.location.href = 'dashboard.html';
            }
        }
    }
}

// Initialize authentication
const auth = new Authentication();

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    Authentication.checkAuth();
});