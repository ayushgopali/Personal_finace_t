const AUTH_API_URL = `${window.location.origin}/api`;

let authMode = 'login';
let pendingSignupPayload = null;

document.addEventListener('DOMContentLoaded', () => {
    applySavedAuthTheme();
    initOAuthPage();
    initPasswordForm();
    initEmailVerificationModal();
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
    if (!button || !buttonText) return;

    try {
        const response = await fetch(`${AUTH_API_URL}/auth/oauth-status`, { credentials: 'same-origin' });
        const auth = await response.json();
        const provider = auth.providerName || 'OAuth2';

        buttonText.textContent = isSwitchMode
            ? `Switch ${provider.toLowerCase() === 'google' ? 'Google' : provider} account`
            : provider.toLowerCase() === 'google'
                ? 'Continue with Google'
                : `Continue with ${provider}`;
        if (providerMark) providerMark.textContent = provider.toLowerCase() === 'google' ? 'G' : provider.charAt(0).toUpperCase();

        if (auth.configured) {
            button.classList.remove('is-disabled');
            button.addEventListener('click', () => {
                window.location.href = isSwitchMode ? '/auth/login?switch=1' : '/auth/login';
            });
            return;
        }

        button.classList.add('is-disabled');
        button.addEventListener('click', () => pulseButton(button));
    } catch (error) {
        button.classList.add('is-disabled');
    }
}

function pulseButton(button) {
    if (!window.gsap) return;
    gsap.fromTo(button, { scale: 0.98, y: 2 }, { scale: 1, y: 0, duration: 0.3, ease: 'back.out(2)' });
}

function initPasswordForm() {
    const form = document.getElementById('passwordLoginForm');
    const displayName = document.getElementById('loginUsername');
    const password = document.getElementById('loginPassword');
    const confirmPassword = document.getElementById('signupConfirmPassword');
    const toggle = document.getElementById('togglePassword');
    const confirmToggle = document.getElementById('toggleConfirmPassword');
    const signup = document.getElementById('signupButton');
    const forgot = document.getElementById('forgotPasswordBtn');
    const message = document.getElementById('authFormMessage');

    setupPasswordToggle(toggle, password, 'password');
    setupPasswordToggle(confirmToggle, confirmPassword, 'confirm password');

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        if (authMode === 'signup') {
            await submitSignup(message);
            return;
        }
        await submitPasswordAuth('/auth/password-login', 'Logging in...', getLoginPayload(), message);
    });

    signup?.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'signup' : 'login', message));

    forgot?.addEventListener('click', async () => {
        const value = displayName.value.trim();
        if (!value) {
            showFormMessage(message, 'Enter your display name first.', 'error');
            displayName.focus();
            return;
        }

        showFormMessage(message, 'Checking account...', 'info');
        const response = await fetch(`${AUTH_API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ displayName: value })
        });
        const result = await readAuthJson(response);
        showFormMessage(message, result.message || result.error, response.ok ? 'success' : 'error');
    });
}

function setupPasswordToggle(button, input, label) {
    if (!button || !input) return;
    button.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.setAttribute('aria-label', showing ? `Show ${label}` : `Hide ${label}`);
        button.querySelector('.ui-icon')?.classList.toggle('icon-eye', showing);
        button.querySelector('.ui-icon')?.classList.toggle('icon-eye-off', !showing);
        if (window.gsap) gsap.fromTo(button, { scale: 0.86 }, { scale: 1, duration: 0.24, ease: 'back.out(2)' });
    });
}

function setAuthMode(mode, message) {
    authMode = mode;
    const isSignup = mode === 'signup';
    const form = document.getElementById('passwordLoginForm');
    const title = document.getElementById('authTitle');
    const intro = document.getElementById('authIntro');
    const nameFields = document.getElementById('signupNameFields');
    const emailField = document.getElementById('signupEmailField');
    const confirmField = document.getElementById('signupConfirmField');
    const submit = document.getElementById('authSubmitButton');
    const switchButton = document.getElementById('signupButton');
    const forgot = document.getElementById('forgotPasswordBtn');
    const password = document.getElementById('loginPassword');
    const displayName = document.getElementById('loginUsername');
    const confirmPassword = document.getElementById('signupConfirmPassword');
    const firstName = document.getElementById('signupFirstName');
    const secondName = document.getElementById('signupSecondName');
    const email = document.getElementById('signupEmail');
    const oauthDivider = document.getElementById('oauthDivider');
    const oauthButton = document.getElementById('oauthButton');

    form?.setAttribute('data-auth-mode', mode);
    if (title) title.textContent = isSignup ? 'Sign up' : 'Log in';
    if (intro) {
        intro.textContent = isSignup
            ? 'Create your secure Spendora account with your name, display name, email, and password.'
            : 'Continue with your secure account to sync Spendora, protect your profile, and keep your dashboard personal.';
    }
    if (nameFields) nameFields.hidden = !isSignup;
    if (emailField) emailField.hidden = !isSignup;
    if (confirmField) confirmField.hidden = !isSignup;
    if (submit) submit.textContent = isSignup ? 'Create account' : 'Login';
    if (switchButton) switchButton.textContent = isSignup ? 'Already have an account? Log in' : 'Sign up';
    if (forgot) forgot.hidden = isSignup;
    if (oauthDivider) oauthDivider.hidden = isSignup;
    if (oauthButton) oauthButton.hidden = isSignup;
    if (displayName) displayName.placeholder = isSignup ? 'Choose display name' : 'Enter display name';
    if (password) {
        password.autocomplete = isSignup ? 'new-password' : 'current-password';
        password.placeholder = isSignup ? 'Create password' : 'Enter password';
    }

    [firstName, secondName, email, confirmPassword].forEach(input => {
        if (input) input.required = isSignup;
    });
    if (!isSignup) {
        [firstName, secondName, email, confirmPassword].forEach(input => {
            if (input) input.value = '';
        });
    }
    if (message) message.hidden = true;

    if (window.gsap) {
        gsap.fromTo('.auth-card', { y: 10, filter: 'blur(4px)' }, { y: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power2.out' });
        gsap.fromTo(isSignup ? ['#signupNameFields', '#signupEmailField', '#signupConfirmField'] : ['#passwordLoginForm'], { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.24, stagger: 0.04, ease: 'power2.out' });
    }
}

function getLoginPayload() {
    return {
        displayName: document.getElementById('loginUsername')?.value.trim() || '',
        password: document.getElementById('loginPassword')?.value || ''
    };
}

async function submitSignup(message) {
    const payload = {
        firstName: document.getElementById('signupFirstName')?.value.trim() || '',
        secondName: document.getElementById('signupSecondName')?.value.trim() || '',
        displayName: document.getElementById('loginUsername')?.value.trim() || '',
        email: document.getElementById('signupEmail')?.value.trim() || '',
        password: document.getElementById('loginPassword')?.value || '',
        confirmPassword: document.getElementById('signupConfirmPassword')?.value || ''
    };

    if (!payload.firstName || !payload.secondName || !payload.displayName || !payload.email || !payload.password || !payload.confirmPassword) {
        showFormMessage(message, 'Complete all signup fields.', 'error');
        return;
    }
    if (!isValidEmail(payload.email)) {
        showFormMessage(message, 'Enter a valid email address.', 'error');
        return;
    }
    if (payload.password.length < 6) {
        showFormMessage(message, 'Password must be at least 6 characters.', 'error');
        return;
    }
    if (payload.password !== payload.confirmPassword) {
        showFormMessage(message, 'Passwords do not match.', 'error');
        return;
    }

    pendingSignupPayload = payload;
    openVerificationModal(payload.email);
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function initEmailVerificationModal() {
    document.getElementById('verifyCloseBtn')?.addEventListener('click', closeVerificationModal);
    document.getElementById('emailVerifyOverlay')?.addEventListener('click', event => {
        if (event.target.id === 'emailVerifyOverlay') closeVerificationModal();
    });
    document.getElementById('verifyPasskeyBtn')?.addEventListener('click', verifyWithPasskey);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeVerificationModal();
    });
}

function openVerificationModal(email) {
    const overlay = document.getElementById('emailVerifyOverlay');
    const emailText = document.getElementById('verifyEmailText');
    const message = document.getElementById('verifyMessage');
    if (!overlay) return;
    if (emailText) emailText.textContent = email;
    if (message) message.hidden = true;
    overlay.hidden = false;
    document.body.classList.add('auth-modal-open');
    if (window.gsap) {
        gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
        gsap.fromTo('.auth-verify-modal', { y: 18, scale: 0.96, filter: 'blur(8px)' }, { y: 0, scale: 1, filter: 'blur(0px)', duration: 0.34, ease: 'power3.out' });
    }
}

function closeVerificationModal() {
    const overlay = document.getElementById('emailVerifyOverlay');
    if (!overlay || overlay.hidden) return;
    const hide = () => {
        overlay.hidden = true;
        document.body.classList.remove('auth-modal-open');
    };
    if (window.gsap) {
        gsap.to('.auth-verify-modal', { y: 10, scale: 0.98, filter: 'blur(6px)', duration: 0.16, ease: 'power2.in' });
        gsap.to(overlay, { autoAlpha: 0, duration: 0.18, ease: 'power2.in', onComplete: hide });
    } else {
        hide();
    }
}

function base64UrlToBuffer(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
}

function bufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function optionsToPublicKeyCreationOptions(options) {
    return {
        ...options,
        challenge: base64UrlToBuffer(options.challenge),
        user: {
            ...options.user,
            id: base64UrlToBuffer(options.user.id)
        },
        excludeCredentials: (options.excludeCredentials || []).map(credential => ({
            ...credential,
            id: base64UrlToBuffer(credential.id)
        }))
    };
}

function credentialToJSON(credential) {
    return {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        response: {
            attestationObject: bufferToBase64Url(credential.response.attestationObject),
            clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
            transports: typeof credential.response.getTransports === 'function' ? credential.response.getTransports() : []
        },
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults?.() || {},
        authenticatorAttachment: credential.authenticatorAttachment || undefined
    };
}

async function readAuthJson(response) {
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();
    if (!contentType.includes('application/json')) {
        throw new Error('The auth server returned a page instead of JSON. Restart the Spendora server and try again.');
    }
    try {
        return JSON.parse(body);
    } catch (error) {
        throw new Error('The auth server returned invalid JSON. Restart the Spendora server and try again.');
    }
}
async function verifyWithPasskey() {
    const message = document.getElementById('verifyMessage');
    if (!pendingSignupPayload) return;
    if (!window.PublicKeyCredential || !navigator.credentials?.create) {
        showFormMessage(message, 'Passkey or fingerprint verification is not available on this device.', 'error');
        return;
    }

    showFormMessage(message, 'Preparing secure verification...', 'info');

    try {
        const challengeResponse = await fetch(`${AUTH_API_URL}/auth/signup-challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                displayName: pendingSignupPayload.displayName,
                email: pendingSignupPayload.email
            })
        });
        const challengeData = await readAuthJson(challengeResponse);
        if (!challengeResponse.ok || !challengeData.success) throw new Error(challengeData.error || 'Could not prepare verification.');

        showFormMessage(message, 'Waiting for fingerprint or passkey...', 'info');
        const credential = await navigator.credentials.create({
            publicKey: optionsToPublicKeyCreationOptions(challengeData.options)
        });
        if (!credential) throw new Error('No credential returned.');

        await submitPasswordAuth('/auth/signup', 'Passkey verified. Creating account...', {
            ...pendingSignupPayload,
            challengeId: challengeData.challengeId,
            credential: credentialToJSON(credential)
        }, message, () => {
            pendingSignupPayload = null;
        });
    } catch (error) {
        showFormMessage(message, error.message || 'Passkey verification was cancelled or failed.', 'error');
    }
}

