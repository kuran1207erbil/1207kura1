// script.js

// Supabase Configuration
const supabaseUrl = 'https://zctlrchflhakuvcfdifv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdGxyY2hmbGhha3V2Y2ZkaWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjM1NzYsImV4cCI6MjA4NzIzOTU3Nn0.Uw_qLlsZqNRBO0BgxAT5r8ryeRJu4nSXviJ9UOocHRc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    // Add event listener for the password toggle button if it exists
    const togglePassword = document.getElementById('toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility);
    }

    // Add event listener for forgot password
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }

    // Close modal logic
    const modal = document.getElementById('reset-password-modal');
    const closeBtn = document.querySelector('.close-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Add event listener for password strength checker
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }

    // Add event listener for password strength checker (Settings Page)
    const settingsNewPasswordInput = document.getElementById('settings-new-password');
    if (settingsNewPasswordInput) {
        settingsNewPasswordInput.addEventListener('input', checkSettingsPasswordStrength);
    }

    // Add event listener for password match checker (Settings Page)
    const settingsConfirmPasswordInput = document.getElementById('settings-confirm-password');
    if (settingsConfirmPasswordInput && settingsNewPasswordInput) {
        settingsNewPasswordInput.addEventListener('input', checkSettingsPasswordMatch);
        settingsConfirmPasswordInput.addEventListener('input', checkSettingsPasswordMatch);
    }

    // Close dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            const content = document.getElementById('dropdown-options');
            const btn = document.querySelector('.dropdown-btn');
            if (content && content.classList.contains('show')) {
                content.classList.remove('show');
                btn.classList.remove('active');
            }
        }
    });

    // Sidebar Toggle Logic
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (window.innerWidth > 992) {
                // Desktop: Toggle collapse
                sidebar.classList.toggle('collapsed');
            } else {
                // Mobile: Toggle visibility
                sidebar.classList.toggle('active');
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Load User Info & Online Status
    checkUserSession();
    setupOnlineStatus();

    // Initialize PWA Logic
    initPWA();
});

function loadSettings() {
    // وەرگرتنی داتا لە بیرگە
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedLang = localStorage.getItem('language') || 'ku';
    const savedNotifications = localStorage.getItem('notifications');
    const savedAccent = localStorage.getItem('accent') || 'blue';

    // جێبەجێکردنی دۆخی تاریک
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.checked = true;
    }
    updateThemeIcon(savedTheme === 'dark');

    // جێبەجێکردنی ڕەنگی سەرەکی
    setAccentColor(savedAccent, false);

    // جێبەجێکردنی زمان
    selectLanguage(savedLang, true); // Apply language settings immediately

    // جێبەجێکردنی ئاگادارکردنەوەکان
    if (savedNotifications === 'true') {
        const notifToggle = document.getElementById('notif-toggle');
        if (notifToggle) notifToggle.checked = true;
    }

    // Update Settings Page User Info if on settings page
    const settingsName = document.getElementById('settings-user-name');
    if (settingsName) {
        checkUserSession(); // This will update the global user info
        // We need to update the settings specific elements inside checkUserSession or here
    }

    // Check MFA Status if on settings page
    if (document.getElementById('mfa-toggle')) checkMFAStatus();
}

// فەنکشن بۆ گۆڕینی دەقەکان بەپێی زمان
function applyLanguage(lang) {
    const elements = document.querySelectorAll('[data-lang-key]');
    elements.forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[lang][key]) {
            // ئەگەر ئینپوت بوو placeholder دەگۆڕین، ئەگەر نا دەقەکەی
            if (element.tagName === 'INPUT' && element.getAttribute('placeholder')) {
                element.placeholder = translations[lang][key];
            } else {
                element.innerText = translations[lang][key];
            }
        }
    });
    
    // گۆڕینی ئاراستەی نووسین ئەگەر پێویست بوو (هەردووکیان RTL ن بۆیە لێرە پێویست نییە)
    document.documentElement.lang = lang;
}

// گۆڕینی دۆخی تاریک/ڕوون
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

