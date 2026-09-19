import SpendoraSelect from '../SpendoraSelect';

// CardsModal — the wallet card editor dialog.
export default function CardsModal({
  open, cardKey, onCardKey, fields, onFields, onClose, onSave, onReset
}) {
  const set = (key) => (e) => onFields({ ...fields, [key]: e.target.value });
  return (
    <div className={`wallet-upload-modal${open ? ' is-open' : ''}`} id="walletCardsModal" aria-hidden={open ? 'false' : 'true'}>
      <div className="wallet-upload-card wallet-card-editor-card" role="dialog" aria-modal="true" aria-labelledby="walletCardsTitle">
        <button type="button" className="wallet-upload-close" id="walletCardsClose" aria-label="Close card editor" onClick={onClose}>x</button>
        <span className="wallet-kicker">Cards</span>
        <h2 id="walletCardsTitle">Edit wallet cards</h2>
        <p>Update the visible card name, info label, displayed information, and card number.</p>
        <div className="wallet-balance-field">
          <span>Card</span>
          <SpendoraSelect
            id="walletCardSelect"
            value={cardKey}
            onChange={onCardKey}
            placeholder="Top card"
            options={[
              { value: 'stripe', label: 'Top card' },
              { value: 'wise', label: 'Middle card' },
              { value: 'payflow', label: 'Bottom card' }
            ]}
          />
        </div>
        <div className="wallet-card-editor-grid">
          <label className="wallet-balance-field">
            <span>Card name</span>
            <input type="text" id="walletEditCardName" maxLength="18" placeholder="Card name" value={fields.name} onChange={set('name')} />
          </label>
          <label className="wallet-balance-field">
            <span>Info label</span>
            <input type="text" id="walletEditCardLabel" maxLength="16" placeholder="Holder" value={fields.label} onChange={set('label')} />
          </label>
          <label className="wallet-balance-field">
            <span>Information</span>
            <input type="text" id="walletEditCardInfo" maxLength="24" placeholder="Card info" value={fields.info} onChange={set('info')} />
          </label>
          <label className="wallet-balance-field">
            <span>Card number</span>
            <input type="text" id="walletEditCardNumber" maxLength="24" placeholder="0000 0000 0000" value={fields.number} onChange={set('number')} />
          </label>
        </div>
        <div className="wallet-balance-actions">
          <button type="button" className="btn-primary" id="walletSaveCardBtn" onClick={onSave}>Save card</button>
          <button type="button" className="btn-secondary" id="walletResetCardBtn" onClick={onReset}>Reset card</button>
        </div>
      </div>
    </div>
  );
}
