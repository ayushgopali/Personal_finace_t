import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Transactions from './pages/Transactions';
import Search from './pages/Search';
import Categories from './pages/Categories';
import Wallet from './pages/Wallet';
import Login from './pages/Login';
import SwitchUserMode from './pages/SwitchUserMode';

// Route map preserves existing navigation destinations/meaning:
//   index        -> /            (Dashboard)
//   analytics    -> /analytics
//   transactions -> /transactions (full expense ledger)
//   wallet       -> /wallet      (Budget command center)
//   search       -> /search
//   categories   -> /categories
//   login        -> /login
//   switch       -> /switch-user-mode
// Legacy *.html URLs redirect to the equivalent React route so bookmarks,
// browser history, and direct navigation keep working.
function BodyClassSync() {
  const location = useLocation();
  useEffect(() => {
    const isAuth = location.pathname === '/login' || location.pathname === '/signup';
    document.body.classList.toggle('auth-body', isAuth);
    document.body.classList.toggle('switch-mode-body', location.pathname === '/switch-user-mode');
    document.body.classList.toggle('wallet-page', location.pathname === '/wallet');
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BodyClassSync />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/search" element={<Search />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login defaultMode="signup" />} />
          <Route path="/switch-user-mode" element={<SwitchUserMode />} />

          {/* Backward-compatible redirects for legacy standalone pages */}
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/analytics.html" element={<Navigate to="/analytics" replace />} />
          <Route path="/wallet.html" element={<Navigate to="/wallet" replace />} />
          <Route path="/search.html" element={<Navigate to="/search" replace />} />
          <Route path="/categories.html" element={<Navigate to="/categories" replace />} />
          <Route path="/login.html" element={<Navigate to="/login" replace />} />
          <Route path="/signup.html" element={<Navigate to="/signup" replace />} />
          <Route path="/switch-user-mode.html" element={<Navigate to="/switch-user-mode" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