async function submitPasswordAuth(path, pendingText, payload, message, onSuccess) {
    if ((!payload.displayName && !payload.username) || !payload.password) {
        showFormMessage(message, 'Enter your display name and password.', 'error');
        return;
    }
    showFormMessage(message, pendingText, 'info');
    try {
        const response = await fetch(`${AUTH_API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
        });
        const result = await readAuthJson(response);
        if (!response.ok || !result.success) {
            showFormMessage(message, result.error || 'Could not continue.', 'error');
            return;
        }
        showFormMessage(message, result.message || 'Welcome back.', 'success');
        onSuccess?.();
        window.setTimeout(() => { window.location.href = '/'; }, 450);
    } catch (error) {
        showFormMessage(message, 'Authentication failed. Try again.', 'error');
    }
}

function showFormMessage(message, text, type) {
    if (!message) return;
    message.hidden = false;
    message.textContent = text;
    message.dataset.type = type;
    if (window.gsap) gsap.fromTo(message, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' });
}

function animateAuthPage() {
    if (!window.gsap) return;
    gsap.fromTo(['.auth-header', '.auth-showcase', '.auth-card'], { opacity: 0, y: 24, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.08, ease: 'power3.out' });
    animatePreviewAnalytics();
}

function animatePreviewAnalytics() {
    document.querySelectorAll('.motion-line').forEach((line, index) => {
        const length = line.getTotalLength();
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(line, { strokeDashoffset: 0, duration: 1.15, delay: 0.35 + index * 0.16, ease: 'power3.out' });
    });
    gsap.fromTo('.motion-chart, .pie-card, .bar-card', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, delay: 0.28, ease: 'power3.out' });
    document.querySelectorAll('.pie-segment').forEach((segment, index) => {
        const targetOffset = segment.classList.contains('pie-secondary') ? -56 : segment.classList.contains('pie-tertiary') ? -86 : 0;
        gsap.fromTo(segment, { strokeDashoffset: 100 }, { strokeDashoffset: targetOffset, duration: 1, delay: 0.45 + index * 0.1, ease: 'power3.out' });
    });
    gsap.to('.pie-chart', { rotate: 360, transformOrigin: '50% 50%', duration: 18, repeat: -1, ease: 'none' });
    gsap.fromTo('.moving-bar i', { scaleX: 0.18 }, { scaleX: 1, duration: 1.25, stagger: 0.13, delay: 0.48, ease: 'power3.out' });
    gsap.to('.moving-bar i', { scaleX: () => gsap.utils.random(0.54, 1), duration: () => gsap.utils.random(1.2, 1.9), delay: 1.7, repeat: -1, yoyo: true, stagger: 0.18, ease: 'sine.inOut' });
    gsap.to('.pulse-dot', { scale: 1.35, opacity: 0.48, transformOrigin: '50% 50%', duration: 0.85, repeat: -1, yoyo: true, stagger: 0.16, ease: 'sine.inOut' });
}