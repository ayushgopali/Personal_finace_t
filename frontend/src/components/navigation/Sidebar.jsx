import { useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

// DesktopNavigation — the desktop side rail (logo, primary nav, logout).
// Same markup/classes as the legacy side-rail; liquid indicator preserved.
export default function Sidebar({ activeRail, onLogout }) {
  const location = useLocation();
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

  return (
    <aside className="side-rail liquid-rail-ready" aria-label="Dashboard navigation">
      <Link className="sidebar-brand-logo" to="/" aria-label="Spendora Dashboard">
        <div className="spendora-logo-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#15803d" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
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
      <button className="rail-button danger" id="logoutBtn" title="Logout" aria-label="Logout" onClick={onLogout}>
        <span className="ui-icon icon-logout" />
      </button>
    </aside>
  );
}