// گۆڕینی ڕەنگی سەرەکی
function setAccentColor(color, save = true) {
    document.body.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange');
    if (color !== 'blue') {
        document.body.classList.add(`theme-${color}`);
    }
    if (save) localStorage.setItem('accent', color);
}

function updateThemeIcon(isDark) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    
    const icon = btn.querySelector('i');
    
    // گۆڕینی ئایکۆن
    if (isDark) {
        icon.className = 'fas fa-moon'; // مانگ بۆ دۆخی تاریک
    } else {
        icon.className = 'fas fa-sun'; // خۆر بۆ دۆخی ڕوون
    }

    // زیادکردنی ئەنیمەیشن
    icon.classList.remove('icon-spin');
    void icon.offsetWidth; // Trigger reflow
    icon.classList.add('icon-spin');
}

// گۆڕینی زمان
function selectLanguage(lang, apply = true) {
    // Update UI
    const currentFlag = document.getElementById('current-flag');
    const currentText = document.getElementById('current-lang-text');
    
    if (currentFlag && currentText) {
        if (lang === 'ku') {
            currentText.innerText = 'کوردی';
            currentFlag.className = 'flag-icon flag-ku';
        } else {
            currentText.innerText = 'عربي';
            currentFlag.className = 'flag-icon flag-ar';
        }
    }

    // Update Sidebar Buttons Active State
    document.querySelectorAll('.sidebar-lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeSidebarBtn = document.getElementById(`sidebar-lang-${lang}`);
    if (activeSidebarBtn) activeSidebarBtn.classList.add('active');

    // Update Settings Page Dropdown
    const settingsLangSelect = document.getElementById('language-select');
    if (settingsLangSelect) {
        settingsLangSelect.value = lang;
    }

    localStorage.setItem('language', lang);
    if (apply) applyLanguage(lang);
    
    // Close dropdown if open
    const content = document.getElementById('dropdown-options');
    if (content) content.classList.remove('show');
}

function toggleLanguageDropdown() {
    const content = document.getElementById('dropdown-options');
    const btn = document.querySelector('.dropdown-btn');
    content.classList.toggle('show');
    btn.classList.toggle('active');
}

// گۆڕینی ئاگادارکردنەوە
function toggleNotifications() {
    const notifToggle = document.getElementById('notif-toggle');
    localStorage.setItem('notifications', notifToggle.checked);
}

// فەنکشنی چوونە ژوورەوە (Login)
async function handleLogin(event) {
    event.preventDefault(); // ڕێگری لە ڕیفرێش
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-msg');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Loading State
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: usernameInput.value,
            password: passwordInput.value,
        });

        if (error) throw error;

        // Check if MFA is required (AAL2)
        const { data: mfaData, error: mfaError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
            // Show MFA Login Modal
            document.getElementById('mfa-login-modal').style.display = 'flex';
            return; // Stop redirect
        }

        window.location.href = "home.html";
    } catch (error) {
        // پیشاندانی پەیامی هەڵە
        const currentLang = localStorage.getItem('language') || 'ku';
        errorMsg.style.display = "block";
        errorMsg.innerText = translations[currentLang].login_error;
        // دووبارە کارکردنی ئەنیمەیشنەکە
        errorMsg.style.animation = 'none';
        errorMsg.offsetHeight; /* trigger reflow */
        errorMsg.style.animation = 'shake 0.4s ease-in-out';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Function to toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggle-password');

    // Check the current type
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // Change the icon
    if (type === 'password') {
        // Show the 'eye-slash' icon (password hidden)
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        // Show the 'eye' icon (password visible)
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Function to handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();
    // Open the modal at step 1
    document.getElementById('reset-password-modal').style.display = 'flex';
    document.getElementById('modal-step-1').style.display = 'block';
    document.getElementById('modal-step-2').style.display = 'none';
    document.getElementById('modal-step-3').style.display = 'none';
}

let otpTimerInterval;

// Step 1: Send OTP
async function handleSendOtp(event) {
    event.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const currentLang = localStorage.getItem('language') || 'ku';

    if (!email) return;

    const submitBtn = event.target.querySelector('button');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "...";

    try {
        const { error } = await supabaseClient.auth.signInWithOtp({ email: email });
        if (error) throw error;

        // Move to Step 2
        document.getElementById('modal-step-1').style.display = 'none';
        document.getElementById('modal-step-2').style.display = 'block';
        showToast(translations[currentLang].otp_sent_if_exists, 'success');

        // Start Timer
        startOtpTimer();

    } catch (error) {
        showToast(translations[currentLang].error_occurred + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

// --- MFA (Two-Factor Authentication) Logic ---
let mfaFactorId = null;

async function checkMFAStatus() {
    const toggle = document.getElementById('mfa-toggle');
    const statusText = document.getElementById('mfa-status-text');
    const currentLang = localStorage.getItem('language') || 'ku';

    if (!toggle) return;

    const { data, error } = await supabaseClient.auth.mfa.listFactors();
    if (error) {
        console.error("Error checking MFA:", error);
        return;
    }

    // Check if there is any verified TOTP factor
    const hasVerifiedFactor = data.totp.some(factor => factor.status === 'verified');
    toggle.checked = hasVerifiedFactor;

    // Update Status Text
    if (hasVerifiedFactor) {
        statusText.innerText = translations[currentLang].mfa_active;
        statusText.className = 'mfa-status-badge active';
    } else {
        statusText.innerText = translations[currentLang].mfa_inactive;
        statusText.className = 'mfa-status-badge inactive';
    }
}

async function handleMFAToggle(toggle) {
    const currentLang = localStorage.getItem('language') || 'ku';
    
    if (toggle.checked) {
        // Enable MFA
        try {
            const { data, error } = await supabaseClient.auth.mfa.enroll({
                factorType: 'totp'
            });
            
            if (error) throw error;

            mfaFactorId = data.id;
            
            // Show QR Code Modal
            let qrCode = data.totp.qr_code;
            const qrContainer = document.getElementById('mfa-qr-container');
            
            // Handle Supabase returning data URI with raw SVG (not base64) which breaks img tags
            if (qrCode.startsWith('data:image/svg+xml;utf-8,')) {
                qrCode = qrCode.replace('data:image/svg+xml;utf-8,', '');
                // Try to decode if it's URI encoded (fixes issues with % characters)
                try {
                    qrCode = decodeURIComponent(qrCode);
                } catch (e) {
                    // Ignore error if not encoded
                }
            }
            
            if (qrCode.startsWith('data:')) {
                qrContainer.innerHTML = `<img src="${qrCode}" alt="QR Code" style="width: 100%; height: auto;">`;
            } else {
                // Clean up SVG string to remove XML declaration if present
                let cleanSvg = qrCode.replace(/<\?xml.*?\?>/, '');
                // Force SVG to fit container by setting width/height to 100%
                cleanSvg = cleanSvg.replace(/width=['"][^'"]*['"]/, 'width="100%"');
                cleanSvg = cleanSvg.replace(/height=['"][^'"]*['"]/, 'height="100%"');
                qrContainer.innerHTML = cleanSvg;
            }
            
            document.getElementById('mfa-setup-modal').style.display = 'flex';
            document.getElementById('mfa-verify-code').value = '';
            document.getElementById('mfa-verify-code').focus();

        } catch (error) {
            toggle.checked = false;
            showToast(translations[currentLang].error_occurred + error.message, 'error');
        }
    } else {
        // Disable MFA
        if (confirm(translations[currentLang].confirm_disable_mfa)) {
            try {
                const { data: factors } = await supabaseClient.auth.mfa.listFactors();
                // Unenroll all verified factors (simplification)
                const verifiedFactors = factors.totp.filter(f => f.status === 'verified');
                
                for (const factor of verifiedFactors) {
                    await supabaseClient.auth.mfa.unenroll({ factorId: factor.id });
                }
                
                showToast(translations[currentLang].mfa_disabled_success, 'success');
                checkMFAStatus(); // Update UI status
            } catch (error) {
                toggle.checked = true; // Revert
                showToast(translations[currentLang].error_occurred + error.message, 'error');
            }
        } else {
            toggle.checked = true; // User cancelled
        }
    }
}

function closeMFASetupModal() {
    document.getElementById('mfa-setup-modal').style.display = 'none';
    // If closed without verifying, uncheck the toggle
    checkMFAStatus(); 
}

async function verifyMFASetup() {
    const code = document.getElementById('mfa-verify-code').value;
    const currentLang = localStorage.getItem('language') || 'ku';

    try {
        const { data, error } = await supabaseClient.auth.mfa.challengeAndVerify({
            factorId: mfaFactorId,
            code: code
        });

        if (error) throw error;

        showToast(translations[currentLang].mfa_enabled_success, 'success');
        document.getElementById('mfa-setup-modal').style.display = 'none';
        checkMFAStatus(); // Update UI status
    } catch (error) {
        showToast(translations[currentLang].invalid_code, 'error');
    }
}

async function handleMFALogin(event) {
    event.preventDefault();
    const code = document.getElementById('mfa-login-code').value;
    const currentLang = localStorage.getItem('language') || 'ku';

    const { data, error } = await supabaseClient.auth.mfa.challengeAndVerify({
        factorId: (await supabaseClient.auth.mfa.listFactors()).data.totp[0].id, // Use first factor
        code: code
    });

    if (error) {
        showToast(translations[currentLang].invalid_code, 'error');
    } else {
        window.location.href = "home.html";
    }
}

function startOtpTimer() {
    let timeLeft = 60;
    const timerElement = document.getElementById('otp-timer');
    const currentLang = localStorage.getItem('language') || 'ku';
    
    timerElement.innerText = timeLeft;
    
    clearInterval(otpTimerInterval);
    otpTimerInterval = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            showToast(translations[currentLang].otp_expired, 'error');
            // Reset to step 1
            document.getElementById('modal-step-2').style.display = 'none';
            document.getElementById('modal-step-1').style.display = 'block';
        }
    }, 1000);
}

// Step 2: Verify OTP
async function handleVerifyOtp(event) {
    event.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const token = document.getElementById('otp-code').value.trim();

    try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: email,
            token: token,
            type: 'email'
        });
        if (error) throw error;

        // Move to Step 3
        clearInterval(otpTimerInterval);
        document.getElementById('modal-step-2').style.display = 'none';
        document.getElementById('modal-step-3').style.display = 'block';
    } catch (error) {
        const currentLang = localStorage.getItem('language') || 'ku';
        showToast(translations[currentLang].error_occurred + error.message, 'error');
    }
}

