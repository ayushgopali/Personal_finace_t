const API_URL = `${window.location.origin}/api`;

let isEditMode = false;
let editingExpenseId = null;
let currentUser = { name: 'Pranav', email: '' };
let isAuthenticated = false;
let searchExpenses = [];
let analyticsRangeMonths = 6;
let categoryExpenses = [];
let categoryRangeMonths = 6;
let walletRefreshTimer = null;
let walletPhotoCache = '';
let walletCardRuntime = {
    monthLabel: 'LIVE',
    status: 'Ready'
};

// Set today's date as default
const dateInput = document.getElementById('date');
if (dateInput) {
    dateInput.value = getDateInputValue(new Date());
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initSpendoraSelectControls();
    initDatePickerControl();
    updateTimeGreeting();
    initAuthState();
    initHeaderControls();
    initLiquidGlassNav();
    initDashboardPage();
    initSearchPage();
    initAnalyticsPage();
    initCategoriesPage();
    initWalletPage();
    initPremiumAnimations();
});

function initSpendoraSelectControls() {
    const roots = [...document.querySelectorAll('[data-select-root]')];
    if (!roots.length) return;

    roots.forEach(root => {
        if (root.dataset.selectReady === 'true') return;
        root.dataset.selectReady = 'true';

        const trigger = root.querySelector('[data-select-trigger]');
        const menu = root.querySelector('[data-select-menu]');
        const input = root.querySelector('input[type="hidden"]');

        syncSpendoraSelect(root);

        trigger?.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();

            const shouldOpen = menu?.hidden;
            closeSpendoraSelects(shouldOpen ? root : null);

            if (menu && shouldOpen) {
                menu.hidden = false;
                root.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');

                if (window.gsap) {
                    gsap.fromTo(menu, { opacity: 0, y: -5, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' });
                }
            }
        });

        menu?.addEventListener('click', event => {
            const option = event.target.closest('[data-select-option]');
            if (!option) return;

            event.preventDefault();
            event.stopPropagation();

            input.value = option.dataset.selectOption || '';
            input.dispatchEvent(new Event('change', { bubbles: true }));
            syncSpendoraSelect(root);
            closeSpendoraSelects();
        });
    });

    if (document.body.dataset.spendoraSelectListeners === 'true') return;
    document.body.dataset.spendoraSelectListeners = 'true';

    document.addEventListener('click', event => {
        if (!event.target.closest('[data-select-root]')) closeSpendoraSelects();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSpendoraSelects();
    });
}

function closeSpendoraSelects(exceptRoot = null) {
    document.querySelectorAll('[data-select-root]').forEach(root => {
        if (root === exceptRoot) return;

        root.classList.remove('is-open');
        root.querySelector('[data-select-menu]')?.setAttribute('hidden', '');
        root.querySelector('[data-select-trigger]')?.setAttribute('aria-expanded', 'false');
    });
}

function syncSpendoraSelect(root) {
    if (!root) return;

    const input = root.querySelector('input[type="hidden"]');
    const label = root.querySelector('[data-select-label]');
    const trigger = root.querySelector('[data-select-trigger]');
    const placeholder = root.dataset.placeholder || 'Select';
    const value = input?.value || '';
    const options = [...root.querySelectorAll('[data-select-option]')];
    const selected = options.find(option => (option.dataset.selectOption || '') === value);

    if (label) label.textContent = selected?.textContent?.trim() || placeholder;
    trigger?.classList.toggle('has-value', Boolean(value));

    options.forEach(option => {
        const isSelected = (option.dataset.selectOption || '') === value;
        option.classList.toggle('is-selected', isSelected);
        option.setAttribute('aria-selected', String(isSelected));
    });
}

function setSpendoraSelectValue(inputId, value) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.value = value || '';
    syncSpendoraSelect(input.closest('[data-select-root]'));
}

function initDatePickerControl() {
    const roots = [...document.querySelectorAll('.spendora-date-picker')];
    if (!roots.length) return;

    roots.forEach(root => {
        if (root.dataset.dateReady === 'true') return;
        root.dataset.dateReady = 'true';

        const input = root.querySelector('input');
        const trigger = root.querySelector('.date-picker-trigger');
        const popover = root.querySelector('.date-picker-popover');
        const valueLabel = root.querySelector('[data-date-label], #datePickerValue');
        const placeholder = root.dataset.placeholder || 'Select date';
        const shouldDefaultToday = root.dataset.defaultToday === 'true' || input?.id === 'date';

        if (!input || !trigger || !popover || !valueLabel) return;

        let viewDate = parseDateInputValue(input.value) || new Date();

        const syncLabel = () => {
            valueLabel.textContent = input.value ? formatDateForPicker(input.value) : placeholder;
            trigger.classList.toggle('has-value', Boolean(input.value));
        };

        const closePicker = () => {
            root.classList.remove('is-open');
            popover.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        };

        const openPicker = () => {
            closeSpendoraDatePickers(root);
            renderSpendoraCalendar(popover, input.value, viewDate);
            root.classList.add('is-open');
            popover.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');

            if (window.gsap) {
                gsap.fromTo(popover, { opacity: 0, y: -6, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' });
            }
        };

        const setDate = value => {
            const nextValue = value || '';
            const changed = input.value !== nextValue;
            input.value = nextValue;
            if (nextValue) viewDate = parseDateInputValue(nextValue) || viewDate;
            syncLabel();
            if (changed) input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        if (!input.value && shouldDefaultToday) {
            setDate(getDateInputValue(new Date()));
        } else {
            syncLabel();
        }

        trigger.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (popover.hidden) {
                openPicker();
            } else {
                closePicker();
            }
        });

        const refreshCalendar = () => {
            renderSpendoraCalendar(popover, input.value, viewDate);

            if (window.gsap) {
                gsap.fromTo(
                    popover.querySelector('.date-picker-grid'),
                    { opacity: 0, y: 5 },
                    { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }
                );
            }
        };

        popover.addEventListener('click', event => {
            const actionButton = event.target.closest('[data-date-action]');
            const action = actionButton?.dataset.dateAction;
            const dateButton = event.target.closest('[data-date-value]');
            const toggleButton = event.target.closest('[data-date-toggle]');
            const optionButton = event.target.closest('[data-date-option]');

            if (actionButton || dateButton || toggleButton || optionButton) {
                event.preventDefault();
                event.stopPropagation();
            }

            if (toggleButton) {
                const menuName = toggleButton.dataset.dateToggle;
                const menu = popover.querySelector(`[data-date-menu="${menuName}"]`);
                const isOpening = menu?.hidden;

                popover.querySelectorAll('[data-date-menu]').forEach(item => {
                    item.hidden = true;
                });
                popover.querySelectorAll('[data-date-toggle]').forEach(item => {
                    item.setAttribute('aria-expanded', 'false');
                });

                if (menu && isOpening) {
                    menu.hidden = false;
                    toggleButton.setAttribute('aria-expanded', 'true');

                    if (window.gsap) {
                        gsap.fromTo(menu, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' });
                    }
                }
                return;
            }

            if (optionButton) {
                const option = optionButton.dataset.dateOption;
                const value = Number(optionButton.dataset.dateValue);
                if (Number.isNaN(value)) return;

                viewDate = option === 'month'
                    ? new Date(viewDate.getFullYear(), value, 1)
                    : new Date(value, viewDate.getMonth(), 1);
                refreshCalendar();
                return;
            }

            if (action === 'previous') {
                viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
                refreshCalendar();
                return;
            }

            if (action === 'next') {
                viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
                refreshCalendar();
                return;
            }

            if (action === 'today') {
                setDate(getDateInputValue(new Date()));
                closePicker();
                return;
            }

            if (action === 'clear') {
                setDate('');
                closePicker();
                return;
            }

            if (dateButton) {
                setDate(dateButton.dataset.dateValue);
                closePicker();
            }
        });
    });

    if (document.body.dataset.spendoraDateListeners === 'true') return;
    document.body.dataset.spendoraDateListeners = 'true';

    document.addEventListener('click', event => {
        if (!event.target.closest('.spendora-date-picker')) closeSpendoraDatePickers();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSpendoraDatePickers();
    });
}

function getDateInputValue(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateInputValue(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateForPicker(value) {
    const date = parseDateInputValue(value);
    if (!date) return 'Select date';

    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function setExpenseDateValue(value) {
    setSpendoraDateValue('date', value);
}

function setSpendoraDateValue(inputId, value) {
    const targetInput = document.getElementById(inputId);
    const root = targetInput?.closest('.spendora-date-picker');
    const valueLabel = root?.querySelector('[data-date-label], #datePickerValue');
    const trigger = root?.querySelector('.date-picker-trigger');
    const placeholder = root?.dataset.placeholder || 'Select date';
    const normalizedValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value;

    if (targetInput) targetInput.value = normalizedValue || '';
    if (valueLabel) valueLabel.textContent = normalizedValue ? formatDateForPicker(normalizedValue) : placeholder;
    if (trigger) trigger.classList.toggle('has-value', Boolean(normalizedValue));
}

function closeSpendoraDatePickers(exceptRoot = null) {
    document.querySelectorAll('.spendora-date-picker').forEach(root => {
        if (root === exceptRoot) return;

        root.classList.remove('is-open');
        root.querySelector('.date-picker-popover')?.setAttribute('hidden', '');
        root.querySelector('.date-picker-trigger')?.setAttribute('aria-expanded', 'false');
    });
}

function renderSpendoraCalendar(popover, selectedValue, viewDate) {
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDay = monthStart.getDay();
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - firstDay);
    const todayValue = getDateInputValue(new Date());
    const monthNames = Array.from({ length: 12 }, (_, index) => new Date(2026, index, 1).toLocaleDateString('en-IN', { month: 'long' }));
    const currentYear = new Date().getFullYear();
    const minYear = Math.min(currentYear - 30, monthStart.getFullYear() - 5);
    const maxYear = Math.max(currentYear + 10, monthStart.getFullYear() + 5);
    const monthOptions = monthNames.map((month, index) => `
        <button type="button" role="option" class="${index === monthStart.getMonth() ? 'is-selected' : ''}" data-date-option="month" data-date-value="${index}" aria-selected="${index === monthStart.getMonth()}">${month}</button>
    `).join('');
    const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) => {
        const year = minYear + index;
        return `<button type="button" role="option" class="${year === monthStart.getFullYear() ? 'is-selected' : ''}" data-date-option="year" data-date-value="${year}" aria-selected="${year === monthStart.getFullYear()}">${year}</button>`;
    }).join('');
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const cells = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        const value = getDateInputValue(date);
        const classes = [
            'date-picker-day',
            date.getMonth() !== monthStart.getMonth() ? 'is-muted' : '',
            value === selectedValue ? 'is-selected' : '',
            value === todayValue ? 'is-today' : ''
        ].filter(Boolean).join(' ');

        return `<button type="button" class="${classes}" data-date-value="${value}">${date.getDate()}</button>`;
    }).join('');

    popover.innerHTML = `
        <div class="date-picker-head">
            <div class="date-picker-selects" aria-label="Choose month and year">
                <div class="date-picker-dropdown">
                    <button type="button" class="date-picker-select-trigger" data-date-toggle="month" aria-haspopup="listbox" aria-expanded="false">
                        <span>${monthNames[monthStart.getMonth()]}</span>
                        <i aria-hidden="true"></i>
                    </button>
                    <div class="date-picker-menu date-picker-month-menu" data-date-menu="month" role="listbox" hidden>
                        ${monthOptions}
                    </div>
                </div>
                <div class="date-picker-dropdown">
                    <button type="button" class="date-picker-select-trigger" data-date-toggle="year" aria-haspopup="listbox" aria-expanded="false">
                        <span>${monthStart.getFullYear()}</span>
                        <i aria-hidden="true"></i>
                    </button>
                    <div class="date-picker-menu date-picker-year-menu" data-date-menu="year" role="listbox" hidden>
                        ${yearOptions}
                    </div>
                </div>
            </div>
            <div class="date-picker-nav">
                <button type="button" data-date-action="previous" aria-label="Previous month">&lsaquo;</button>
                <button type="button" data-date-action="next" aria-label="Next month">&rsaquo;</button>
            </div>
        </div>
        <div class="date-picker-weekdays">
            ${days.map(day => `<span>${day}</span>`).join('')}
        </div>
        <div class="date-picker-grid">
            ${cells}
        </div>
        <div class="date-picker-footer">
            <button type="button" data-date-action="clear">Clear</button>
            <button type="button" data-date-action="today">Today</button>
        </div>
    `;
}

