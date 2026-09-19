import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

// Shared expenses data hook: single fetch per page mount, no polling.
export function useExpenses({ auto = true } = {}) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listExpenses();
      if (mounted.current) setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      if (mounted.current) setError(err.message || 'Error loading expenses');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (auto) load();
    return () => {
      mounted.current = false;
    };
  }, [auto, load]);

  return { expenses, loading, error, reload: load, setExpenses };
}

// Time-based greeting, same logic as updateTimeGreeting() in app.js.
export function useGreeting(userName) {
  const [greeting, setGreeting] = useState('Here is your spending overview');
  useEffect(() => {
    const hour = new Date().getHours();
    let g = 'Good evening';
    if (hour < 12) g = 'Good morning';
    else if (hour < 17) g = 'Good afternoon';
    setGreeting(userName ? `${g}, ${userName}. Here is your spending overview` : `${g}. Here is your spending overview`);
  }, [userName]);
  return greeting;
}
