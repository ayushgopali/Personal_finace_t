// LogoutWarning — the "Log out of Spendora?" confirmation modal.
export default function LogoutWarning({ open, busy, onSwitch, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="logout-warning-modal" id="logoutWarningModal" role="dialog" aria-modal="true" aria-labelledby="logoutWarningTitle" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="logout-warning-card">
        <span className="logout-warning-badge">Warning</span>
        <h2 id="logoutWarningTitle">Log out of Spendora?</h2>
        <p>Choose another account or log out completely. Switching users keeps this session active until a new login finishes.</p>
        <div className="logout-warning-actions">
          <button type="button" className="logout-switch-button" id="logoutSwitchButton" disabled={busy} onClick={onSwitch}>
            Switch user
          </button>
          <button type="button" className="logout-confirm-button" id="logoutConfirmButton" disabled={busy} onClick={onConfirm}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
