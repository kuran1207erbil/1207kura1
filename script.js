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
});

function loadSettings() {
    // وەرگرتنی داتا لە بیرگە
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedLang = localStorage.getItem('language') || 'ku';
    const savedNotifications = localStorage.getItem('notifications');

    // جێبەجێکردنی دۆخی تاریک
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.checked = true;
    }
    updateThemeIcon(savedTheme === 'dark');

    // جێبەجێکردنی زمان
    selectLanguage(savedLang, true); // Apply language settings immediately

    // جێبەجێکردنی ئاگادارکردنەوەکان
    if (savedNotifications === 'true') {
        const notifToggle = document.getElementById('notif-toggle');
        if (notifToggle) notifToggle.checked = true;
    }
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

        window.location.href = "home.html"; // ڕۆیشتن بۆ لاپەڕەی سەرەکی
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
    
    if (user && emailElement) {
        // Try to get name from metadata, otherwise use email username part
        const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
        emailElement.innerText = displayName;
    } else if (emailElement) {
        emailElement.innerText = 'Guest';
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
