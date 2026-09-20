import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login({ defaultMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const { notify } = useToast();
  const isSwitchMode = searchParams.get('switch') === '1';

  const initialMode = defaultMode || (location.pathname === '/signup' ? 'signup' : 'login');
  const [authMode, setAuthMode] = useState(initialMode);
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
    if (location.pathname === '/signup') {
      setAuthMode('signup');
    } else if (location.pathname === '/login') {
      setAuthMode('login');
    }
  }, [location.pathname]);

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
          ['.spendora-top-navbar', '.spendora-form-card', '.spendora-showcase-card'],
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }
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

  const switchToSignup = (e) => {
    e?.preventDefault();
    setAuthMode('signup');
    setMessage({ text: '', type: '', visible: false });
    navigate('/signup');
  };

  const switchToLogin = (e) => {
    e?.preventDefault();
    setAuthMode('login');
    setMessage({ text: '', type: '', visible: false });
    navigate('/login');
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
      <main className="spendora-auth-screen">
        {/* Top Navigation Bar */}
        <nav className="spendora-top-navbar" aria-label="Authentication and site navigation">
          <Link className="spendora-brand-link" to="/" title="Spendora Home">
            <div className="spendora-logo-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#15803d" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className="spendora-brand-text">
              <strong className="spendora-brand-title">SPENDORA</strong>
              <span className="spendora-brand-subtitle">SECURE EXPENSE WORKSPACE</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="spendora-nav-links">
            <Link to="/" className="spendora-nav-link">Dashboard</Link>
            <Link to="/analytics" className="spendora-nav-link">Analytics</Link>
            <Link to="/wallet" className="spendora-nav-link">Wallet</Link>
            <Link to="/transactions" className="spendora-nav-link">Transactions</Link>
            <Link to="/categories" className="spendora-nav-link">Categories</Link>
          </div>

          {/* Navigation Actions */}
          <div className="spendora-nav-actions">
            <div className="spendora-auth-toggle-group" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={`spendora-nav-tab${!isSignup ? ' active' : ''}`}
                onClick={switchToLogin}
                role="tab"
                aria-selected={!isSignup}
              >
                Log in
              </button>
              <button
                type="button"
                className={`spendora-nav-tab${isSignup ? ' active' : ''}`}
                onClick={switchToSignup}
                role="tab"
                aria-selected={isSignup}
              >
                Sign up
              </button>
            </div>
            <Link className="spendora-back-btn" to="/">
              Back to dashboard
            </Link>
          </div>
        </nav>

        {/* Auth Content Grid */}
        <div className="spendora-auth-content">
          {/* Left Column: Form Card */}
          <section className="spendora-form-card" aria-labelledby="spendoraAuthTitle">
            <span className="spendora-kicker-tag">ACCOUNT ACCESS</span>
            <h1 id="spendoraAuthTitle" className="spendora-auth-title">
              {isSignup ? 'Sign up' : 'Log in'}
            </h1>
            <p className="spendora-auth-desc">
              {isSignup
                ? 'Create an account to sync your accounts, track spend against budget, and keep your financial data private.'
                : 'Sign in to sync your accounts, track spend against budget, and keep your financial data private.'}
            </p>

            <form className="spendora-form" onSubmit={handleSubmit} noValidate>
              {isSignup && (
                <div className="spendora-form-row-2">
                  <div className="spendora-field-group">
                    <label htmlFor="signupFirstName">First name</label>
                    <input
                      type="text"
                      id="signupFirstName"
                      autoComplete="given-name"
                      placeholder="Enter first name"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="spendora-field-group">
                    <label htmlFor="signupSecondName">Second name</label>
                    <input
                      type="text"
                      id="signupSecondName"
                      autoComplete="family-name"
                      placeholder="Enter second name"
                      required
                      value={secondName}
                      onChange={e => setSecondName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="spendora-field-group">
                <label htmlFor="authDisplayName">Display name</label>
                <input
                  type="text"
                  id="authDisplayName"
                  autoComplete="username"
                  placeholder={isSignup ? 'Choose display name' : 'Enter display name'}
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>

              {isSignup && (
                <div className="spendora-field-group">
                  <label htmlFor="authEmail">Email address</label>
                  <input
                    type="email"
                    id="authEmail"
                    autoComplete="email"
                    placeholder="Enter email address"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              )}

              <div className="spendora-field-group">
                <div className="spendora-label-row">
                  <label htmlFor="authPassword">Password</label>
                  {!isSignup && (
                    <button type="button" className="spendora-forgot-link" onClick={handleForgot}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="spendora-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="authPassword"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    placeholder={isSignup ? 'Create password' : 'Enter password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="spendora-eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(s => !s)}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {isSignup && (
                <div className="spendora-field-group">
                  <label htmlFor="authConfirmPassword">Confirm password</label>
                  <div className="spendora-input-wrap">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="authConfirmPassword"
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="spendora-eye-btn"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirmPassword(s => !s)}
                    >
                      {showConfirmPassword ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {message.visible && (
                <p className="spendora-form-feedback" data-type={message.type || 'info'} role="status">
                  {message.text}
                </p>
              )}

              <button type="submit" className="spendora-btn-submit">
                {isSignup ? 'Create account' : 'Log in'}
              </button>

              <div className="spendora-switch-wrap">
                {isSignup ? (
                  <>
                    <span>Already have an account? </span>
                    <button type="button" className="spendora-switch-link" onClick={switchToLogin}>
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    <span>New here? </span>
                    <button type="button" className="spendora-switch-link" onClick={switchToSignup}>
                      Create an account
                    </button>
                  </>
                )}
              </div>

              {!isSignup && (
                <>
                  <div className="spendora-divider">
                    <span>or</span>
                  </div>
                  <button
                    type="button"
                    className={`spendora-oauth-btn${oauthReady ? '' : ' is-disabled'}`}
                    onClick={handleOAuth}
                  >
                    <span className="spendora-oauth-icon-badge" aria-hidden="true">
                      {providerMark === 'G' ? (
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path fill="#EA4335" d="M12 5c1.56 0 2.96.54 4.07 1.43l3.05-3.05C17.27 1.63 14.81 1 12 1 7.37 1 3.42 3.65 1.54 7.51l3.66 2.84C6.07 7.55 8.79 5 12 5z" />
                          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.16-1.99 3.71-4.92 3.71-8.7z" />
                          <path fill="#FBBC05" d="M5.2 14.65c-.25-.74-.39-1.54-.39-2.35s.14-1.61.39-2.35L1.54 7.51C.56 9.47 0 11.67 0 14s.56 4.53 1.54 6.49l3.66-2.84z" />
                          <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.07.72-2.44 1.15-4.22 1.15-3.21 0-5.93-2.55-6.8-5.35L1.54 15.85C3.42 20.35 7.37 23 12 23z" />
                        </svg>
                      ) : (
                        <span className="oauth-letter-mark">{providerMark}</span>
                      )}
                    </span>
                    <span className="spendora-oauth-label">{oauthLabel}</span>
                  </button>
                </>
              )}
            </form>
          </section>

          {/* Right Column: Showcase Card */}
          <section className="spendora-showcase-card" aria-label="Spendora monthly insights preview">
            <div className="showcase-top-row">
              <span className="showcase-section-title">MONTHLY SPEND TREND</span>
              <div className="showcase-trending-pill">
                <span className="trending-arrow">▲</span>
                <span>Trending up</span>
              </div>
            </div>

            <div className="showcase-charts-body">
              {/* Left chart: Trend & Candlestick */}
              <div className="showcase-candlestick-area">
                <svg viewBox="0 0 400 190" className="showcase-candlestick-svg" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15803d" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#15803d" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="15" y1="40" x2="385" y2="40" stroke="#f0f3ee" strokeWidth="1" />
                  <line x1="15" y1="85" x2="385" y2="85" stroke="#f0f3ee" strokeWidth="1" />
                  <line x1="15" y1="130" x2="385" y2="130" stroke="#f0f3ee" strokeWidth="1" />
                  <line x1="15" y1="165" x2="385" y2="165" stroke="#e8ece5" strokeWidth="1" />

                  {/* Shaded Area under trend line */}
                  <path
                    d="M 28 142 L 80 134 L 138 112 L 194 100 L 250 80 L 306 60 L 368 44 L 368 165 L 28 165 Z"
                    fill="url(#spendGradient)"
                  />

                  {/* Trend line */}
                  <path
                    d="M 28 142 L 80 134 L 138 112 L 194 100 L 250 80 L 306 60 L 368 44"
                    fill="none"
                    stroke="#166534"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Candlesticks: (wick line + box) */}
                  {/* MAR (Green) */}
                  <line x1="45" y1="122" x2="45" y2="152" stroke="#15803d" strokeWidth="1.5" />
                  <rect x="41" y="128" width="8" height="18" fill="#15803d" rx="1" />

                  {/* APR (Red) */}
                  <line x1="98" y1="116" x2="98" y2="148" stroke="#dc2626" strokeWidth="1.5" />
                  <rect x="94" y="122" width="8" height="18" fill="#dc2626" rx="1" />

                  {/* MAY (Green) */}
                  <line x1="154" y1="94" x2="154" y2="132" stroke="#15803d" strokeWidth="1.5" />
                  <rect x="150" y="102" width="8" height="22" fill="#15803d" rx="1" />

                  {/* JUN (Red) */}
                  <line x1="210" y1="84" x2="210" y2="120" stroke="#dc2626" strokeWidth="1.5" />
                  <rect x="206" y="92" width="8" height="18" fill="#dc2626" rx="1" />

                  {/* JUL (Green) */}
                  <line x1="264" y1="64" x2="264" y2="102" stroke="#15803d" strokeWidth="1.5" />
                  <rect x="260" y="72" width="8" height="20" fill="#15803d" rx="1" />

                  {/* AUG (Green) */}
                  <line x1="318" y1="46" x2="318" y2="86" stroke="#15803d" strokeWidth="1.5" />
                  <rect x="314" y="52" width="8" height="22" fill="#15803d" rx="1" />

                  {/* Month text labels */}
                  <text x="28" y="180" className="chart-month-label">MAR</text>
                  <text x="80" y="180" className="chart-month-label">APR</text>
                  <text x="138" y="180" className="chart-month-label">MAY</text>
                  <text x="194" y="180" className="chart-month-label">JUN</text>
                  <text x="250" y="180" className="chart-month-label">JUL</text>
                  <text x="306" y="180" className="chart-month-label">AUG</text>
                  <text x="362" y="180" className="chart-month-label">SEP</text>
                </svg>
              </div>

              {/* Right chart: Category Donut */}
              <div className="showcase-donut-area">
                <span className="donut-section-title">SPEND BY CATEGORY</span>
                <div className="donut-chart-box">
                  <svg viewBox="0 0 90 90" className="category-donut-svg">
                    {/* Radius = 30, Circumference = 188.49 */}
                    {/* Bills: 46% (86.7), Food: 28% (52.8), Travel: 14% (26.4), Other: 12% (22.6) */}
                    {/* Segment 1: Bills (#1e5e3a) */}
                    <circle
                      cx="45" cy="45" r="30"
                      fill="transparent"
                      stroke="#1e5e3a"
                      strokeWidth="12"
                      strokeDasharray="86.7 188.5"
                      strokeDashoffset="0"
                      transform="rotate(-90 45 45)"
                    />
                    {/* Segment 2: Food (#9c7a3c) */}
                    <circle
                      cx="45" cy="45" r="30"
                      fill="transparent"
                      stroke="#a38237"
                      strokeWidth="12"
                      strokeDasharray="52.8 188.5"
                      strokeDashoffset="-86.7"
                      transform="rotate(-90 45 45)"
                    />
                    {/* Segment 3: Travel (#b9473b) */}
                    <circle
                      cx="45" cy="45" r="30"
                      fill="transparent"
                      stroke="#b9473b"
                      strokeWidth="12"
                      strokeDasharray="26.4 188.5"
                      strokeDashoffset="-139.5"
                      transform="rotate(-90 45 45)"
                    />
                    {/* Segment 4: Other (#9ca3af) */}
                    <circle
                      cx="45" cy="45" r="30"
                      fill="transparent"
                      stroke="#9ca3af"
                      strokeWidth="12"
                      strokeDasharray="22.6 188.5"
                      strokeDashoffset="-165.9"
                      transform="rotate(-90 45 45)"
                    />
                  </svg>
                </div>

                {/* Donut Legend */}
                <div className="donut-legend-list">
                  <div className="legend-item">
                    <span className="legend-dot dot-bills" />
                    <span>Bills</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot dot-food" />
                    <span>Food</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot dot-travel" />
                    <span>Travel</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot dot-other" />
                    <span>Other</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Trend Legend */}
            <div className="showcase-bottom-legend">
              <div className="bottom-legend-item">
                <span className="legend-dot dot-inflow" />
                <span>Net inflow days</span>
              </div>
              <div className="bottom-legend-item">
                <span className="legend-dot dot-outflow" />
                <span>Net outflow days</span>
              </div>
              <div className="bottom-legend-item">
                <span className="legend-dot dot-budget" />
                <span>Budget line</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Verification modal for Passkey */}
      {verifyOpen && (
        <div className="spendora-modal-overlay" id="emailVerifyOverlay" onClick={(e) => { if (e.target.id === 'emailVerifyOverlay') setVerifyOpen(false); }}>
          <section className="spendora-modal-card" role="dialog" aria-modal="true" aria-labelledby="verifyTitle">
            <button type="button" className="spendora-modal-close" aria-label="Close verification" onClick={() => setVerifyOpen(false)}>×</button>
            <span className="spendora-kicker-tag">SECURE CHECK</span>
            <h2 id="verifyTitle" className="spendora-modal-title">Verify email address</h2>
            <p className="spendora-modal-desc">Confirm this email with your device fingerprint or passkey before creating your Spendora account.</p>
            <div className="spendora-modal-email-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <strong>{verifyEmail || 'email@example.com'}</strong>
            </div>
            <button type="button" className="spendora-btn-submit modal-action-btn" onClick={verifyWithPasskey}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                <path d="M14 13.5a3 3 0 0 0-3-3" />
                <path d="M17 19.8a10 10 0 0 1-5 1.2" />
                <path d="M12 17a5 5 0 0 0 5-5v-.5" />
              </svg>
              <span>Verify with fingerprint or passkey</span>
            </button>
            {verifyMessage.visible && (
              <p className="spendora-form-feedback modal-feedback" data-type={verifyMessage.type || 'info'} role="status">
                {verifyMessage.text}
              </p>
            )}
          </section>
        </div>
      )}
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
