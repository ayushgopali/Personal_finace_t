import { NavLink } from 'react-router-dom';

// BottomNavigation — the responsive floating navigation shell
// (bottom-center primary nav + bottom-right logout).
export default function BottomNavigation({ activeRail, openPanel, onToggleProfile, onLogout }) {
  return (
    <>
      <nav className="mobile-nav-bottom-center" aria-label="Primary navigation">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-btn${isActive && activeRail === 'dashboard' ? ' active' : ''}`} title="Home" aria-label="Home">
          <span className="ui-icon icon-grid" aria-hidden="true" />
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `mobile-nav-btn${isActive || activeRail === 'search' ? ' active' : ''}`} title="Search" aria-label="Search">
          <span className="ui-icon icon-search" aria-hidden="true" />
        </NavLink>
        <button type="button" className="mobile-nav-btn mobile-profile-btn" id="mobileProfileBtn" title="Profile" aria-label="Profile" aria-expanded={openPanel === 'profile' ? 'true' : 'false'} aria-controls="profilePanel" onClick={onToggleProfile}>
          <span className="ui-icon icon-user" aria-hidden="true" />
        </button>
      </nav>
      <div className="mobile-nav-bottom-right">
        <button type="button" className="mobile-logout-btn" id="mobileLogoutBtn" title="Logout" aria-label="Logout" onClick={onLogout}>
          <span className="ui-icon icon-logout" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
