import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGreeting } from '../hooks/useExpenses';

// Shared shell reproducing index.html/analytics.html/... layout exactly:
// same class names, same DOM order, same CSS. Navigation converted to
// React Router links with identical destinations/meaning.
export default function AppShell({ children, mainId, mainClass = 'main-area', activeRail }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const greeting = useGreeting(isAuthenticated ? user.name : '');
  const [openPanel, setOpenPanel] = useState(null); // 'notification' | 'message' | 'profile' | null
  const [logoutWarning, setLogoutWarning] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Liquid-glass rail indicator (parity with initLiquidGlassNav in app.js):
  // same .rail-indicator element + placement; motion via CSS transition.
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  const placeIndicator = (element) => {
    if (!element) return;
    setIndicator({
      x: element.offsetLeft,
      y: element.offsetTop,
      w: element.offsetWidth,
      h: element.offsetHeight
    });
  };
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector('.rail-button.active:not(.danger)') || nav.querySelector('.rail-button:not(.danger)');
    placeIndicator(active);
    const onResize = () => {
      const current = nav.querySelector('.rail-button.active:not(.danger)') || nav.querySelector('.rail-button:not(.danger)');
      placeIndicator(current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [location.pathname]);

  const displayName = user.name || 'Pranav';
  const initial = (displayName.trim().charAt(0).toUpperCase() || 'P');

  useEffect(() => {
    setOpenPanel(null);
    setLogoutWarning(false);
  }, [location.pathname]);

  // Entrance choreography parity with initPremiumAnimations in app.js.
  // Guarded progressive enhancement: content is fully visible without it.
  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ default: gsap }) => {
      if (cancelled) return;
      try {
        const targets = document.querySelectorAll('.side-rail, .greeting, .top-actions, .metric-card, .panel');
        if (!targets.length) return;
        gsap.fromTo(
          targets,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }
        );
      } catch { /* ignore */ }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!openPanel) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenPanel(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openPanel ]);

  const togglePanel = (name) => setOpenPanel(prev => (prev === name ? null : name));

  const requestLogout = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isAuthenticated) {
      notify('You are already logged out.', 'info');
      return;
    }
    setOpenPanel(null);
    setLogoutWarning(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      const result = await logout();
      setLogoutWarning(false);
      notify(result.message || 'Logged out successfully', 'success');
      setOpenPanel('profile');
    } catch (error) {
      notify('Logout failed: ' + error.message, 'error');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className="side-rail liquid-rail-ready" aria-label="Dashboard navigation">
        <Link className="logo-mark" to="/" aria-label="Expense tracker">
          <span /><span /><span /><span />
        </Link>
        <nav
          className="rail-nav"
          aria-label="Main navigation"
          ref={navRef}
          onMouseOver={(e) => {
            const btn = e.target.closest('.rail-button:not(.danger)');
            if (btn && navRef.current?.contains(btn)) placeIndicator(btn);
          }}
          onMouseLeave={() => {
            const active = navRef.current?.querySelector('.rail-button.active:not(.danger)');
            placeIndicator(active);
          }}
        >
          {indicator ? (
            <span
              className="rail-indicator"
              aria-hidden="true"
              style={{
                transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
                width: indicator.w,
                height: indicator.h,
                transition: 'transform 0.34s ease, width 0.34s ease, height 0.34s ease'
              }}
            />
          ) : null}
          <NavLink to="/" end className={({ isActive }) => (isActive || activeRail === 'dashboard' ? 'rail-button active' : 'rail-button')} title="Dashboard" aria-label="Dashboard">
            <span className="ui-icon icon-grid" />
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive || activeRail === 'analytics' ? 'rail-button active' : 'rail-button')} title="Analytics" aria-label="Analytics">
            <span className="ui-icon icon-chart" />
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => (isActive || activeRail === 'wallet' ? 'rail-button active' : 'rail-button')} title="Wallet" aria-label="Wallet">
            <span className="ui-icon icon-wallet" />
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => (isActive || activeRail === 'search' ? 'rail-button active' : 'rail-button')} title="Search" aria-label="Search expenses">
            <span className="ui-icon icon-search" />
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => (isActive || activeRail === 'categories' ? 'rail-button active' : 'rail-button')} title="Categories" aria-label="Categories">
            <span className="ui-icon icon-list" />
          </NavLink>
        </nav>
        <div className="rail-spacer" />
        <button className="rail-button danger" id="logoutBtn" title="Logout" aria-label="Logout" onClick={requestLogout}>
          <span className="ui-icon icon-logout" />
        </button>
      </aside>

      <main className={mainClass} id={mainId}>
        <nav className="topbar">
          <div className="greeting">
            <Link className="brand-title-link" to="/" aria-label="Go to dashboard top">
              <h1 className="brand-word">Spendora</h1>
            </Link>
            <p id="timeGreeting">{greeting}</p>
          </div>
          <div className="mobile-top-nav-wrap">
            <nav className="mobile-nav-top-left" aria-label="Sections navigation">
              <NavLink to="/analytics" className={({ isActive }) => `mobile-nav-pill${isActive || activeRail === 'analytics' ? ' active' : ''}`} title="Analytics" aria-label="Analytics">
                <span className="ui-icon icon-chart" aria-hidden="true" />
                <span>Analytics</span>
              </NavLink>
              <NavLink to="/wallet" className={({ isActive }) => `mobile-nav-pill${isActive || activeRail === 'wallet' ? ' active' : ''}`} title="Wallet" aria-label="Wallet">
                <span className="ui-icon icon-wallet" aria-hidden="true" />
                <span>Wallet</span>
              </NavLink>
              <NavLink to="/categories" className={({ isActive }) => `mobile-nav-pill${isActive || activeRail === 'categories' ? ' active' : ''}`} title="Categories" aria-label="Categories">
                <span className="ui-icon icon-list" aria-hidden="true" />
                <span>Categories</span>
              </NavLink>
            </nav>
          </div>
          <div className="top-actions">
            <div className="action-menu">
              <button className="round-action" id="notificationBtn" title="Notifications" aria-expanded={openPanel === 'notification' ? 'true' : 'false'} aria-controls="notificationPanel" onClick={() => togglePanel('notification')}>
                <span className="ui-icon icon-bell" />
              </button>
              <div className={`menu-panel${openPanel === 'notification' ? ' is-open' : ''}`} id="notificationPanel">
                <strong>Notifications</strong>
                <p id="notificationText">Your dashboard is up to date.</p>
              </div>
            </div>
            <div className="action-menu">
              <button className="round-action" id="messageBtn" title="Messages" aria-expanded={openPanel === 'message' ? 'true' : 'false'} aria-controls="messagePanel" onClick={() => togglePanel('message')}>
                <span className="ui-icon icon-mail" />
              </button>
              <div className={`menu-panel${openPanel === 'message' ? ' is-open' : ''}`} id="messagePanel">
                <strong>Messages</strong>
                <p>No messages yet. Expense alerts will appear here.</p>
              </div>
            </div>
            <div className="action-menu">
              <button className={`avatar${isAuthenticated && user.picture ? ' has-photo' : ''}`} id="profileBtn" aria-label="User profile" aria-expanded={openPanel === 'profile' ? 'true' : 'false'} aria-controls="profilePanel" onClick={() => togglePanel('profile')}>
                {isAuthenticated && user.picture ? (
                  <img className="avatar-photo" src={user.picture} alt="" decoding="async" referrerPolicy="no-referrer" />
                ) : null}
                <span className="ui-icon icon-user" id="avatarGuestIcon" aria-hidden="true" hidden={isAuthenticated} />
                <span id="avatarInitial">{isAuthenticated && !user.picture ? initial : ''}</span>
              </button>
              <div className={`menu-panel profile-panel${isAuthenticated ? '' : ' is-signed-out'}${openPanel === 'profile' ? ' is-open' : ''}`} id="profilePanel">
                <strong id="profileName">{isAuthenticated ? displayName : 'Login or sign up'}</strong>
                <p id="profileSubtitle">{isAuthenticated ? (user.email || 'Signed in with OAuth2') : 'Start your Spendora experience and keep your spending secure.'}</p>
                <button type="button" id="profileAddBtn" hidden={!isAuthenticated} onClick={() => { setOpenPanel(null); navigate('/switch-user-mode'); }}>
                  Switch user mode
                </button>
                {!isAuthenticated ? (
                  <button type="button" className="profile-secondary" id="profileLoginBtn" onClick={() => { setOpenPanel(null); navigate('/login'); }}>
                    Login or sign up
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </nav>

        {children}
      </main>

      <nav className="mobile-nav-bottom-center" aria-label="Primary navigation">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-btn${isActive && activeRail === 'dashboard' ? ' active' : ''}`} title="Home" aria-label="Home">
          <span className="ui-icon icon-grid" aria-hidden="true" />
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `mobile-nav-btn${isActive || activeRail === 'search' ? ' active' : ''}`} title="Search" aria-label="Search">
          <span className="ui-icon icon-search" aria-hidden="true" />
        </NavLink>
        <button type="button" className="mobile-nav-btn mobile-profile-btn" id="mobileProfileBtn" title="Profile" aria-label="Profile" aria-expanded={openPanel === 'profile' ? 'true' : 'false'} aria-controls="profilePanel" onClick={() => togglePanel('profile')}>
          <span className="ui-icon icon-user" aria-hidden="true" />
        </button>
      </nav>
      <div className="mobile-nav-bottom-right">
        <button type="button" className="mobile-logout-btn" id="mobileLogoutBtn" title="Logout" aria-label="Logout" onClick={requestLogout}>
          <span className="ui-icon icon-logout" aria-hidden="true" />
        </button>
      </div>

      <div className={`menu-backdrop${openPanel ? ' is-open' : ''}`} id="menuBackdrop" aria-hidden="true" onClick={() => setOpenPanel(null)} />

      {logoutWarning ? (
        <div className="logout-warning-modal" id="logoutWarningModal" role="dialog" aria-modal="true" aria-labelledby="logoutWarningTitle" onClick={(e) => { if (e.target === e.currentTarget) setLogoutWarning(false); }}>
          <div className="logout-warning-card">
            <span className="logout-warning-badge">Warning</span>
            <h2 id="logoutWarningTitle">Log out of Spendora?</h2>
            <p>Choose another account or log out completely. Switching users keeps this session active until a new login finishes.</p>
            <div className="logout-warning-actions">
              <button type="button" className="logout-switch-button" id="logoutSwitchButton" disabled={loggingOut} onClick={() => navigate('/login?switch=1')}>
                Switch user
              </button>
              <button type="button" className="logout-confirm-button" id="logoutConfirmButton" disabled={loggingOut} onClick={confirmLogout}>
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
