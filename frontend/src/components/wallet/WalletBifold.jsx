import { formatWalletCardMask } from '../../utils/analytics';

// WalletBifold — the premium bifold visual: cards, balance pocket, ID window.
export default function WalletBifold({
  cards, balance, photo, statusClass,
  optionsOpen, onToggleOptions, onEditCards, onRemovePhoto, onOpenUpload
}) {
  return (
    <section className="panel wallet-visual-panel">
      <div className="panel-head">
        <h2>Premium Bifold</h2>
        <div className="wallet-options">
          <button
            type="button"
            className="wallet-options-trigger"
            id="walletOptionsBtn"
            aria-label="Wallet options"
            aria-expanded={optionsOpen ? 'true' : 'false'}
            aria-controls="walletOptionsMenu"
            onClick={(e) => {
              e.stopPropagation();
              onToggleOptions();
            }}
          >
            ...
          </button>
          <div className={`wallet-options-menu${optionsOpen ? ' is-open' : ''}`} id="walletOptionsMenu">
            <button type="button" id="walletEditCardsBtn" onClick={onEditCards}>Edit cards</button>
            <button type="button" id="walletRemovePhotoBtn" onClick={onRemovePhoto}>Remove photo</button>
          </div>
        </div>
      </div>

      <div className="wallet-scene">
        <div className={`premium-bifold ${statusClass}`} id="premiumBifold">
          <div className="wallet-outer">
            <div className="leather-grain" />
            <div className="edge-shadow-top" />
            <div className="edge-shadow-bottom" />
            <div className="edge-shadow-left" />
            <div className="edge-shadow-right" />
            <div className="stitching" />
          </div>

          <div className="fold-shadow-left" />
          <div className="fold-shadow-right" />
          <div className="fold-line" />

          <div className="left-half">
            <div className="card-stack-area">
              {['stripe', 'wise', 'payflow'].map(key => (
                <div className={`wcard wc-${key}`} data-wallet-card={key} key={key}>
                  <div className="wcard-inner">
                    <div className="wcard-top"><span data-card-name>{cards[key].name}</span><div className="wchip" /></div>
                    <div className="wcard-bottom">
                      <div><span className="wlabel" data-card-label>{cards[key].label}</span><span className="wvalue" data-card-info>{cards[key].info}</span></div>
                      <div><span className="wstars" data-card-masked>{formatWalletCardMask(cards[key].number)}</span><span className="wnumber" data-card-number>{cards[key].number}</span></div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pocket-strip">
                <svg viewBox="0 0 168 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 0 10 C 0 5,3 5,6 5 C 12 5,15 14,24 14 L 144 14 C 153 14,156 5,162 5 C 165 5,168 5,168 10 L 168 52 C 168 62,156 64,144 64 L 24 64 C 12 64,0 62,0 52 Z" fill="#6B3510" />
                  <path d="M 4 11 C 4 7,7 7,9 7 C 14 7,16 15,24 15 L 144 15 C 152 15,154 7,159 7 C 161 7,164 7,164 11 L 164 52 C 164 61,154 63,144 63 L 24 63 C 14 63,4 61,4 52 Z" stroke="#9E5620" strokeWidth="1" strokeDasharray="5 3" />
                </svg>
                <div className="pocket-info">
                  <div className="bal-wrap">
                    <div className="bal-stars">*****</div>
                    <div className="bal-real" id="walletBalanceReveal">INR {balance.toFixed(2)}</div>
                  </div>
                  <div className="bal-label">Balance</div>
                  <div className="eye-wrap">
                    <svg className="ei ei-slash" width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /><line x1="3" y1="3" x2="21" y2="21" />
                    </svg>
                    <svg className="ei ei-open" style={{ opacity: 0 }} width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-half">
            <button className="id-window" id="idWindow" type="button" aria-haspopup="dialog" aria-controls="walletUploadModal" onClick={onOpenUpload}>
              <div className="inner-stitching-right" />
              {photo ? (
                <img src={photo} alt="Wallet ID photo" className="wallet-earth-img" id="walletEarthImg" />
              ) : (
                <div className="id-placeholder" id="idPlaceholder">
                  <span className="ui-icon icon-card" />
                  <span>Click to add<br />photo / ID</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