function initDashboardPage() {
    if (!document.getElementById('expenseForm')) return;

    loadExpenses();
    loadSummary();
    loadCategoryChart();
    applyPendingEdit();
}

function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('spendora-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    applyTheme(initialTheme, false);

    toggle?.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
        applyTheme(nextTheme, true);
    });
}

function applyTheme(theme, animate) {
    const isDark = theme === 'dark';
    const toggle = document.getElementById('themeToggle');

    function commitTheme() {
        document.body.classList.toggle('theme-dark', isDark);
        localStorage.setItem('spendora-theme', theme);
        if (toggle) {
            toggle.setAttribute('aria-pressed', String(isDark));
            toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            toggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }

    if (!animate || !window.gsap) {
        commitTheme();
        return;
    }

    const sunIcon = toggle?.querySelector('.theme-sun');
    const moonIcon = toggle?.querySelector('.theme-moon');
    const themeIcons = [sunIcon, moonIcon].filter(Boolean);
    const activeIcon = isDark ? moonIcon : sunIcon;

    gsap.killTweensOf([toggle, ...themeIcons].filter(Boolean));
    gsap.set(themeIcons, { clearProps: 'all' });
    commitTheme();

    if (!activeIcon) return;

    gsap.fromTo(
        activeIcon,
        { rotate: isDark ? -90 : 90, scale: 0.45, opacity: 0 },
        {
            rotate: 0,
            scale: 1,
            opacity: 1,
            duration: 0.38,
            ease: 'back.out(2.2)',
            onComplete: () => gsap.set(themeIcons, { clearProps: 'all' })
        }
    );
}

async function initAuthState() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'same-origin'
        });
        const authState = await response.json();
        updateAuthUi(authState);
    } catch (error) {
        console.error('Error loading auth state:', error);
        updateAuthUi({ authenticated: false, user: currentUser });
    }
}

function updateAuthUi(authState) {
    isAuthenticated = Boolean(authState?.authenticated);
    const user = authState?.user || currentUser;
    currentUser = {
        name: user.name || 'Pranav',
        email: user.email || '',
        picture: user.picture || ''
    };

    const displayName = currentUser.name || 'Pranav';
    const initial = displayName.trim().charAt(0).toUpperCase() || 'P';
    const profileName = document.getElementById('profileName');
    const profileSubtitle = document.getElementById('profileSubtitle');
    const avatarInitial = document.getElementById('avatarInitial');
    const avatarGuestIcon = document.getElementById('avatarGuestIcon');
    const loginButton = document.getElementById('profileLoginBtn');
    const profileLogoutButton = document.getElementById('profileLogoutBtn');
    const profileAddButton = document.getElementById('profileAddBtn');
    const profilePanel = document.getElementById('profilePanel');
    const profileButton = document.getElementById('profileBtn');

    if (profileName) profileName.textContent = isAuthenticated ? displayName : 'Login or sign up';
    if (profileSubtitle) {
        profileSubtitle.textContent = isAuthenticated
            ? (currentUser.email || 'Signed in with OAuth2')
            : 'Start your Spendora experience and keep your spending secure.';
    }
    updateProfileAvatar(profileButton, {
        initial,
        picture: currentUser.picture,
        isAuthenticated
    });
    if (avatarInitial) avatarInitial.textContent = isAuthenticated && !currentUser.picture ? initial : '';
    if (avatarGuestIcon) avatarGuestIcon.hidden = isAuthenticated;
    if (loginButton) {
        loginButton.hidden = isAuthenticated;
        loginButton.textContent = 'Login or sign up';
    }
    if (profileLogoutButton) profileLogoutButton.hidden = !isAuthenticated;
    if (profileAddButton) {
        profileAddButton.hidden = !isAuthenticated;
        profileAddButton.textContent = 'Switch user mode';
    }
    profilePanel?.classList.toggle('is-signed-out', !isAuthenticated);
    renderWalletCards();
    if (!isAuthenticated) {
        clearWalletPhotoView();
    } else {
        syncWalletPhotoState();
    }

    updateTimeGreeting();
}

function updateProfileAvatar(button, { initial, picture, isAuthenticated }) {
    if (!button) return;

    let image = button.querySelector('.avatar-photo');
    const avatarInitial = document.getElementById('avatarInitial');
    const avatarGuestIcon = document.getElementById('avatarGuestIcon');
    const shouldShowPhoto = Boolean(isAuthenticated && picture);

    button.classList.toggle('has-photo', shouldShowPhoto);

    if (!shouldShowPhoto) {
        image?.remove();
        if (avatarInitial) avatarInitial.textContent = isAuthenticated ? initial : '';
        if (avatarGuestIcon) avatarGuestIcon.hidden = isAuthenticated;
        return;
    }

    if (!image) {
        image = document.createElement('img');
        image.className = 'avatar-photo';
        image.alt = '';
        image.decoding = 'async';
        image.referrerPolicy = 'no-referrer';
        button.prepend(image);
    }

    image.src = picture;
    image.onerror = () => {
        image.remove();
        button.classList.remove('has-photo');
        if (avatarInitial) avatarInitial.textContent = initial;
    };

    if (avatarInitial) avatarInitial.textContent = '';
    if (avatarGuestIcon) avatarGuestIcon.hidden = true;
}

async function loginWithOAuth() {
    window.location.href = '/login';
}

async function logoutUser() {
    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'same-origin'
        });
        const result = await response.json();

        currentUser = { name: 'Pranav', email: '' };
        clearWalletPhotoView();
        updateAuthUi({
            authenticated: false,
            user: currentUser
        });
        showProfilePrompt();
        showNotification(result.message || 'Logged out successfully', 'success');
    } catch (error) {
        showNotification('Logout failed: ' + error.message, 'error');
    }
}

function requestLogout(event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (!isAuthenticated) {
        showNotification('You are already logged out.', 'info');
        return;
    }

    showLogoutWarning();
}

function showLogoutWarning() {
    if (document.getElementById('logoutWarningModal')) return;

    closeMenus();

    const modal = document.createElement('div');
    modal.className = 'logout-warning-modal';
    modal.id = 'logoutWarningModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'logoutWarningTitle');
    modal.innerHTML = `
        <div class="logout-warning-card">
            <span class="logout-warning-badge">Warning</span>
            <h2 id="logoutWarningTitle">Log out of Spendora?</h2>
            <p>Choose another account or log out completely. Switching users keeps this session active until a new login finishes.</p>
            <div class="logout-warning-actions">
                <button type="button" class="logout-switch-button" id="logoutSwitchButton">Switch user</button>
                <button type="button" class="logout-confirm-button" id="logoutConfirmButton">Log out</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const card = modal.querySelector('.logout-warning-card');
    let closeOnEscape;
    const close = () => {
        if (closeOnEscape) document.removeEventListener('keydown', closeOnEscape);

        if (window.gsap) {
            gsap.to(card, { opacity: 0, y: 10, scale: 0.98, duration: 0.18, ease: 'power2.in' });
            gsap.to(modal, {
                opacity: 0,
                duration: 0.2,
                ease: 'power2.in',
                onComplete: () => modal.remove()
            });
            return;
        }

        modal.remove();
    };

    modal.querySelector('#logoutSwitchButton')?.addEventListener('click', async event => {
        event.currentTarget.disabled = true;
        window.location.href = 'login.html?switch=1';
    });
    modal.querySelector('#logoutConfirmButton')?.addEventListener('click', async event => {
        event.currentTarget.disabled = true;
        await logoutUser();
        close();
    });
    modal.addEventListener('click', event => {
        if (event.target === modal) close();
    });

    closeOnEscape = event => {
        if (event.key === 'Escape' && document.body.contains(modal)) {
            close();
        }
    };
    document.addEventListener('keydown', closeOnEscape);

    if (window.gsap) {
        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' });
        gsap.fromTo(card, { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.7)' });
    }
}

function showProfilePrompt() {
    const button = document.getElementById('profileBtn');
    const panel = document.getElementById('profilePanel');

    if (!button || !panel) return;

    closeMenus();
    window.setTimeout(() => openMenu(button, panel), window.gsap ? 240 : 0);
}

// ==================== CREATE / UPDATE ====================
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const expenseData = {
        description: document.getElementById('description').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        date: document.getElementById('date').value
    };

    if (!expenseData.date) {
        showNotification('Choose a date before adding the expense.', 'error');
        document.getElementById('datePickerTrigger')?.focus();
        return;
    }

    if (!expenseData.category) {
        showNotification('Choose a category before adding the expense.', 'error');
        document.querySelector('#category')?.closest('[data-select-root]')?.querySelector('[data-select-trigger]')?.focus();
        return;
    }

    if (!expenseData.paymentMethod) {
        showNotification('Choose a payment method before adding the expense.', 'error');
        document.querySelector('#paymentMethod')?.closest('[data-select-root]')?.querySelector('[data-select-trigger]')?.focus();
        return;
    }
     
    try {
        let response;
        
        if (isEditMode && editingExpenseId) {
            // UPDATE existing expense
            response = await fetch(`${API_URL}/expenses/${editingExpenseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
        } else {
            // CREATE new expense
            response = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            resetForm();
            refreshExpenseViews();
        } else {
            showNotification('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
});

// ==================== READ ====================
async function loadExpenses(filters = {}) {
    const container = document.getElementById('expensesList');
    if (!container) return;

    try {
        let url = `${API_URL}/expenses`;
        const params = new URLSearchParams(filters);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url);
        const expenses = await response.json();
        
        displayExpenses(expenses);
    } catch (error) {
        console.error('Error loading expenses:', error);
        container.innerHTML = '<p class="empty-state">Error loading expenses</p>';
    }
}

function displayExpenses(expenses) {
    const container = document.getElementById('expensesList');
    if (!container) return;
    
    if (expenses.length === 0) {
        container.innerHTML = '<p class="empty-state">No expenses found. Add your first expense above.</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="expenses-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map(expense => `
                    <tr>
                        <td>
                            <span class="expense-name">
                                <span class="table-avatar">${escapeHtml(getInitials(expense.description))}</span>
                                ${escapeHtml(expense.description)}
                            </span>
                        </td>
                        <td><span class="category-name">${getCategoryIcon(expense.category)} ${escapeHtml(expense.category)}</span></td>
                        <td>${escapeHtml(expense.paymentMethod)}</td>
                        <td>${formatDate(expense.date)}</td>
                        <td>INR ${expense.amount.toFixed(2)}</td>
                        <td>
                            <div class="expense-actions">
                                <button class="btn-edit" onclick="editExpense('${expense._id}')">
                                    <span class="ui-icon icon-edit" aria-hidden="true"></span>
                                    Edit
                                </button>
                                <button class="btn-delete" onclick="deleteExpense('${expense._id}')">
                                    <span class="ui-icon icon-trash" aria-hidden="true"></span>
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    if (window.gsap) {
        gsap.fromTo(
            '.expenses-table tbody tr',
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.34, stagger: 0.045, ease: 'power2.out' }
        );
    }
}

