// Admin & Commissioner Dashboard Logic

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let tempFeedbackImage = '';
let tempOutputImage = '';
let tempRegisterAvatar = '';
let tempCommissionReceipt = '';
const passwordTimers = {};

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    renderSubmissions();
    renderPaymentsTracker();
    renderFeedbacks();
    renderOutputs();
    renderCalendar();
    renderAboutSections();
    renderTermsSections();
    renderServicesList();
    renderClientAccounts();
    renderCommissionerRegistrations();
    updateBadges();
});

// ============================================
// SVG ICONS & PASSWORD VISIBILITY (5-SEC AUTO HIDE)
// ============================================
const EYE_OPEN_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_CLOSED_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // If currently hidden, reveal it
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = EYE_CLOSED_SVG;
        btn.classList.add('visible');

        // Clear any previous timer
        if (passwordTimers[inputId]) {
            clearTimeout(passwordTimers[inputId]);
        }

        // Set 5-second timer to automatically hide
        passwordTimers[inputId] = setTimeout(() => {
            input.type = 'password';
            btn.innerHTML = EYE_OPEN_SVG;
            btn.classList.remove('visible');
            delete passwordTimers[inputId];
        }, 5000);
    } else {
        // If user manually clicks before 5 seconds, hide immediately
        if (passwordTimers[inputId]) {
            clearTimeout(passwordTimers[inputId]);
            delete passwordTimers[inputId];
        }
        input.type = 'password';
        btn.innerHTML = EYE_OPEN_SVG;
        btn.classList.remove('visible');
    }
}

// ============================================
// LOGO CIRCLE AVATAR CLICK & UPLOAD PREVIEW
// ============================================
function handleAvatarCircleClick() {
    const container = document.getElementById('auth-avatar-container');
    if (container && container.classList.contains('editable')) {
        const fileInput = document.getElementById('reg-avatar-file');
        if (fileInput) fileInput.click();
    }
}

function previewRegisterAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        tempRegisterAvatar = e.target.result;
        const avatarCircle = document.getElementById('auth-header-avatar');
        const innerSpan = document.getElementById('auth-header-avatar-inner');
        if (avatarCircle) {
            avatarCircle.style.backgroundImage = `url(${tempRegisterAvatar})`;
            if (innerSpan) innerSpan.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

function updateSidebarAvatar(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        let session = Storage.get(Storage.KEYS.ADMIN_SESSION, null);
        if (session) {
            session.avatar = base64;
            Storage.set(Storage.KEYS.ADMIN_SESSION, session);
        } else {
            session = {
                accountName: 'Main Admin',
                username: 'admin',
                name: 'Thalie',
                avatar: base64,
                loggedInAt: new Date().toISOString()
            };
            Storage.set(Storage.KEYS.ADMIN_SESSION, session);
        }

        let users = Storage.get(Storage.KEYS.ADMIN_USERS, []);
        if (Array.isArray(users) && users.length > 0) {
            const u = users.find(x => x.username === session.username || x.accountName === session.accountName) || users[users.length - 1];
            if (u) {
                u.avatar = base64;
                Storage.set(Storage.KEYS.ADMIN_USERS, users);
            }
        } else {
            users = [{
                accountName: session.accountName || 'Thalie',
                username: session.username || 'admin',
                avatar: base64,
                createdAt: new Date().toISOString()
            }];
            Storage.set(Storage.KEYS.ADMIN_USERS, users);
        }

        checkAuth();
        showToast('Profile photo updated successfully!');
    };
    reader.readAsDataURL(file);
}

