import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useGreeting } from '../../hooks/useExpenses';
import Sidebar from '../navigation/Sidebar';
import Topbar from '../navigation/Topbar';
import BottomNavigation from '../navigation/BottomNavigation';
import LogoutWarning from '../navigation/LogoutWarning';

// AppShell — shared application layout: sidebar, topbar, page content,
// responsive bottom navigation, and the logout flow.
export default function AppShell({ children, mainId, mainClass = 'main-area', activeRail }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const greeting = useGreeting(isAuthenticated ? user.name : '');
  const [openPanel, setOpenPanel] = useState(null); // 'notification' | 'message' | 'profile' | null
  const [logoutWarning, setLogoutWarning] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      <Sidebar activeRail={activeRail} onLogout={requestLogout} />

      <main className={mainClass} id={mainId}>
        <Topbar
          greeting={greeting}
          user={user}
          isAuthenticated={isAuthenticated}
          displayName={displayName}
          initial={initial}
          openPanel={openPanel}
          onTogglePanel={togglePanel}
          onLogin={() => { setOpenPanel(null); navigate('/login'); }}
          onSwitchMode={() => { setOpenPanel(null); navigate('/switch-user-mode'); }}
        />

        {children}
      </main>

      <BottomNavigation
        activeRail={activeRail}
        openPanel={openPanel}
        onToggleProfile={() => togglePanel('profile')}
        onLogout={requestLogout}
      />

      <div className={`menu-backdrop${openPanel ? ' is-open' : ''}`} id="menuBackdrop" aria-hidden="true" onClick={() => setOpenPanel(null)} />

      <LogoutWarning
        open={logoutWarning}
        busy={loggingOut}
        onSwitch={() => navigate('/login?switch=1')}
        onConfirm={confirmLogout}
        onClose={() => setLogoutWarning(false)}
      />
    </div>
  );
}