// ==================== UPDATE (Load for Editing) ====================
async function editExpense(id) {
    const form = document.getElementById('expenseForm');
    if (!form) {
        sessionStorage.setItem('spendora-edit-expense-id', id);
        window.location.href = 'index.html#expenseForm';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/expenses/${id}`);
        const expense = await response.json();
        
        // Populate form
        document.getElementById('description').value = expense.description;
        document.getElementById('amount').value = expense.amount;
        setSpendoraSelectValue('category', expense.category);
        setSpendoraSelectValue('paymentMethod', expense.paymentMethod);
        setExpenseDateValue(expense.date);
        
        // Set edit mode
        isEditMode = true;
        editingExpenseId = id;
        
        // Change button text
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.textContent = 'Update Expense';
        submitBtn.classList.add('is-updating');
        
        // Scroll to form
        scrollToSection('expenseForm');
        
        showNotification('Editing expense. Update the details and click Update.', 'info');
    } catch (error) {
        showNotification('Error loading expense: ' + error.message, 'error');
    }
}

// ==================== DELETE ====================
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/expenses/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            refreshExpenseViews();
        } else {
            showNotification('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Error deleting expense: ' + error.message, 'error');
    }
}

function refreshExpenseViews() {
    if (document.getElementById('expensesList')) loadExpenses();
    if (document.getElementById('totalSpent')) loadSummary();
    if (document.getElementById('categoryChart') || document.getElementById('categoryInsight')) loadCategoryChart();
    if (document.getElementById('searchPage')) loadSearchExpenses();
    if (document.getElementById('analyticsPage')) loadAnalyticsPageData();
    if (document.getElementById('categoriesPage')) loadCategoriesPageData();
    if (document.getElementById('walletPage')) loadWalletBudgetData();
}

function applyPendingEdit() {
    const pendingEditId = sessionStorage.getItem('spendora-edit-expense-id');
    if (!pendingEditId) return;

    sessionStorage.removeItem('spendora-edit-expense-id');
    window.setTimeout(() => editExpense(pendingEditId), 120);
}

// ==================== SEARCH PAGE ====================
function initSearchPage() {
    if (!document.getElementById('searchPage')) return;

    const searchInput = document.getElementById('expenseSearch');
    const applyButton = document.getElementById('applySearchBtn');
    const clearButton = document.getElementById('clearSearchBtn');
    const liveRender = debounce(renderSearchResults, 160);

    searchInput?.addEventListener('input', liveRender);
    ['searchCategory', 'searchPaymentMethod', 'searchStartDate', 'searchEndDate', 'searchSort'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', liveRender);
    });
    applyButton?.addEventListener('click', () => {
        renderSearchResults();
        showNotification('Search filters applied', 'info');
    });
    clearButton?.addEventListener('click', clearSearchFilters);

    loadSearchExpenses();
}

async function loadSearchExpenses() {
    const container = document.getElementById('searchResults');
    if (!container) return;

    try {
        container.innerHTML = '<p class="loading">Loading expenses...</p>';
        const response = await fetch(`${API_URL}/expenses`);
        const expenses = await response.json();
        searchExpenses = Array.isArray(expenses) ? expenses : [];
        renderSearchResults();
    } catch (error) {
        console.error('Error loading search expenses:', error);
        container.innerHTML = '<p class="empty-state">Error loading expenses</p>';
        updateSearchCount(0, 0);
    }
}

function clearSearchFilters() {
    const searchInput = document.getElementById('expenseSearch');
    setSpendoraSelectValue('searchCategory', '');
    setSpendoraSelectValue('searchPaymentMethod', '');
    setSpendoraSelectValue('searchSort', 'date-desc');
    setSpendoraDateValue('searchStartDate', '');
    setSpendoraDateValue('searchEndDate', '');
    if (searchInput) searchInput.value = '';

    renderSearchResults();
    showNotification('Search cleared', 'info');
}

function renderSearchResults() {
    const container = document.getElementById('searchResults');
    if (!container) return;

    const filters = getSearchFilters();
    const results = searchExpenses
        .filter(expense => expenseMatchesSearch(expense, filters))
        .sort((a, b) => sortSearchExpenses(a, b, filters.sort));

    updateSearchCount(results.length, searchExpenses.length);

    if (!results.length) {
        container.innerHTML = `
            <div class="search-empty-state">
                <span class="ui-icon icon-search" aria-hidden="true"></span>
                <strong>No matching expenses</strong>
                <p>Try a different keyword, category, payment method, or date range.</p>
            </div>
        `;
        animateSearchResults('.search-empty-state');
        return;
    }

    container.innerHTML = `
        <div class="search-results-table">
            <div class="search-results-head">
                <span>Expense</span>
                <span>Category</span>
                <span>Payment</span>
                <span>Date</span>
                <span>Amount</span>
                <span>Actions</span>
            </div>
            ${results.map(expense => renderSearchExpenseRow(expense)).join('')}
        </div>
    `;

    animateSearchResults('.search-result-row');
}

function renderSearchExpenseRow(expense) {
    const description = expense.description || 'Untitled expense';
    const category = expense.category || 'Other';
    const paymentMethod = expense.paymentMethod || 'Unknown';
    const amount = Number(expense.amount || 0);
    const notes = expense.notes ? `<small>${escapeHtml(expense.notes)}</small>` : '<small>No notes added</small>';

    return `
        <article class="search-result-row">
            <div class="search-expense-cell">
                <span class="table-avatar">${escapeHtml(getInitials(description))}</span>
                <div>
                    <strong>${escapeHtml(description)}</strong>
                    ${notes}
                </div>
            </div>
            <div><span class="category-name">${getCategoryIcon(category)} ${escapeHtml(category)}</span></div>
            <div>${escapeHtml(paymentMethod)}</div>
            <div>${formatDate(expense.date)}</div>
            <div class="search-amount">INR ${amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-edit" onclick="editExpense('${expense._id}')">
                    <span class="ui-icon icon-edit" aria-hidden="true"></span>
                    Edit
                </button>
                <button class="btn-delete" onclick="deleteExpense('${expense._id}')">
                    <span class="ui-icon icon-trash" aria-hidden="true"></span>
                    Delete
                </button>
            </div>
        </article>
    `;
}

function getSearchFilters() {
    return {
        query: normalizeSearchText(document.getElementById('expenseSearch')?.value || ''),
        category: document.getElementById('searchCategory')?.value || '',
        paymentMethod: document.getElementById('searchPaymentMethod')?.value || '',
        startDate: document.getElementById('searchStartDate')?.value || '',
        endDate: document.getElementById('searchEndDate')?.value || '',
        sort: document.getElementById('searchSort')?.value || 'date-desc'
    };
}

function expenseMatchesSearch(expense, filters) {
    if (filters.category && expense.category !== filters.category) return false;
    if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
    if (filters.startDate && expense.date < filters.startDate) return false;
    if (filters.endDate && expense.date > filters.endDate) return false;
    if (!filters.query) return true;

    const searchableText = normalizeSearchText([
        expense.description,
        expense.category,
        expense.paymentMethod,
        expense.notes
    ].filter(Boolean).join(' '));

    return filters.query.split(/\s+/).every(term => searchableText.includes(term));
}

function sortSearchExpenses(a, b, sort) {
    const amountA = Number(a.amount || 0);
    const amountB = Number(b.amount || 0);
    const dateA = new Date(a.date || a.createdAt || 0).getTime();
    const dateB = new Date(b.date || b.createdAt || 0).getTime();
    const nameA = (a.description || '').localeCompare(b.description || '');
    const categoryA = (a.category || '').localeCompare(b.category || '');

    switch (sort) {
        case 'date-asc':
            return dateA - dateB;
        case 'amount-desc':
            return amountB - amountA;
        case 'amount-asc':
            return amountA - amountB;
        case 'name-asc':
            return nameA;
        case 'category-asc':
            return categoryA || nameA;
        case 'date-desc':
        default:
            return dateB - dateA;
    }
}

function updateSearchCount(count, total) {
    const counter = document.getElementById('searchResultCount');
    if (!counter) return;

    counter.textContent = total ? `${count} of ${total} expenses` : 'No expenses';
}

function normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
}

function debounce(callback, delay = 180) {
    let timeoutId;

    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => callback(...args), delay);
    };
}

function animateSearchResults(selector) {
    if (!window.gsap) return;

    gsap.killTweensOf(selector);
    gsap.fromTo(
        selector,
        { opacity: 0, y: 12, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.34, stagger: 0.035, ease: 'power2.out' }
    );
}

// ==================== ANALYTICS PAGE ====================
function initAnalyticsPage() {
    if (!document.getElementById('analyticsPage')) return;

    document.querySelectorAll('[data-analytics-range]').forEach(button => {
        button.addEventListener('click', () => {
            analyticsRangeMonths = Number(button.dataset.analyticsRange || 6);
            document.querySelectorAll('[data-analytics-range]').forEach(item => {
                item.classList.toggle('active', item === button);
            });
            loadAnalyticsPageData();
        });
    });

    loadAnalyticsPageData();
}

async function loadAnalyticsPageData() {
    const page = document.getElementById('analyticsPage');
    if (!page) return;

    try {
        const response = await fetch(`${API_URL}/expenses`);
        const expenses = await response.json();
        const records = Array.isArray(expenses) ? expenses : [];

        renderAnalyticsSummary(records);
        renderAnalyticsTrend(records);
        renderAnalyticsInsights(records);
        animateAnalyticsPage();
    } catch (error) {
        console.error('Error loading analytics:', error);
        const chart = document.getElementById('analyticsTrendChart');
        if (chart) chart.innerHTML = '<p class="empty-state">Error loading analytics</p>';
    }
}

function renderAnalyticsSummary(expenses) {
    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const average = expenses.length ? total / expenses.length : 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTotal = expenses
        .filter(expense => expense.date && expense.date.slice(0, 7) === currentMonth)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const categories = getCategoryTotals(expenses);
    const topCategory = categories[0];

    setText('analyticsTotal', `INR ${total.toFixed(2)}`);
    setText('analyticsTotalNote', `${expenses.length} transaction${expenses.length === 1 ? '' : 's'} analyzed`);
    setText('analyticsMonth', `INR ${monthTotal.toFixed(2)}`);
    setText('analyticsMonthNote', `${getMonthLabel(currentMonth)} live spend`);
    setText('analyticsTopCategory', topCategory ? topCategory.category : 'None');
    setText('analyticsTopCategoryNote', topCategory ? `INR ${topCategory.amount.toFixed(2)} total` : 'Waiting for data');
    setText('analyticsAverage', `INR ${average.toFixed(2)}`);
    setText('analyticsAverageNote', 'Across all records');
}

function renderAnalyticsTrend(expenses) {
    const container = document.getElementById('analyticsTrendChart');
    if (!container) return;

    if (!expenses.length) {
        container.innerHTML = '<p class="empty-state">No spending trend yet. Add expenses to see analytics.</p>';
        return;
    }

    const months = getRecentMonths(analyticsRangeMonths);
    const monthlyTotals = months.map(month => sumExpensesForMonth(expenses, month.key));
    const transactionCounts = months.map(month => expenses.filter(expense => expense.date && expense.date.slice(0, 7) === month.key).length);
    const totalMax = Math.max(...monthlyTotals, 1);
    const countMax = Math.max(...transactionCounts, 1);
    const width = 960;
    const height = 360;
    const left = 56;
    const top = 34;
    const plotWidth = 840;
    const plotHeight = 244;
    const denominator = Math.max(months.length - 1, 1);

    const points = monthlyTotals.map((value, index) => {
        const x = left + (plotWidth / denominator) * index;
        const y = top + plotHeight - (value / totalMax) * plotHeight;
        return { x, y, value };
    });
    const countPoints = transactionCounts.map((value, index) => {
        const x = left + (plotWidth / denominator) * index;
        const y = top + plotHeight - ((value / countMax) * 0.78) * plotHeight;
        return { x, y, value };
    });
    const areaPoints = `${left},${top + plotHeight} ${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')} ${left + plotWidth},${top + plotHeight}`;
    const gridLines = [0, 1, 2, 3, 4].map(index => {
        const y = top + (plotHeight / 4) * index;
        return `<line class="trend-grid" x1="${left}" x2="${left + plotWidth}" y1="${y}" y2="${y}"></line>`;
    }).join('');
    const labels = months.map((month, index) => {
        const x = left + (plotWidth / denominator) * index;
        return `<text class="trend-label analytics-trend-label" x="${x}" y="326">${month.label}</text>`;
    }).join('');
    const dots = points.map((point, index) => `
        <circle class="analytics-point" cx="${point.x}" cy="${point.y}" r="6">
            <title>${months[index].label}: INR ${point.value.toFixed(2)}</title>
        </circle>
    `).join('');

    container.innerHTML = `
        <svg class="analytics-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Analytics spending trend chart">
            <defs>
                <linearGradient id="analyticsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--blue)" stop-opacity="0.22"></stop>
                    <stop offset="100%" stop-color="var(--blue)" stop-opacity="0"></stop>
                </linearGradient>
            </defs>
            <g>${gridLines}</g>
            <polygon class="analytics-area" points="${areaPoints}"></polygon>
            <polyline class="trend-line analytics-main-line" points="${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}"></polyline>
            <polyline class="trend-line-soft analytics-soft-line" points="${countPoints.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}"></polyline>
            <g>${dots}</g>
            <g>${labels}</g>
        </svg>
    `;
}

function renderAnalyticsInsights(expenses) {
    const container = document.getElementById('analyticsInsightList');
    if (!container) return;

    if (!expenses.length) {
        container.innerHTML = '<p class="empty-state">No insights yet. Add expenses to unlock analytics.</p>';
        return;
    }

    const largest = [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
    const methods = expenses.reduce((acc, expense) => {
        const method = expense.paymentMethod || 'Unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
    }, {});
    const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];
    const months = getRecentMonths(2);
    const previousMonthTotal = months.length > 1 ? sumExpensesForMonth(expenses, months[0].key) : 0;
    const currentMonthTotal = months.length > 1 ? sumExpensesForMonth(expenses, months[1].key) : 0;
    const delta = previousMonthTotal ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;
    const categories = getCategoryTotals(expenses);
    const categoryTotal = categories.reduce((sum, item) => sum + item.amount, 0);

    const insights = [
        {
            label: 'Largest expense',
            value: largest ? `INR ${Number(largest.amount || 0).toFixed(2)}` : 'INR 0.00',
            note: largest ? largest.description || 'Untitled expense' : 'No expenses yet'
        },
        {
            label: 'Preferred payment',
            value: topMethod ? topMethod[0] : 'None',
            note: topMethod ? `${topMethod[1]} transaction${topMethod[1] === 1 ? '' : 's'}` : 'No payment data'
        },
        {
            label: 'Month over month',
            value: previousMonthTotal ? `${delta >= 0 ? '+' : ''}${Math.round(delta)}%` : 'New',
            note: `${getMonthLabel(months[1]?.key)} vs ${getMonthLabel(months[0]?.key)}`
        },
        {
            label: 'Category concentration',
            value: categories[0] && categoryTotal ? `${Math.round((categories[0].amount / categoryTotal) * 100)}%` : '0%',
            note: categories[0] ? `${categories[0].category} leads spend` : 'No category data'
        }
    ];

    container.innerHTML = insights.map(item => `
        <article class="analytics-insight-card">
            <span>${item.label}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <small>${escapeHtml(item.note)}</small>
        </article>
    `).join('');
}

function animateAnalyticsPage() {
    if (!window.gsap) return;

    gsap.fromTo(
        ['.analytics-stat-card', '.analytics-trend-svg', '.analytics-insight-card'],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.42, stagger: 0.035, ease: 'power2.out' }
    );
}

// ==================== CATEGORIES PAGE ====================
function initCategoriesPage() {
    if (!document.getElementById('categoriesPage')) return;

    const liveRender = debounce(renderCategoriesPage, 150);
    const backButton = document.getElementById('categoryFlowBack');
    if (backButton) backButton.hidden = true;

    backButton?.addEventListener('click', () => {
        window.location.href = 'categories.html';
    });

    document.querySelectorAll('[data-category-range]').forEach(button => {
        button.addEventListener('click', () => {
            categoryRangeMonths = Number(button.dataset.categoryRange || 6);
            document.querySelectorAll('[data-category-range]').forEach(item => {
                item.classList.toggle('active', item === button);
            });
            renderCategoriesPage();
        });
    });

    ['categorySearch', 'categoryFocus', 'categoryPayment', 'categorySort'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', liveRender);
        document.getElementById(id)?.addEventListener('change', liveRender);
    });

    document.getElementById('applyCategoryFiltersBtn')?.addEventListener('click', () => {
        renderCategoriesPage();
        showNotification('Category filters applied', 'info');
    });
    document.getElementById('clearCategoryFiltersBtn')?.addEventListener('click', clearCategoryFilters);

    loadCategoriesPageData();
}

async function loadCategoriesPageData() {
    const page = document.getElementById('categoriesPage');
    if (!page) return;

    try {
        const response = await fetch(`${API_URL}/expenses`);
        const expenses = await response.json();
        categoryExpenses = Array.isArray(expenses) ? expenses : [];
        renderCategoriesPage();
    } catch (error) {
        console.error('Error loading category analytics:', error);
        const container = document.getElementById('categoryFlowVisual');
        if (container) container.innerHTML = '<p class="empty-state">Error loading category analytics</p>';
        updateCategoryResultCount(0, 0);
    }
}

function clearCategoryFilters() {
    ['categorySearch', 'categoryFocus', 'categoryPayment'].forEach(id => {
        const control = document.getElementById(id);
        if (control) control.value = '';
    });

    const sort = document.getElementById('categorySort');
    if (sort) sort.value = 'amount-desc';
    const backButton = document.getElementById('categoryFlowBack');
    if (backButton) backButton.hidden = true;

    renderCategoriesPage();
    showNotification('Category filters cleared', 'info');
}

function renderCategoriesPage() {
    const page = document.getElementById('categoriesPage');
    if (!page) return;

    const filteredExpenses = getFilteredCategoryExpenses();
    const stats = getCategoryStats(filteredExpenses);

    updateCategoryResultCount(filteredExpenses.length, categoryExpenses.length);
    renderCategoryPageSummary(filteredExpenses, stats);
    renderCategoryFlowVisual(stats);
    renderCategoryBreakdownList(stats);
    renderCategoryTrendChart(filteredExpenses, stats);
    renderCategoryDetailCards(stats);
    animateCategoriesPage();
}

function getCategoryFilters() {
    return {
        query: normalizeSearchText(document.getElementById('categorySearch')?.value || ''),
        category: document.getElementById('categoryFocus')?.value || '',
        paymentMethod: document.getElementById('categoryPayment')?.value || '',
        sort: document.getElementById('categorySort')?.value || 'amount-desc'
    };
}

function getFilteredCategoryExpenses() {
    const filters = getCategoryFilters();
    const rangeKeys = categoryRangeMonths ? new Set(getRecentMonths(categoryRangeMonths).map(month => month.key)) : null;

    return categoryExpenses.filter(expense => {
        if (rangeKeys && (!expense.date || !rangeKeys.has(expense.date.slice(0, 7)))) return false;
        if (filters.category && expense.category !== filters.category) return false;
        if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
        if (!filters.query) return true;

        const searchableText = normalizeSearchText([
            expense.description,
            expense.category,
            expense.paymentMethod,
            expense.notes
        ].filter(Boolean).join(' '));

        return filters.query.split(/\s+/).every(term => searchableText.includes(term));
    });
}

function getCategoryStats(expenses) {
    const grouped = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        if (!acc[category]) {
            acc[category] = {
                category,
                amount: 0,
                count: 0,
                payments: {},
                latestDate: '',
                largestExpense: null
            };
        }

        const amount = Number(expense.amount || 0);
        const paymentMethod = expense.paymentMethod || 'Unknown';
        acc[category].amount += amount;
        acc[category].count += 1;
        acc[category].payments[paymentMethod] = (acc[category].payments[paymentMethod] || 0) + 1;

        if (expense.date && expense.date > acc[category].latestDate) acc[category].latestDate = expense.date;
        if (!acc[category].largestExpense || amount > Number(acc[category].largestExpense.amount || 0)) {
            acc[category].largestExpense = expense;
        }

        return acc;
    }, {});

    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const filters = getCategoryFilters();
    const entries = Object.values(grouped).map(item => {
        const topPayment = Object.entries(item.payments).sort((a, b) => b[1] - a[1])[0];
        return {
            ...item,
            percent: total ? Math.round((item.amount / total) * 100) : 0,
            topPayment: topPayment ? topPayment[0] : 'None'
        };
    });

    entries.sort((a, b) => {
        switch (filters.sort) {
            case 'amount-asc':
                return a.amount - b.amount || a.category.localeCompare(b.category);
            case 'name-asc':
                return a.category.localeCompare(b.category);
            case 'transactions-desc':
                return b.count - a.count || b.amount - a.amount;
            case 'amount-desc':
            default:
                return b.amount - a.amount || a.category.localeCompare(b.category);
        }
    });

    return { entries, total };
}