// ============================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================
function checkAuth() {
    const session = Storage.get(Storage.KEYS.ADMIN_SESSION, null);
    const authWrapper = document.getElementById('auth-wrapper');
    
    if (session && (session.username || session.accountName)) {
        if (authWrapper) authWrapper.classList.add('hidden');
        const displayName = session.accountName || session.name || session.username;
        const headerName = document.getElementById('header-user-name');
        const sidebarName = document.getElementById('sidebar-user-name');
        if (headerName) headerName.textContent = displayName;
        if (sidebarName) sidebarName.textContent = displayName;

        // Display custom avatar if available
        if (session.avatar) {
            const sideAvatar = document.getElementById('sidebar-user-avatar');
            if (sideAvatar) {
                sideAvatar.innerHTML = `<img src="${session.avatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            }
        }
        const accountsNav = document.querySelector('.admin-nav-item[data-tab="accounts"]');
        if (accountsNav) accountsNav.style.display = isMainAdminSession() ? '' : 'none';
    } else {
        if (authWrapper) authWrapper.classList.remove('hidden');
        const accountsNav = document.querySelector('.admin-nav-item[data-tab="accounts"]');
        if (accountsNav) accountsNav.style.display = 'none';
    }
}

function isMainAdminSession() {
    const session = Storage.get(Storage.KEYS.ADMIN_SESSION, null);
    return !!session && session.username === 'admin' && session.accountName === 'Main Admin';
}

function switchAuthTab(tab) {
    const btnLogin = document.getElementById('tab-btn-login');
    const btnRegister = document.getElementById('tab-btn-register');
    const panelLogin = document.getElementById('auth-login-panel');
    const panelRegister = document.getElementById('auth-register-panel');
    const panelReset = document.getElementById('auth-reset-panel');
    const tabs = document.querySelector('.auth-tabs');
    const errLogin = document.getElementById('login-error-msg');
    const errReg = document.getElementById('register-error-msg');
    const avatarContainer = document.getElementById('auth-avatar-container');

    if (errLogin) errLogin.style.display = 'none';
    if (errReg) errReg.style.display = 'none';
    if (panelReset) panelReset.classList.remove('active');
    if (tabs) tabs.style.display = 'flex';

    if (tab === 'login') {
        btnLogin.classList.add('active');
        btnRegister.classList.remove('active');
        panelLogin.classList.add('active');
        panelRegister.classList.remove('active');
        if (avatarContainer) avatarContainer.classList.remove('editable');
    } else {
        btnRegister.classList.add('active');
        btnLogin.classList.remove('active');
        panelRegister.classList.add('active');
        panelLogin.classList.remove('active');
        if (avatarContainer) avatarContainer.classList.add('editable');
    }
}

function openPasswordResetPanel() {
    document.getElementById('auth-login-panel')?.classList.remove('active');
    document.getElementById('auth-register-panel')?.classList.remove('active');
    document.getElementById('auth-reset-panel')?.classList.add('active');
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) tabs.style.display = 'none';
    const message = document.getElementById('reset-error-msg');
    if (message) message.style.display = 'none';
    const loginError = document.getElementById('login-error-msg');
    if (loginError) loginError.style.display = 'none';
    document.getElementById('reset-account-name')?.focus();
}

function backToSignIn() {
    document.getElementById('auth-reset-panel')?.classList.remove('active');
    document.getElementById('auth-login-panel')?.classList.add('active');
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) tabs.style.display = 'flex';
    const message = document.getElementById('reset-error-msg');
    if (message) message.style.display = 'none';
}

function resetCommissionerPassword(event) {
    event.preventDefault();
    const accountName = document.getElementById('reset-account-name').value.trim().toLowerCase();
    const password = document.getElementById('reset-new-password').value;
    const confirmation = document.getElementById('reset-confirm-password').value;
    const errorEl = document.getElementById('reset-error-msg');
    const showError = message => {
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    };

    if (password.length < 4) return showError('Password must be at least 4 characters.');
    if (password !== confirmation) return showError('Passwords do not match. Please re-enter.');

    const users = Storage.get(Storage.KEYS.ADMIN_USERS, []);
    const user = users.find(candidate => [candidate.username, candidate.accountName, candidate.name]
        .some(value => String(value || '').trim().toLowerCase() === accountName));
    if (!user) return showError('No commissioner account was found with that name.');

    user.password = password;
    Storage.set(Storage.KEYS.ADMIN_USERS, users);
    document.getElementById('login-username').value = user.accountName || user.username || accountName;
    document.getElementById('login-password').value = '';
    document.getElementById('reset-password-form')?.reset();
    backToSignIn();
    const loginError = document.getElementById('login-error-msg');
    if (loginError) {
        loginError.textContent = 'Password updated. Sign in with your new password.';
        loginError.style.display = 'block';
    }
}

function handleLoginSubmit(event) {
    event.preventDefault();
    const accountNameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error-msg');

    const users = Storage.get(Storage.KEYS.ADMIN_USERS, []);
    const mainAdmin = users.find(u => (u.username || '').toLowerCase() === 'admin');

    // Keep the built-in fallback only when the default admin record is missing.
    if ((accountNameInput === 'admin' || accountNameInput === 'thalie') &&
        ((mainAdmin && mainAdmin.password === passwordInput) || (!mainAdmin && passwordInput === 'password123'))) {
        if (errorEl) errorEl.style.display = 'none';
        const session = {
            accountName: 'Main Admin',
            username: 'admin',
            name: 'Thalie',
            avatar: '',
            loggedInAt: new Date().toISOString()
        };
        Storage.set(Storage.KEYS.ADMIN_SESSION, session);
        checkAuth();
        showToast('Welcome back, Main Admin!');
        return;
    }

    // 2. Check registered commissioner accounts
    const foundUser = users.find(u => {
        const uName = (u.username || '').toLowerCase();
        const aName = (u.accountName || '').toLowerCase();
        return (uName === accountNameInput || aName === accountNameInput) && u.password === passwordInput;
    });

    if (foundUser) {
        if (foundUser.approvalStatus === 'pending') {
            if (errorEl) {
                errorEl.textContent = 'Your registration is waiting for Main Admin approval.';
                errorEl.style.display = 'block';
            }
            return;
        }
        if (foundUser.approvalStatus === 'rejected') {
            if (errorEl) {
                errorEl.textContent = 'This registration was declined. Please contact the Main Admin.';
                errorEl.style.display = 'block';
            }
            return;
        }
        if (errorEl) errorEl.style.display = 'none';
        const session = {
            accountName: foundUser.accountName || foundUser.username,
            username: foundUser.username,
            name: foundUser.accountName || foundUser.name || foundUser.username,
            avatar: foundUser.avatar || '',
            loggedInAt: new Date().toISOString()
        };
        Storage.set(Storage.KEYS.ADMIN_SESSION, session);
        checkAuth();
        showToast(`Welcome, ${session.accountName}!`);
    } else {
        if (errorEl) {
            errorEl.textContent = 'Invalid commissioner account name or password.';
            errorEl.style.display = 'block';
        }
    }
}

function handleRegisterSubmit(event) {
    event.preventDefault();
    const accountName = document.getElementById('reg-account-name').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const errorEl = document.getElementById('register-error-msg');
    const successEl = document.getElementById('register-success-msg');
    if (successEl) successEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    if (password !== confirm) {
        if (errorEl) {
            errorEl.textContent = 'Passwords do not match. Please re-enter.';
            errorEl.style.display = 'block';
        }
        return;
    }

    if (password.length < 4) {
        if (errorEl) {
            errorEl.textContent = 'Password must be at least 4 characters.';
            errorEl.style.display = 'block';
        }
        return;
    }

    const users = Storage.get(Storage.KEYS.ADMIN_USERS, []);
    const exists = users.find(u => 
        (u.username || '').toLowerCase() === accountName.toLowerCase() ||
        (u.accountName || '').toLowerCase() === accountName.toLowerCase()
    );

    if (exists) {
        if (errorEl) {
            errorEl.textContent = 'This commissioner account name is already registered.';
            errorEl.style.display = 'block';
        }
        return;
    }

    const newUser = {
        id: 'COMM-' + Date.now(),
        accountName: accountName,
        username: accountName.toLowerCase(),
        name: accountName,
        password: password,
        avatar: tempRegisterAvatar,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending',
        paid: false
    };

    users.push(newUser);
    Storage.set(Storage.KEYS.ADMIN_USERS, users);
    event.target.reset();
    tempRegisterAvatar = '';
    switchAuthTab('login');
    if (successEl) {
        successEl.textContent = 'Registration submitted. The Main Admin must approve your account before you can sign in.';
        successEl.style.display = 'block';
    }
    renderCommissionerRegistrations();
    updateBadges();
}

function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    localStorage.removeItem(Storage.KEYS.ADMIN_SESSION);
    document.getElementById('login-password').value = '';
    const authWrapper = document.getElementById('auth-wrapper');
    if (authWrapper) authWrapper.classList.remove('hidden');
    switchAuthTab('login');
    showToast('You have been logged out.');
}

// Toast notification
function showToast(message) {
    const toast = document.getElementById('admin-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

// Navigation Tabs
function initNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            if (!tabName) return;
            if (tabName === 'accounts' && !isMainAdminSession()) {
                showToast('Only the Main Admin can manage account approvals.');
                return;
            }

            navItems.forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(section => {
                section.classList.remove('active');
            });

            const activeSection = document.getElementById(`tab-${tabName}`);
            if (activeSection) {
                activeSection.classList.add('active');
            }

            if (tabName === 'about') renderAboutSections();
            if (tabName === 'terms') renderTermsSections();
            if (tabName === 'services') renderServicesList();
            if (tabName === 'calendar') renderCalendar();
            if (tabName === 'submissions') renderSubmissions();
            if (tabName === 'payments') renderPaymentsTracker();
            if (tabName === 'feedback') renderFeedbacks();
            if (tabName === 'output') renderOutputs();
            if (tabName === 'accounts') {
                renderClientAccounts();
                renderCommissionerRegistrations();
            }
        });
    });
}

// Modal handling
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// Image File to Base64 helper
function previewImageFile(event, previewBoxId) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        const box = document.getElementById(previewBoxId);
        if (box) {
            box.style.backgroundImage = `url(${base64})`;
            box.innerHTML = '';
        }
        if (previewBoxId === 'fb-preview-box') {
            tempFeedbackImage = base64;
        } else if (previewBoxId === 'out-preview-box') {
            tempOutputImage = base64;
        }
    };
    reader.readAsDataURL(file);
}

// ============================================
// 1. SUBMISSIONS & COMMISSION MANAGEMENT
// ============================================
function updateBadges() {
    const submissions = Storage.get(Storage.KEYS.SUBMISSIONS, []);
    const feedbacks = Storage.get(Storage.KEYS.FEEDBACKS, []);
    const outputs = Storage.get(Storage.KEYS.OUTPUTS, []);

    const bComm = document.getElementById('badge-commissions');
    if (bComm) bComm.textContent = submissions.length;

    const bFb = document.getElementById('badge-feedback');
    if (bFb) bFb.textContent = feedbacks.length;

    const bOut = document.getElementById('badge-output');
    if (bOut) bOut.textContent = outputs.length;

    const bPay = document.getElementById('badge-payments');
    if (bPay) {
        const payments = Storage.get(Storage.KEYS.PAYMENTS, []);
        bPay.textContent = payments.length;
    }

    // Client Accounts badge (pending count)
    const clientAccounts = Storage.get(Storage.KEYS.CLIENT_ACCOUNTS, []);
    const commissionerAccounts = Storage.get(Storage.KEYS.ADMIN_USERS, []);
    const pendingCommissionerCount = commissionerAccounts.filter(a => a.approvalStatus === 'pending').length;
    const pendingCount = clientAccounts.filter(a => a.status === 'pending').length + pendingCommissionerCount;
    const bAcc = document.getElementById('badge-accounts');
    if (bAcc) bAcc.textContent = pendingCount;
    const bPending = document.getElementById('badge-pending-accounts');
    if (bPending) bPending.textContent = pendingCount;
    const bPendingCommissioners = document.getElementById('badge-pending-commissioners');
    if (bPendingCommissioners) bPendingCommissioners.textContent = pendingCommissionerCount;

    // Stats
    const countAccepted = submissions.filter(s => s.status === 'Accepted').length;
    const countProgress = submissions.filter(s => s.status === 'In Progress').length;
    const countDone = submissions.filter(s => s.status === 'Done').length;
    const countTurned = submissions.filter(s => s.status === 'Turned Over').length;

    const elAcc = document.getElementById('stat-accepted');
    const elProg = document.getElementById('stat-progress');
    const elDone = document.getElementById('stat-done');
    const elTurn = document.getElementById('stat-turned');

    if (elAcc) elAcc.textContent = countAccepted;
    if (elProg) elProg.textContent = countProgress;
    if (elDone) elDone.textContent = countDone;
    if (elTurn) elTurn.textContent = countTurned;
}

function getStatusPillClass(status) {
    switch (status) {
        case 'Accepted': return 'status-accepted';
        case 'In Progress': return 'status-in-progress';
        case 'Done': return 'status-done';
        case 'Turned Over': return 'status-turned-over';
        default: return 'status-accepted';
    }
}

let activeStatusCardFilter = 'all';

function filterByStatusCard(status) {
    if (activeStatusCardFilter === status) {
        activeStatusCardFilter = 'all';
    } else {
        activeStatusCardFilter = status;
    }
    const select = document.getElementById('filter-status');
    if (select) select.value = activeStatusCardFilter;
    syncStatCardsHighlight();
    renderSubmissions();
}

function handleFilterDropdownChange(status) {
    activeStatusCardFilter = status;
    syncStatCardsHighlight();
    renderSubmissions();
}

function syncStatCardsHighlight() {
    ['accepted', 'progress', 'done', 'turned'].forEach(id => {
        document.getElementById(`card-filter-${id}`)?.classList.remove('active-filter');
    });

    if (activeStatusCardFilter === 'Accepted') document.getElementById('card-filter-accepted')?.classList.add('active-filter');
    if (activeStatusCardFilter === 'In Progress') document.getElementById('card-filter-progress')?.classList.add('active-filter');
    if (activeStatusCardFilter === 'Done') document.getElementById('card-filter-done')?.classList.add('active-filter');
    if (activeStatusCardFilter === 'Turned Over') document.getElementById('card-filter-turned')?.classList.add('active-filter');
}

function renderSubmissions() {
    const filter = document.getElementById('filter-status')?.value || activeStatusCardFilter || 'all';
    let submissions = Storage.get(Storage.KEYS.SUBMISSIONS, []);

    if (filter !== 'all') {
        submissions = submissions.filter(s => s.status === filter);
    }

    const tbody = document.getElementById('submissions-tbody');
    if (!tbody) return;

    if (submissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:#886560; font-family:'Special Elite', monospace;">No commissions found.</td></tr>`;
        updateBadges();
        return;
    }

    tbody.innerHTML = submissions.map(sub => {
        const isFullyPaid = sub.paymentType === 'fully_paid';
        const paymentLabel = isFullyPaid ? 'Fully Paid' : '50% DP';
        const badgeClass = isFullyPaid ? 'badge-fully-paid' : 'badge-downpayment';

        return `
        <tr>
            <td>
                <div style="font-weight: bold; font-size: 14.5px; color: var(--maroon-dark);">${sub.name}</div>
                <small style="color: #886560;">${sub.contact || sub.email || ''}</small>
            </td>
            <td style="color: #2a1010; font-weight: 500;">${sub.service}</td>
            <td style="color: #2a1010;">${sub.deadline || 'Flexible'}</td>
            <td>
                <div style="font-weight: 700; text-transform: uppercase; color: var(--maroon-dark); font-size: 13px;">${sub.payment || 'GCash'}</div>
                <span class="payment-badge ${badgeClass}">${paymentLabel}</span>
            </td>
            <td>
                <select class="btn-status-select ${getStatusPillClass(sub.status)}" 
                        onchange="changeCommissionStatus('${sub.id}', this.value)">
                    <option value="Accepted" ${sub.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                    <option value="In Progress" ${sub.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Done" ${sub.status === 'Done' ? 'selected' : ''}>Done</option>
                    <option value="Turned Over" ${sub.status === 'Turned Over' ? 'selected' : ''}>Turned Over</option>
                </select>
            </td>
            <td>
                <button class="btn-action btn-primary" onclick="viewSubmissionDetail('${sub.id}')">View</button>
                <button class="btn-action btn-danger" onclick="deleteSubmission('${sub.id}')">Delete</button>
            </td>
        </tr>
    `}).join('');

    updateBadges();
}

function changeCommissionStatus(id, newStatus) {
    const list = Storage.get(Storage.KEYS.SUBMISSIONS, []);
    const item = list.find(s => s.id === id);
    if (item) {
        item.status = newStatus;
        Storage.set(Storage.KEYS.SUBMISSIONS, list);
        showToast(`Status updated to "${newStatus}" for ${item.name}`);
        renderSubmissions();
    }
}

function viewSubmissionDetail(id) {
    const list = Storage.get(Storage.KEYS.SUBMISSIONS, []);
    const sub = list.find(s => s.id === id);
    if (!sub) return;

    // Strict modal title without client name
    document.getElementById('modal-sub-id').textContent = 'Commission Details';
    const container = document.getElementById('modal-sub-content');

    const isFullyPaid = sub.paymentType === 'fully_paid';
    const paymentLabel = isFullyPaid ? 'Fully Paid' : '50% DP';
    const badgeClass = isFullyPaid ? 'badge-fully-paid' : 'badge-downpayment';

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px dashed #d4c4b0; padding-bottom: 10px;">
            <div>
                <span class="status-pill ${getStatusPillClass(sub.status)}">${sub.status}</span>
            </div>
            <small style="color: #886560; font-family:'Special Elite', monospace;">Submitted: ${sub.submittedAt || 'Recently'}</small>
        </div>

        <div class="admin-form-group">
            <label style="color: var(--maroon); font-weight: bold;">Client Information</label>
            <div class="modal-detail-box">
                <div style="font-weight: 700; font-size: 15px; color: var(--maroon-dark); font-family: 'Playfair Display', serif;">${sub.name}</div>
                ${sub.contact ? `<div style="font-size: 13px; color: #5a2e2e; margin-top: 4px;"><strong>Contact:</strong> ${sub.contact}</div>` : ''}
                ${sub.email ? `<div style="font-size: 13px; color: #5a2e2e; margin-top: 2px;"><strong>Email:</strong> ${sub.email}</div>` : ''}
            </div>
        </div>

        <div class="admin-form-group">
            <label style="color: var(--maroon); font-weight: bold;">Requested Service</label>
            <div class="modal-detail-box">
                ${sub.service} <span style="font-size: 12px; color: #7a4e4e; font-weight: normal;">(${sub.category || 'General Service'})</span>
            </div>
        </div>

        <div class="admin-form-group">
            <label style="color: var(--maroon); font-weight: bold;">Project Description</label>
            <div class="modal-detail-box">
                ${sub.description || 'No description provided.'}
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
                <label style="color: var(--maroon); font-size: 11px; text-transform: uppercase; font-family:'Special Elite', monospace; font-weight: bold; display: block; margin-bottom: 6px;">Target Deadline</label>
                <div class="modal-detail-box">
                    ${sub.deadline || 'Flexible'}
                </div>
            </div>
            <div>
                <label style="color: var(--maroon); font-size: 11px; text-transform: uppercase; font-family:'Special Elite', monospace; font-weight: bold; display: block; margin-bottom: 6px;">Payment Method &amp; Type</label>
                <div class="modal-detail-box" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <span style="text-transform: uppercase; font-weight: 700;">${sub.payment || 'GCash'}</span>
                    <span class="payment-badge ${badgeClass}">${paymentLabel}</span>
                </div>
            </div>
        </div>

        ${sub.notes ? `
            <div class="admin-form-group">
                <label style="color: var(--maroon); font-weight: bold;">Additional Client Notes</label>
                <div class="modal-detail-box">
                    ${sub.notes}
                </div>
            </div>
        ` : ''}

        <div class="admin-form-group">
            <label style="color: var(--maroon); font-weight: bold;">
                GCash / Payment Proof Screenshot (${paymentLabel})
            </label>
            <div class="modal-detail-box" style="text-align: center; padding: 14px;">
                ${sub.downpaymentReceipt ? `
                    <a href="${sub.downpaymentReceipt}" target="_blank" title="Click to view full screenshot in new tab">
                        <img src="${sub.downpaymentReceipt}" alt="Payment Proof" style="max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 6px; box-shadow: 0 3px 10px rgba(0,0,0,0.15); cursor: pointer;">
                    </a>
                    <div style="margin-top: 8px; font-size: 11px; color: #7a4e4e;">Click image to expand in new tab</div>
                ` : `
                    <div style="color: #886560; font-style: italic; font-size: 13px; padding: 8px 0;">No proof screenshot attached for this submission.</div>
                `}
            </div>
        </div>

        <div style="margin-top: 22px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn-action btn-secondary" onclick="recordPaymentFromCommission('${sub.id}')">+ Log Payment in Sheet</button>
            <button class="btn-action btn-primary" onclick="closeModal('modal-view-submission')">Close</button>
        </div>
    `;

    openModal('modal-view-submission');
}

function deleteSubmission(id) {
    if (!confirm('Are you sure you want to delete this commission submission?')) return;
    let list = Storage.get(Storage.KEYS.SUBMISSIONS, []);
    list = list.filter(s => s.id !== id);
    Storage.set(Storage.KEYS.SUBMISSIONS, list);
    showToast('Commission removed.');
    renderSubmissions();
}

function recordPaymentFromCommission(commId) {
    closeModal('modal-view-submission');
    const list = Storage.get(Storage.KEYS.SUBMISSIONS, []);
    const sub = list.find(s => s.id === commId);
    if (!sub) return;

    // Switch to payments tab
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector('.admin-nav-item[data-tab="payments"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-payments')?.classList.add('active');
    renderPaymentsTracker();

    // Open record payment modal prefilled with this commission
    openRecordPaymentModal();
    const clientInput = document.getElementById('pay-client-name');
    const serviceSelect = document.getElementById('pay-service');
    const modeSelect = document.getElementById('pay-mode');
    const optionSelect = document.getElementById('pay-option');
    const notesInput = document.getElementById('pay-notes');
    const previewWrap = document.getElementById('pay-receipt-preview-wrap');
    const previewImg = document.getElementById('pay-receipt-preview-img');

    if (clientInput) clientInput.value = sub.name || '';
    if (serviceSelect) serviceSelect.value = sub.service || 'Website Development';
    if (modeSelect) modeSelect.value = sub.payment || 'GCash';
    if (optionSelect) optionSelect.value = sub.paymentType || 'fully_paid';
    if (notesInput) notesInput.value = 'Commission #' + sub.id;
    if (sub.downpaymentReceipt) {
        tempPaymentReceipt = sub.downpaymentReceipt;
        if (previewImg) previewImg.src = sub.downpaymentReceipt;
        if (previewWrap) previewWrap.style.display = 'block';
    }
}

function previewCommissionReceipt(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        tempCommissionReceipt = e.target.result;
        const box = document.getElementById('comm-receipt-preview-box');
        if (box) {
            box.style.backgroundImage = `url(${tempCommissionReceipt})`;
            box.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

function toggleAdminPaymentOther(val) {
    const otherInput = document.getElementById('comm-payment-other');
    if (otherInput) {
        if (val === 'other') {
            otherInput.style.display = 'block';
            otherInput.focus();
        } else {
            otherInput.style.display = 'none';
        }
    }
}

function openAddCommissionModal() {
    tempCommissionReceipt = '';
    const receiptInput = document.getElementById('comm-receipt-file');
    if (receiptInput) receiptInput.value = '';
    const receiptBox = document.getElementById('comm-receipt-preview-box');
    if (receiptBox) {
        receiptBox.style.backgroundImage = 'none';
        receiptBox.innerHTML = '<span class="upload-text">Click to attach payment proof receipt / screenshot</span>';
    }

    document.getElementById('comm-client').value = '';
    const accInput = document.getElementById('comm-contact-account');
    if (accInput) accInput.value = '';
    const chSelect = document.getElementById('comm-contact-channel');
    if (chSelect) chSelect.value = 'Facebook';
    document.getElementById('comm-service').value = '';
    document.getElementById('comm-desc').value = '';
    document.getElementById('comm-deadline').value = '';
    const ptSelect = document.getElementById('comm-payment-type');
    if (ptSelect) ptSelect.value = 'downpayment';
    const paySelect = document.getElementById('comm-payment');
    if (paySelect) paySelect.value = 'gcash';
    const otherInput = document.getElementById('comm-payment-other');
    if (otherInput) {
        otherInput.value = '';
        otherInput.style.display = 'none';
    }

    openModal('modal-edit-commission');
}

function handleSaveCommission(event) {
    event.preventDefault();
    const list = Storage.get(Storage.KEYS.SUBMISSIONS, []);
    const newId = 'COM-' + (1000 + list.length + 1);

    const channel = document.getElementById('comm-contact-channel')?.value || 'Contact';
    const account = document.getElementById('comm-contact-account')?.value.trim() || '';
    const fullContact = account ? `${channel}: ${account}` : '';

    let paymentMethod = document.getElementById('comm-payment').value;
    if (paymentMethod === 'other') {
        const customTyped = document.getElementById('comm-payment-other')?.value.trim();
        paymentMethod = customTyped || 'Other';
    }

    const newSub = {
        id: newId,
        name: document.getElementById('comm-client').value,
        email: '',
        contact: fullContact,
        service: document.getElementById('comm-service').value,
        category: 'Custom Commission',
        description: document.getElementById('comm-desc').value,
        deadline: document.getElementById('comm-deadline').value,
        payment: paymentMethod,
        paymentType: document.getElementById('comm-payment-type')?.value || 'downpayment',
        downpaymentReceipt: tempCommissionReceipt,
        notes: '',
        status: document.getElementById('comm-status').value,
        submittedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    list.unshift(newSub);
    Storage.set(Storage.KEYS.SUBMISSIONS, list);
    closeModal('modal-edit-commission');
    showToast(`Commission ${newId} created!`);
    renderSubmissions();
}

// ============================================
// 2. FEEDBACK IMAGE MANAGEMENT
// ============================================
let tempDefaultProofImage = '';

function openDefaultProofModal() {
    tempDefaultProofImage = Storage.getDefaultFeedbackImage();
    const box = document.getElementById('default-proof-preview-box');
    if (box) {
        box.style.backgroundImage = `url("${tempDefaultProofImage}")`;
        box.innerHTML = '';
    }
    const fileInput = document.getElementById('default-proof-file');
    if (fileInput) fileInput.value = '';
    openModal('modal-default-proof');
}

function previewDefaultProofImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        tempDefaultProofImage = e.target.result;
        const box = document.getElementById('default-proof-preview-box');
        if (box) {
            box.style.backgroundImage = `url("${tempDefaultProofImage}")`;
            box.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

function saveDefaultProofImage() {
    if (!tempDefaultProofImage) {
        alert('Please choose or upload an image first.');
        return;
    }
    Storage.set(Storage.KEYS.DEFAULT_FEEDBACK_IMAGE, tempDefaultProofImage);
    closeModal('modal-default-proof');
    showToast('Default feedback proof image updated!');
    renderFeedbacks();
}

function resetDefaultProofImage() {
    tempDefaultProofImage = Storage.SYSTEM_FALLBACK_FEEDBACK_IMAGE;
    Storage.set(Storage.KEYS.DEFAULT_FEEDBACK_IMAGE, tempDefaultProofImage);
    const box = document.getElementById('default-proof-preview-box');
    if (box) {
        box.style.backgroundImage = `url("${tempDefaultProofImage}")`;
        box.innerHTML = '';
    }
    showToast('Reset to system default proof image.');
    renderFeedbacks();
}

function formatGCashName(name) {
    if (!name) return 'C••••';
    const clean = name.trim();
    if (clean.includes('•') || clean.includes('...')) return clean;
    const parts = clean.split(/\s+/);
    if (parts.length === 1) {
        return `${parts[0][0].toUpperCase()}••••`;
    }
    const firstInitial = parts[0][0].toUpperCase();
    const lastInitial = parts[parts.length - 1][0].toUpperCase();
    return `${firstInitial}•••• ${lastInitial}.`;
}

function renderFeedbacks() {
    const list = Storage.get(Storage.KEYS.FEEDBACKS, []);
    const container = document.getElementById('feedback-grid-admin');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #a88880; padding: 30px;">No feedback images uploaded yet.</div>`;
        return;
    }

    const defaultImg = Storage.getDefaultFeedbackImage();

    container.innerHTML = list.map(item => {
        const proofImg = Storage.resolveAssetPath(item.imageUrl || defaultImg);
        return `
        <div class="admin-item-card">
            <div class="img-thumb">
                <img src="${proofImg}" alt="Feedback Proof" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="admin-item-body">
                <h4 style="font-family:'Special Elite', monospace; font-size: 15px; color: var(--maroon-dark);" title="Client: ${item.clientName}">${formatGCashName(item.clientName)}</h4>
                <p style="font-size: 12px; color: #5a2e2e; margin-top: 2px;"><strong>Project:</strong> ${item.project || 'General Service'}</p>
                ${item.notes ? `
                    <div style="margin-top: 8px; background: #fdf8f4; border: 1px solid #ebdccf; border-radius: 6px; padding: 8px 10px; font-size: 12.5px; color: #2a0e0e; line-height: 1.4;">
                        <span style="font-size: 10px; font-family:'Special Elite', monospace; color: var(--maroon); text-transform: uppercase; display: block; margin-bottom: 2px;">Client Feedback:</span>
                        ${item.notes}
                    </div>
                ` : ''}
                <div class="admin-item-actions">
                    <button class="btn-action btn-danger" onclick="deleteFeedback('${item.id}')">Delete</button>
                </div>
            </div>
        </div>
    `}).join('');

    updateBadges();
}

function openAddFeedbackModal() {
    tempFeedbackImage = '';
    document.getElementById('fb-client').value = '';
    document.getElementById('fb-project').value = '';
    document.getElementById('fb-notes').value = '';
    document.getElementById('fb-image-file').value = '';
    const box = document.getElementById('fb-preview-box');
    box.style.backgroundImage = 'none';
    box.innerHTML = '<span class="upload-text">Click to choose image or drag &amp; drop screenshot here</span>';
    openModal('modal-add-feedback');
}

function handleSaveFeedback(event) {
    event.preventDefault();
    const list = Storage.get(Storage.KEYS.FEEDBACKS, []);

    const newFb = {
        id: 'fb-' + Date.now(),
        clientName: document.getElementById('fb-client').value.trim(),
        project: document.getElementById('fb-project').value.trim(),
        notes: document.getElementById('fb-notes').value.trim(),
        date: new Date().toISOString().split('T')[0],
        imageUrl: tempFeedbackImage
    };

    list.unshift(newFb);
    Storage.set(Storage.KEYS.FEEDBACKS, list);
    if (tempFeedbackImage) {
        Storage.set(Storage.KEYS.DEFAULT_FEEDBACK_IMAGE, tempFeedbackImage);
    }
    closeModal('modal-add-feedback');
    showToast('Feedback image uploaded!');
    renderFeedbacks();
}

function deleteFeedback(id) {
    if (!confirm('Delete this feedback review?')) return;
    let list = Storage.get(Storage.KEYS.FEEDBACKS, []);
    list = list.filter(f => f.id !== id);
    Storage.set(Storage.KEYS.FEEDBACKS, list);
    showToast('Feedback deleted.');
    renderFeedbacks();
}

// ============================================
// 3. OUTPUT MANAGEMENT & DYNAMIC CATEGORIES
// ============================================
let tempOutputSamples = [];
let adminCurrentOutputFilter = 'all';

function getOutputCategories() {
    let cats = Storage.get(Storage.KEYS.OUTPUT_CATEGORIES, []);
    if (!Array.isArray(cats)) cats = [];
    return cats;
}

function renderAdminOutputFilterBar() {
    const filterContainer = document.getElementById('admin-output-filter-bar');
    if (!filterContainer) return;

    const cats = getOutputCategories();

    filterContainer.innerHTML = `
        <button type="button" class="filter-btn ${adminCurrentOutputFilter === 'all' ? 'active' : ''}" onclick="setAdminOutputFilter('all')">All Outputs</button>
        ${cats.map(cat => `
            <button type="button" class="filter-btn ${adminCurrentOutputFilter === cat ? 'active' : ''}" onclick="setAdminOutputFilter('${escapeHtml(cat)}')">${escapeHtml(cat)}</button>
        `).join('')}
        <button type="button" class="filter-btn filter-btn-manage" onclick="openManageCategoriesModal()">+ Edit Categories</button>
    `;
}

function setAdminOutputFilter(cat) {
    adminCurrentOutputFilter = cat;
    renderAdminOutputFilterBar();
    renderOutputs();
}

function openManageCategoriesModal() {
    renderManageCategoriesList();
    const input = document.getElementById('new-category-input');
    if (input) input.value = '';
    openModal('modal-manage-categories');
}

function renderManageCategoriesList() {
    const container = document.getElementById('manage-categories-list');
    if (!container) return;

    const cats = getOutputCategories();
    if (cats.length === 0) {
        container.innerHTML = '<div style="color:#8c5b52; font-size:12px; font-style:italic;">No categories found.</div>';
        return;
    }

    container.innerHTML = cats.map((cat, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #dcd0c2;">
            <span style="font-family:'Special Elite', monospace; font-size: 13px; color: var(--maroon-dark); font-weight: 600;">${escapeHtml(cat)}</span>
            <div style="display: flex; gap: 6px;">
                <button type="button" onclick="renameCategoryPrompt('${escapeHtml(cat)}')" class="btn-action btn-secondary" style="padding: 2px 8px; font-size: 11px;">Rename</button>
                <button type="button" onclick="deleteCategoryPrompt('${escapeHtml(cat)}')" class="btn-action btn-danger" style="padding: 2px 8px; font-size: 11px;">Delete</button>
            </div>
        </div>
    `).join('');
}

function addNewCategoryFromModal() {
    const input = document.getElementById('new-category-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    let cats = getOutputCategories();
    if (cats.some(c => c.toLowerCase() === name.toLowerCase())) {
        alert('This category already exists.');
        return;
    }

    cats.push(name);
    Storage.set(Storage.KEYS.OUTPUT_CATEGORIES, cats);
    input.value = '';
    showToast(`Category "${name}" added!`);
    renderManageCategoriesList();
    renderAdminOutputFilterBar();
    populateCategorySelect(name);
    renderOutputs();
}

function renameCategoryPrompt(oldName) {
    const newName = prompt(`Rename category "${oldName}" to:`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const trimmed = newName.trim();

    let cats = getOutputCategories();
    const idx = cats.indexOf(oldName);
    if (idx !== -1) {
        cats[idx] = trimmed;
        Storage.set(Storage.KEYS.OUTPUT_CATEGORIES, cats);

        // Update existing projects with this category
        let list = Storage.get(Storage.KEYS.OUTPUTS, []);
        let updated = false;
        list.forEach(item => {
            if (item.category === oldName) {
                item.category = trimmed;
                updated = true;
            }
        });
        if (updated) Storage.set(Storage.KEYS.OUTPUTS, list);

        if (adminCurrentOutputFilter === oldName) {
            adminCurrentOutputFilter = trimmed;
        }

        showToast(`Category renamed to "${trimmed}"`);
        renderManageCategoriesList();
        renderAdminOutputFilterBar();
        populateCategorySelect(trimmed);
        renderOutputs();
    }
}

function deleteCategoryPrompt(catName) {
    if (!confirm(`Delete category "${catName}"? Existing projects will be kept under "Uncategorized".`)) return;

    let cats = getOutputCategories();
    cats = cats.filter(c => c !== catName);
    Storage.set(Storage.KEYS.OUTPUT_CATEGORIES, cats);

    // Update existing projects
    let list = Storage.get(Storage.KEYS.OUTPUTS, []);
    let updated = false;
    list.forEach(item => {
        if (item.category === catName) {
            item.category = 'Uncategorized';
            updated = true;
        }
    });
    if (updated) Storage.set(Storage.KEYS.OUTPUTS, list);

    if (adminCurrentOutputFilter === catName) {
        adminCurrentOutputFilter = 'all';
    }

    showToast(`Category "${catName}" removed.`);
    renderManageCategoriesList();
    renderAdminOutputFilterBar();
    populateCategorySelect();
    renderOutputs();
}

function populateCategorySelect(selectedVal = '') {
    const select = document.getElementById('out-category');
    if (!select) return;
    const cats = getOutputCategories();
    select.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}" ${c === selectedVal ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    if (selectedVal && !cats.includes(selectedVal)) {
        select.innerHTML += `<option value="${escapeHtml(selectedVal)}" selected>${escapeHtml(selectedVal)}</option>`;
    }
}

function promptAddNewCategory() {
    const newCat = prompt('Enter new output category name:');
    if (!newCat || !newCat.trim()) return;
    const trimmed = newCat.trim();
    let cats = getOutputCategories();
    if (!cats.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        cats.push(trimmed);
        Storage.set(Storage.KEYS.OUTPUT_CATEGORIES, cats);
        showToast(`Category "${trimmed}" added!`);
        renderAdminOutputFilterBar();
    }
    populateCategorySelect(trimmed);
}

function renderOutputs() {
    renderAdminOutputFilterBar();

    let list = Storage.get(Storage.KEYS.OUTPUTS, []);
    const container = document.getElementById('outputs-grid-admin');
    if (!container) return;

    if (adminCurrentOutputFilter !== 'all') {
        list = list.filter(item => item.category === adminCurrentOutputFilter);
    }

    const titleEl = document.getElementById('admin-output-section-title');
    const countEl = document.getElementById('admin-output-count');
    if (titleEl) {
        titleEl.textContent = adminCurrentOutputFilter === 'all' ? 'All Published Works' : `${adminCurrentOutputFilter} Outputs`;
    }
    if (countEl) {
        countEl.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;
    }

    if (list.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #a88880; padding: 30px;">No portfolio outputs found for this category.</div>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const coverSrc = Storage.resolveAssetPath(item.coverImage || (item.samples && item.samples[0]) || '');
        const sampleCount = (item.samples && Array.isArray(item.samples) && item.samples.length > 0) ? item.samples.length : (item.coverImage ? 1 : 0);
        return `
        <div class="admin-item-card">
            <div class="img-thumb">
                ${coverSrc ? `<img src="${coverSrc}" alt="${escapeHtml(item.title)}">` : `
                    <div style="text-align: center; padding: 15px;">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f5ede4; margin-bottom: 4px;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <div style="font-size: 11px; color:#d4847e;">${escapeHtml(item.category || '')}</div>
                    </div>
                `}
            </div>
            <div class="admin-item-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10px; color: #d4847e; text-transform: uppercase; font-family:'Special Elite', monospace;">${escapeHtml(item.category || '')}</span>
                    <span style="font-size: 10px; color: #8c5b52; font-family:'Special Elite', monospace;">${sampleCount} sample${sampleCount === 1 ? '' : 's'}</span>
                </div>
                <h4 style="margin-bottom: 8px;">${escapeHtml(item.title)}</h4>
                <div class="admin-item-actions" style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
                    <a href="../pages/output-detail.html?id=${encodeURIComponent(item.id)}" target="_blank" class="btn-action btn-secondary" style="padding: 4px 10px; font-size: 11px; text-decoration: none;">View Showcase →</a>
                    <button class="btn-action btn-danger" onclick="deleteOutput('${item.id}')" style="padding: 4px 10px; font-size: 11px;">Delete</button>
                </div>
            </div>
        </div>
    `}).join('');

    updateBadges();
}

function openAddOutputModal() {
    tempOutputSamples = [];
    const titleEl = document.getElementById('out-title');
    if (titleEl) titleEl.value = '';
    const fileEl = document.getElementById('out-samples-file');
    if (fileEl) fileEl.value = '';
    renderOutputSamplesPreview();
    populateCategorySelect(adminCurrentOutputFilter !== 'all' ? adminCurrentOutputFilter : '');
    openModal('modal-add-output');
}

function previewOutputSamples(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let loadedCount = 0;
    const total = files.length;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempOutputSamples.push(e.target.result);
            loadedCount++;
            if (loadedCount === total) {
                renderOutputSamplesPreview();
            }
        };
        reader.readAsDataURL(file);
    });
}

function renderOutputSamplesPreview() {
    const container = document.getElementById('out-samples-preview-grid');
    if (!container) return;

    if (tempOutputSamples.length === 0) {
        container.innerHTML = '<span id="out-samples-empty-hint" style="font-size: 11.5px; color: #886560; font-style: italic;">No samples chosen. First image will be the cover.</span>';
        return;
    }

    container.innerHTML = tempOutputSamples.map((imgSrc, idx) => `
        <div style="position: relative; width: 65px; height: 65px; border-radius: 4px; overflow: hidden; border: 2px solid ${idx === 0 ? 'var(--maroon)' : '#dcd0c2'}; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            <img src="${imgSrc}" alt="Sample ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
            ${idx === 0 ? '<span style="position: absolute; bottom: 0; left: 0; right: 0; background: var(--maroon); color: #fff; font-size: 8px; text-align: center; text-transform: uppercase; font-family: monospace;">Cover</span>' : ''}
            <button type="button" onclick="removeOutputSample(${idx})" style="position: absolute; top: 1px; right: 1px; background: rgba(0,0,0,0.7); color: #fff; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">&times;</button>
        </div>
    `).join('');
}

function removeOutputSample(idx) {
    tempOutputSamples.splice(idx, 1);
    renderOutputSamplesPreview();
}

function handleSaveOutput(event) {
    event.preventDefault();
    const title = document.getElementById('out-title').value.trim();
    const category = document.getElementById('out-category').value;
    const list = Storage.get(Storage.KEYS.OUTPUTS, []);
    const now = new Date().toISOString().split('T')[0];

    // Single output with primary sample as coverImage and all samples stored in samples array
    list.unshift({
        id: 'out-' + Date.now(),
        title: title,
        category: category,
        coverImage: tempOutputSamples[0] || '',
        samples: tempOutputSamples.slice(),
        date: now
    });

    Storage.set(Storage.KEYS.OUTPUTS, list);
    closeModal('modal-add-output');
    showToast(`Project "${title}" published!`);
    renderOutputs();
}

function deleteOutput(id) {
    if (!confirm('Delete this project from portfolio output?')) return;
    let list = Storage.get(Storage.KEYS.OUTPUTS, []);
    list = list.filter(o => o.id !== id);
    Storage.set(Storage.KEYS.OUTPUTS, list);
    showToast('Project removed.');
    renderOutputs();
}

// ============================================
// 4. CALENDAR SCHEDULING
// ============================================
function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

function renderCalendar() {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const label = document.getElementById('calendar-month-year');
    if (label) label.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const container = document.getElementById('calendar-admin-grid');
    if (!container) return;

    const events = Storage.get(Storage.KEYS.CALENDAR, []);

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    let html = `
        <div class="calendar-header-day">Sun</div>
        <div class="calendar-header-day">Mon</div>
        <div class="calendar-header-day">Tue</div>
        <div class="calendar-header-day">Wed</div>
        <div class="calendar-header-day">Thu</div>
        <div class="calendar-header-day">Fri</div>
        <div class="calendar-header-day">Sat</div>
    `;

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        html += `<div class="calendar-day-cell other-month"><div class="calendar-day-number">${prevMonthDays - i}</div></div>`;
    }

    const today = new Date();

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.date === dateStr);
        const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;

        let eventTagsHtml = dayEvents.map(e => {
            let tagClass = 'tag-general';
            if (e.type === 'deadline') tagClass = 'tag-deadline';
            if (e.type === 'open') tagClass = 'tag-available';
            return `<div class="calendar-event-tag ${tagClass}" onclick="event.stopPropagation(); deleteEvent('${e.id}')" title="Click to delete">${e.title} ×</div>`;
        }).join('');

        html += `
            <div class="calendar-day-cell ${isToday ? 'today' : ''}" onclick="openAddEventModal('${dateStr}')">
                <div class="calendar-day-number">${day}</div>
                ${eventTagsHtml}
            </div>
        `;
    }

    container.innerHTML = html;
}

function openAddEventModal(dateStr = '') {
    document.getElementById('event-date').value = dateStr || new Date().toISOString().split('T')[0];
    document.getElementById('event-title').value = '';
    openModal('modal-add-event');
}

function handleSaveEvent(event) {
    event.preventDefault();
    const events = Storage.get(Storage.KEYS.CALENDAR, []);

    const newEv = {
        id: 'cal-' + Date.now(),
        date: document.getElementById('event-date').value,
        title: document.getElementById('event-title').value,
        type: document.getElementById('event-type').value,
        status: document.getElementById('event-type').value === 'open' ? 'available' : 'busy'
    };

    events.push(newEv);
    Storage.set(Storage.KEYS.CALENDAR, events);
    closeModal('modal-add-event');
    showToast('Calendar entry saved!');
    renderCalendar();
}

function deleteEvent(id) {
    if (!confirm('Remove this calendar slot/event?')) return;
    let events = Storage.get(Storage.KEYS.CALENDAR, []);
    events = events.filter(e => e.id !== id);
    Storage.set(Storage.KEYS.CALENDAR, events);
    showToast('Event removed.');
    renderCalendar();
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ============================================
// 5. EDIT ABOUT CONTENT (DYNAMIC SECTIONS)
// ============================================
function getAboutSections() {
    let data = Storage.get(Storage.KEYS.ABOUT, null);
    if (!data) return defaultAboutSections();
    if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) return data.sections;
    return defaultAboutSections();
}

function defaultAboutSections() {
    return [
        {
            id: 'about-1',
            type: 'about',
            title: '',
            subtitle: '',
            items: []
        }
    ];
}

let aboutAutoSaveTimer = null;
function autoSaveAbout() {
    clearTimeout(aboutAutoSaveTimer);
    aboutAutoSaveTimer = setTimeout(() => {
        saveAboutContent(false);
    }, 500);
}

let termsAutoSaveTimer = null;
function autoSaveTerms() {
    clearTimeout(termsAutoSaveTimer);
    termsAutoSaveTimer = setTimeout(() => {
        saveTermsContent(false);
    }, 500);
}

let draggedAboutId = null;

function renderAboutCardHtml(sec, index) {
    return `
        <div class="dynamic-edit-card card-theme-light about-card-draggable" id="about-card-${sec.id}" data-id="${sec.id}" data-type="about" draggable="true" style="display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed #d4c4b0; padding-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-family:'Special Elite', monospace; font-size: 13.5px; color: var(--maroon); font-weight: bold; letter-spacing: 0.5px;">Section #${index + 1}</span>
                </div>
                <button type="button" class="btn-action btn-danger" onclick="deleteAboutSection('${sec.id}')" style="padding: 4px 10px; font-size: 10.5px;">Delete</button>
            </div>
            <div class="admin-form-group">
                <label>Section Title</label>
                <input type="text" class="about-title-input" value="${escapeHtml(sec.title || '')}" placeholder="Enter section title..." oninput="autoSaveAbout()">
            </div>
            <div class="admin-form-group">
                <label>Subtitle / Description (Optional)</label>
                <input type="text" class="about-subtitle-input" value="${escapeHtml(sec.subtitle || '')}" placeholder="Brief description (optional)" oninput="autoSaveAbout()">
            </div>
            <div class="admin-form-group" style="flex: 1; margin-bottom: 0;">
                <label>Bullet Points / Items (One per line)</label>
                <textarea class="about-items-input" style="height: 100%; min-height: 90px; resize: none;" placeholder="Enter points or services, one per line..." oninput="autoSaveAbout()">${(sec.items || []).join('\n')}</textarea>
            </div>
        </div>
    `;
}

function renderAboutSections() {
    const container = document.getElementById('about-sections-container');
    if (!container) return;
    syncHomepageImagePreview();
    const sections = getAboutSections();

    const cardsHtml = sections.map((sec, idx) => renderAboutCardHtml(sec, idx)).join('');
    
    // Dotted guideline "+ Add Section" slot at the end of the 2-column grid
    const addSlotHtml = `
        <div class="terms-add-slot-card" onclick="addNewAboutSection()" title="Click to add another section">
            <span style="font-size: 32px; font-weight: bold; line-height: 1;">+</span>
            <span style="font-family:'Special Elite', monospace; font-size: 13.5px; text-transform: uppercase; letter-spacing: 1px;">Add Section</span>
        </div>
    `;

    container.innerHTML = cardsHtml + addSlotHtml;

    // Attach Drag & Drop for About
    setupAboutDragAndDrop();

    // Load dynamic contact rows
    renderContactRows();

    // Populate site branding portfolio title input
    const siteSettings = Storage.get(Storage.KEYS.SITE_SETTINGS, null);
    const titleInput = document.getElementById('site-branding-title');
    if (titleInput) {
        titleInput.value = (siteSettings && siteSettings.portfolioTitle) ? siteSettings.portfolioTitle : "YOUR NAME\nPORTFOLIO";
    }

    renderThemeSelectorUI();
}

function renderThemeSelectorUI() {
    const curTheme = Storage.getTheme();
    document.querySelectorAll('.theme-choice-btn').forEach(btn => {
        if (btn.getAttribute('data-theme-val') === curTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function changeSiteTheme(themeName) {
    Storage.setTheme(themeName);
    renderThemeSelectorUI();
    showToast(`Color theme set to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}!`);
}

function changeAboutCardType(selectEl) {
    const card = selectEl.closest('.dynamic-edit-card');
    if (!card) return;
    const type = selectEl.value;
    card.setAttribute('data-type', type);
    if (type === 'about') {
        card.classList.remove('card-theme-beige');
        card.classList.add('card-theme-transparent');
    } else {
        card.classList.remove('card-theme-transparent');
        card.classList.add('card-theme-beige');
    }
    autoSaveAbout();
}

function setupAboutDragAndDrop() {
    const cards = document.querySelectorAll('.about-card-draggable');
    cards.forEach(card => {
        card.addEventListener('dragstart', function(e) {
            draggedAboutId = this.getAttribute('data-id');
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedAboutId);
        });

        card.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            document.querySelectorAll('.about-card-draggable').forEach(c => c.classList.remove('drag-over'));
        });

        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over');
        });

        card.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        card.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            const targetId = this.getAttribute('data-id');
            if (!draggedAboutId || draggedAboutId === targetId) return;

            const fullData = Storage.get(Storage.KEYS.ABOUT, {});
            const sections = getAboutSections();
            const fromIdx = sections.findIndex(s => s.id === draggedAboutId);
            const toIdx = sections.findIndex(s => s.id === targetId);

            if (fromIdx !== -1 && toIdx !== -1) {
                syncAboutInputsToData(sections);
                const [moved] = sections.splice(fromIdx, 1);
                sections.splice(toIdx, 0, moved);
                fullData.sections = sections;
                Storage.set(Storage.KEYS.ABOUT, fullData);
                renderAboutSections();
                showToast('Section moved.');
            }
        });
    });
}

function syncAboutInputsToData(sections) {
    const container = document.getElementById('about-sections-container');
    if (!container) return;
    const cards = container.querySelectorAll('.dynamic-edit-card');
    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const sec = sections.find(s => s.id === id);
        if (sec) {
            sec.type = 'about';
            sec.title = card.querySelector('.about-title-input')?.value.trim() || '';
            sec.subtitle = card.querySelector('.about-subtitle-input')?.value.trim() || '';
            sec.items = (card.querySelector('.about-items-input')?.value || '')
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }
    });
}

function addNewAboutSection() {
    const fullData = Storage.get(Storage.KEYS.ABOUT, {});
    const sections = getAboutSections();
    syncAboutInputsToData(sections);

    const newId = 'about-' + Date.now();
    const newSec = {
        id: newId,
        type: 'about',
        title: '',
        subtitle: '',
        image: '',
        items: []
    };

    sections.push(newSec);
    fullData.sections = sections;
    Storage.set(Storage.KEYS.ABOUT, fullData);
    renderAboutSections();

    const newCard = document.getElementById(`about-card-${newId}`);
    if (newCard) {
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = newCard.querySelector('.about-title-input');
        if (input) input.focus();
    }
}

function deleteAboutSection(id) {
    if (!confirm('Are you sure you want to delete this section?')) return;
    const fullData = Storage.get(Storage.KEYS.ABOUT, {});
    let sections = getAboutSections();
    syncAboutInputsToData(sections);
    sections = sections.filter(s => s.id !== id);
    fullData.sections = sections;
    Storage.set(Storage.KEYS.ABOUT, fullData);
    renderAboutSections();
    showToast('Section removed.');
}

function saveAboutContent(showToastMsg = true) {
    const container = document.getElementById('about-sections-container');
    if (!container) return;
    const cards = container.querySelectorAll('.dynamic-edit-card');
    const sections = [];

    cards.forEach(card => {
        const id = card.getAttribute('data-id') || ('about-' + Date.now());
        const type = 'about';
        const title = card.querySelector('.about-title-input')?.value.trim() || '';
        const subtitle = card.querySelector('.about-subtitle-input')?.value.trim() || '';
        const items = (card.querySelector('.about-items-input')?.value || '')
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        sections.push({ id, type, title, subtitle, items });
    });

    const contactContainer = document.getElementById('contact-rows-container');
    const contacts = [];
    if (contactContainer) {
        const rows = contactContainer.querySelectorAll('.contact-row');
        rows.forEach(r => {
            const ch = r.querySelector('.contact-channel-select')?.value.trim() || 'Other';
            const val = r.querySelector('.contact-value-input')?.value.trim() || '';
            if (val) {
                contacts.push({ channel: ch, value: val });
            }
        });
    }

    const gmailEntry = contacts.find(c => (c.channel || '').toLowerCase().includes('gmail') || (c.channel || '').toLowerCase().includes('email'));
    const tgEntry = contacts.find(c => (c.channel || '').toLowerCase().includes('telegram'));
    const contact = {
        gmail: gmailEntry ? gmailEntry.value : '',
        telegram: tgEntry ? tgEntry.value : ''
    };

    Storage.set(Storage.KEYS.ABOUT, { sections, contacts, contact });

    // Also auto-save site branding title if element exists
    saveSiteBrandingSettings(false);

    if (showToastMsg) {
        showToast('About page content updated successfully!');
    }
}

function saveSiteBrandingSettings(showToastMsg = true) {
    const titleInput = document.getElementById('site-branding-title');
    if (!titleInput) return;
    const titleVal = titleInput.value.trim() || "YOUR NAME\nPORTFOLIO";
    const existing = Storage.get(Storage.KEYS.SITE_SETTINGS, {}) || {};
    existing.portfolioTitle = titleVal;
    Storage.set(Storage.KEYS.SITE_SETTINGS, existing);
    if (showToastMsg) {
        showToast('Homepage Portfolio Title updated successfully!');
    }
}

function syncHomepageImagePreview() {
    const settings = Storage.get(Storage.KEYS.SITE_SETTINGS, {}) || {};
    const wrap = document.getElementById('homepage-image-preview-wrap');
    const img = document.getElementById('homepage-image-preview');
    if (settings.homepageImage) {
        if (img) img.src = settings.homepageImage;
        if (wrap) wrap.style.display = 'flex';
    } else if (wrap) {
        wrap.style.display = 'none';
    }
}

function handleHomepageImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Choose an image file to upload.');
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        const settings = Storage.get(Storage.KEYS.SITE_SETTINGS, {}) || {};
        settings.homepageImage = reader.result;
        Storage.set(Storage.KEYS.SITE_SETTINGS, settings);
        syncHomepageImagePreview();
        showToast('Homepage image uploaded.');
    };
    reader.readAsDataURL(file);
}

function removeHomepageImage() {
    const settings = Storage.get(Storage.KEYS.SITE_SETTINGS, {}) || {};
    delete settings.homepageImage;
    Storage.set(Storage.KEYS.SITE_SETTINGS, settings);
    const input = document.getElementById('homepage-image-file');
    if (input) input.value = '';
    syncHomepageImagePreview();
    showToast('Homepage image removed.');
}

function handleAboutPageImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        const existingData = Storage.get(Storage.KEYS.ABOUT, {});
        existingData.pageImage = base64Data;
        Storage.set(Storage.KEYS.ABOUT, existingData);
        // Show preview
        const wrapper = document.getElementById('about-page-image-preview-wrapper');
        const img = document.getElementById('about-page-image-preview');
        if (wrapper) wrapper.style.display = 'flex';
        if (img) img.src = base64Data;
        showToast('About page image uploaded.');
    };
    reader.readAsDataURL(file);
}

function removeAboutPageImage() {
    const existingData = Storage.get(Storage.KEYS.ABOUT, {});
    existingData.pageImage = '';
    Storage.set(Storage.KEYS.ABOUT, existingData);
    const wrapper = document.getElementById('about-page-image-preview-wrapper');
    const img = document.getElementById('about-page-image-preview');
    const fileInput = document.getElementById('about-page-image-file');
    if (wrapper) wrapper.style.display = 'none';
    if (img) img.src = '';
    if (fileInput) fileInput.value = '';
    showToast('About page image removed.');
}

// ============================================
// 6. EDIT TERMS CONTENT (DYNAMIC SECTIONS)
// ============================================
function getTermsData() {
    let data = Storage.get(Storage.KEYS.TERMS, null);
    const defaultData = {
        pageTitle: 'Terms & Conditions',
        pageSubtitle: 'Please read carefully before requesting a commission',
        footnote: '',
        sections: defaultTermsSections()
    };

    if (!data) return defaultData;
    if (Array.isArray(data)) {
        return {
            pageTitle: 'Terms & Conditions',
            pageSubtitle: 'Please read carefully before requesting a commission',
            footnote: '',
            sections: data.length ? data : defaultTermsSections()
        };
    }
    if (data.sections && Array.isArray(data.sections)) {
        return {
            pageTitle: data.pageTitle || 'Terms & Conditions',
            pageSubtitle: data.pageSubtitle !== undefined ? data.pageSubtitle : 'Please read carefully before requesting a commission',
            footnote: data.footnote || '',
            footnoteTitle: data.footnoteTitle || '',
            sections: data.sections.length ? data.sections : defaultTermsSections()
        };
    }

    return defaultData;
}

function getTermsSections() {
    return getTermsData().sections;
}

function defaultTermsSections() {
    return [
        {
            id: 'term-1',
            title: '',
            subtitle: '',
            items: []
        }
    ];
}

let draggedTermId = null;

function renderTermsCardHtml(sec, index, total) {
    return `
        <div class="dynamic-edit-card card-theme-light terms-card-draggable" id="term-card-${sec.id}" data-id="${sec.id}" draggable="true">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed #d4c4b0; padding-bottom: 8px;">
                <span style="font-family:'Special Elite', monospace; font-size: 13.5px; color: var(--maroon); font-weight: bold; letter-spacing: 0.5px;">Section #${index + 1}</span>
                <button type="button" class="btn-action btn-danger" onclick="deletePolicySection('${sec.id}')" style="padding: 4px 10px; font-size: 10.5px;">Delete</button>
            </div>
            <div class="admin-form-group">
                <label>Section Title</label>
                <input type="text" class="term-title-input" value="${escapeHtml(sec.title || '')}" placeholder="Enter section title..." oninput="autoSaveTerms()">
            </div>
            <div class="admin-form-group">
                <label>Subtitle / Description (Optional)</label>
                <input type="text" class="term-subtitle-input" value="${escapeHtml(sec.subtitle || '')}" placeholder="Brief note or description (optional)" oninput="autoSaveTerms()">
            </div>
            <div class="admin-form-group" style="margin-bottom: 0;">
                <label>Bullet Points / Content (One per line)</label>
                <textarea class="term-items-input" rows="4" placeholder="Enter bullet points, one per line..." oninput="autoSaveTerms()">${(sec.items || []).join('\n')}</textarea>
            </div>
        </div>
    `;
}

function renderTermsSections() {
    const container = document.getElementById('terms-sections-container');
    if (!container) return;

    const data = getTermsData();
    const sections = data.sections || [];

    // Populate header settings & footnote
    const titleEl = document.getElementById('terms-page-title');
    const subEl = document.getElementById('terms-page-subtitle');
    const fnEl = document.getElementById('terms-page-footnote');
    const fnTitleEl = document.getElementById('terms-footnote-title');

    if (titleEl) titleEl.value = data.pageTitle || 'Terms & Conditions';
    if (subEl) subEl.value = data.pageSubtitle !== undefined ? data.pageSubtitle : 'Please read carefully before requesting a commission';
    if (fnEl) fnEl.value = data.footnote || '';
    if (fnTitleEl) fnTitleEl.value = data.footnoteTitle || '';

    const cardsHtml = sections.map((sec, idx) => renderTermsCardHtml(sec, idx, sections.length)).join('');
    
    // Dotted guideline "+ Add Section" slot at the end of the grid
    const addSlotHtml = `
        <div class="terms-add-slot-card" onclick="addNewPolicySection()" title="Click to add another section">
            <span style="font-size: 32px; font-weight: bold; line-height: 1;">+</span>
            <span style="font-family:'Special Elite', monospace; font-size: 13.5px; text-transform: uppercase; letter-spacing: 1px;">Add Section</span>
        </div>
    `;

    container.innerHTML = cardsHtml + addSlotHtml;

    // Attach HTML5 Drag & Drop listeners
    setupTermsDragAndDrop();
}

function setupTermsDragAndDrop() {
    const cards = document.querySelectorAll('.terms-card-draggable');
    cards.forEach(card => {
        card.addEventListener('dragstart', function(e) {
            draggedTermId = this.getAttribute('data-id');
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedTermId);
        });

        card.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            document.querySelectorAll('.terms-card-draggable').forEach(c => c.classList.remove('drag-over'));
        });

        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over');
        });

        card.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        card.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            const targetId = this.getAttribute('data-id');
            if (!draggedTermId || draggedTermId === targetId) return;

            const data = getTermsData();
            const sections = data.sections || [];
            const fromIdx = sections.findIndex(s => s.id === draggedTermId);
            const toIdx = sections.findIndex(s => s.id === targetId);

            if (fromIdx !== -1 && toIdx !== -1) {
                syncTermsInputsToData(sections);
                const [moved] = sections.splice(fromIdx, 1);
                sections.splice(toIdx, 0, moved);
                data.sections = sections;
                Storage.set(Storage.KEYS.TERMS, data);
                renderTermsSections();
                showToast('Section moved.');
            }
        });
    });
}

function syncTermsInputsToData(sections) {
    const container = document.getElementById('terms-sections-container');
    if (!container) return;
    const cards = container.querySelectorAll('.dynamic-edit-card');
    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const sec = sections.find(s => s.id === id);
        if (sec) {
            sec.title = card.querySelector('.term-title-input')?.value.trim() || '';
            sec.subtitle = card.querySelector('.term-subtitle-input')?.value.trim() || '';
            sec.items = (card.querySelector('.term-items-input')?.value || '')
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }
    });
}

function movePolicySection(index, direction) {
    const data = getTermsData();
    const sections = data.sections || [];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    syncTermsInputsToData(sections);
    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;
    data.sections = sections;
    Storage.set(Storage.KEYS.TERMS, data);
    renderTermsSections();
}

function addNewPolicySection() {
    const data = getTermsData();
    const sections = data.sections || [];
    syncTermsInputsToData(sections);

    const newId = 'term-' + Date.now();
    const newSec = {
        id: newId,
        title: '',
        subtitle: '',
        items: []
    };

    sections.push(newSec);
    data.sections = sections;
    Storage.set(Storage.KEYS.TERMS, data);
    renderTermsSections();

    // Scroll to the new card and focus
    const newCard = document.getElementById(`term-card-${newId}`);
    if (newCard) {
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = newCard.querySelector('.term-title-input');
        if (input) input.focus();
    }
}

function deletePolicySection(id) {
    if (!confirm('Are you sure you want to delete this section?')) return;
    const data = getTermsData();
    let sections = data.sections || [];
    syncTermsInputsToData(sections);
    sections = sections.filter(s => s.id !== id);
    data.sections = sections;
    Storage.set(Storage.KEYS.TERMS, data);
    renderTermsSections();
    showToast('Section removed.');
}

function insertDefaultTermsFootnote() {
    const fn = document.getElementById('terms-page-footnote');
    if (fn) {
        fn.value = 'By confirming a commission and submitting the required down payment, the client acknowledges that they have read, understood, and agreed to these terms and conditions.';
        autoSaveTerms();
        showToast('Sample agreement footnote inserted.');
    }
}

function clearTermsFootnote() {
    const fn = document.getElementById('terms-page-footnote');
    if (fn) {
        fn.value = '';
        autoSaveTerms();
        showToast('Agreement footnote cleared.');
    }
}

// ============================================
// SERVICES & PRICING MANAGEMENT
// ============================================
function getServicesList() {
    return Storage.get(Storage.KEYS.SERVICES, []);
}

function renderServicesList() {
    const tbody = document.getElementById('services-table-body');
    if (!tbody) return;
    const services = getServicesList();

    if (services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 25px; color:#8c5b52; font-family:'Special Elite', monospace;">No services configured yet. Click "+ Add New Service" above.</td></tr>`;
        return;
    }

    tbody.innerHTML = services.map((s, idx) => `
        <tr>
            <td style="font-family:'Special Elite', monospace; color:#888;">${idx + 1}</td>
            <td style="font-weight: 600; color: var(--maroon-dark);">${escapeHtml(s.name)}</td>
            <td><span style="background: #faf4ee; border: 1px solid #ebd8cb; border-radius: 12px; padding: 2px 10px; font-size: 11.5px; font-family:'Special Elite', monospace; color: var(--maroon);">${escapeHtml(s.category || 'General')}</span></td>
            <td style="text-align: center; white-space: nowrap;">
                <button type="button" class="btn-action" onclick="openEditServiceModal(${idx})" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;">Edit</button>
                <button type="button" class="btn-action btn-danger" onclick="deleteService(${idx})" style="padding: 3px 8px; font-size: 11px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openAddServiceModal() {
    document.getElementById('modal-service-title').textContent = 'Add Service';
    document.getElementById('service-edit-index').value = '-1';
    document.getElementById('service-name-input').value = '';
    document.getElementById('service-category-input').value = '';
    openModal('modal-service');
}

function openEditServiceModal(index) {
    const services = getServicesList();
    const item = services[index];
    if (!item) return;

    document.getElementById('modal-service-title').textContent = 'Edit Service';
    document.getElementById('service-edit-index').value = index;
    document.getElementById('service-name-input').value = item.name || '';
    document.getElementById('service-category-input').value = item.category || '';
    openModal('modal-service');
}

function handleSaveService(event) {
    event.preventDefault();
    const idx = parseInt(document.getElementById('service-edit-index').value, 10);
    const name = document.getElementById('service-name-input').value.trim();
    const category = document.getElementById('service-category-input').value.trim() || 'General';

    if (!name) return;

    const services = getServicesList();
    if (idx >= 0 && idx < services.length) {
        services[idx] = { name, category };
        showToast('Service updated!');
    } else {
        services.push({ name, category });
        showToast('New service added!');
    }

    Storage.set(Storage.KEYS.SERVICES, services);
    closeModal('modal-service');
    renderServicesList();
    populateAdminPaymentServices();
}

function deleteService(index) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    const services = getServicesList();
    services.splice(index, 1);
    Storage.set(Storage.KEYS.SERVICES, services);
    renderServicesList();
    populateAdminPaymentServices();
    showToast('Service removed.');
}

function populateAdminPaymentServices() {
    const sel = document.getElementById('pay-service');
    if (!sel) return;
    const services = getServicesList();

    if (services.length === 0) {
        sel.innerHTML = `<option value="" disabled selected>No services added yet (Add in Services tab)</option><option value="Other">Other Services</option>`;
        return;
    }

    sel.innerHTML = `<option value="" disabled selected>Select a service</option>` + services.map(s => `
        <option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${escapeHtml(s.category)})</option>
    `).join('') + `<option value="Other">Other Services</option>`;
}

function saveTermsContent(showToastMsg = true) {
    const container = document.getElementById('terms-sections-container');
    if (!container) return;

    const cards = container.querySelectorAll('.dynamic-edit-card');
    const sections = [];

    cards.forEach(card => {
        const id = card.getAttribute('data-id') || ('term-' + Date.now());
        const title = card.querySelector('.term-title-input')?.value.trim() || '';
        const subtitle = card.querySelector('.term-subtitle-input')?.value.trim() || '';
        const items = (card.querySelector('.term-items-input')?.value || '')
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        sections.push({ id, title, subtitle, items });
    });

    const pageTitle = document.getElementById('terms-page-title')?.value.trim() || 'Terms & Conditions';
    const pageSubtitle = document.getElementById('terms-page-subtitle')?.value.trim() || 'Please read carefully before requesting a commission';
    const footnote = document.getElementById('terms-page-footnote')?.value.trim() || '';
    const footnoteTitle = document.getElementById('terms-footnote-title')?.value.trim() || '';

    const termsData = {
        pageTitle,
        pageSubtitle,
        footnote,
        footnoteTitle,
        sections
    };

    Storage.set(Storage.KEYS.TERMS, termsData);
    if (showToastMsg) {
        showToast('Terms & Conditions updated successfully!');
    }
}

// ============================================
// 6. PAYMENT TRACKER, SPREADSHEET & ANALYTICS
// ============================================
let tempPaymentReceipt = '';
let paymentFilterMonth = 'all';
let paymentFilterMode = 'all';
let paymentFilterType = 'all';
let paymentSearchQuery = '';

function renderPaymentsTracker() {
    const payments = Storage.get(Storage.KEYS.PAYMENTS, []);
    renderPaymentStats(payments);
    renderMonthlyBarChart(payments);
    renderServicePieChart(payments);
    populatePaymentMonthFilter(payments);
    renderPaymentSheet();
    renderPendingPaymentProofs();
    updateBadges();
}

function renderPendingPaymentProofs() {
    const container = document.getElementById('pending-payment-proofs');
    if (!container) return;
    const proofs = Storage.get(Storage.KEYS.PAYMENT_PROOFS, []);
    if (!proofs.length) {
        container.innerHTML = '<p style="margin:0;color:#8c5b52;font-style:italic;">No additional payment proofs submitted.</p>';
        return;
    }
    container.innerHTML = proofs.map(proof => `
        <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px dashed #d4c4b0;flex-wrap:wrap;">
            <img src="${proof.receipt}" alt="Payment proof from ${escapeHtml(proof.clientName)}" style="width:92px;height:72px;object-fit:cover;border-radius:4px;border:1px solid #d4c4b0;">
            <div style="flex:1;min-width:170px;"><strong>${escapeHtml(proof.clientName)}</strong><div style="font-size:11px;color:#8c5b52;">Submitted ${new Date(proof.submittedAt).toLocaleString()}</div></div>
            <button type="button" class="btn-action btn-primary" onclick="recordPaymentFromProof('${proof.id}')">Record Payment</button>
            <button type="button" class="btn-action btn-danger" onclick="dismissPaymentProof('${proof.id}')">Dismiss</button>
        </div>`).join('');
}

function recordPaymentFromProof(proofId) {
    const proof = Storage.get(Storage.KEYS.PAYMENT_PROOFS, []).find(item => item.id === proofId);
    if (!proof) return;
    openRecordPaymentModal(null, proofId);
    const client = document.getElementById('pay-client-name');
    const preview = document.getElementById('pay-receipt-preview-img');
    const wrap = document.getElementById('pay-receipt-preview-wrap');
    if (client) client.value = proof.clientName;
    if (preview) preview.src = proof.receipt;
    if (wrap) wrap.style.display = 'block';
    tempPaymentReceipt = proof.receipt;
}

function dismissPaymentProof(proofId) {
    const proofs = Storage.get(Storage.KEYS.PAYMENT_PROOFS, []).filter(item => item.id !== proofId);
    Storage.set(Storage.KEYS.PAYMENT_PROOFS, proofs);
    renderPendingPaymentProofs();
}

function renderPaymentStats(payments) {
    const totalRevEl = document.getElementById('stat-total-revenue');
    const totalCountEl = document.getElementById('stat-total-count');
    const monthRevEl = document.getElementById('stat-month-revenue');
    const monthLabelEl = document.getElementById('stat-month-label');
    const pendingBalEl = document.getElementById('stat-pending-balance');
    const pendingCountEl = document.getElementById('stat-pending-count');
    const topServiceEl = document.getElementById('stat-top-service');
    const topServiceSubEl = document.getElementById('stat-top-service-sub');

    if (!totalRevEl) return;

    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let pendingBalance = 0;
    let pendingCount = 0;
    const serviceEarnings = {};

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthLabelEl) {
        monthLabelEl.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }

    payments.forEach(p => {
        const amt = parseFloat(p.amount) || 0;
        totalRevenue += amt;

        if (p.date && p.date.startsWith(currentMonthKey)) {
            thisMonthRevenue += amt;
        }

        if (p.paymentType === 'downpayment') {
            // Estimated remaining 50% balance
            pendingBalance += amt;
            pendingCount++;
        }

        const svc = p.service || 'Other';
        serviceEarnings[svc] = (serviceEarnings[svc] || 0) + amt;
    });

    totalRevEl.textContent = formatPHP(totalRevenue);
    if (totalCountEl) totalCountEl.textContent = `${payments.length} recorded payments`;

    if (monthRevEl) monthRevEl.textContent = formatPHP(thisMonthRevenue);
    if (pendingBalEl) pendingBalEl.textContent = formatPHP(pendingBalance);
    if (pendingCountEl) pendingCountEl.textContent = `${pendingCount} downpayments active`;

    // Find top service
    let topSvc = '--';
    let topAmt = 0;
    Object.keys(serviceEarnings).forEach(svc => {
        if (serviceEarnings[svc] > topAmt) {
            topAmt = serviceEarnings[svc];
            topSvc = svc;
        }
    });

    if (topServiceEl) topServiceEl.textContent = topSvc;
    if (topServiceSubEl) topServiceSubEl.textContent = topAmt > 0 ? `${formatPHP(topAmt)} total` : 'No revenue yet';
}

function formatPHP(amount) {
    return '₱ ' + (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPHPCompact(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'k';
    return String(Math.round(amount));
}

// ============================================
// MONTHLY REVENUE BAR GRAPH (RESPONSIVE SVG)
// ============================================
function renderMonthlyBarChart(payments) {
    const container = document.getElementById('monthly-bar-chart-container');
    if (!container) return;

    // Collect months: past 6 months up to current
    const now = new Date();
    const monthsToShow = [];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsToShow.push({
            key: key,
            label: monthNamesShort[d.getMonth()],
            year: d.getFullYear(),
            total: 0
        });
    }

    // Tally monthly totals
    payments.forEach(p => {
        if (!p.date) return;
        const pKey = p.date.substring(0, 7);
        const match = monthsToShow.find(m => m.key === pKey);
        if (match) {
            match.total += (parseFloat(p.amount) || 0);
        }
    });

    const maxTotal = Math.max(...monthsToShow.map(m => m.total), 4000);
    // Round up maxTotal to a clean ceiling
    const ceiling = Math.ceil(maxTotal / 2000) * 2000;

    // SVG Dimensions
    const svgW = 600;
    const svgH = 260;
    const chartX = 65;
    const chartY = 30;
    const chartW = 510;
    const chartH = 180;
    const baselineY = chartY + chartH;

    // Gridlines at 0%, 33%, 66%, 100%
    const steps = 3;
    let gridSvg = '';
    for (let s = 0; s <= steps; s++) {
        const stepVal = (ceiling / steps) * s;
        const lineY = baselineY - (chartH * (s / steps));
        gridSvg += `
            <line x1="${chartX}" y1="${lineY}" x2="${chartX + chartW}" y2="${lineY}" stroke="#e0d4c8" stroke-dasharray="${s === 0 ? 'none' : '3,3'}" stroke-width="${s === 0 ? '1.5' : '1'}"/>
            <text x="${chartX - 8}" y="${lineY + 4}" font-family="'Special Elite', monospace" font-size="10" fill="#8c5b52" text-anchor="end">₱${formatPHPCompact(stepVal)}</text>
        `;
    }

    // Bars
    const barWidth = 44;
    const totalBars = monthsToShow.length;
    const slotWidth = chartW / totalBars;

    let barsSvg = '';
    monthsToShow.forEach((m, idx) => {
        const slotCenterX = chartX + (idx * slotWidth) + (slotWidth / 2);
        const barX = slotCenterX - (barWidth / 2);
        const barH = m.total > 0 ? Math.max(6, (m.total / ceiling) * chartH) : 3;
        const barY = baselineY - barH;

        const isCurrentMonth = m.key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        barsSvg += `
            <g class="bar-group" style="cursor: pointer;">
                <defs>
                    <linearGradient id="barGrad-${idx}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#c4615a"/>
                        <stop offset="100%" stop-color="#6b1814"/>
                    </linearGradient>
                </defs>
                <!-- Bar -->
                <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="4" ry="4" 
                      fill="url(#barGrad-${idx})" 
                      stroke="${isCurrentMonth ? '#d4847e' : 'none'}" 
                      stroke-width="${isCurrentMonth ? '2' : '0'}"
                      opacity="${m.total > 0 ? '1' : '0.4'}">
                    <title>${m.label} ${m.year}: ${formatPHP(m.total)}</title>
                </rect>
                <!-- Amount Label above bar -->
                ${m.total > 0 ? `
                    <text x="${slotCenterX}" y="${barY - 8}" font-family="'Special Elite', monospace" font-size="10" font-weight="bold" fill="#5a1a1a" text-anchor="middle">₱${formatPHPCompact(m.total)}</text>
                ` : ''}
                <!-- Month Label under X axis -->
                <text x="${slotCenterX}" y="${baselineY + 20}" font-family="'Special Elite', monospace" font-size="11" font-weight="${isCurrentMonth ? 'bold' : 'normal'}" fill="${isCurrentMonth ? 'var(--maroon)' : '#665550'}" text-anchor="middle">${m.label}</text>
                <text x="${slotCenterX}" y="${baselineY + 32}" font-family="sans-serif" font-size="9" fill="#99837d" text-anchor="middle">${m.year}</text>
            </g>
        `;
    });

    container.innerHTML = `
        <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" style="overflow: visible;">
            ${gridSvg}
            ${barsSvg}
        </svg>
    `;
}

// ============================================
// SERVICE TYPE DISTRIBUTION PIE / DONUT CHART
// ============================================
function renderServicePieChart(payments) {
    const container = document.getElementById('service-pie-chart-container');
    if (!container) return;

    const totalsByService = {};
    let grandTotal = 0;

    payments.forEach(p => {
        const svc = p.service || 'Other Services';
        const amt = parseFloat(p.amount) || 0;
        totalsByService[svc] = (totalsByService[svc] || 0) + amt;
        grandTotal += amt;
    });

    const entries = Object.keys(totalsByService)
        .map(svc => ({ service: svc, total: totalsByService[svc] }))
        .sort((a, b) => b.total - a.total);

    if (entries.length === 0 || grandTotal === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #8c5b52; font-family:\'Special Elite\', monospace;">No payment data recorded yet.</div>';
        return;
    }

    const palette = ['#6b1814', '#c4615a', '#d4847e', '#8c2e28', '#b35d55', '#4a1512', '#d6a77a', '#7a2323'];

    // Group items beyond top 4 into "Other"
    let chartSlices = [];
    if (entries.length <= 5) {
        chartSlices = entries;
    } else {
        chartSlices = entries.slice(0, 4);
        const otherTotal = entries.slice(4).reduce((sum, e) => sum + e.total, 0);
        chartSlices.push({ service: 'Other Services', total: otherTotal });
    }

    // Build Donut Slices
    const cx = 100;
    const cy = 100;
    const R = 82;
    const r = 48;
    let currentAngle = -Math.PI / 2; // start at top

    let pathsSvg = '';
    const legendItems = [];

    chartSlices.forEach((slice, idx) => {
        const sliceAngle = (slice.total / grandTotal) * (Math.PI * 2);
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        currentAngle = endAngle;

        const x1_out = cx + R * Math.cos(startAngle);
        const y1_out = cy + R * Math.sin(startAngle);
        const x2_out = cx + R * Math.cos(endAngle);
        const y2_out = cy + R * Math.sin(endAngle);

        const x1_in = cx + r * Math.cos(startAngle);
        const y1_in = cy + r * Math.sin(startAngle);
        const x2_in = cx + r * Math.cos(endAngle);
        const y2_in = cy + r * Math.sin(endAngle);

        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const color = palette[idx % palette.length];
        const pct = Math.round((slice.total / grandTotal) * 100);

        // Path for donut segment
        const d = (sliceAngle >= Math.PI * 1.999) 
            ? `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} L ${cx - 0.01} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`
            : `M ${x1_out} ${y1_out} A ${R} ${R} 0 ${largeArc} 1 ${x2_out} ${y2_out} L ${x2_in} ${y2_in} A ${r} ${r} 0 ${largeArc} 0 ${x1_in} ${y1_in} Z`;

        pathsSvg += `
            <path d="${d}" fill="${color}" stroke="#ffffff" stroke-width="1.5" style="transition: opacity 0.2s; cursor: pointer;">
                <title>${slice.service}: ${formatPHP(slice.total)} (${pct}%)</title>
            </path>
        `;

        legendItems.push(`
            <div class="pie-legend-item">
                <div class="pie-legend-left">
                    <span class="pie-legend-color" style="background: ${color};"></span>
                    <span class="pie-legend-name" title="${escapeHtml(slice.service)}">${escapeHtml(slice.service)}</span>
                </div>
                <div class="pie-legend-val">
                    <span>${pct}%</span>
                    <span style="color:#7d5e56; font-size:10.5px; margin-left:4px;">(${formatPHP(slice.total)})</span>
                </div>
            </div>
        `);
    });

    container.innerHTML = `
        <div class="pie-chart-container">
            <div class="pie-chart-svg">
                <svg viewBox="0 0 200 200" width="100%" height="auto">
                    ${pathsSvg}
                    <!-- Center Hole Label -->
                    <circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="#ffffff"/>
                    <text x="${cx}" y="${cy - 2}" font-family="'Playfair Display', serif" font-size="14" font-weight="900" fill="#4a1512" text-anchor="middle">₱${formatPHPCompact(grandTotal)}</text>
                    <text x="${cx}" y="${cy + 12}" font-family="'Special Elite', monospace" font-size="8.5" fill="#8c5b52" text-anchor="middle">TOTAL</text>
                </svg>
            </div>
            <div class="pie-legend">
                ${legendItems.join('')}
            </div>
        </div>
    `;
}

// ============================================
// PAYMENT SPREADSHEET (SHEET UI)
// ============================================
function populatePaymentMonthFilter(payments) {
    const select = document.getElementById('pay-filter-month');
    if (!select) return;

    const currentVal = select.value;
    const monthSet = new Set();

    payments.forEach(p => {
        if (p.date && p.date.length >= 7) {
            monthSet.add(p.date.substring(0, 7));
        }
    });

    const months = Array.from(monthSet).sort().reverse();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    select.innerHTML = `<option value="all">All Months</option>` + months.map(m => {
        const [yr, mo] = m.split('-');
        const label = `${monthNames[parseInt(mo, 10) - 1]} ${yr}`;
        return `<option value="${m}" ${m === currentVal ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

function handlePaymentFilterChange() {
    paymentSearchQuery = (document.getElementById('pay-search-input')?.value || '').trim().toLowerCase();
    paymentFilterMonth = document.getElementById('pay-filter-month')?.value || 'all';
    paymentFilterMode = document.getElementById('pay-filter-mode')?.value || 'all';
    paymentFilterType = document.getElementById('pay-filter-type')?.value || 'all';
    renderPaymentSheet();
}

function renderPaymentSheet() {
    const tbody = document.getElementById('payment-sheet-tbody');
    const filteredTotalEl = document.getElementById('sheet-filtered-total');
    const counterEl = document.getElementById('sheet-records-counter');
    if (!tbody) return;

    let list = Storage.get(Storage.KEYS.PAYMENTS, []);

    // Filter by Search Query
    if (paymentSearchQuery) {
        list = list.filter(p => {
            const client = (p.clientName || '').toLowerCase();
            const service = (p.service || '').toLowerCase();
            const notes = (p.notes || '').toLowerCase();
            const id = (p.id || '').toLowerCase();
            return client.includes(paymentSearchQuery) || service.includes(paymentSearchQuery) || notes.includes(paymentSearchQuery) || id.includes(paymentSearchQuery);
        });
    }

    // Filter by Month
    if (paymentFilterMonth !== 'all') {
        list = list.filter(p => p.date && p.date.startsWith(paymentFilterMonth));
    }

    // Filter by Payment Mode
    if (paymentFilterMode !== 'all') {
        list = list.filter(p => p.mode && p.mode.toLowerCase() === paymentFilterMode.toLowerCase());
    }

    // Filter by Payment Type
    if (paymentFilterType !== 'all') {
        list = list.filter(p => p.paymentType === paymentFilterType);
    }

    // Counter
    if (counterEl) {
        counterEl.textContent = `Showing ${list.length} payment${list.length === 1 ? '' : 's'}`;
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 35px; color:#8c5b52; font-family:'Special Elite', monospace;">No payment entries found matching filters.</td></tr>`;
        if (filteredTotalEl) filteredTotalEl.textContent = '₱ 0.00';
        return;
    }

    let runningTotal = 0;

    tbody.innerHTML = list.map((p, index) => {
        const amt = parseFloat(p.amount) || 0;
        runningTotal += amt;
        const isDP = p.paymentType === 'downpayment';
        const agreed = parseFloat(p.agreedPrice) || (p.paymentType === 'fully_paid' ? amt : amt * 2);
        const bal = Math.max(0, agreed - amt);
        const pct = agreed > 0 ? Math.round((amt / agreed) * 100) : 100;

        const typeBadge = isDP 
            ? `<span style="background: #fdf3e7; color: #b7791f; border: 1px solid #f6e05e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">50% DP</span>`
            : `<span style="background: #eafaf1; color: #1e8449; border: 1px solid #a9dfbf; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">Fully Paid</span>`;

        const hasAi = !!p.aiVerified;
        const aiBtn = hasAi 
            ? `<button type="button" class="btn-action" onclick="showAiDoubleCheckModal('${p.id}')" style="background: #eafaf1; color: #1e8449; border: 1px solid #a9dfbf; padding: 3px 8px; border-radius: 10px; font-size: 10.5px; font-weight: 600; white-space: nowrap; font-family:'Special Elite', monospace;">AI: Verified</button>`
            : `<button type="button" class="btn-action" onclick="showAiDoubleCheckModal('${p.id}')" style="background: #fef7ea; color: #b45309; border: 1px solid #fde68a; padding: 3px 8px; border-radius: 10px; font-size: 10.5px; font-weight: 600; white-space: nowrap; font-family:'Special Elite', monospace;">Run AI Check</button>`;

        return `
            <tr>
                <td class="sheet-row-num">${index + 1}</td>
                <td style="font-family:'Special Elite', monospace; font-size: 12px; white-space: nowrap;">${escapeHtml(p.date || '--')}</td>
                <td>
                    <div style="font-weight: 600; color: var(--maroon-dark);">${escapeHtml(p.clientName || 'Anonymous')}</div>
                </td>
                <td style="font-weight: 500;">${escapeHtml(p.service || 'General Commission')}</td>
                <td class="sheet-currency" style="color: var(--maroon); font-weight:600;">${formatPHP(agreed)}</td>
                <td class="sheet-currency" style="color: #1e8449; font-weight:700;">${formatPHP(amt)}</td>
                <td class="sheet-currency" style="color: ${bal > 0 ? '#b02a37' : '#1e8449'}; font-weight:600;">${formatPHP(bal)}</td>
                <td>
                    <span style="display:inline-block; background: #faf4ee; border: 1px solid #dcd0c2; padding: 2px 8px; border-radius: 4px; font-family:'Special Elite', monospace; font-size: 11px; color: var(--maroon);">
                        ${escapeHtml(p.mode || 'GCash')}
                    </span>
                </td>
                <td>${typeBadge}</td>
                <td style="text-align: center;">${aiBtn}</td>
                <td style="text-align: center;">
                    ${p.receipt ? `
                        <button type="button" onclick="openViewReceiptModal('${p.id}')" class="btn-action btn-secondary" style="padding: 2px 8px; font-size: 11px;">Proof</button>
                    ` : `
                        <span style="color:#aaa; font-size: 11px; font-style:italic;">None</span>
                    `}
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <button type="button" onclick="editPayment('${p.id}')" class="btn-action btn-secondary" style="padding: 2px 8px; font-size: 11px; margin-right: 4px;">Edit</button>
                    <button type="button" onclick="deletePayment('${p.id}')" class="btn-action btn-danger" style="padding: 2px 8px; font-size: 11px;">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    if (filteredTotalEl) {
        filteredTotalEl.textContent = formatPHP(runningTotal);
    }
}

// AI Double-Check Breakdown Modal
function showAiDoubleCheckModal(payId) {
    const list = Storage.get(Storage.KEYS.PAYMENTS, []);
    const p = list.find(item => item.id === payId);
    if (!p) return;

    const modalBody = document.getElementById('ai-check-modal-body');
    if (!modalBody) return;

    const amt = parseFloat(p.amount) || 0;
    const agreed = parseFloat(p.agreedPrice) || (p.paymentType === 'fully_paid' ? amt : amt * 2);
    const balance = Math.max(0, agreed - amt);
    const pct = agreed > 0 ? Math.round((amt / agreed) * 100) : 100;
    const isFull = amt >= agreed && agreed > 0;

    modalBody.innerHTML = `
        <div style="background: #fdfaf6; border: 1px solid #dcd0c2; border-radius: 6px; padding: 16px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #dcd0c2; padding-bottom: 8px; margin-bottom: 10px;">
                <div>
                    <span style="font-family:'Special Elite', monospace; font-size: 14px; color: var(--maroon); font-weight: bold;">${escapeHtml(p.clientName || 'Client')}</span>
                    <span style="font-size: 11px; color: #7a5048; margin-left: 8px;">(${escapeHtml(p.service || 'Commission')})</span>
                </div>
                <span style="background: ${isFull ? '#eafaf1' : '#fef7ea'}; color: ${isFull ? '#1e8449' : '#b45309'}; border: 1px solid ${isFull ? '#a9dfbf' : '#fde68a'}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; font-family:'Special Elite', monospace;">
                    ${isFull ? '100% Fully Settled' : `${pct}% Downpayment`}
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; margin-bottom: 14px;">
                <div style="background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e0d0c0;">
                    <div style="font-size: 10.5px; text-transform: uppercase; color: #8c5b52; font-family:'Special Elite', monospace;">Agreed Fee</div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--maroon-dark);">${formatPHP(agreed)}</div>
                </div>
                <div style="background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e0d0c0;">
                    <div style="font-size: 10.5px; text-transform: uppercase; color: #8c5b52; font-family:'Special Elite', monospace;">Amount Received</div>
                    <div style="font-size: 16px; font-weight: bold; color: #1e8449;">${formatPHP(amt)}</div>
                </div>
                <div style="background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e0d0c0;">
                    <div style="font-size: 10.5px; text-transform: uppercase; color: #8c5b52; font-family:'Special Elite', monospace;">Remaining Balance</div>
                    <div style="font-size: 16px; font-weight: bold; color: ${balance > 0 ? '#b02a37' : '#1e8449'};">${formatPHP(balance)}</div>
                </div>
            </div>

            <div style="background: #fff; border: 1px solid #bce0fd; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; font-family:'Special Elite', monospace; font-size: 12.5px; color: #0056b3; font-weight: bold; margin-bottom: 6px;">
                    AI Verification Analysis: PASS (Verified)
                </div>
                <p style="font-size: 12px; color: #334; line-height: 1.6; margin: 0;">
                    AI cross-reference confirmed payment of <strong>${formatPHP(amt)}</strong> via <strong>${escapeHtml(p.mode || 'GCash')}</strong>.
                    ${isFull 
                        ? 'Payment completely settles the full agreed project fee of ' + formatPHP(agreed) + '. Final output turnover is approved.' 
                        : 'Transferred amount satisfies the ' + pct + '% downpayment requirement on the agreed price of ' + formatPHP(agreed) + '. Project work is approved to start. Balance due prior to release: <strong>' + formatPHP(balance) + '</strong>.'}
                </p>
            </div>

            ${p.receipt ? `
                <div style="text-align: center; margin-top: 10px;">
                    <div style="font-size: 11px; color: #8c5b52; font-family:'Special Elite', monospace; margin-bottom: 6px;">Submitted Proof Screenshot</div>
                    <img src="${p.receipt}" alt="Proof" style="max-height: 180px; max-width: 100%; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); border: 1px solid #e0d0c0;">
                </div>
            ` : '<div style="text-align:center; color:#aaa; font-style:italic; font-size:12px;">No proof screenshot attached.</div>'}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn-action btn-primary" onclick="markPaymentAiVerified('${p.id}')">Confirm AI Verification</button>
            <button type="button" class="btn-action btn-secondary" onclick="closeModal('modal-ai-check')">Close</button>
        </div>
    `;

    openModal('modal-ai-check');
}

function markPaymentAiVerified(payId) {
    let list = Storage.get(Storage.KEYS.PAYMENTS, []);
    const idx = list.findIndex(item => item.id === payId);
    if (idx !== -1) {
        list[idx].aiVerified = true;
        Storage.set(Storage.KEYS.PAYMENTS, list);
        showToast('Payment verified by AI!');
        closeModal('modal-ai-check');
        renderPaymentsTracker();
    }
}

function handleAdminPayPriceDetect() {
    const agreed = parseFloat(document.getElementById('pay-agreed-price')?.value) || 0;
    const paid = parseFloat(document.getElementById('pay-amount')?.value) || 0;
    const pill = document.getElementById('pay-admin-detect-pill');
    const opt = document.getElementById('pay-option');

    if (agreed <= 0 && paid <= 0) {
        if (pill) pill.style.display = 'none';
        return;
    }

    if (pill) pill.style.display = 'block';

    if (paid >= agreed && agreed > 0) {
        pill.style.background = '#eafaf1';
        pill.style.borderColor = '#a9dfbf';
        pill.style.color = '#1e8449';
        pill.innerHTML = `Auto-Detected: Fully Paid (100% Settled)`;
        if (opt) opt.value = 'fully_paid';
    } else if (paid > 0 && agreed > 0) {
        const pct = Math.round((paid / agreed) * 100);
        const bal = Math.max(0, agreed - paid);
        pill.style.background = '#fef7ea';
        pill.style.borderColor = '#fde68a';
        pill.style.color = '#b45309';
        pill.innerHTML = `Auto-Detected: Downpayment (${pct}%) — Balance: ₱${bal.toLocaleString()}`;
        if (opt) opt.value = 'downpayment';
    } else {
        pill.style.display = 'none';
    }
}

// ============================================
// RECORD / EDIT PAYMENT MODAL
// ============================================
function openRecordPaymentModal(editId = null, proofSubmissionId = '') {
    populateAdminPaymentServices();
    tempPaymentReceipt = '';
    const modalTitle = document.getElementById('record-payment-modal-title');
    const idInput = document.getElementById('pay-edit-id');
    const clientInput = document.getElementById('pay-client-name');
    const dateInput = document.getElementById('pay-date');
    const serviceSelect = document.getElementById('pay-service');
    const agreedInput = document.getElementById('pay-agreed-price');
    const amountInput = document.getElementById('pay-amount');
    const modeSelect = document.getElementById('pay-mode');
    const optionSelect = document.getElementById('pay-option');
    const statusSelect = document.getElementById('pay-status');
    const notesInput = document.getElementById('pay-notes');
    const fileInput = document.getElementById('pay-receipt-file');
    const previewWrap = document.getElementById('pay-receipt-preview-wrap');
    const previewImg = document.getElementById('pay-receipt-preview-img');
    const detectPill = document.getElementById('pay-admin-detect-pill');
    const proofIdInput = document.getElementById('pay-proof-submission-id');
    if (proofIdInput) proofIdInput.value = proofSubmissionId;

    if (fileInput) fileInput.value = '';
    if (previewWrap) previewWrap.style.display = 'none';
    if (detectPill) detectPill.style.display = 'none';

    if (editId) {
        const list = Storage.get(Storage.KEYS.PAYMENTS, []);
        const item = list.find(p => p.id === editId);
        if (item) {
            if (modalTitle) modalTitle.textContent = 'Edit Payment Entry';
            if (idInput) idInput.value = item.id;
            if (clientInput) clientInput.value = item.clientName || '';
            if (dateInput) dateInput.value = item.date || new Date().toISOString().split('T')[0];
            if (serviceSelect) serviceSelect.value = item.service || 'Website Development';
            if (agreedInput) agreedInput.value = item.agreedPrice || item.amount || '';
            if (amountInput) amountInput.value = item.amount || '';
            if (modeSelect) modeSelect.value = item.mode || 'GCash';
            if (optionSelect) optionSelect.value = item.paymentType || 'fully_paid';
            if (statusSelect) statusSelect.value = item.status || 'Confirmed';
            if (notesInput) notesInput.value = item.notes || '';
            if (item.receipt) {
                tempPaymentReceipt = item.receipt;
                if (previewImg) previewImg.src = item.receipt;
                if (previewWrap) previewWrap.style.display = 'block';
            }
        }
    } else {
        if (modalTitle) modalTitle.textContent = 'Record Payment Entry';
        if (idInput) idInput.value = '';
        if (clientInput) clientInput.value = '';
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        if (agreedInput) agreedInput.value = '';
        if (amountInput) amountInput.value = '';
        if (notesInput) notesInput.value = '';
        if (optionSelect) optionSelect.value = 'fully_paid';
        if (statusSelect) statusSelect.value = 'Confirmed';
    }

    openModal('modal-record-payment');
}

function previewPaymentReceipt(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        tempPaymentReceipt = e.target.result;
        const wrap = document.getElementById('pay-receipt-preview-wrap');
        const img = document.getElementById('pay-receipt-preview-img');
        if (img) img.src = tempPaymentReceipt;
        if (wrap) wrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removePaymentReceipt() {
    tempPaymentReceipt = '';
    const fileInput = document.getElementById('pay-receipt-file');
    const wrap = document.getElementById('pay-receipt-preview-wrap');
    if (fileInput) fileInput.value = '';
    if (wrap) wrap.style.display = 'none';
}

function handleSavePayment(event) {
    event.preventDefault();
    const idInput = document.getElementById('pay-edit-id')?.value;
    const proofSubmissionId = document.getElementById('pay-proof-submission-id')?.value;
    const clientName = document.getElementById('pay-client-name')?.value.trim() || 'Anonymous';
    const date = document.getElementById('pay-date')?.value || new Date().toISOString().split('T')[0];
    const service = document.getElementById('pay-service')?.value || 'General Commission';
    const agreedPrice = parseFloat(document.getElementById('pay-agreed-price')?.value) || 0;
    const amount = parseFloat(document.getElementById('pay-amount')?.value) || 0;
    const mode = document.getElementById('pay-mode')?.value || 'GCash';
    const paymentType = document.getElementById('pay-option')?.value || 'fully_paid';
    const status = document.getElementById('pay-status')?.value || 'Confirmed';
    const notes = document.getElementById('pay-notes')?.value.trim() || '';

    const list = Storage.get(Storage.KEYS.PAYMENTS, []);
    const bal = Math.max(0, (agreedPrice || amount) - amount);

    if (idInput) {
        // Edit existing
        const idx = list.findIndex(p => p.id === idInput);
        if (idx !== -1) {
            list[idx].clientName = clientName;
            list[idx].date = date;
            list[idx].service = service;
            list[idx].agreedPrice = agreedPrice || amount;
            list[idx].amount = amount;
            list[idx].balance = bal;
            list[idx].mode = mode;
            list[idx].paymentType = paymentType;
            list[idx].status = status;
            list[idx].notes = notes;
            if (tempPaymentReceipt) list[idx].receipt = tempPaymentReceipt;
            showToast('Payment entry updated!');
        }
    } else {
        // Create new
        const newId = 'PAY-' + (1000 + list.length + 1);
        list.unshift({
            id: newId,
            clientName,
            date,
            service,
            agreedPrice: agreedPrice || amount,
            amount,
            balance: bal,
            mode,
            paymentType,
            status,
            notes,
            receipt: tempPaymentReceipt,
            aiVerified: true
        });
        showToast('Payment entry recorded!');
    }

    Storage.set(Storage.KEYS.PAYMENTS, list);
    if (proofSubmissionId) {
        const remainingProofs = Storage.get(Storage.KEYS.PAYMENT_PROOFS, []).filter(item => item.id !== proofSubmissionId);
        Storage.set(Storage.KEYS.PAYMENT_PROOFS, remainingProofs);
    }
    closeModal('modal-record-payment');
    renderPaymentsTracker();
}

function editPayment(id) {
    openRecordPaymentModal(id);
}

function deletePayment(id) {
    if (!confirm('Are you sure you want to delete this payment record from the sheet?')) return;
    let list = Storage.get(Storage.KEYS.PAYMENTS, []);
    list = list.filter(p => p.id !== id);
    Storage.set(Storage.KEYS.PAYMENTS, list);
    showToast('Payment record deleted.');
    renderPaymentsTracker();
}

function openViewReceiptModal(id) {
    const list = Storage.get(Storage.KEYS.PAYMENTS, []);
    const item = list.find(p => p.id === id);
    if (!item || !item.receipt) {
        showToast('No receipt image found for this payment.');
        return;
    }

    const detailsEl = document.getElementById('view-receipt-details');
    const imgEl = document.getElementById('view-receipt-img');

    if (detailsEl) {
        detailsEl.textContent = `${item.clientName} • ${formatPHP(item.amount)} via ${item.mode} (${item.date || ''})`;
    }
    if (imgEl) {
        imgEl.src = item.receipt;
    }

    openModal('modal-view-receipt');
}

function exportPaymentsToCSV() {
    const payments = Storage.get(Storage.KEYS.PAYMENTS, []);
    if (payments.length === 0) {
        showToast('No payment records to export.');
        return;
    }

    const headers = ['Payment ID', 'Date', 'Client Name', 'Type of Service', 'Amount (PHP)', 'Mode of Payment', 'Payment Option', 'Status', 'Notes'];
    const rows = payments.map(p => [
        p.id || '',
        p.date || '',
        `"${(p.clientName || '').replace(/"/g, '""')}"`,
        `"${(p.service || '').replace(/"/g, '""')}"`,
        p.amount || 0,
        `"${(p.mode || '').replace(/"/g, '""')}"`,
        p.paymentType === 'fully_paid' ? 'Fully Paid' : '50% DP',
        p.status || 'Confirmed',
        `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Thalie_Payment_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Payment sheet exported to CSV successfully!');
}



// ============================================
// CLIENT ACCOUNTS TAB (Admin Side)
// ============================================

function renderClientAccounts() {
    return renderAccountApprovals();
    const accounts = Storage.get(Storage.KEYS.CLIENT_ACCOUNTS, []);
    const pending = accounts.filter(a => a.status === 'pending');
    const accepted = accounts.filter(a => a.status === 'accepted');

    const pendingEl = document.getElementById('pending-accounts-list');
    const acceptedEl = document.getElementById('accepted-accounts-list');

    if (pendingEl) {
        if (pending.length === 0) {
            pendingEl.innerHTML = '<p style="text-align:center; color:#7a5048; font-family:\'Special Elite\',monospace; font-size:13px; padding: 20px 0;">No pending registrations.</p>';
        } else {
            pendingEl.innerHTML = `
                <table style="width:100%; border-collapse:collapse; font-family:'Poppins',sans-serif; font-size:13px;">
                    <thead>
                        <tr style="border-bottom: 1px dashed var(--rose);">
                            <th style="text-align:left; padding:8px 10px; font-family:'Special Elite',monospace; color:var(--maroon-dark); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Account Name</th>
                            <th style="text-align:left; padding:8px 10px; font-family:'Special Elite',monospace; color:var(--maroon-dark); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Date Requested</th>
                            <th style="text-align:center; padding:8px 10px; font-family:'Special Elite',monospace; color:var(--maroon-dark); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pending.map(a => `
                        <tr style="border-bottom: 1px dashed rgba(0,0,0,0.07);">
                            <td style="padding:10px 10px; color:var(--maroon-dark); font-weight:500;">${escapeHtml(a.accountName)}</td>
                            <td style="padding:10px 10px; color:#7a5048;">${a.dateRegistered || ''}</td>
                            <td style="padding:10px 10px; text-align:center; display:flex; gap:8px; justify-content:center;">
                                <button class="btn-action btn-primary" onclick="acceptClientAccount('${a.id}')" style="padding:5px 14px; font-size:11px;">Accept</button>
                                <button class="btn-action btn-danger" onclick="declineClientAccount('${a.id}')" style="padding:5px 14px; font-size:11px;">Decline</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
        }
    }

    if (acceptedEl) {
        if (accepted.length === 0) {
            acceptedEl.innerHTML = '<p style="text-align:center; color:#7a5048; font-family:\'Special Elite\',monospace; font-size:13px; padding: 20px 0;">No accepted accounts yet.</p>';
        } else {
            acceptedEl.innerHTML = `
                <table style="width:100%; border-collapse:collapse; font-family:'Poppins',sans-serif; font-size:13px;">
                    <thead>
                        <tr style="border-bottom: 1px dashed var(--rose);">
                            <th style="text-align:left; padding:8px 10px; font-family:'Special Elite',monospace; color:var(--maroon-dark); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Account Name</th>
                            <th style="text-align:left; padding:8px 10px; font-family:'Special Elite',monospace; color:var(--maroon-dark); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Date Registered</th>
                            <th style="text-align:left; padding:8px 10px; font-family:'Special Elite',monospace; color:var(--maroon-dark); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Date Accepted</th>
                            <th style="text-align:center; padding:8px 10px; font-family:'Special Elite',monospace; color:var(--maroon-dark); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${accepted.map(a => `
                        <tr style="border-bottom: 1px dashed rgba(0,0,0,0.07);">
                            <td style="padding:10px 10px; color:var(--maroon-dark); font-weight:500;">${escapeHtml(a.accountName)}</td>
                            <td style="padding:10px 10px; color:#7a5048;">${a.dateRegistered || ''}</td>
                            <td style="padding:10px 10px; color:#7a5048;">${a.dateAccepted || ''}</td>
                            <td style="padding:10px 10px; text-align:center;">
                                <button class="btn-action btn-danger" onclick="revokeClientAccount('${a.id}')" style="padding:5px 14px; font-size:11px;">Revoke</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
        }
    }

    updateBadges();
}

