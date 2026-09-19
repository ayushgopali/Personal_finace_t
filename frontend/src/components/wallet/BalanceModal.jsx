// BalanceModal — the add/update wallet balance dialog.
export default function BalanceModal({
  open, balance, hasSavedBalance,
  input, error, onInput, onClose, onAdd, onSet
}) {
  return (
    <div className={`wallet-upload-modal${open ? ' is-open' : ''}`} id="walletBalanceModal" aria-hidden={open ? 'false' : 'true'}>
      <div className="wallet-upload-card wallet-balance-card" role="dialog" aria-modal="true" aria-labelledby="walletBalanceTitle">
        <button type="button" className="wallet-upload-close" id="walletBalanceClose" aria-label="Close balance panel" onClick={onClose}>x</button>
        <span className="wallet-kicker">Balance</span>
        <h2 id="walletBalanceTitle">{hasSavedBalance ? 'Update wallet balance' : 'Add wallet balance'}</h2>
        <p id="walletBalanceDescription">
          {hasSavedBalance
            ? 'Add more money to your current balance, or update it with a new amount.'
            : 'Add money to your wallet balance or replace it with a new amount.'}
        </p>
        <label className="wallet-balance-field">
          <span>Amount in INR</span>
          <input
            type="number"
            id="walletBalanceInput"
            min="0"
            step="100"
            placeholder="Enter amount"
            aria-describedby="walletBalanceError"
            aria-invalid={error ? 'true' : 'false'}
            value={input}
            onChange={e => onInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
              }
            }}
          />
        </label>
        <small className={`wallet-validation-message${error ? ' is-visible' : ''}`} id="walletBalanceError" aria-live="polite">
          {error}
        </small>
        <div className="wallet-balance-actions">
          <button type="button" className="btn-primary" id="walletAddBalanceConfirm" onClick={onAdd}>Add balance</button>
          <button type="button" className="btn-secondary" id="walletSetBalanceConfirm" onClick={onSet}>Update balance</button>
        </div>
        <small className="wallet-balance-note" id="walletBalanceCurrent">Current balance: INR {balance.toFixed(2)}</small>
      </div>
    </div>
  );
}