function renderCategoryPageSummary(expenses, stats) {
    const activeCount = stats.entries.length;
    const leader = stats.entries[0];
    const average = activeCount ? stats.total / activeCount : 0;

    setText('categoryTotalSpend', `INR ${stats.total.toFixed(2)}`);
    setText('categoryTotalNote', `${expenses.length} transaction${expenses.length === 1 ? '' : 's'} in view`);
    setText('categoryActiveCount', String(activeCount));
    setText('categoryActiveNote', categoryRangeMonths ? `${categoryRangeMonths} month window` : 'All-time view');
    setText('categoryLeader', leader ? leader.category : 'None');
    setText('categoryLeaderNote', leader ? `${leader.percent}% of filtered spend` : 'No category leader');
    setText('categoryAverageSpend', `INR ${average.toFixed(2)}`);
    setText('categoryAverageNote', 'Across active categories');
}

function renderCategoryFlowVisual(stats) {
    const container = document.getElementById('categoryFlowVisual');
    if (!container) return;

    if (!stats.entries.length) {
        container.innerHTML = `
            <div class="search-empty-state">
                <span class="ui-icon icon-list" aria-hidden="true"></span>
                <strong>No category data yet</strong>
                <p>Add expenses or loosen the filters to see category flow.</p>
            </div>
        `;
        return;
    }

    let offset = 0;
    const segments = stats.entries.map((entry, index) => {
        const percent = stats.total ? (entry.amount / stats.total) * 100 : 0;
        const dashOffset = -offset;
        offset += percent;
        const color = getCategoryColor(entry.category, index);
        return `
            <circle class="category-donut-segment" cx="50" cy="50" r="35" pathLength="100"
                stroke="${color}"
                stroke-dasharray="${percent.toFixed(3)} ${Math.max(100 - percent, 0).toFixed(3)}"
                stroke-dashoffset="${dashOffset.toFixed(3)}">
                <title>${entry.category}: INR ${entry.amount.toFixed(2)} (${Math.round(percent)}%)</title>
            </circle>
        `;
    }).join('');

    container.innerHTML = `
        <div class="category-donut-wrap">
            <svg class="category-donut-svg" viewBox="0 0 100 100" role="img" aria-label="Category flow donut chart">
                <circle class="category-donut-track" cx="50" cy="50" r="35" pathLength="100"></circle>
                ${segments}
            </svg>
            <div class="category-donut-center">
                <span>Total</span>
                <strong>INR ${stats.total.toFixed(0)}</strong>
                <small>${stats.entries.length} categories</small>
            </div>
        </div>
        <div class="category-flow-tags">
            ${stats.entries.slice(0, 5).map((entry, index) => `
                <button type="button" class="category-flow-tag" data-category-quick="${escapeHtml(entry.category)}">
                    <i style="background: ${getCategoryColor(entry.category, index)}"></i>
                    <span>${escapeHtml(entry.category)}</span>
                    <strong>${entry.percent}%</strong>
                </button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('[data-category-quick]').forEach(button => {
        button.addEventListener('click', () => {
            const focus = document.getElementById('categoryFocus');
            const backButton = document.getElementById('categoryFlowBack');
            if (focus) focus.value = button.dataset.categoryQuick || '';
            if (backButton) backButton.hidden = false;
            renderCategoriesPage();
        });
    });
}

