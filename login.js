const AUTH_API_URL = `${window.location.origin}/api`;

document.addEventListener('DOMContentLoaded', () => {
    applySavedAuthTheme();
    initOAuthPage();
    initPasswordForm();
    animateAuthPage();
});

function applySavedAuthTheme() {
    const savedTheme = localStorage.getItem('spendora-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.body.classList.toggle('theme-dark', theme === 'dark');
}

async function initOAuthPage() {
    const button = document.getElementById('oauthButton');
    const buttonText = document.getElementById('oauthButtonText');
    const providerMark = document.querySelector('.provider-mark');
    const params = new URLSearchParams(window.location.search);
    const isSwitchMode = params.get('switch') === '1';

    try {
        const response = await fetch(`${AUTH_API_URL}/auth/oauth-status`, {
            credentials: 'same-origin'
        });
        const auth = await response.json();
        const provider = auth.providerName || 'OAuth2';

        buttonText.textContent = isSwitchMode
            ? `Switch ${provider.toLowerCase() === 'google' ? 'Google' : provider} account`
            : provider.toLowerCase() === 'google'
                ? 'Continue with Google'
                : `Continue with ${provider}`;
        if (providerMark) {
            providerMark.textContent = provider.toLowerCase() === 'google' ? 'G' : provider.charAt(0).toUpperCase();
        }

        if (auth.configured) {
            button.classList.remove('is-disabled');
            button.addEventListener('click', () => {
                window.location.href = isSwitchMode ? '/auth/login?switch=1' : '/auth/login';
            });
            return;
        }

        button.classList.add('is-disabled');
        button.addEventListener('click', () => {
            pulseButton(button);
        });
    } catch (error) {
        button.classList.add('is-disabled');
    }
}

function pulseButton(button) {
    if (!window.gsap) return;

    gsap.fromTo(
        button,
        { scale: 0.98, y: 2 },
        { scale: 1, y: 0, duration: 0.3, ease: 'back.out(2)' }
    );
}

function initPasswordForm() {
    const form = document.getElementById('passwordLoginForm');
    const username = document.getElementById('loginUsername');
    const password = document.getElementById('loginPassword');
    const toggle = document.getElementById('togglePassword');
    const signup = document.getElementById('signupButton');
    const forgot = document.getElementById('forgotPasswordBtn');
    const message = document.getElementById('authFormMessage');

    toggle?.addEventListener('click', () => {
        const showing = password.type === 'text';
        password.type = showing ? 'password' : 'text';
        toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        toggle.querySelector('.ui-icon')?.classList.toggle('icon-eye', showing);
        toggle.querySelector('.ui-icon')?.classList.toggle('icon-eye-off', !showing);

        if (window.gsap) {
            gsap.fromTo(toggle, { scale: 0.86 }, { scale: 1, duration: 0.24, ease: 'back.out(2)' });
        }
    });

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        await submitPasswordAuth('/auth/password-login', 'Logging in...', username, password, message);
    });

    signup?.addEventListener('click', async () => {
        await submitPasswordAuth('/auth/signup', 'Creating your account...', username, password, message);
    });

    forgot?.addEventListener('click', async () => {
        const value = username.value.trim();
        if (!value) {
            showFormMessage(message, 'Enter your username first.', 'error');
            username.focus();
            return;
        }

        showFormMessage(message, 'Checking account...', 'info');
        const response = await fetch(`${AUTH_API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username: value })
        });
        const result = await response.json();
        showFormMessage(message, result.message || result.error, response.ok ? 'success' : 'error');
    });
}

async function submitPasswordAuth(path, pendingText, username, password, message) {
    const credentials = {
        username: username.value.trim(),
        password: password.value
    };

    if (!credentials.username || !credentials.password) {
        showFormMessage(message, 'Enter your username and password.', 'error');
        return;
    }

    showFormMessage(message, pendingText, 'info');

    try {
        const response = await fetch(`${AUTH_API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(credentials)
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            showFormMessage(message, result.error || 'Could not continue.', 'error');
            return;
        }

        showFormMessage(message, result.message || 'Welcome back.', 'success');
        window.setTimeout(() => {
            window.location.href = '/';
        }, 450);
    } catch (error) {
        showFormMessage(message, 'Login failed. Try again.', 'error');
    }
}

function showFormMessage(message, text, type) {
    if (!message) return;

    message.hidden = false;
    message.textContent = text;
    message.dataset.type = type;

    if (window.gsap) {
        gsap.fromTo(message, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' });
    }
}

function animateAuthPage() {
    if (!window.gsap) return;

    gsap.fromTo(
        ['.auth-header', '.auth-showcase', '.auth-card'],
        { opacity: 0, y: 24, filter: 'blur(10px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.08, ease: 'power3.out' }
    );
    animatePreviewAnalytics();
}

function animatePreviewAnalytics() {
    document.querySelectorAll('.motion-line').forEach((line, index) => {
        const length = line.getTotalLength();
        gsap.set(line, {
            strokeDasharray: length,
            strokeDashoffset: length
        });
        gsap.to(line, {
            strokeDashoffset: 0,
            duration: 1.15,
            delay: 0.35 + index * 0.16,
            ease: 'power3.out'
        });
    });

    gsap.fromTo(
        '.motion-chart, .pie-card, .bar-card',
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, delay: 0.28, ease: 'power3.out' }
    );

    document.querySelectorAll('.pie-segment').forEach((segment, index) => {
        const targetOffset = segment.classList.contains('pie-secondary')
            ? -56
            : segment.classList.contains('pie-tertiary')
                ? -86
                : 0;

        gsap.fromTo(
            segment,
            { strokeDashoffset: 100 },
            { strokeDashoffset: targetOffset, duration: 1, delay: 0.45 + index * 0.1, ease: 'power3.out' }
        );
    });

    gsap.to('.pie-chart', {
        rotate: 360,
        transformOrigin: '50% 50%',
        duration: 18,
        repeat: -1,
        ease: 'none'
    });

    gsap.fromTo(
        '.moving-bar i',
        { scaleX: 0.18 },
        { scaleX: 1, duration: 1.25, stagger: 0.13, delay: 0.48, ease: 'power3.out' }
    );

    gsap.to('.moving-bar i', {
        scaleX: () => gsap.utils.random(0.54, 1),
        duration: () => gsap.utils.random(1.2, 1.9),
        delay: 1.7,
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
        ease: 'sine.inOut'
    });

    gsap.to('.pulse-dot', {
        scale: 1.35,
        opacity: 0.48,
        transformOrigin: '50% 50%',
        duration: 0.85,
        repeat: -1,
        yoyo: true,
        stagger: 0.16,
        ease: 'sine.inOut'
    });
}
