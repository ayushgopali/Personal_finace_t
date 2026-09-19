import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import ExpenseTable from '../components/expenses/ExpenseTable';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

// Transactions — the full expense ledger (same table, same edit/delete,
// same API contracts as the dashboard ledger and search results).
export default function Transactions() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      notify('Error loading expenses', 'error');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = (id) => {
    sessionStorage.setItem('spendora-edit-expense-id', id);
    navigate('/?edit=' + encodeURIComponent(id));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;
    try {
      const result = await api.deleteExpense(id);
      if (result.success) {
        notify(result.message, 'success');
        load();
      } else {
        notify('Error: ' + result.error, 'error');
      }
    } catch (error) {
      notify('Error deleting expense: ' + error.message, 'error');
    }
  };

  return (
    <AppShell mainId="transactionsTop" activeRail="transactions">
      <ExpenseTable expenses={expenses} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
    </AppShell>
  );
}