function renderCategoryBreakdownList(stats) {
    const container = document.getElementById('categoryBreakdownList');
    if (!container) return;

    if (!stats.entries.length) {
        container.innerHTML = '<p class="empty-state">No categories match these filters.</p>';
        return;
    }

    const max = Math.max(...stats.entries.map(entry => entry.amount), 1);
    container.innerHTML = stats.entries.map((entry, index) => {
        const width = Math.max((entry.amount / max) * 100, entry.amount ? 8 : 0);
        return `
            <article class="category-breakdown-row">
                <span class="category-breakdown-icon" style="--category-color: ${getCategoryColor(entry.category, index)}">${entry.category.slice(0, 2).toUpperCase()}</span>
                <div>
                    <div class="category-breakdown-title">
                        <strong>${escapeHtml(entry.category)}</strong>
                        <em>${entry.percent}%</em>
                    </div>
                    <i><span style="width: ${width}%; background: ${getCategoryColor(entry.category, index)}"></span></i>
                    <small>${entry.count} transaction${entry.count === 1 ? '' : 's'} - ${escapeHtml(entry.topPayment)}</small>
                </div>
                <strong>INR ${entry.amount.toFixed(2)}</strong>
            </article>
        `;
    }).join('');
}

function renderCategoryTrendChart(expenses, stats) {
    const container = document.getElementById('categoryTrendChart');
    if (!container) return;

    if (!expenses.length || !stats.entries.length) {
        container.innerHTML = '<p class="empty-state">No category trends yet.</p>';
        return;
    }

    const months = getRecentMonths(categoryRangeMonths || 12);
    const topCategories = stats.entries.slice(0, 3).map(entry => entry.category);
    const series = topCategories.map(category => months.map(month => {
        return expenses
            .filter(expense => (expense.category || 'Other') === category && expense.date && expense.date.slice(0, 7) === month.key)
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    }));
    const max = Math.max(...series.flat(), 1);
    const width = 940;
    const height = 250;
    const left = 54;
    const top = 22;
    const plotWidth = 822;
    const plotHeight = 156;
    const denominator = Math.max(months.length - 1, 1);
    const gridLines = [0, 1, 2, 3, 4].map(index => {
        const y = top + (plotHeight / 4) * index;
        return `<line class="trend-grid" x1="${left}" x2="${left + plotWidth}" y1="${y}" y2="${y}"></line>`;
    }).join('');
    const labels = months.map((month, index) => {
        const x = left + (plotWidth / denominator) * index;
        return `<text class="trend-label analytics-trend-label" x="${x}" y="224">${month.label}</text>`;
    }).join('');
    const lines = series.map((values, seriesIndex) => {
        const points = values.map((value, index) => {
            const x = left + (plotWidth / denominator) * index;
            const y = top + plotHeight - (value / max) * plotHeight;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        return `<polyline class="category-trend-line" style="stroke: ${getCategoryColor(topCategories[seriesIndex], seriesIndex)}" points="${points}"></polyline>`;
    }).join('');

    container.innerHTML = `
        <svg class="category-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Category spending trends">
            <g>${gridLines}</g>
            <g>${lines}</g>
            <g>${labels}</g>
        </svg>
        <div class="category-trend-key">
            ${topCategories.map((category, index) => `
                <span><i style="background: ${getCategoryColor(category, index)}"></i>${escapeHtml(category)}</span>
            `).join('')}
        </div>
    `;
}

function renderCategoryDetailCards(stats) {
    const container = document.getElementById('categoryDetailCards');
    if (!container) return;

    if (!stats.entries.length) {
        container.innerHTML = '<p class="empty-state">No category details yet.</p>';
        return;
    }

    container.innerHTML = stats.entries.slice(0, 6).map(entry => {
        const largest = entry.largestExpense;
        const largestNote = largest ? `${largest.description || 'Untitled'} - INR ${Number(largest.amount || 0).toFixed(2)}` : 'No largest expense';
        return `
            <article class="category-detail-card">
                <div>
                    <span>${escapeHtml(entry.category)}</span>
                    <strong>${entry.percent}%</strong>
                </div>
                <p>${escapeHtml(largestNote)}</p>
                <small>Last activity ${entry.latestDate ? formatDate(entry.latestDate) : 'N/A'}</small>
            </article>
        `;
    }).join('');
}

function updateCategoryResultCount(count, total) {
    const counter = document.getElementById('categoryResultCount');
    if (!counter) return;

    counter.textContent = total ? `${count} of ${total} expenses` : 'No expenses';
}

function animateCategoriesPage() {
    if (!window.gsap) return;

    gsap.fromTo(
        ['.category-donut-segment', '.category-breakdown-row', '.category-trend-svg', '.category-detail-card'],
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.38, stagger: 0.035, ease: 'power2.out' }
    );
}

function getCategoryPalette() {
    return ['#4d38dc', '#ff4f73', '#2eb84f', '#ff9f1c', '#22a6f2', '#8b5cf6', '#657085'];
}

function getCategoryColor(category, fallbackIndex = 0) {
    const colors = {
        Bills: '#4d38dc',
        Shopping: '#ff4f73',
        Transport: '#2eb84f',
        Food: '#ff9f1c',
        Health: '#22a6f2',
        Entertainment: '#8b5cf6',
        Other: '#657085'
    };
    const palette = getCategoryPalette();
    return colors[category] || palette[fallbackIndex % palette.length];
}

// ==================== WALLET PAGE ====================
function initWalletPage() {
    if (!document.getElementById('walletPage')) return;

    const savedBudget = Number(localStorage.getItem('spendora-monthly-budget') || 0);
    const budgetInput = document.getElementById('monthlyBudgetInput');
    if (budgetInput && savedBudget > 0) budgetInput.value = savedBudget;

    document.getElementById('saveBudgetBtn')?.addEventListener('click', saveMonthlyBudget);
    budgetInput?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveMonthlyBudget();
        }
    });

    setupWalletBalanceControls();
    setupWalletOptionsMenu();
    setupWalletCardEditor();
    setupWalletPhotoUpload();
    renderWalletCards();
    syncWalletPhotoState();
    loadWalletBudgetData();

    walletRefreshTimer = window.setInterval(() => {
        if (!document.hidden) loadWalletBudgetData(false);
    }, 8000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) loadWalletBudgetData(false);
    });

    window.addEventListener('beforeunload', () => {
        if (walletRefreshTimer) window.clearInterval(walletRefreshTimer);
    });
}

function saveMonthlyBudget() {
    const input = document.getElementById('monthlyBudgetInput');
    const amount = Number(input?.value || 0);

    if (!input || amount < 0 || Number.isNaN(amount)) {
        showNotification('Enter a valid budget amount.', 'error');
        return;
    }

    localStorage.setItem('spendora-monthly-budget', String(amount));
    showNotification(amount > 0 ? 'Monthly budget updated' : 'Budget tracking paused', 'success');
    loadWalletBudgetData();
}

function setupWalletBalanceControls() {
    const openButton = document.getElementById('walletAddBalanceBtn');
    const modal = document.getElementById('walletBalanceModal');
    const closeButton = document.getElementById('walletBalanceClose');
    const input = document.getElementById('walletBalanceInput');
    const errorMessage = document.getElementById('walletBalanceError');
    const addButton = document.getElementById('walletAddBalanceConfirm');
    const setButton = document.getElementById('walletSetBalanceConfirm');
    if (!openButton || !modal || !input || !addButton || !setButton) return;

    const setBalanceError = message => {
        if (!errorMessage) return;

        errorMessage.textContent = message;
        errorMessage.classList.toggle('is-visible', Boolean(message));
        input.setAttribute('aria-invalid', String(Boolean(message)));

        if (message && window.gsap) {
            gsap.fromTo(errorMessage, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });
        }
    };

    const openModal = () => {
        input.value = '';
        setBalanceError('');
        renderWalletBalance();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        window.setTimeout(() => input.focus(), 60);

        if (window.gsap) {
            gsap.fromTo(
                modal.querySelector('.wallet-upload-card'),
                { opacity: 0, y: 18, scale: 0.96, filter: 'blur(8px)' },
                { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.32, ease: 'power3.out' }
            );
        }
    };

    const closeModal = () => closeWalletModal(modal);

    const commitBalance = mode => {
        const amount = Number(input.value || 0);
        if (amount < 0 || Number.isNaN(amount)) {
            setBalanceError('Enter a valid amount. Balance cannot be negative.');
            input.focus();
            return;
        }

        const current = getWalletBalance();
        const nextBalance = mode === 'add' ? current + amount : amount;
        localStorage.setItem('spendora-wallet-balance', String(nextBalance));
        renderWalletBalance(true);
        closeModal();
        showNotification(mode === 'add' ? 'Balance added' : 'Wallet balance updated', 'success');
    };

    openButton.addEventListener('click', openModal);
    closeButton?.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closeModal();
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitBalance('add');
        }
    });
    input.addEventListener('input', () => {
        if (Number(input.value || 0) >= 0) setBalanceError('');
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });
    addButton.addEventListener('click', () => commitBalance('add'));
    setButton.addEventListener('click', () => commitBalance('set'));

    renderWalletBalance();
}

