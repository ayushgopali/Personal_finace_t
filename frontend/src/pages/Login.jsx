import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Login — React port of login.html + login.js.
// Same UI, same endpoints, same switch-mode (?switch=1) behavior.
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const { notify } = useToast();
  const isSwitchMode = searchParams.get('switch') === '1';

  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '', visible: false });
  const [oauthLabel, setOauthLabel] = useState('Continue with OAuth2');
  const [providerMark, setProviderMark] = useState('G');
  const [oauthReady, setOauthReady] = useState(false);

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
    // Intro animation parity (gsap CDN in legacy; guarded here too).
    import('gsap').then(({ default: gsap }) => {
      if (cancelled || !window) return;
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

  const showFormMessage = (text, type) => setMessage({ text, type, visible: true });

  const toggleMode = () => {
    const next = authMode === 'login' ? 'signup' : 'login';
    setAuthMode(next);
    setMessage({ text: '', type: '', visible: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authMode === 'signup') {
      // Matches legacy: signup fields are not present in this UI, so the
      // legacy handler reports incomplete fields. Preserve the message.
      showFormMessage('Complete all signup fields.', 'error');
      return;
    }
    const displayName = username.trim();
    if (!displayName || !password) {
      showFormMessage('Enter your display name and password.', 'error');
      return;
    }
    showFormMessage('Logging in...', 'info');
    try {
      const { ok, data } = await api.passwordLogin({ displayName, password });
      if (!ok || !data.success) {
        showFormMessage(data.error || 'Could not continue.', 'error');
        return;
      }
      showFormMessage(data.message || 'Welcome back.', 'success');
      await refresh();
      window.setTimeout(() => navigate('/', { replace: true }), 450);
    } catch {
      showFormMessage('Authentication failed. Try again.', 'error');
    }
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

  const isSignup = authMode === 'signup';

  return (
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
          <p>Continue with your secure account to sync Spendora, protect your profile, and keep your dashboard personal.</p>

          <form className="login-form" id="passwordLoginForm" data-auth-mode={authMode} onSubmit={handleSubmit}>
            <label htmlFor="loginUsername">Username</label>
            <input
              type="text"
              id="loginUsername"
              autoComplete="username"
              placeholder={isSignup ? 'Choose display name' : 'Enter username'}
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
            />

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

            <p className="auth-form-message" id="authFormMessage" role="status" aria-live="polite" hidden={!message.visible} data-type={message.type || undefined}>
              {message.text}
            </p>

            <button className="login-submit" type="submit">{isSignup ? 'Create account' : 'Login'}</button>
            <button className="signup-link" id="signupButton" type="button" onClick={toggleMode}>
              {isSignup ? 'Already have an account? Log in' : 'Sign up'}
            </button>

            <div className="auth-divider"><span>or</span></div>

            <button className={`oauth-button${oauthReady ? '' : ' is-disabled'}`} id="oauthButton" type="button" onClick={handleOAuth}>
              <span className="provider-mark" aria-hidden="true">{providerMark}</span>
              <span id="oauthButtonText">{oauthLabel}</span>
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
