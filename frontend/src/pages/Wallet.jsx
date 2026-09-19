import { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '../components/AppShell';
import SpendoraSelect from '../components/SpendoraSelect';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatWalletCardMask, getBudgetStatus, getCategoryTotals } from '../utils/analytics';

const BALANCE_KEY = 'spendora-wallet-balance';
const BUDGET_KEY = 'spendora-monthly-budget';
const CARDS_KEY = 'spendora-wallet-cards';

// Wallet — React port of wallet.html + initWalletPage and all wallet helpers.
// Same markup/classes, same localStorage keys for budget/balance/cards,
// same server-backed photo flow (never localStorage).
export default function Wallet() {
  const { isAuthenticated, user } = useAuth();
  const { notify } = useToast();

  const [budgetInput, setBudgetInput] = useState(() => {
    const saved = Number(localStorage.getItem(BUDGET_KEY) || 0);
    return saved > 0 ? String(saved) : '';
  });
  const [budget, setBudget] = useState(() => Number(localStorage.getItem(BUDGET_KEY) || 0));
  const [monthRecords, setMonthRecords] = useState([]);
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));

  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceError, setBalanceError] = useState('');

  const [optionsOpen, setOptionsOpen] = useState(false);

  const [cardsModalOpen, setCardsModalOpen] = useState(false);
  const [cardKey, setCardKey] = useState('stripe');
  const [cardFields, setCardFields] = useState({ name: '', label: '', info: '', number: '' });

  const [photo, setPhoto] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const displayName = isAuthenticated && user.name ? user.name.toUpperCase() : 'GUEST';

  // ---- data ----
  const loadBudgetData = useCallback(async () => {
    try {
      const records = await api.listExpenses();
      const list = Array.isArray(records) ? records : [];
      const currentMonth = new Date().toISOString().slice(0, 7);
      setMonthKey(currentMonth);
      setMonthRecords(list.filter(e => e.date && e.date.slice(0, 7) === currentMonth));
      setBudget(Number(localStorage.getItem(BUDGET_KEY) || 0));
    } catch {
      // alert text handled in render via error state below
    }
  }, []);

  useEffect(() => {
    loadBudgetData();
    const timer = window.setInterval(() => {
      if (!document.hidden) loadBudgetData();
    }, 8000);
    const onVis = () => {
      if (!document.hidden) loadBudgetData();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadBudgetData]);

  // ---- photo: server-backed, mirrors syncWalletPhotoState ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated) {
        if (!cancelled) setPhoto('');
        return;
      }
      try {
        const result = await api.getWalletPhoto();
        if (cancelled) return;
        if (result.authenticated && result.photo) setPhoto(result.photo);
        else setPhoto('');
      } catch {
        if (!cancelled) setPhoto('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      localStorage.removeItem('spendora-wallet-photo');
    } catch { /* ignore */ }
  }, []);

  // ---- derived ----
  const spent = monthRecords.reduce((s, e) => s + Number(e.amount || 0), 0);
  const percent = budget > 0 ? (spent / budget) * 100 : 0;
  const status = getBudgetStatus(percent, budget);
  const remaining = budget - spent;
  const average = monthRecords.length ? spent / monthRecords.length : 0;
  const topCategory = getCategoryTotals(monthRecords)[0];
  const statusClass = status.className;

  const balance = Number(localStorage.getItem(BALANCE_KEY) || 0);
  const hasSavedBalance = (() => {
    try {
      return localStorage.getItem(BALANCE_KEY) !== null;
    } catch {
      return false;
    }
  })();

  const cards = getWalletCards(displayName, monthKey, status.shortLabel);

  // ---- budget ----
  const saveBudget = () => {
    const amount = Number(budgetInput || 0);
    if (budgetInput === '' || Number.isNaN(amount) || amount < 0) {
      if (budgetInput !== '' && (Number.isNaN(amount) || amount < 0)) {
        notify('Enter a valid budget amount.', 'error');
        return;
      }
    }
    localStorage.setItem(BUDGET_KEY, String(amount));
    setBudget(amount);
    notify(amount > 0 ? 'Monthly budget updated' : 'Budget tracking paused', 'success');
    loadBudgetData();
  };

  // ---- balance ----
  const commitBalance = (mode) => {
    const amount = Number(balanceInput || 0);
    if (Number.isNaN(amount) || amount < 0) {
      setBalanceError('Enter a valid amount. Balance cannot be negative.');
      return;
    }
    const current = Number(localStorage.getItem(BALANCE_KEY) || 0);
    const next = mode === 'add' ? current + amount : amount;
    localStorage.setItem(BALANCE_KEY, String(next));
    setBalanceModalOpen(false);
    setBalanceInput('');
    setBalanceError('');
    notify(mode === 'add' ? 'Balance added' : 'Wallet balance updated', 'success');
    loadBudgetData();
  };

  // ---- cards ----
  const openCardEditor = () => {
    setOptionsOpen(false);
    populateCardFields(cardKey, displayName, monthKey, status.shortLabel, setCardFields);
    setCardsModalOpen(true);
  };

  const saveCard = () => {
    const stored = getStoredCards();
    stored[cardKey] = { ...cardFields };
    try {
      localStorage.setItem(CARDS_KEY, JSON.stringify(stored));
    } catch { /* ignore */ }
    setCardsModalOpen(false);
    notify('Wallet card updated', 'success');
    loadBudgetData();
  };

  const resetCard = () => {
    const stored = getStoredCards();
    delete stored[cardKey];
    try {
      localStorage.setItem(CARDS_KEY, JSON.stringify(stored));
    } catch { /* ignore */ }
    populateCardFields(cardKey, displayName, monthKey, status.shortLabel);
    notify('Wallet card reset', 'info');
  };

  // ---- photo ----
  const openUpload = () => {
    setOptionsOpen(false);
    if (!isAuthenticated) {
      notify('Login first to save your wallet photo.', 'error');
      return;
    }
    setUploadOpen(true);
  };

  const usePhotoFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please choose an image file.', 'error');
      return;
    }
    if (!isAuthenticated) {
      setUploadOpen(false);
      notify('Login first to save your wallet photo.', 'error');
      return;
    }
    try {
      const prepared = await prepareWalletPhoto(file);
      await api.saveWalletPhoto(prepared);
      setPhoto(prepared);
      setUploadOpen(false);
      notify('Wallet ID photo saved', 'success');
    } catch (error) {
      notify(error.message || 'Wallet photo could not be saved.', 'error');
    }
  };

  const removePhoto = async () => {
    setOptionsOpen(false);
    if (isAuthenticated) {
      try {
        await api.deleteWalletPhoto();
      } catch (error) {
        notify(error.message || 'Wallet photo could not be removed.', 'error');
        return;
      }
    }
    setPhoto('');
    notify('Wallet photo removed', 'info');
  };

  useEffect(() => {
    if (!cardsModalOpen && !balanceModalOpen && !uploadOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setCardsModalOpen(false);
        setBalanceModalOpen(false);
        setUploadOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cardsModalOpen, balanceModalOpen, uploadOpen]);

  useEffect(() => {
    if (!optionsOpen) return;
    const onDoc = (e) => {
      if (!e.target.closest('.wallet-options')) setOptionsOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOptionsOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [optionsOpen]);

  return (
    <AppShell mainId="walletTop" mainClass="main-area wallet-main" activeRail="wallet">
      <section className="wallet-workspace" id="walletPage">
        <section className="wallet-hero-panel">
          <div>
            <span className="wallet-kicker">Wallet</span>
            <h2>Budget command center</h2>
            <p>Track wallet balance and this month’s expenses against your budget.</p>
          </div>
          <button
            className="wallet-add-link"
            type="button"
            id="walletAddBalanceBtn"
            onClick={() => {
              setBalanceInput('');
              setBalanceError('');
              setBalanceModalOpen(true);
            }}
          >
            {hasSavedBalance ? 'Update balance' : 'Add balance'}
          </button>
        </section>

        <section className="wallet-grid">
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
                    setOptionsOpen(o => !o);
                  }}
                >
                  ...
                </button>
                <div className={`wallet-options-menu${optionsOpen ? ' is-open' : ''}`} id="walletOptionsMenu">
                  <button type="button" id="walletEditCardsBtn" onClick={openCardEditor}>Edit cards</button>
                  <button type="button" id="walletRemovePhotoBtn" onClick={removePhoto}>Remove photo</button>
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
                  <button className="id-window" id="idWindow" type="button" aria-haspopup="dialog" aria-controls="walletUploadModal" onClick={openUpload}>
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

          <section className="panel budget-manager-panel">
            <div className="panel-head">
              <h2>Monthly Budget Manager</h2>
              <span className={`budget-status-pill ${statusClass}`} id="budgetStatusPill">{status.label}</span>
            </div>

            <div className="budget-input-row">
              <label>
                <span>Monthly budget</span>
                <input
                  type="number"
                  id="monthlyBudgetInput"
                  min="0"
                  step="100"
                  placeholder="Enter amount in INR"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveBudget();
                    }
                  }}
                />
              </label>
              <button type="button" className="btn-primary" id="saveBudgetBtn" onClick={saveBudget}>Update</button>
            </div>

            <div className={`budget-meter-card ${statusClass}`} id="budgetMeterCard">
              <div className="budget-meter-top">
                <div>
                  <span>Spent this month</span>
                  <strong id="budgetSpent">INR {spent.toFixed(2)}</strong>
                </div>
                <div>
                  <span>Budget</span>
                  <strong id="budgetLimit">{budget > 0 ? `INR ${budget.toFixed(2)}` : 'INR 0.00'}</strong>
                </div>
              </div>

              <div className="budget-progress-shell" aria-label="Monthly budget usage">
                <span id="budgetProgressFill" className={statusClass} style={{ width: `${Math.min(percent, 100)}%` }} />
              </div>

              <div className="budget-meter-bottom">
                <strong id="budgetPercent">{budget > 0 ? `${Math.round(percent)}%` : '0%'}</strong>
                <span id="budgetRemaining">
                  {budget <= 0
                    ? 'Set a budget to start tracking.'
                    : remaining >= 0
                      ? `INR ${remaining.toFixed(2)} remaining this month.`
                      : `INR ${Math.abs(remaining).toFixed(2)} over budget.`}
                </span>
              </div>
            </div>

            <div className="budget-insight-grid">
              <article>
                <span>Transactions</span>
                <strong id="budgetTransactions">{monthRecords.length}</strong>
              </article>
              <article>
                <span>Average spend</span>
                <strong id="budgetAverage">INR {average.toFixed(2)}</strong>
              </article>
              <article>
                <span>Top category</span>
                <strong id="budgetTopCategory">{topCategory ? topCategory.category : 'None'}</strong>
              </article>
            </div>

            <div className={`budget-alert ${statusClass}`} id="budgetAlert">
              {status.message}
            </div>
          </section>
        </section>
      </section>

      <div className={`wallet-upload-modal${uploadOpen ? ' is-open' : ''}`} id="walletUploadModal" aria-hidden={uploadOpen ? 'false' : 'true'}>
        <div className="wallet-upload-card" role="dialog" aria-modal="true" aria-labelledby="walletUploadTitle">
          <button type="button" className="wallet-upload-close" id="walletUploadClose" aria-label="Close upload panel" onClick={() => setUploadOpen(false)}>x</button>
          <span className="wallet-kicker">Photo / ID</span>
          <h2 id="walletUploadTitle">Add wallet ID</h2>
          <p>Choose an image or drag and drop it here.</p>
          <label className={`wallet-dropzone${dragging ? ' is-dragging' : ''}`} id="walletDropzone"
            onDragEnter={e => { e.preventDefault(); setDragging(true); }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              usePhotoFile(e.dataTransfer?.files?.[0]);
            }}
          >
            <input
              type="file"
              accept="image/*"
              id="photoInput"
              ref={fileInputRef}
              onChange={e => {
                usePhotoFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <span className="ui-icon icon-card" aria-hidden="true" />
            <strong>Drop image here</strong>
            <small>or click to browse from your device</small>
          </label>
        </div>
      </div>

      <div className={`wallet-upload-modal${balanceModalOpen ? ' is-open' : ''}`} id="walletBalanceModal" aria-hidden={balanceModalOpen ? 'false' : 'true'}>
        <div className="wallet-upload-card wallet-balance-card" role="dialog" aria-modal="true" aria-labelledby="walletBalanceTitle">
          <button type="button" className="wallet-upload-close" id="walletBalanceClose" aria-label="Close balance panel" onClick={() => setBalanceModalOpen(false)}>x</button>
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
              aria-invalid={balanceError ? 'true' : 'false'}
              value={balanceInput}
              onChange={e => {
                setBalanceInput(e.target.value);
                if (Number(e.target.value || 0) >= 0) setBalanceError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitBalance('add');
                }
              }}
            />
          </label>
          <small className={`wallet-validation-message${balanceError ? ' is-visible' : ''}`} id="walletBalanceError" aria-live="polite">
            {balanceError}
          </small>
          <div className="wallet-balance-actions">
            <button type="button" className="btn-primary" id="walletAddBalanceConfirm" onClick={() => commitBalance('add')}>Add balance</button>
            <button type="button" className="btn-secondary" id="walletSetBalanceConfirm" onClick={() => commitBalance('set')}>Update balance</button>
          </div>
          <small className="wallet-balance-note" id="walletBalanceCurrent">Current balance: INR {balance.toFixed(2)}</small>
        </div>
      </div>

      <div className={`wallet-upload-modal${cardsModalOpen ? ' is-open' : ''}`} id="walletCardsModal" aria-hidden={cardsModalOpen ? 'false' : 'true'}>
        <div className="wallet-upload-card wallet-card-editor-card" role="dialog" aria-modal="true" aria-labelledby="walletCardsTitle">
          <button type="button" className="wallet-upload-close" id="walletCardsClose" aria-label="Close card editor" onClick={() => setCardsModalOpen(false)}>x</button>
          <span className="wallet-kicker">Cards</span>
          <h2 id="walletCardsTitle">Edit wallet cards</h2>
          <p>Update the visible card name, info label, displayed information, and card number.</p>
          <div className="wallet-balance-field">
            <span>Card</span>
            <SpendoraSelect
              id="walletCardSelect"
              value={cardKey}
              onChange={(v) => {
                setCardKey(v || 'stripe');
                populateCardFields(v || 'stripe', displayName, monthKey, status.shortLabel, setCardFields);
              }}
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
              <input type="text" id="walletEditCardName" maxLength="18" placeholder="Card name" value={cardFields.name} onChange={e => setCardFields(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="wallet-balance-field">
              <span>Info label</span>
              <input type="text" id="walletEditCardLabel" maxLength="16" placeholder="Holder" value={cardFields.label} onChange={e => setCardFields(f => ({ ...f, label: e.target.value }))} />
            </label>
            <label className="wallet-balance-field">
              <span>Information</span>
              <input type="text" id="walletEditCardInfo" maxLength="24" placeholder="Card info" value={cardFields.info} onChange={e => setCardFields(f => ({ ...f, info: e.target.value }))} />
            </label>
            <label className="wallet-balance-field">
              <span>Card number</span>
              <input type="text" id="walletEditCardNumber" maxLength="24" placeholder="0000 0000 0000" value={cardFields.number} onChange={e => setCardFields(f => ({ ...f, number: e.target.value }))} />
            </label>
          </div>
          <div className="wallet-balance-actions">
            <button type="button" className="btn-primary" id="walletSaveCardBtn" onClick={saveCard}>Save card</button>
            <button type="button" className="btn-secondary" id="walletResetCardBtn" onClick={resetCard}>Reset card</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function getStoredCards() {
  try {
    return JSON.parse(localStorage.getItem(CARDS_KEY) || '{}');
  } catch {
    return {};
  }
}

function getCardDefaults(displayName, monthKey, statusLabel) {
  return {
    stripe: { name: 'SPENDORA', label: 'Holder', info: displayName, number: '5524 9910 4242' },
    wise: { name: 'CRYPTEX.', label: 'Month', info: (monthLabel(monthKey) || 'LIVE').toUpperCase(), number: '9012 4432 8810' },
    payflow: { name: 'PAYFLOW.', label: 'STATUS', info: statusLabel || 'Health', number: '3312 0045 0094' }
  };
}

function getWalletCards(displayName, monthKey, statusLabel) {
  const defaults = getCardDefaults(displayName, monthKey, statusLabel);
  const stored = getStoredCards();
  return Object.keys(defaults).reduce((acc, key) => {
    acc[key] = { ...defaults[key], ...(stored[key] || {}) };
    return acc;
  }, {});
}

function populateCardFields(key, displayName, monthKey, statusLabel, setter) {
  const cards = getWalletCards(displayName, monthKey, statusLabel);
  const card = cards[key] || cards.stripe;
  if (typeof setter === 'function') {
    setter({ name: card.name || '', label: card.label || '', info: card.info || '', number: card.number || '' });
    return;
  }
  return card;
}

function monthLabel(monthKey) {
  if (!monthKey) return 'LIVE';
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return 'LIVE';
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Could not read this image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not prepare this image.'));
    image.src = source;
  });
}

async function prepareWalletPhoto(file) {
  const original = await readFileAsDataUrl(file);
  if (!window.HTMLCanvasElement) return original;
  try {
    const image = await loadImage(original);
    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return original;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    let quality = 0.86;
    let compressed = canvas.toDataURL('image/jpeg', quality);
    while (compressed.length > 3500000 && quality > 0.48) {
      quality -= 0.1;
      compressed = canvas.toDataURL('image/jpeg', quality);
    }
    return compressed;
  } catch {
    return original;
  }
}