// Function to update password
async function handleUpdatePassword(event) {
    event.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const currentLang = localStorage.getItem('language') || 'ku';

    if (newPassword !== confirmPassword) {
        showToast(translations[currentLang].password_mismatch, 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;

        showToast(translations[currentLang].password_updated, 'success');
        
        // Sign out the user so they have to login with new password
        const { error: signOutError } = await supabaseClient.auth.signOut();
        if (signOutError) console.error("Error signing out:", signOutError);
        
        setTimeout(() => {
            window.location.href = 'index.html'; // Redirect to login page instead of home
        }, 2000);
    } catch (error) {
        showToast(translations[currentLang].error_occurred + error.message, 'error');
    }
}

// Function to check password strength
function checkPasswordStrength() {
    const password = document.getElementById('new-password').value;
    const meterBars = document.querySelectorAll('#password-strength-meter .strength-bar'); 
    const strengthText = document.getElementById('password-strength-text');
    const currentLang = localStorage.getItem('language') || 'ku';
    
    evaluateStrength(password, meterBars, strengthText, currentLang);
}

function checkSettingsPasswordStrength() {
    const password = document.getElementById('settings-new-password').value;
    const meterBars = document.querySelectorAll('#settings-password-strength-meter .strength-bar');
    const strengthText = document.getElementById('settings-password-strength-text');
    const currentLang = localStorage.getItem('language') || 'ku';

    evaluateStrength(password, meterBars, strengthText, currentLang);
}

function checkSettingsPasswordMatch() {
    const password = document.getElementById('settings-new-password').value;
    const confirm = document.getElementById('settings-confirm-password').value;
    const indicator = document.getElementById('password-match-indicator');
    const currentLang = localStorage.getItem('language') || 'ku';

    if (!confirm) {
        indicator.textContent = '';
        indicator.className = 'match-indicator';
        return;
    }

    if (password === confirm) {
        indicator.innerHTML = `<i class="fas fa-check"></i> ${translations[currentLang].password_match}`;
        indicator.className = 'match-indicator match';
    } else {
        indicator.innerHTML = `<i class="fas fa-times"></i> ${translations[currentLang].password_no_match}`;
        indicator.className = 'match-indicator mismatch';
    }
}

function evaluateStrength(password, meterBars, strengthText, currentLang) {

    let score = 0;
    const regex = {
        lower: /[a-z]/,
        upper: /[A-Z]/,
        number: /[0-9]/,
        special: /[^a-zA-Z0-9]/
    };

    if (password.length >= 8) score++;
    if (regex.lower.test(password)) score++;
    if (regex.upper.test(password)) score++;
    if (regex.number.test(password)) score++;
    if (regex.special.test(password)) score++;
    
    // Reset UI
    meterBars.forEach(bar => bar.className = 'strength-bar');
    strengthText.className = '';
    strengthText.innerText = '';

    if (password.length === 0) return;

    let strength = { level: '', textKey: '' };
    let barsToColor = 0;

    if (score <= 2) {
        strength = { level: 'weak', textKey: 'password_strength_weak' };
        barsToColor = 1;
    } else if (score === 3) {
        strength = { level: 'medium', textKey: 'password_strength_medium' };
        barsToColor = 2;
    } else if (score === 4) {
        strength = { level: 'strong', textKey: 'password_strength_strong' };
        barsToColor = 3;
    } else if (score === 5) {
        strength = { level: 'very-strong', textKey: 'password_strength_very_strong' };
        barsToColor = 4;
    }

    if (strength.level) {
        strengthText.innerText = translations[currentLang][strength.textKey];
        strengthText.classList.add(strength.level);
        for (let i = 0; i < barsToColor; i++) {
            meterBars[i].classList.add(strength.level);
        }
    }
}

// Custom Toast Notification Function
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<i class="fas fa-check-circle" style="color: #2ecc71;"></i>';
    else if (type === 'error') icon = '<i class="fas fa-exclamation-circle" style="color: #e74c3c;"></i>';
    else icon = '<i class="fas fa-info-circle" style="color: var(--primary-color);"></i>';
    
    toast.innerHTML = `${icon}<span>${message}</span>
    <div class="toast-progress">
        <div class="toast-progress-bar"></div>
    </div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutToast 0.5s ease forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
}

// Fetch User Session and Display Email
async function checkUserSession() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const emailElement = document.getElementById('user-email');
    const settingsName = document.getElementById('settings-user-name');
    const settingsEmail = document.getElementById('settings-user-email');
    
    if (user) {
        // Try to get name from metadata, otherwise use email username part
        const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
        if (emailElement) emailElement.innerText = displayName;

        if (settingsName) settingsName.innerText = displayName;
        if (settingsEmail) settingsEmail.innerText = user.email;
        

    } else {
        // Handle logged out state
        if (emailElement) emailElement.innerText = 'Guest';
        if (settingsName) settingsName.innerText = 'Guest';
        if (settingsEmail) settingsEmail.innerText = '';
    }
}

// Handle Online/Offline Status
function setupOnlineStatus() {
    const indicator = document.getElementById('online-indicator');
    
    function updateStatus() {
        if (navigator.onLine) {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    // Initial check
    updateStatus();
}

// --- PWA Installation Logic ---
let deferredPrompt;

function initPWA() {
    // 1. Register Service Worker (This should always run for offline functionality)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(reg => {
                console.log('Service Worker Registered');

                // Check if there's an update waiting
                if (reg.waiting) {
                    showUpdateNotification(reg.waiting);
                    return;
                }

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            showUpdateNotification(newWorker);
                        }
                    });
                });
            }).catch(err => console.log('Service Worker Error:', err));
        });

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }

    // Check if the app is already installed (running in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
        console.log('App is running in standalone mode. No install prompt needed.');
        return; // Exit before setting up any install prompt logic.
    }

    // --- From here on, the code only runs if the app is NOT installed ---

    // iOS Install Modal Logic (Setup listeners)
    const iosInstallModal = document.getElementById('ios-install-modal');
    if (iosInstallModal) {
        const closeIosModalBtn = document.getElementById('close-ios-modal');
        closeIosModalBtn.addEventListener('click', () => {
            iosInstallModal.style.display = 'none';
        });
        window.addEventListener('click', (e) => {
            if (e.target === iosInstallModal) {
                iosInstallModal.style.display = 'none';
            }
        });
    }

    // 2. Handle Install Prompt for Android/Desktop
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67+ from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        
        // Check if we are on the home page by looking for the card element
        const installCard = document.getElementById('pwa-install-card');
        const installOverlay = document.getElementById('pwa-install-overlay');
        
        // Only show if the element exists (which is only in home.html)
        if (installCard) {
            setTimeout(() => {
                installCard.classList.add('show');
                if (installOverlay) installOverlay.classList.add('show');
            }, 2000); // Show after 2 seconds
        }
    });

    // 2.1 Handle iOS (iPhone/iPad)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        // The 'beforeinstallprompt' event won't fire on iOS, so we show the prompt manually.
        const installCard = document.getElementById('pwa-install-card');
        const installOverlay = document.getElementById('pwa-install-overlay');
        if (installCard) {
            setTimeout(() => {
                installCard.classList.add('show');
                if (installOverlay) installOverlay.classList.add('show');
            }, 2000);
            
            // Change button behavior for iOS since we can't auto-install
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) {
                installBtn.innerText = "چۆنیەتی دابەزاندن";
            }
        }
    }

    // 3. Handle Button Clicks
    const installBtn = document.getElementById('pwa-install-btn');
    const dismissBtn = document.getElementById('pwa-dismiss-btn');
    const installCard = document.getElementById('pwa-install-card');
    const installOverlay = document.getElementById('pwa-install-overlay');

    if (installBtn && dismissBtn && installCard) {
        installBtn.addEventListener('click', async () => {
            // Hide the card and overlay first
            if (installOverlay) installOverlay.classList.remove('show');
            installCard.classList.remove('show');

            // Trigger the specific action
            if (deferredPrompt) { // For Android/Desktop
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
            } else if (isIOS) { // For iOS
                // Show the custom instructions modal instead of an alert
                if (iosInstallModal) iosInstallModal.style.display = 'flex';
            }
        });

        dismissBtn.addEventListener('click', () => {
            installCard.classList.remove('show');
            if (installOverlay) installOverlay.classList.remove('show');
            // sessionStorage.setItem('pwa-dismissed', 'true'); // Don't show again in this session
        });
    }
}

// --- Cache Management ---
async function clearAppCache() {
    if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
        
        const currentLang = localStorage.getItem('language') || 'ku';
        showToast(translations[currentLang].cache_cleared, 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
}

function showUpdateNotification(worker) {
    const updateCard = document.getElementById('update-notification');
    const updateBtn = document.getElementById('update-now-btn');
    
    if (updateCard && updateBtn) {
        updateCard.classList.add('show');
        updateBtn.addEventListener('click', () => {
            worker.postMessage({ type: 'SKIP_WAITING' });
        });
    }
}

// --- Settings Page Functions ---
function openChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        document.getElementById('change-password-form').reset();
        // Reset visual indicators
        document.getElementById('password-match-indicator').textContent = '';
        document.querySelectorAll('#settings-password-strength-meter .strength-bar').forEach(b => b.className = 'strength-bar');
        document.getElementById('settings-password-strength-text').textContent = '';
        
        modal.style.display = 'flex';
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.style.display = 'none';
}

async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('settings-old-password').value;
    const newPassword = document.getElementById('settings-new-password').value;
    const confirmPassword = document.getElementById('settings-confirm-password').value;
    const currentLang = localStorage.getItem('language') || 'ku';

    if (newPassword !== confirmPassword) {
        showToast(translations[currentLang].password_mismatch, 'error');
        return;
    }

    // دۆزینەوەی دوگمەکە: لەبەر ئەوەی دوگمەکە لە دەرەوەی فۆڕمەکەیە لە settings.html
    let submitBtn = event.target.querySelector('button[type="submit"]');
    if (!submitBtn && event.target.id) {
        // گەڕان بەدوای دوگمەیەک کە attributeـی formـی هەبێت
        submitBtn = document.querySelector(`button[type="submit"][form="${event.target.id}"]`);
    }

    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // Verify old password
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: user.email,
            password: oldPassword
        });

        if (signInError) {
            throw new Error(translations[currentLang].old_password_incorrect);
        }

        const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;

        showToast(translations[currentLang].password_change_success, 'success');
        
        // Clear form and indicators immediately
        document.getElementById('change-password-form').reset();
        document.getElementById('password-match-indicator').textContent = '';
        document.querySelectorAll('#settings-password-strength-meter .strength-bar').forEach(b => b.className = 'strength-bar');
        document.getElementById('settings-password-strength-text').textContent = '';
        
        closeChangePasswordModal();
    } catch (error) {
        const msg = error.message === "Invalid login credentials" ? translations[currentLang].old_password_incorrect : error.message;
        showToast(msg, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

async function handleSignOutAll() {
    const currentLang = localStorage.getItem('language') || 'ku';
    if (confirm(translations[currentLang].logout_all_confirm)) {
        try {
            const { error } = await supabaseClient.auth.signOut({ scope: 'others' });
            if (error) throw error;
            showToast(translations[currentLang].logout_all_success, 'success');
        } catch (error) {
            showToast(translations[currentLang].error_occurred + error.message, 'error');
        }
    }
}

async function handleSignOutAll() {
    const currentLang = localStorage.getItem('language') || 'ku';
    if (confirm(translations[currentLang].logout_all_confirm)) {
        try {
            const { error } = await supabaseClient.auth.signOut({ scope: 'others' });
            if (error) throw error;
            showToast(translations[currentLang].logout_all_success, 'success');
        } catch (error) {
            showToast(translations[currentLang].error_occurred + error.message, 'error');
        }
    }
}

// --- Edit Profile Functions ---
async function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Populate form
    document.getElementById('edit-full-name').value = user.user_metadata?.full_name || user.email.split('@')[0];
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-profile-password').value = ''; // Clear password field

    modal.style.display = 'flex';
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.style.display = 'none';
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    const currentLang = localStorage.getItem('language') || 'ku';

    const newName = document.getElementById('edit-full-name').value;
    const newEmail = document.getElementById('edit-email').value.trim();
    const password = document.getElementById('edit-profile-password').value;

    const submitBtn = document.querySelector('button[type="submit"][form="edit-profile-form"]');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("User not found");

        // 1. Verify password first
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email: user.email, password: password });
        if (signInError) throw new Error(translations[currentLang].old_password_incorrect);

        // 2. Prepare and perform update
        const updateData = {};
        if (newName !== (user.user_metadata?.full_name || user.email.split('@')[0])) {
            updateData.data = { full_name: newName };
        }
        if (newEmail.toLowerCase() !== user.email) {
            updateData.email = newEmail;
        }

        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabaseClient.auth.updateUser(updateData);
            if (updateError) throw updateError;
            showToast(translations[currentLang].profile_updated_success, 'success');
            await checkUserSession();
        }

        closeEditProfileModal();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}