function closeWalletModal(modal) {
    if (!modal) return;

    if (window.gsap) {
        gsap.to(modal.querySelector('.wallet-upload-card'), {
            opacity: 0,
            y: 12,
            scale: 0.97,
            filter: 'blur(6px)',
            duration: 0.18,
            ease: 'power2.in',
            onComplete: () => {
                modal.classList.remove('is-open');
                modal.setAttribute('aria-hidden', 'true');
                gsap.set(modal.querySelector('.wallet-upload-card'), { clearProps: 'opacity,y,scale,filter' });
            }
        });
    } else {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function getWalletBalance() {
    return Number(localStorage.getItem('spendora-wallet-balance') || 0);
}

function hasWalletBalance() {
    return localStorage.getItem('spendora-wallet-balance') !== null;
}

function renderWalletBalance(animate = false) {
    const balance = getWalletBalance();
    const hasSavedBalance = hasWalletBalance();
    setText('walletBalanceReveal', `INR ${balance.toFixed(2)}`);
    setText('walletBalanceCurrent', `Current balance: INR ${balance.toFixed(2)}`);
    setText('walletAddBalanceBtn', hasSavedBalance ? 'Update balance' : 'Add balance');
    setText('walletBalanceTitle', hasSavedBalance ? 'Update wallet balance' : 'Add wallet balance');
    setText(
        'walletBalanceDescription',
        hasSavedBalance
            ? 'Add more money to your current balance, or update it with a new amount.'
            : 'Add money to your wallet balance or replace it with a new amount.'
    );

    const balanceElement = document.getElementById('walletBalanceReveal');
    if (balanceElement && window.gsap && animate) {
        gsap.fromTo(balanceElement, { scale: 0.88 }, { scale: 1, duration: 0.28, ease: 'back.out(2)' });
    }
}

async function loadWalletBudgetData(animate = true) {
    if (!document.getElementById('walletPage')) return;

    try {
        const response = await fetch(`${API_URL}/expenses`);
        const expenses = await response.json();
        const records = Array.isArray(expenses) ? expenses : [];
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthRecords = records.filter(expense => expense.date && expense.date.slice(0, 7) === currentMonth);
        const spent = monthRecords.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        const budget = Number(localStorage.getItem('spendora-monthly-budget') || 0);

        renderWalletBalance();
        renderWalletBudget({
            budget,
            spent,
            records: monthRecords,
            monthKey: currentMonth,
            animate
        });
    } catch (error) {
        console.error('Error loading wallet budget:', error);
        const alert = document.getElementById('budgetAlert');
        if (alert) alert.textContent = 'Unable to load expense data right now.';
    }
}

function renderWalletBudget({ budget, spent, records, monthKey, animate }) {
    const percent = budget > 0 ? (spent / budget) * 100 : 0;
    const cappedPercent = Math.min(percent, 100);
    const average = records.length ? spent / records.length : 0;
    const topCategory = getCategoryTotals(records)[0];
    const status = getBudgetStatus(percent, budget);
    const remaining = budget - spent;

    setText('budgetSpent', `INR ${spent.toFixed(2)}`);
    setText('budgetLimit', budget > 0 ? `INR ${budget.toFixed(2)}` : 'INR 0.00');
    setText('budgetPercent', budget > 0 ? `${Math.round(percent)}%` : '0%');
    setText('budgetTransactions', String(records.length));
    setText('budgetAverage', `INR ${average.toFixed(2)}`);
    setText('budgetTopCategory', topCategory ? topCategory.category : 'None');
    walletCardRuntime = {
        monthLabel: getMonthLabel(monthKey).toUpperCase(),
        status: status.shortLabel
    };
    renderWalletCards();

    const remainingText = budget <= 0
        ? 'Set a budget to start tracking.'
        : remaining >= 0
            ? `INR ${remaining.toFixed(2)} remaining this month.`
            : `INR ${Math.abs(remaining).toFixed(2)} over budget.`;
    setText('budgetRemaining', remainingText);
    setText('budgetAlert', status.message);
    setText('budgetStatusPill', status.label);

    const meter = document.getElementById('budgetMeterCard');
    const fill = document.getElementById('budgetProgressFill');
    const pill = document.getElementById('budgetStatusPill');
    const alert = document.getElementById('budgetAlert');
    const wallet = document.getElementById('premiumBifold');

    [meter, fill, pill, alert, wallet].forEach(element => {
        if (!element) return;
        element.classList.remove('budget-within', 'budget-nearing', 'budget-complete', 'budget-exceeded', 'budget-idle');
        element.classList.add(status.className);
    });

    if (fill) {
        const width = `${cappedPercent}%`;
        if (window.gsap && animate) {
            gsap.to(fill, { width, duration: 0.7, ease: 'power3.out' });
        } else {
            fill.style.width = width;
        }
    }

    if (window.gsap && animate) {
        gsap.fromTo(
            ['.budget-meter-card', '.budget-insight-grid article', '.budget-alert'],
            { opacity: 0.82, y: 8 },
            { opacity: 1, y: 0, duration: 0.34, stagger: 0.04, ease: 'power2.out' }
        );
    }
}

function getBudgetStatus(percent, budget) {
    if (budget <= 0) {
        return {
            className: 'budget-idle',
            label: 'Set budget',
            shortLabel: 'Ready',
            message: 'Add your monthly budget to activate live tracking.'
        };
    }

    if (percent > 100) {
        return {
            className: 'budget-exceeded',
            label: 'Exceeded budget',
            shortLabel: 'Exceeded',
            message: 'You have exceeded this month’s budget. Review recent expenses.'
        };
    }

    if (percent >= 95) {
        return {
            className: 'budget-complete',
            label: 'Completed budget',
            shortLabel: 'Complete',
            message: 'Your monthly budget is essentially complete. Spend carefully.'
        };
    }

    if (percent >= 75) {
        return {
            className: 'budget-nearing',
            label: 'Nearing limit',
            shortLabel: 'Nearing',
            message: 'You are nearing your monthly limit. Keep an eye on upcoming expenses.'
        };
    }

    return {
        className: 'budget-within',
        label: 'Within budget',
        shortLabel: 'Healthy',
        message: 'You are within budget. Nice and steady.'
    };
}

function setupWalletOptionsMenu() {
    const button = document.getElementById('walletOptionsBtn');
    const menu = document.getElementById('walletOptionsMenu');
    if (!button || !menu) return;

    button.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = menu.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(isOpen));

        if (window.gsap && isOpen) {
            gsap.fromTo(menu, { opacity: 0, y: -8, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out' });
        }
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.wallet-options')) {
            closeWalletOptionsMenu();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeWalletOptionsMenu();
    });
}

function closeWalletOptionsMenu() {
    const button = document.getElementById('walletOptionsBtn');
    const menu = document.getElementById('walletOptionsMenu');
    if (!menu) return;

    menu.classList.remove('is-open');
    button?.setAttribute('aria-expanded', 'false');
}

function setupWalletCardEditor() {
    const modal = document.getElementById('walletCardsModal');
    const closeButton = document.getElementById('walletCardsClose');
    const editButton = document.getElementById('walletEditCardsBtn');
    const select = document.getElementById('walletCardSelect');
    const saveButton = document.getElementById('walletSaveCardBtn');
    const resetButton = document.getElementById('walletResetCardBtn');
    if (!modal || !editButton || !select || !saveButton || !resetButton) return;

    const openEditor = () => {
        closeWalletOptionsMenu();
        populateWalletCardEditor(select.value || 'stripe');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');

        if (window.gsap) {
            gsap.fromTo(
                modal.querySelector('.wallet-upload-card'),
                { opacity: 0, y: 18, scale: 0.96, filter: 'blur(8px)' },
                { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.32, ease: 'power3.out' }
            );
        }
    };

    editButton.addEventListener('click', openEditor);
    closeButton?.addEventListener('click', () => closeWalletModal(modal));
    modal.addEventListener('click', event => {
        if (event.target === modal) closeWalletModal(modal);
    });
    select.addEventListener('change', () => populateWalletCardEditor(select.value));
    saveButton.addEventListener('click', saveWalletCardEdit);
    resetButton.addEventListener('click', resetWalletCardEdit);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeWalletModal(modal);
        }
    });
}

function getWalletCardDefaults() {
    const displayName = isAuthenticated && currentUser.name ? currentUser.name.toUpperCase() : 'GUEST';

    return {
        stripe: {
            name: 'Spendora',
            label: 'Holder',
            info: displayName,
            number: '5524 9910 4242'
        },
        wise: {
            name: 'Budget',
            label: 'Month',
            info: walletCardRuntime.monthLabel || 'LIVE',
            number: '9012 4432 8810'
        },
        payflow: {
            name: 'PayFlow',
            label: 'Status',
            info: walletCardRuntime.status || 'Ready',
            number: '3312 0045 0094'
        }
    };
}

function getStoredWalletCards() {
    try {
        return JSON.parse(localStorage.getItem('spendora-wallet-cards') || '{}');
    } catch {
        return {};
    }
}

function getWalletCards() {
    const defaults = getWalletCardDefaults();
    const stored = getStoredWalletCards();

    return Object.keys(defaults).reduce((cards, key) => {
        cards[key] = { ...defaults[key], ...(stored[key] || {}) };
        return cards;
    }, {});
}

function renderWalletCards() {
    const cards = getWalletCards();

    Object.entries(cards).forEach(([key, card]) => {
        const element = document.querySelector(`[data-wallet-card="${key}"]`);
        if (!element) return;

        const number = card.number || '';
        element.querySelector('[data-card-name]').textContent = card.name || '';
        element.querySelector('[data-card-label]').textContent = card.label || '';
        element.querySelector('[data-card-info]').textContent = card.info || '';
        element.querySelector('[data-card-number]').textContent = number;
        element.querySelector('[data-card-masked]').textContent = formatWalletCardMask(number);
    });
}

function populateWalletCardEditor(cardKey) {
    const cards = getWalletCards();
    const card = cards[cardKey] || cards.stripe;

    document.getElementById('walletEditCardName').value = card.name || '';
    document.getElementById('walletEditCardLabel').value = card.label || '';
    document.getElementById('walletEditCardInfo').value = card.info || '';
    document.getElementById('walletEditCardNumber').value = card.number || '';
}

function saveWalletCardEdit() {
    const select = document.getElementById('walletCardSelect');
    if (!select) return;

    const cardKey = select.value;
    const stored = getStoredWalletCards();
    stored[cardKey] = {
        name: document.getElementById('walletEditCardName')?.value.trim() || '',
        label: document.getElementById('walletEditCardLabel')?.value.trim() || '',
        info: document.getElementById('walletEditCardInfo')?.value.trim() || '',
        number: document.getElementById('walletEditCardNumber')?.value.trim() || ''
    };

    localStorage.setItem('spendora-wallet-cards', JSON.stringify(stored));
    renderWalletCards();
    showNotification('Wallet card updated', 'success');
}

function resetWalletCardEdit() {
    const select = document.getElementById('walletCardSelect');
    if (!select) return;

    const stored = getStoredWalletCards();
    delete stored[select.value];
    localStorage.setItem('spendora-wallet-cards', JSON.stringify(stored));
    renderWalletCards();
    populateWalletCardEditor(select.value);
    showNotification('Wallet card reset', 'info');
}

function formatWalletCardMask(number) {
    const digits = String(number || '').replace(/\D/g, '');
    const lastFour = digits.slice(-4) || '0000';
    return `**** ${lastFour}`;
}

function clearWalletPhotoView() {
    walletPhotoCache = '';
    localStorage.removeItem('spendora-wallet-photo');
    renderWalletPhoto();
}

