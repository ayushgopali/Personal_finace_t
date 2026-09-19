import { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import WalletBifold from '../components/wallet/WalletBifold';
import BudgetManager from '../components/wallet/BudgetManager';
import BalanceModal from '../components/wallet/BalanceModal';
import CardsModal from '../components/wallet/CardsModal';
import PhotoModal from '../components/wallet/PhotoModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getBudgetStatus, getCategoryTotals } from '../utils/analytics';

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

  const handleCardKey = (v) => {
    const next = v || 'stripe';
    setCardKey(next);
    populateCardFields(next, displayName, monthKey, status.shortLabel, setCardFields);
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
    populateCardFields(cardKey, displayName, monthKey, status.shortLabel, setCardFields);
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
          <WalletBifold
            cards={cards}
            balance={balance}
            photo={photo}
            statusClass={statusClass}
            optionsOpen={optionsOpen}
            onToggleOptions={() => setOptionsOpen(o => !o)}
            onEditCards={openCardEditor}
            onRemovePhoto={removePhoto}
            onOpenUpload={openUpload}
          />
          <BudgetManager
            budget={budget}
            spent={spent}
            percent={percent}
            remaining={remaining}
            status={status}
            statusClass={statusClass}
            txCount={monthRecords.length}
            average={average}
            topCategory={topCategory}
            budgetInput={budgetInput}
            onBudgetInput={setBudgetInput}
            onSaveBudget={saveBudget}
          />
        </section>
      </section>

      <PhotoModal
        open={uploadOpen}
        dragging={dragging}
        fileInputRef={fileInputRef}
        onClose={() => setUploadOpen(false)}
        onFile={usePhotoFile}
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          usePhotoFile(e.dataTransfer?.files?.[0]);
        }}
      />
      <BalanceModal
        open={balanceModalOpen}
        balance={balance}
        hasSavedBalance={hasSavedBalance}
        input={balanceInput}
        error={balanceError}
        onInput={(v) => {
          setBalanceInput(v);
          if (Number(v || 0) >= 0) setBalanceError('');
        }}
        onClose={() => setBalanceModalOpen(false)}
        onAdd={() => commitBalance('add')}
        onSet={() => commitBalance('set')}
      />
      <CardsModal
        open={cardsModalOpen}
        cardKey={cardKey}
        onCardKey={handleCardKey}
        fields={cardFields}
        onFields={setCardFields}
        onClose={() => setCardsModalOpen(false)}
        onSave={saveCard}
        onReset={resetCard}
      />
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
