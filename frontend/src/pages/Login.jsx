import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Login — React port of the LIVE login.html + login.js.
// Same UI (including the full signup form + passkey verification modal),
// same endpoints, same switch-mode (?switch=1) behavior.
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const { notify } = useToast();
  const isSwitchMode = searchParams.get('switch') === '1';

  const [authMode, setAuthMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '', visible: false });
  const [oauthLabel, setOauthLabel] = useState('Continue with OAuth2');
  const [providerMark, setProviderMark] = useState('G');
  const [oauthReady, setOauthReady] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyMessage, setVerifyMessage] = useState({ text: '', type: '', visible: false });
  const [pendingSignup, setPendingSignup] = useState(null);

  const isSignup = authMode === 'signup';

  useEffect(() => {
    document.body.classList.remove('theme-dark');
    let cancelled = false;
    (async () => {
      try {
        const auth = await api.oauthStatus();
        if (cancelled) return;
        const provider = auth.providerName || 'OAuth2';
        setOauthLabel(
          isSwitchMode
            ? `Switch ${provider.toLowerCase() === 'google' ? 'Google' : provider} account`
            : provider.toLowerCase() === 'google'
              ? 'Continue with Google'
              : `Continue with ${provider}`
        );
        setProviderMark(provider.toLowerCase() === 'google' ? 'G' : provider.charAt(0).toUpperCase());
        setOauthReady(Boolean(auth.configured));
      } catch {
        setOauthReady(false);
      }
    })();
    import('gsap').then(({ default: gsap }) => {
      if (cancelled) return;
      try {
        gsap.fromTo(
          ['.auth-header', '.auth-showcase', '.auth-card'],
          { opacity: 0, y: 24, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.08, ease: 'power3.out' }
        );
      } catch { /* ignore */ }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSwitchMode]);

  useEffect(() => {
    if (!verifyOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setVerifyOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [verifyOpen]);

  const showFormMessage = (text, type) => setMessage({ text, type, visible: true });
  const showVerifyMessage = (text, type) => setVerifyMessage({ text, type, visible: true });

  const toggleMode = () => {
    setAuthMode(prev => (prev === 'login' ? 'signup' : 'login'));
    setMessage({ text: '', type: '', visible: false });
  };

  const getLoginPayload = () => ({
    displayName: username.trim(),
    password
  });

  const submitPasswordAuth = async (path, pendingText, payload, onSuccess) => {
    if ((!payload.displayName && !payload.username) || !payload.password) {
      showFormMessage('Enter your display name and password.', 'error');
      return;
    }
    showFormMessage(pendingText, 'info');
    try {
      const res = await fetch(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const result = await readAuthJson(res);
      if (!res.ok || !result.success) {
        showFormMessage(result.error || 'Could not continue.', 'error');
        return;
      }
      showFormMessage(result.message || 'Welcome back.', 'success');
      onSuccess?.();
      await refresh();
      window.setTimeout(() => navigate('/', { replace: true }), 450);
    } catch {
      showFormMessage('Authentication failed. Try again.', 'error');
    }
  };

  const submitSignup = () => {
    const payload = {
      firstName: firstName.trim(),
      secondName: secondName.trim(),
      displayName: username.trim(),
      email: email.trim(),
      password,
      confirmPassword
    };
    if (!payload.firstName || !payload.secondName || !payload.displayName || !payload.email || !payload.password || !payload.confirmPassword) {
      showFormMessage('Complete all signup fields.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      showFormMessage('Enter a valid email address.', 'error');
      return;
    }
    if (payload.password.length < 6) {
      showFormMessage('Password must be at least 6 characters.', 'error');
      return;
    }
    if (payload.password !== payload.confirmPassword) {
      showFormMessage('Passwords do not match.', 'error');
      return;
    }
    setPendingSignup(payload);
    setVerifyEmail(payload.email);
    setVerifyMessage({ text: '', type: '', visible: false });
    setVerifyOpen(true);
  };

  const verifyWithPasskey = async () => {
    if (!pendingSignup) return;
    if (!window.PublicKeyCredential || !navigator.credentials?.create) {
      showVerifyMessage('Passkey or fingerprint verification is not available on this device.', 'error');
      return;
    }
    showVerifyMessage('Preparing secure verification...', 'info');
    try {
      const res = await fetch('/api/auth/signup-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          displayName: pendingSignup.displayName,
          email: pendingSignup.email
        })
      });
      const challengeData = await readAuthJson(res);
      if (!res.ok || !challengeData.success) throw new Error(challengeData.error || 'Could not prepare verification.');
      showVerifyMessage('Waiting for fingerprint or passkey...', 'info');
      const credential = await navigator.credentials.create({
        publicKey: toPublicKeyCreationOptions(challengeData.options)
      });
      if (!credential) throw new Error('No credential returned.');
      setVerifyOpen(false);
      await submitPasswordAuth('/auth/signup', 'Passkey verified. Creating account...', {
        ...pendingSignup,
        challengeId: challengeData.challengeId,
        credential: credentialToJSON(credential)
      }, () => {
        setPendingSignup(null);
      });
    } catch (error) {
      showVerifyMessage(error.message || 'Passkey verification was cancelled or failed.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignup) {
      submitSignup();
      return;
    }
    await submitPasswordAuth('/auth/password-login', 'Logging in...', getLoginPayload());
  };

  const handleForgot = async () => {
    const value = username.trim();
    if (!value) {
      showFormMessage('Enter your display name first.', 'error');
      return;
    }
    showFormMessage('Checking account...', 'info');
    try {
      const { ok, data } = await api.forgotPassword({ displayName: value });
      showFormMessage(data.message || data.error, ok ? 'success' : 'error');
    } catch {
      showFormMessage('Authentication failed. Try again.', 'error');
    }
  };

  const handleOAuth = () => {
    if (!oauthReady) {
      notify('OAuth is not configured on the server.', 'info');
      return;
    }
    window.location.href = isSwitchMode ? '/auth/login?switch=1' : '/auth/login';
  };

  return (
    <>
      <main className="auth-page">
        <nav className="auth-header" aria-label="Authentication navigation">
          <Link className="auth-brand" to="/">
            <span className="logo-mark auth-logo"><span /><span /><span /><span /></span>
            <span>
              <strong className="brand-word">Spendora</strong>
              <small>Secure expense workspace</small>
            </span>
          </Link>
          <Link className="auth-back" to="/">Back to dashboard</Link>
        </nav>

        <section className="auth-grid">
          <div className="auth-showcase" aria-label="Spendora preview">
            <div className="auth-mini-window">
              <div className="auth-analytics-board">
                <div className="motion-chart">
                  <svg viewBox="0 0 420 190" role="img" aria-label="Animated spending graph">
                    <line x1="18" x2="402" y1="46" y2="46" />
                    <line x1="18" x2="402" y1="92" y2="92" />
                    <line x1="18" x2="402" y1="138" y2="138" />
                    <path className="motion-line motion-line-primary" d="M18 140 C64 86 106 126 150 98 C202 62 240 72 284 44 C336 12 360 58 402 34" />
                    <path className="motion-line motion-line-secondary" d="M18 112 C66 126 110 72 154 82 C202 94 234 150 284 122 C330 94 362 124 402 88" />
                    <circle className="pulse-dot" cx="284" cy="44" r="5" />
                    <circle className="pulse-dot secondary" cx="154" cy="82" r="4" />
                  </svg>
                </div>

                <div className="analytics-bottom">
                  <div className="pie-card">
                    <svg className="pie-chart" viewBox="0 0 120 120" aria-label="Category split">
                      <circle className="pie-track" cx="60" cy="60" r="40" />
                      <circle className="pie-segment pie-primary" cx="60" cy="60" r="40" pathLength="100" />
                      <circle className="pie-segment pie-secondary" cx="60" cy="60" r="40" pathLength="100" />
                      <circle className="pie-segment pie-tertiary" cx="60" cy="60" r="40" pathLength="100" />
                    </svg>
                  </div>
                  <div className="bar-card">
                    <span className="moving-bar"><i /></span>
                    <span className="moving-bar"><i /></span>
                    <span className="moving-bar"><i /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="auth-card" aria-labelledby="authTitle">
            <h1 id="authTitle">{isSignup ? 'Sign up' : 'Log in'}</h1>
            <p id="authIntro">
              {isSignup
                ? 'Create your secure Spendora account with your name, display name, email, and password.'
                : 'Continue with your secure account to sync Spendora, protect your profile, and keep your dashboard personal.'}
            </p>

            <form className="login-form" id="passwordLoginForm" data-auth-mode={authMode} onSubmit={handleSubmit}>
              <div className="signup-name-grid" id="signupNameFields" hidden={!isSignup}>
                <label className="auth-field" htmlFor="signupFirstName">
                  <span>First name</span>
                  <input
                    type="text"
                    id="signupFirstName"
                    autoComplete="given-name"
                    placeholder="Enter first name"
                    required={isSignup}
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </label>
                <label className="auth-field" htmlFor="signupSecondName">
                  <span>Second name</span>
                  <input
                    type="text"
                    id="signupSecondName"
                    autoComplete="family-name"
                    placeholder="Enter second name"
                    required={isSignup}
                    value={secondName}
                    onChange={e => setSecondName(e.target.value)}
                  />
                </label>
              </div>

              <label className="auth-field" htmlFor="loginUsername">
                <span id="displayNameLabel">Display name</span>
                <input
                  type="text"
                  id="loginUsername"
                  autoComplete="username"
                  placeholder={isSignup ? 'Choose display name' : 'Enter display name'}
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </label>

              <label className="auth-field" htmlFor="signupEmail" id="signupEmailField" hidden={!isSignup}>
                <span>Email address</span>
                <input
                  type="email"
                  id="signupEmail"
                  autoComplete="email"
                  placeholder="Enter email address"
                  required={isSignup}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>

              <div className="password-label-row">
                <label htmlFor="loginPassword">Password</label>
                {!isSignup ? (
                  <button type="button" id="forgotPasswordBtn" onClick={handleForgot}>Forgot password?</button>
                ) : null}
              </div>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="loginPassword"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'Create password' : 'Enter password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  id="togglePassword"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(s => !s)}
                >
                  <span className={`ui-icon ${showPassword ? 'icon-eye-off' : 'icon-eye'}`} aria-hidden="true" />
                </button>
              </div>

              <label className="auth-field" htmlFor="signupConfirmPassword" id="signupConfirmField" hidden={!isSignup}>
                <span>Confirm password</span>
                <div className="password-input-wrap">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="signupConfirmPassword"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    required={isSignup}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    id="toggleConfirmPassword"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword(s => !s)}
                  >
                    <span className={`ui-icon ${showConfirmPassword ? 'icon-eye-off' : 'icon-eye'}`} aria-hidden="true" />
                  </button>
                </div>
              </label>

              <p className="auth-form-message" id="authFormMessage" role="status" aria-live="polite" hidden={!message.visible} data-type={message.type || undefined}>
                {message.text}
              </p>

              <button className="login-submit" id="authSubmitButton" type="submit">{isSignup ? 'Create account' : 'Login'}</button>
              <button className="signup-link" id="signupButton" type="button" onClick={toggleMode}>
                {isSignup ? 'Already have an account? Log in' : 'Sign up'}
              </button>

              {!isSignup ? (
                <>
                  <div className="auth-divider" id="oauthDivider"><span>or</span></div>
                  <button className={`oauth-button${oauthReady ? '' : ' is-disabled'}`} id="oauthButton" type="button" onClick={handleOAuth}>
                    <span className="provider-mark" aria-hidden="true">{providerMark}</span>
                    <span id="oauthButtonText">{oauthLabel}</span>
                  </button>
                </>
              ) : null}
            </form>
          </section>
        </section>
      </main>

      {verifyOpen ? (
        <div className="auth-verify-overlay" id="emailVerifyOverlay" onClick={(e) => { if (e.target.id === 'emailVerifyOverlay') setVerifyOpen(false); }}>
          <section className="auth-verify-modal" role="dialog" aria-modal="true" aria-labelledby="verifyTitle">
            <button type="button" className="auth-verify-close" id="verifyCloseBtn" aria-label="Close verification" onClick={() => setVerifyOpen(false)}>×</button>
            <span className="verify-pill">Secure check</span>
            <h2 id="verifyTitle">Verify email address</h2>
            <p>Confirm this email with your device fingerprint or passkey before creating your Spendora account.</p>
            <div className="verify-email-row">
              <span className="ui-icon icon-mail" aria-hidden="true" />
              <strong id="verifyEmailText">{verifyEmail || 'email@example.com'}</strong>
            </div>
            <button type="button" className="login-submit verify-passkey-button" id="verifyPasskeyBtn" onClick={verifyWithPasskey}>
              <span className="ui-icon icon-fingerprint" aria-hidden="true" />
              Verify with fingerprint or passkey
            </button>
            <p className="auth-form-message verify-message" id="verifyMessage" role="status" aria-live="polite" hidden={!verifyMessage.visible} data-type={verifyMessage.type || undefined}>
              {verifyMessage.text}
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}

async function readAuthJson(response) {
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();
  if (!contentType.includes('application/json')) {
    throw new Error('The auth server returned a page instead of JSON. Restart the Spendora server and try again.');
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('The auth server returned invalid JSON. Restart the Spendora server and try again.');
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

function toPublicKeyCreationOptions(options) {
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