async function syncWalletPhotoState() {
    if (!document.getElementById('idWindow')) return;

    if (!isAuthenticated) {
        clearWalletPhotoView();
        return;
    }

    walletPhotoCache = '';
    localStorage.removeItem('spendora-wallet-photo');
    renderWalletPhoto();

    try {
        const response = await fetch(`${API_URL}/wallet/photo`, {
            credentials: 'same-origin'
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not load wallet photo.');
        }

        if (!result.authenticated) {
            clearWalletPhotoView();
            return;
        }

        if (result.photo) {
            walletPhotoCache = result.photo;
            try {
                localStorage.setItem('spendora-wallet-photo', result.photo);
            } catch {
                localStorage.removeItem('spendora-wallet-photo');
            }
        } else {
            walletPhotoCache = '';
            localStorage.removeItem('spendora-wallet-photo');
        }

        renderWalletPhoto(Boolean(result.photo));
    } catch (error) {
        console.error('Error loading wallet photo:', error);
        renderWalletPhoto();
    }
}

async function saveWalletPhotoToServer(photo) {
    const response = await fetch(`${API_URL}/wallet/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ photo })
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 404) {
        throw new Error('Restart the Node server once to enable wallet photo storage.');
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Could not save wallet photo.');
    }

    return result;
}

async function deleteWalletPhotoFromServer() {
    const response = await fetch(`${API_URL}/wallet/photo`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 404) {
        throw new Error('Restart the Node server once to enable wallet photo storage.');
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Could not remove wallet photo.');
    }

    return result;
}

function readWalletPhotoAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(new Error('Could not read this image file.'));
        reader.readAsDataURL(file);
    });
}

function loadImageElement(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not prepare this image.'));
        image.src = source;
    });
}

function storeWalletPhotoLocally(photo) {
    walletPhotoCache = photo;
    try {
        localStorage.setItem('spendora-wallet-photo', photo);
    } catch {
        localStorage.removeItem('spendora-wallet-photo');
    }
}

async function prepareWalletPhoto(file) {
    const original = await readWalletPhotoAsDataUrl(file);

    if (!window.HTMLCanvasElement) {
        return original;
    }

    try {
        const image = await loadImageElement(original);
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
        const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) return original;

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        let quality = 0.86;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        while (compressed.length > 3_500_000 && quality > 0.48) {
            quality -= 0.1;
            compressed = canvas.toDataURL('image/jpeg', quality);
        }

        return compressed;
    } catch {
        return original;
    }
}

function setupWalletPhotoUpload() {
    const input = document.getElementById('photoInput');
    const placeholder = document.getElementById('idPlaceholder');
    const windowElement = document.getElementById('idWindow');
    const modal = document.getElementById('walletUploadModal');
    const closeButton = document.getElementById('walletUploadClose');
    const dropzone = document.getElementById('walletDropzone');
    const removePhotoButton = document.getElementById('walletRemovePhotoBtn');
    if (!input || !windowElement || !modal || !dropzone) return;

    const openUploadModal = () => {
        closeWalletOptionsMenu();

        if (!isAuthenticated) {
            showProfilePrompt();
            showNotification('Login first to save your wallet photo.', 'error');
            return;
        }

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        if (window.gsap) {
            gsap.fromTo(
                modal.querySelector('.wallet-upload-card'),
                { opacity: 0, y: 18, scale: 0.96, filter: 'blur(8px)' },
                { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.32, ease: 'power3.out' }
            );
        }
    };

    const closeUploadModal = () => {
        if (window.gsap) {
            gsap.to(modal.querySelector('.wallet-upload-card'), {
                opacity: 0,
                y: 12,
                scale: 0.97,
                filter: 'blur(6px)',
                duration: 0.18,
                ease: 'power2.in',
                onComplete: () => {
                    modal.classList.remove('is-open');
                    modal.setAttribute('aria-hidden', 'true');
                    gsap.set(modal.querySelector('.wallet-upload-card'), { clearProps: 'opacity,y,scale,filter' });
                }
            });
        } else {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
    };

    const usePhotoFile = file => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('Please choose an image file.', 'error');
            return;
        }

        if (!isAuthenticated) {
            closeUploadModal();
            showProfilePrompt();
            showNotification('Login first to save your wallet photo.', 'error');
            return;
        }

        const saveSelectedPhoto = async () => {
            let photo = '';

            try {
                photo = await prepareWalletPhoto(file);
                await saveWalletPhotoToServer(photo);
                storeWalletPhotoLocally(photo);
                renderWalletPhoto(true);
                closeUploadModal();
                showNotification('Wallet ID photo saved', 'success');
            } catch (error) {
                if (photo) {
                    storeWalletPhotoLocally(photo);
                    renderWalletPhoto(true);
                    closeUploadModal();
                    showNotification('Photo added locally. Restart the Node server to sync it to MongoDB.', 'info');
                } else {
                    showNotification(error.message || 'Wallet photo could not be saved.', 'error');
                }
            }
        };

        saveSelectedPhoto();
    };

    if (isAuthenticated) {
        renderWalletPhoto();
    } else {
        clearWalletPhotoView();
    }
    windowElement.addEventListener('click', openUploadModal);
    removePhotoButton?.addEventListener('click', () => {
        closeWalletOptionsMenu();
        removeWalletPhoto();
    });
    closeButton?.addEventListener('click', closeUploadModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closeUploadModal();
    });

    input.addEventListener('change', () => {
        usePhotoFile(input.files?.[0]);
        input.value = '';
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.remove('is-dragging');
        });
    });

    dropzone.addEventListener('drop', event => {
        usePhotoFile(event.dataTransfer?.files?.[0]);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeUploadModal();
        }
    });
}

function renderWalletPhoto(animate = false) {
    const windowElement = document.getElementById('idWindow');
    const placeholder = document.getElementById('idPlaceholder');
    if (!windowElement) return;

    const photo = walletPhotoCache || localStorage.getItem('spendora-wallet-photo');
    let image = windowElement.querySelector('img');

    if (!photo) {
        if (image) image.remove();
        if (placeholder) placeholder.style.display = 'flex';
        return;
    }

    if (!image) {
        image = document.createElement('img');
        windowElement.appendChild(image);
    }

    image.src = photo;
    if (placeholder) placeholder.style.display = 'none';

    if (window.gsap && animate) {
        gsap.fromTo(image, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
    }
}

async function removeWalletPhoto() {
    if (isAuthenticated) {
        try {
            await deleteWalletPhotoFromServer();
        } catch (error) {
            showNotification(error.message || 'Wallet photo could not be removed.', 'error');
            return;
        }
    }

    clearWalletPhotoView();
    showNotification('Wallet photo removed', 'info');
}

// ==================== ANALYTICS ====================
function getMonthKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
}

function getPreviousMonthKey(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    return getMonthKey(new Date(year, month - 2, 1));
}

function getTrendMeta(current, previous) {
    const currentValue = Number(current) || 0;
    const previousValue = Number(previous) || 0;

    if (currentValue === 0 && previousValue === 0) {
        return { text: 'No data yet', className: 'trend-neutral' };
    }

    if (previousValue === 0) {
        return { text: 'New this month', className: 'trend-up' };
    }

    const percent = Math.round(((currentValue - previousValue) / previousValue) * 100);

    if (percent === 0) {
        return { text: '0% last month', className: 'trend-neutral' };
    }

    return {
        text: `${percent > 0 ? '+' : ''}${percent}% last month`,
        className: percent > 0 ? 'trend-up' : 'trend-down'
    };
}

function setMetricNote(id, text, className = 'trend-neutral') {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = text;
    element.classList.remove('trend-up', 'trend-down', 'trend-neutral');
    element.classList.add(className);
}

function setMetricTrend(id, current, previous) {
    const trend = getTrendMeta(current, previous);
    setMetricNote(id, trend.text, trend.className);
}

async function loadSummary() {
    try {
        const currentMonth = getMonthKey(new Date());
        const previousMonth = getPreviousMonthKey(currentMonth);
        
        // Get monthly summary
        const summaryResponse = await fetch(`${API_URL}/analytics/summary?month=${currentMonth}`);
        const summaryData = await summaryResponse.json();
        
        document.getElementById('monthSpent').textContent = `INR ${summaryData.total.toFixed(2)}`;
        document.getElementById('transactionCount').textContent = summaryData.transactionCount;
        
        // Get all-time total
        const allExpensesResponse = await fetch(`${API_URL}/expenses`);
        const allExpenses = await allExpensesResponse.json();
        const totalAllTime = allExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const average = allExpenses.length ? totalAllTime / allExpenses.length : 0;
        const currentMonthExpenses = allExpenses.filter(expense => expense.date && expense.date.slice(0, 7) === currentMonth);
        const previousMonthExpenses = allExpenses.filter(expense => expense.date && expense.date.slice(0, 7) === previousMonth);
        const currentMonthTotal = currentMonthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const previousMonthTotal = previousMonthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        
        document.getElementById('totalSpent').textContent = `INR ${totalAllTime.toFixed(2)}`;
        document.getElementById('averageSpent').textContent = `INR ${average.toFixed(2)}`;
        setMetricNote('totalSpentNote', allExpenses.length ? 'All-time total' : 'No data yet');
        setMetricTrend('monthSpentTrend', currentMonthTotal, previousMonthTotal);
        setMetricTrend('transactionTrend', currentMonthExpenses.length, previousMonthExpenses.length);
        setMetricNote('averageSpentNote', allExpenses.length ? `${allExpenses.length} records` : 'No data yet');
        
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadCategoryChart() {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const expenses = await response.json();
        renderTrendChart(expenses);
        renderCategoryInsight(expenses);
    } catch (error) {
        console.error('Error loading chart:', error);
        const chart = document.getElementById('categoryChart');
        if (chart) chart.innerHTML = '<p class="empty-state">Error loading chart</p>';
    }
}

// ==================== HELPER FUNCTIONS ====================

function resetForm() {
    document.getElementById('expenseForm').reset();
    setSpendoraSelectValue('category', '');
    setSpendoraSelectValue('paymentMethod', '');
    setExpenseDateValue(getDateInputValue(new Date()));
    
    isEditMode = false;
    editingExpenseId = null;
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = 'Add Expense';
    submitBtn.classList.remove('is-updating');
}

function formatDate(dateString) {
    if (!dateString) return 'No date';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'No date';

    return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

function getCategoryIcon(category) {
    const icons = {
        'Food': 'food',
        'Transport': 'transport',
        'Shopping': 'shopping',
        'Bills': 'bills',
        'Entertainment': 'entertainment',
        'Health': 'health',
        'Other': 'other'
    };
    const icon = icons[category] || 'other';
    return `<span class="category-icon icon-${icon}" aria-hidden="true"></span>`;
}

function getInitials(text = '') {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'EX';
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function renderTrendChart(expenses) {
    const chartContainer = document.getElementById('categoryChart');
    if (!chartContainer) return;

    if (!expenses.length) {
        chartContainer.innerHTML = '<p class="empty-state">No spending trend yet. Add expenses to see analytics.</p>';
        return;
    }

    const months = getLastTenMonths();
    const monthlyTotals = months.map(month => {
        return expenses
            .filter(expense => expense.date && expense.date.slice(0, 7) === month.key)
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    });

    const transactionCounts = months.map(month => {
        return expenses.filter(expense => expense.date && expense.date.slice(0, 7) === month.key).length;
    });

    const totalMax = Math.max(...monthlyTotals, 1);
    const countMax = Math.max(...transactionCounts, 1);
    const width = 690;
    const height = 220;
    const left = 42;
    const top = 18;
    const plotWidth = 612;
    const plotHeight = 158;

    const totalPoints = monthlyTotals.map((value, index) => {
        const x = left + (plotWidth / (months.length - 1)) * index;
        const y = top + plotHeight - (value / totalMax) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const countPoints = transactionCounts.map((value, index) => {
        const x = left + (plotWidth / (months.length - 1)) * index;
        const normalized = (value / countMax) * 0.78;
        const y = top + plotHeight - normalized * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const peakIndex = monthlyTotals.indexOf(Math.max(...monthlyTotals));
    const markerX = left + (plotWidth / (months.length - 1)) * peakIndex;
    const markerY = top + plotHeight - (monthlyTotals[peakIndex] / totalMax) * plotHeight;
    const gridLines = [0, 1, 2, 3, 4].map(i => {
        const y = top + (plotHeight / 4) * i;
        return `<line class="trend-grid" x1="${left}" x2="${left + plotWidth}" y1="${y}" y2="${y}"></line>`;
    }).join('');
    const labels = months.map((month, index) => {
        const x = left + (plotWidth / (months.length - 1)) * index;
        return `<text class="trend-label" x="${x}" y="207">${month.label}</text>`;
    }).join('');

    chartContainer.innerHTML = `
        <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Spending trends chart">
            <g>${gridLines}</g>
            <g>${labels}</g>
            <polyline class="trend-line" points="${totalPoints}"></polyline>
            <polyline class="trend-line-soft" points="${countPoints}"></polyline>
            <line class="trend-marker" x1="${markerX}" x2="${markerX}" y1="${top}" y2="${top + plotHeight}"></line>
            <circle class="marker-dot" cx="${markerX}" cy="${markerY}" r="4"></circle>
            <rect class="marker-pill" x="${markerX - 23}" y="${markerY - 32}" width="50" height="20" rx="6"></rect>
            <text class="marker-text" x="${markerX + 2}" y="${markerY - 18}">INR ${Math.round(monthlyTotals[peakIndex])}</text>
        </svg>
    `;

    if (window.gsap) {
        gsap.fromTo(
            '.trend-svg',
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
        );
        gsap.fromTo(
            ['.trend-line', '.trend-line-soft'],
            { opacity: 0 },
            { opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out' }
        );
    }
}

function renderCategoryInsight(expenses) {
    const container = document.getElementById('categoryInsight');
    if (!container) return;

    const totals = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        acc[category] = (acc[category] || 0) + Number(expense.amount || 0);
        return acc;
    }, {});

    const grandTotal = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (!entries.length) {
        container.innerHTML = '<p class="empty-state">No categories yet.</p>';
        return;
    }

    container.innerHTML = entries.map(([category, amount]) => {
        const percent = grandTotal ? Math.round((amount / grandTotal) * 100) : 0;
        return `
            <div class="insight-row">
                <div class="insight-badge">${category.slice(0, 2).toUpperCase()}</div>
                <div>
                    <div class="insight-name">${escapeHtml(category)}</div>
                    <div class="insight-bar"><span style="width: ${percent}%"></span></div>
                </div>
                <div class="insight-percent">${percent}%</div>
            </div>
        `;
    }).join('');

    if (window.gsap) {
        gsap.fromTo(
            '.insight-row',
            { opacity: 0, x: 12 },
            { opacity: 1, x: 0, duration: 0.32, stagger: 0.05, ease: 'power2.out' }
        );
    }
}

function getLastTenMonths() {
    return getRecentMonths(10);
}

function getRecentMonths(count) {
    const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
    const now = new Date();
    const months = [];

    for (let index = count - 1; index >= 0; index--) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
        months.push({
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: formatter.format(date)
        });
    }

    return months;
}

function getMonthLabel(monthKey = '') {
    if (!monthKey) return 'N/A';

    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return 'N/A';

    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function sumExpensesForMonth(expenses, monthKey) {
    return expenses
        .filter(expense => expense.date && expense.date.slice(0, 7) === monthKey)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function getCategoryTotals(expenses) {
    const totals = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        acc[category] = (acc[category] || 0) + Number(expense.amount || 0);
        return acc;
    }, {});

    return Object.entries(totals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    let stack = document.getElementById('toastStack');

    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toastStack';
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    if (window.gsap) {
        gsap.fromTo(
            toast,
            { autoAlpha: 0, y: -12, scale: 0.96 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power3.out' }
        );
        gsap.to(toast, {
            autoAlpha: 0,
            y: -10,
            duration: 0.24,
            delay: 2.4,
            ease: 'power2.in',
            onComplete: () => toast.remove()
        });
    } else {
        window.setTimeout(() => toast.remove(), 2600);
    }
}

function updateTimeGreeting() {
    const greetingElement = document.getElementById('timeGreeting');
    if (!greetingElement) return;

    const userName = isAuthenticated ? currentUser.name : '';
    const hour = new Date().getHours();
    let greeting = 'Good evening';

    if (hour < 12) {
        greeting = 'Good morning';
    } else if (hour < 17) {
        greeting = 'Good afternoon';
    }

    greetingElement.textContent = userName
        ? `${greeting}, ${userName}. Here is your spending overview`
        : `${greeting}. Here is your spending overview`;
}

function initHeaderControls() {
    const navItems = document.querySelectorAll('.tabs a[data-target], .rail-button[data-target]');
    const tabs = document.querySelectorAll('.tabs a[data-target]');
    const railButtons = document.querySelectorAll('.rail-button[data-target]');

    navItems.forEach(item => {
        item.addEventListener('click', event => {
            event.preventDefault();
            const targetId = item.dataset.target;
            scrollToSection(targetId);
            setActiveNav(targetId, tabs, railButtons);
        });
    });

    document.querySelector('.logo-mark')?.addEventListener('click', event => {
        if (!document.getElementById('dashboardTop')) return;

        event.preventDefault();
        scrollToSection('dashboardTop');
        setActiveNav('dashboardTop', tabs, railButtons);
    });

    setupMenu('notificationBtn', 'notificationPanel');
    setupMenu('messageBtn', 'messagePanel');
    setupMenu('profileBtn', 'profilePanel');
    document.getElementById('menuBackdrop')?.addEventListener('click', closeMenus);

    document.getElementById('profileAddBtn')?.addEventListener('click', () => {
        closeMenus();
        window.location.href = 'switch-user-mode.html';
    });

    document.getElementById('profileLoginBtn')?.addEventListener('click', loginWithOAuth);
    document.getElementById('profileLogoutBtn')?.addEventListener('click', requestLogout);
    document.getElementById('logoutBtn')?.addEventListener('click', requestLogout);

    document.addEventListener('click', event => {
        if (!event.target.closest('.action-menu')) {
            closeMenus();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeMenus();
        }
    });
}

function initLiquidGlassNav() {
    document.querySelectorAll('.tabs').forEach(tabs => {
        if (tabs.dataset.liquidReady === 'true') return;

        tabs.dataset.liquidReady = 'true';
        tabs.classList.add('liquid-glass-tabs');

        const indicator = document.createElement('span');
        indicator.className = 'liquid-glass-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        tabs.prepend(indicator);

        const links = [...tabs.querySelectorAll('a')];
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let settleTimer = null;

        const positionIndicator = (link, immediate = false) => {
            if (!link) return;

            const target = {
                x: link.offsetLeft,
                y: link.offsetTop,
                width: link.offsetWidth,
                height: link.offsetHeight
            };

            if (window.gsap && !reduceMotion) {
                gsap.killTweensOf(indicator);
                if (!immediate) gsap.set(indicator, { scaleX: 1.035, scaleY: 0.985 });
                gsap.to(indicator, {
                    x: target.x,
                    y: target.y,
                    width: target.width,
                    height: target.height,
                    scaleX: 1,
                    scaleY: 1,
                    duration: immediate ? 0 : 0.34,
                    ease: immediate ? 'none' : 'power3.out'
                });
                gsap.fromTo(
                    indicator,
                    { '--liquid-stretch': immediate ? 0 : 1 },
                    { '--liquid-stretch': 0, duration: 0.34, ease: 'power3.out' }
                );
            } else {
                indicator.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
                indicator.style.width = `${target.width}px`;
                indicator.style.height = `${target.height}px`;
            }
        };

        const getActiveLink = () => tabs.querySelector('a.active') || links[0];
        const restoreActive = () => positionIndicator(getActiveLink());
        const clearHoverState = () => {
            tabs.classList.remove('is-hovering');
            links.forEach(link => link.classList.remove('is-liquid-hover'));
        };
        const setHoverState = link => {
            tabs.classList.add('is-hovering');
            links.forEach(item => item.classList.toggle('is-liquid-hover', item === link));
            positionIndicator(link);
        };

        positionIndicator(getActiveLink(), true);
        requestAnimationFrame(() => positionIndicator(getActiveLink(), true));

        links.forEach(link => {
            link.addEventListener('mouseenter', () => setHoverState(link));
            link.addEventListener('focus', () => setHoverState(link));
            link.addEventListener('blur', () => {
                if (!tabs.contains(document.activeElement)) {
                    clearHoverState();
                    restoreActive();
                }
            });
            link.addEventListener('click', () => {
                clearHoverState();
                window.setTimeout(() => positionIndicator(link), 0);
            });
        });

        tabs.addEventListener('mousemove', event => {
            const rect = tabs.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const xRatio = (x / rect.width) - 0.5;
            const yRatio = (y / rect.height) - 0.5;

            tabs.style.setProperty('--glass-x', `${x}px`);
            tabs.style.setProperty('--glass-y', `${y}px`);

            if (window.gsap && !reduceMotion) {
                gsap.to(tabs, {
                    rotateX: yRatio * -2.4,
                    rotateY: xRatio * 2.8,
                    duration: 0.42,
                    ease: 'power3.out',
                    transformPerspective: 900
                });
            }

            window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(() => tabs.classList.add('is-liquid-settled'), 90);
            tabs.classList.remove('is-liquid-settled');
        });

        tabs.addEventListener('mouseleave', () => {
            tabs.style.setProperty('--glass-x', '50%');
            tabs.style.setProperty('--glass-y', '50%');
            clearHoverState();
            restoreActive();

            if (window.gsap && !reduceMotion) {
                gsap.to(tabs, { rotateX: 0, rotateY: 0, duration: 0.46, ease: 'elastic.out(1, 0.8)' });
            }
        });

        tabs.restoreLiquidIndicator = () => {
            clearHoverState();
            restoreActive();
        };

        window.addEventListener('resize', () => positionIndicator(getActiveLink(), true));
        window.addEventListener('load', () => positionIndicator(getActiveLink(), true));
    });
}

function setupMenu(buttonId, panelId) {
    const button = document.getElementById(buttonId);
    const panel = document.getElementById(panelId);
    if (!button || !panel) return;

    button.addEventListener('click', event => {
        event.stopPropagation();
        const shouldOpen = !panel.classList.contains('is-open');
        closeMenus();
        if (shouldOpen) {
            openMenu(button, panel);
        }
    });
}

function openMenu(button, panel) {
    const backdrop = document.getElementById('menuBackdrop');
    backdrop?.classList.add('is-open');
    panel.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');

    if (!window.gsap) return;

    gsap.killTweensOf([backdrop, panel]);
    gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' });
    gsap.fromTo(
        panel,
        { autoAlpha: 0, y: -16, scale: 0.94, filter: 'blur(8px)' },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.36, ease: 'power3.out' }
    );
}

function closeMenus() {
    const backdrop = document.getElementById('menuBackdrop');
    const openPanels = document.querySelectorAll('.menu-panel.is-open');

    if (window.gsap && openPanels.length) {
        gsap.to(openPanels, {
            autoAlpha: 0,
            y: -10,
            scale: 0.96,
            filter: 'blur(6px)',
            duration: 0.18,
            ease: 'power2.in',
            onComplete: () => {
                openPanels.forEach(panel => {
                    panel.classList.remove('is-open');
                    gsap.set(panel, { clearProps: 'opacity,visibility,y,scale,filter' });
                });
            }
        });
        gsap.to(backdrop, {
            autoAlpha: 0,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
                backdrop?.classList.remove('is-open');
                if (backdrop) gsap.set(backdrop, { clearProps: 'opacity,visibility' });
            }
        });
    } else {
        openPanels.forEach(panel => panel.classList.remove('is-open'));
        backdrop?.classList.remove('is-open');
    }

    document.querySelectorAll('.top-actions [aria-expanded="true"]').forEach(button => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function scrollToSection(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setActiveNav(targetId, tabs, railButtons) {
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.target === targetId);
    });

    railButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.target === targetId);
    });

    if (window.gsap) {
        const activeTabs = document.querySelectorAll(`.tabs a[data-target="${targetId}"]`);
        gsap.fromTo(
            activeTabs,
            { scale: 0.92 },
            { scale: 1, duration: 0.28, ease: 'back.out(2)' }
        );
    }

    document.querySelectorAll('.tabs').forEach(tabsElement => {
        tabsElement.restoreLiquidIndicator?.();
    });
}

function initPremiumAnimations() {
    if (!window.gsap) return;

    gsap.set(['.side-rail', '.greeting', '.tabs-sticky-wrap', '.top-actions', '.metric-card', '.panel'], {
        opacity: 0,
        y: 22
    });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.side-rail', { opacity: 1, y: 0, duration: 0.55 })
        .to(['.greeting', '.tabs-sticky-wrap', '.top-actions'], { opacity: 1, y: 0, stagger: 0.08, duration: 0.62, clearProps: 'transform' }, '-=0.35')
        .to('.metric-card', { opacity: 1, y: 0, stagger: 0.07, duration: 0.5 }, '-=0.3')
        .to('.panel', { opacity: 1, y: 0, stagger: 0.07, duration: 0.5 }, '-=0.25');
}