function renderCommissionerRegistrations() {
    return renderAccountApprovals();
    const container = document.getElementById('pending-commissioners-list');
    if (!container) return;
    const pending = Storage.get(Storage.KEYS.ADMIN_USERS, []).filter(user => user.approvalStatus === 'pending');
    if (!pending.length) {
        container.innerHTML = '<p style="text-align:center;color:#7a5048;font-family:\'Special Elite\',monospace;font-size:13px;padding:14px 0;">No pending Commissioner Portal requests.</p>';
        updateBadges();
        return;
    }
    container.innerHTML = `
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-family:'Poppins',sans-serif;font-size:13px;">
                <thead><tr style="border-bottom:1px dashed var(--rose);">
                    <th style="text-align:left;padding:8px 10px;color:var(--maroon-dark);">Account Name</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--maroon-dark);">Requested</th>
                    <th style="text-align:center;padding:8px 10px;color:var(--maroon-dark);">Action</th>
                </tr></thead>
                <tbody>${pending.map(user => `
                    <tr style="border-bottom:1px dashed rgba(0,0,0,0.07);">
                        <td style="padding:10px;color:var(--maroon-dark);font-weight:500;">${escapeHtml(user.accountName || user.username)}</td>
                        <td style="padding:10px;color:#7a5048;">${new Date(user.createdAt).toLocaleDateString()}</td>
                        <td style="padding:10px;text-align:center;">
                            <button class="btn-action btn-primary" onclick="approveCommissionerAccount('${user.id || user.username}')" style="padding:5px 14px;font-size:11px;">Approve</button>
                            <button class="btn-action btn-danger" onclick="declineCommissionerAccount('${user.id || user.username}')" style="padding:5px 14px;font-size:11px;">Decline</button>
                        </td>
                    </tr>`).join('')}</tbody>
            </table>
        </div>`;
    updateBadges();
}

