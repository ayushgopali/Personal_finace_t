import { Link, NavLink } from 'react-router-dom';

// Topbar — greeting, responsive top pills, and notification/message/profile menus.
// Same markup/classes as the legacy topbar.
export default function Topbar({
  greeting,
  user,
  isAuthenticated,
  displayName,
  initial,
  openPanel,
  onTogglePanel,
  onLogin,
  onSwitchMode
}) {
  return (
    <nav className="topbar">
      <div className="greeting">
        <Link className="brand-title-link" to="/" aria-label="Go to dashboard top">
          <h1 className="brand-word">Spendora</h1>
        </Link>
        <p id="timeGreeting">{greeting}</p>
      </div>
      <div className="mobile-top-nav-wrap">
        <nav className="mobile-nav-top-left" aria-label="Sections navigation">
          <NavLink to="/analytics" className={({ isActive }) => `mobile-nav-pill${isActive ? ' active' : ''}`} title="Analytics" aria-label="Analytics">
            <span className="ui-icon icon-chart" aria-hidden="true" />
            <span>Analytics</span>
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => `mobile-nav-pill${isActive ? ' active' : ''}`} title="Wallet" aria-label="Wallet">
            <span className="ui-icon icon-wallet" aria-hidden="true" />
            <span>Wallet</span>
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => `mobile-nav-pill${isActive ? ' active' : ''}`} title="Categories" aria-label="Categories">
            <span className="ui-icon icon-list" aria-hidden="true" />
            <span>Categories</span>
          </NavLink>
        </nav>
      </div>
      <div className="top-actions">
        <div className="action-menu">
          <button className="round-action" id="notificationBtn" title="Notifications" aria-expanded={openPanel === 'notification' ? 'true' : 'false'} aria-controls="notificationPanel" onClick={() => onTogglePanel('notification')}>
            <span className="ui-icon icon-bell" />
          </button>
          <div className={`menu-panel${openPanel === 'notification' ? ' is-open' : ''}`} id="notificationPanel">
            <strong>Notifications</strong>
            <p id="notificationText">Your dashboard is up to date.</p>
          </div>
        </div>
        <div className="action-menu">
          <button className="round-action" id="messageBtn" title="Messages" aria-expanded={openPanel === 'message' ? 'true' : 'false'} aria-controls="messagePanel" onClick={() => onTogglePanel('message')}>
            <span className="ui-icon icon-mail" />
          </button>
          <div className={`menu-panel${openPanel === 'message' ? ' is-open' : ''}`} id="messagePanel">
            <strong>Messages</strong>
            <p>No messages yet. Expense alerts will appear here.</p>
          </div>
        </div>
        <div className="action-menu">
          <button className={`avatar${isAuthenticated && user.picture ? ' has-photo' : ''}`} id="profileBtn" aria-label="User profile" aria-expanded={openPanel === 'profile' ? 'true' : 'false'} aria-controls="profilePanel" onClick={() => onTogglePanel('profile')}>
            {isAuthenticated && user.picture ? (
              <img className="avatar-photo" src={user.picture} alt="" decoding="async" referrerPolicy="no-referrer" />
            ) : null}
            <span className="ui-icon icon-user" id="avatarGuestIcon" aria-hidden="true" hidden={isAuthenticated} />
            <span id="avatarInitial">{isAuthenticated && !user.picture ? initial : ''}</span>
          </button>
          <div className={`menu-panel profile-panel${isAuthenticated ? '' : ' is-signed-out'}${openPanel === 'profile' ? ' is-open' : ''}`} id="profilePanel">
            <strong id="profileName">{isAuthenticated ? displayName : 'Login or sign up'}</strong>
            <p id="profileSubtitle">{isAuthenticated ? (user.email || 'Signed in with OAuth2') : 'Start your Spendora experience and keep your spending secure.'}</p>
            <button type="button" id="profileAddBtn" hidden={!isAuthenticated} onClick={onSwitchMode}>
              Switch user mode
            </button>
            {!isAuthenticated ? (
              <button type="button" className="profile-secondary" id="profileLoginBtn" onClick={onLogin}>
                Login or sign up
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