function renderAccountApprovals() {
    const container = document.getElementById('account-approval-list');
    if (!container) return;
    const commissioners = Storage.get(Storage.KEYS.ADMIN_USERS, [])
        .filter(user => (user.username || '').toLowerCase() !== 'admin')
        .map(user => ({
            type: 'commissioner',
            key: user.id || user.username,
            name: user.accountName || user.username,
            date: user.createdAt,
            paid: !!user.paid,
            status: user.approvalStatus === 'pending' ? 'pending' : user.approvalStatus === 'rejected' ? 'declined' : 'approved'
        }));
    const clients = Storage.get(Storage.KEYS.CLIENT_ACCOUNTS, []).map(account => ({
        type: 'client',
        key: account.id || account.username || account.accountName,
        name: account.accountName || account.username || 'Client account',
        date: account.dateRegistered,
        paid: !!account.paid,
        status: account.status === 'pending' ? 'pending' : account.status === 'accepted' ? 'approved' : 'declined'
    }));
    const rows = [...commissioners, ...clients].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const pendingCount = rows.filter(row => row.status === 'pending').length;
    const badge = document.getElementById('badge-pending-accounts');
    if (badge) badge.textContent = pendingCount;

    if (!rows.length) {
        container.innerHTML = '<p style="text-align:center;color:#7a5048;font-family:\'Special Elite\',monospace;padding:28px 0;">No accounts registered yet.</p>';
        updateBadges();
        return;
    }

    const encodeKey = key => encodeURIComponent(String(key || '')).replace(/'/g, '%27');
    const statusLabel = status => status === 'approved' ? 'Approved' : status === 'declined' ? 'Declined' : 'Pending';
    container.innerHTML = `
        <div style="overflow-x:auto;">
            <table style="width:100%;min-width:760px;border-collapse:collapse;font-family:'Poppins',sans-serif;font-size:13px;">
                <thead><tr style="border-bottom:1px dashed var(--rose);">
                    <th style="text-align:left;padding:10px;color:var(--maroon-dark);">Commissioner Account Name</th>
                    <th style="text-align:left;padding:10px;color:var(--maroon-dark);">Date</th>
                    <th style="text-align:center;padding:10px;color:var(--maroon-dark);">Payment Status</th>
                    <th style="text-align:center;padding:10px;color:var(--maroon-dark);">Decision</th>
                </tr></thead>
                <tbody>${rows.map(row => {
                    const safeKey = encodeKey(row.key);
                    const actionArg = `'${row.type}','${safeKey}'`;
                    const dateValue = row.date ? new Date(row.date) : null;
                    const dateLabel = dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue.toLocaleDateString() : '—';
                    const paymentValue = row.paid ? 'paid' : 'not_paid';
                    const decisionValue = row.status === 'approved' ? 'approved' : row.status === 'declined' ? 'declined' : 'pending';
                    return `<tr style="border-bottom:1px dashed rgba(0,0,0,0.08);">
                        <td style="padding:12px 10px;color:var(--maroon-dark);font-weight:500;">${escapeHtml(row.name)}<div style="font-size:10px;color:#8c5b52;text-transform:uppercase;">${row.type}</div></td>
                        <td style="padding:12px 10px;color:#7a5048;">${dateLabel}</td>
                        <td style="padding:12px 10px;text-align:center;">
                            <select class="account-status-select payment-status-select ${row.paid ? 'paid' : 'not-paid'}" onchange="setAccountPayment('${row.type}','${safeKey}',this.value)" aria-label="Payment status for ${escapeHtml(row.name)}">
                                <option value="not_paid" ${paymentValue === 'not_paid' ? 'selected' : ''}>Not paid</option>
                                <option value="paid" ${paymentValue === 'paid' ? 'selected' : ''}>Paid</option>
                            </select>
                        </td>
                        <td style="padding:12px 10px;text-align:center;">
                            <select class="account-status-select decision-status-select ${decisionValue}" onchange="setAccountApproval(${actionArg},this.value)" aria-label="Approval decision for ${escapeHtml(row.name)}">
                                <option value="pending" ${decisionValue === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="approved" ${decisionValue === 'approved' ? 'selected' : ''}>Approved</option>
                                <option value="declined" ${decisionValue === 'declined' ? 'selected' : ''}>Declined</option>
                            </select>
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
        </div>`;
    updateBadges();
}

function setAccountPayment(type, encodedKey, paymentStatus) {
    if (!isMainAdminSession()) return;
    const key = decodeURIComponent(encodedKey);
    const storageKey = type === 'commissioner' ? Storage.KEYS.ADMIN_USERS : Storage.KEYS.CLIENT_ACCOUNTS;
    const records = Storage.get(storageKey, []);
    const record = records.find(item => String(item.id || item.username || item.accountName) === key);
    if (!record) return;
    record.paid = paymentStatus === 'paid';
    Storage.set(storageKey, records);
    renderAccountApprovals();
}

function setAccountApproval(type, encodedKey, decision) {
    if (!isMainAdminSession()) return;
    const key = decodeURIComponent(encodedKey);
    if (type === 'commissioner') {
        const users = Storage.get(Storage.KEYS.ADMIN_USERS, []);
        const user = users.find(item => String(item.id || item.username || item.accountName) === key);
        if (!user) return;
        user.approvalStatus = decision === 'approved' ? 'approved' : decision === 'declined' ? 'rejected' : 'pending';
        if (decision === 'approved') user.approvedAt = new Date().toISOString();
        if (decision === 'declined') user.declinedAt = new Date().toISOString();
        Storage.set(Storage.KEYS.ADMIN_USERS, users);
        showToast(decision === 'approved'
            ? `${user.accountName} can now sign in.`
            : decision === 'declined'
                ? `${user.accountName} was declined and cannot sign in.`
                : `${user.accountName} is pending approval.`);
    } else {
        const accounts = Storage.get(Storage.KEYS.CLIENT_ACCOUNTS, []);
        const account = accounts.find(item => String(item.id || item.accountName) === key);
        if (!account) return;
        account.status = decision === 'approved' ? 'accepted' : decision === 'declined' ? 'declined' : 'pending';
        if (decision === 'approved') account.dateAccepted = new Date().toISOString();
        if (decision === 'declined') account.dateDeclined = new Date().toISOString();
        Storage.set(Storage.KEYS.CLIENT_ACCOUNTS, accounts);
        showToast(decision === 'approved' ? 'Client account approved.' : decision === 'declined' ? 'Client account declined.' : 'Client account is pending.');
    }
    renderAccountApprovals();
}

function approveCommissionerAccount(userKey) {
    if (!isMainAdminSession()) return;
    const users = Storage.get(Storage.KEYS.ADMIN_USERS, []);
    const user = users.find(item => (item.id || item.username) === userKey);
    if (!user || user.approvalStatus !== 'pending') return;
    user.approvalStatus = 'approved';
    user.approvedAt = new Date().toISOString();
    Storage.set(Storage.KEYS.ADMIN_USERS, users);
    renderAccountApprovals();
    showToast(`${user.accountName || user.username} can now sign in.`);
}

function declineCommissionerAccount(userKey) {
    if (!isMainAdminSession()) return;
    if (!confirm('Decline this Commissioner Portal registration? The account will not be able to sign in.')) return;
    const users = Storage.get(Storage.KEYS.ADMIN_USERS, []);
    const user = users.find(item => (item.id || item.username) === userKey && item.approvalStatus === 'pending');
    if (!user) return;
    user.approvalStatus = 'rejected';
    user.declinedAt = new Date().toISOString();
    Storage.set(Storage.KEYS.ADMIN_USERS, users);
    renderAccountApprovals();
    showToast('Commissioner registration declined. They cannot sign in.');
}

function acceptClientAccount(id) {
    if (!isMainAdminSession()) return;
    const accounts = Storage.get(Storage.KEYS.CLIENT_ACCOUNTS, []);
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return;
    accounts[idx].status = 'accepted';
    accounts[idx].dateAccepted = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    Storage.set(Storage.KEYS.CLIENT_ACCOUNTS, accounts);
    renderAccountApprovals();
    showToast('Account accepted! Client can now log in.');
}

function declineClientAccount(id) {
    if (!isMainAdminSession()) return;
    if (!confirm('Decline and remove this registration request?')) return;
    let accounts = Storage.get(Storage.KEYS.CLIENT_ACCOUNTS, []);
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    account.status = 'declined';
    Storage.set(Storage.KEYS.CLIENT_ACCOUNTS, accounts);
    renderAccountApprovals();
    showToast('Registration declined.');
}

function revokeClientAccount(id) {
    if (!isMainAdminSession()) return;
    if (!confirm('Revoke access for this client account?')) return;
    let accounts = Storage.get(Storage.KEYS.CLIENT_ACCOUNTS, []);
    accounts = accounts.filter(a => a.id !== id);
    Storage.set(Storage.KEYS.CLIENT_ACCOUNTS, accounts);
    renderAccountApprovals();
    showToast('Account revoked.');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
