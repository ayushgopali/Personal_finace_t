import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import CategoryInsight from '../components/CategoryInsight';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  getMonthKey,
  getPreviousMonthKey,
  getTrendMeta
} from '../utils/dates';

// Dashboard — React port of index.html + initDashboardPage/loadSummary/
// loadCategoryChart/editExpense/deleteExpense. Same UI, same calculations.
export default function Dashboard() {
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalAllTime: 0,
    average: 0,
    count: 0,
    currentMonthTotal: 0,
    previousMonthTotal: 0,
    currentMonthCount: 0,
    previousMonthCount: 0,
    monthSpent: 0,
    monthTransactions: 0
  });
  const [editing, setEditing] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = getMonthKey(new Date());
      const previousMonth = getPreviousMonthKey(currentMonth);
      const [summaryData, all] = await Promise.all([
        api.monthlySummary(currentMonth).catch(() => ({ total: 0, transactionCount: 0 })),
        api.listExpenses()
      ]);
      const records = Array.isArray(all) ? all : [];
      const totalAllTime = records.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const average = records.length ? totalAllTime / records.length : 0;
      const currentMonthExpenses = records.filter(e => e.date && e.date.slice(0, 7) === currentMonth);
      const previousMonthExpenses = records.filter(e => e.date && e.date.slice(0, 7) === previousMonth);
      const currentMonthTotal = currentMonthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const previousMonthTotal = previousMonthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      setExpenses(records);
      setSummary({
        totalAllTime,
        average,
        count: records.length,
        currentMonthTotal,
        previousMonthTotal,
        currentMonthCount: currentMonthExpenses.length,
        previousMonthCount: previousMonthExpenses.length,
        monthSpent: Number(summaryData.total || 0),
        monthTransactions: summaryData.transactionCount ?? currentMonthExpenses.length
      });
    } catch (error) {
      notify('Error loading expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Cross-page edit handoff (?edit=<id>, or legacy sessionStorage key).
  useEffect(() => {
    const editId = searchParams.get('edit') || sessionStorage.getItem('spendora-edit-expense-id');
    if (!editId) return;
    sessionStorage.removeItem('spendora-edit-expense-id');
    (async () => {
      try {
        const expense = await api.getExpense(editId);
        if (expense && expense._id) {
          setEditing(expense);
          notify('Editing expense. Update the details and click Update.', 'info');
          window.setTimeout(() => {
            document.getElementById('expenseForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        }
      } catch (error) {
        notify('Error loading expense: ' + error.message, 'error');
      }
    })();
    if (searchParams.get('edit')) {
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = async (id) => {
    try {
      const expense = await api.getExpense(id);
      setEditing(expense);
      notify('Editing expense. Update the details and click Update.', 'info');
      document.getElementById('expenseForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      notify('Error loading expense: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;
    try {
      const result = await api.deleteExpense(id);
      if (result.success) {
        notify(result.message, 'success');
        loadAll();
      } else {
        notify('Error: ' + result.error, 'error');
      }
    } catch (error) {
      notify('Error deleting expense: ' + error.message, 'error');
    }
  };

  const monthTrend = getTrendMeta(summary.currentMonthTotal, summary.previousMonthTotal);
  const txTrend = getTrendMeta(summary.currentMonthCount, summary.previousMonthCount);

  return (
    <AppShell mainId="dashboardTop" activeRail="dashboard">
      <section className="metric-strip" aria-label="Spending metrics">
        <article className="metric-card">
          <div className="metric-label"><span className="metric-icon"><span className="ui-icon icon-wallet" /></span>Total spent</div>
          <div className="metric-bottom">
            <strong id="totalSpent">INR {summary.totalAllTime.toFixed(2)}</strong>
            <span id="totalSpentNote" className="trend-neutral">{summary.count ? 'All-time total' : 'No data yet'}</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label"><span className="metric-icon"><span className="ui-icon icon-chart" /></span>This month</div>
          <div className="metric-bottom">
            <strong id="monthSpent">INR {summary.monthSpent.toFixed(2)}</strong>
            <span id="monthSpentTrend" className={monthTrend.className}>{monthTrend.text}</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label"><span className="metric-icon"><span className="ui-icon icon-list" /></span>Transactions</div>
          <div className="metric-bottom">
            <strong id="transactionCount">{summary.monthTransactions}</strong>
            <span id="transactionTrend" className={txTrend.className}>{txTrend.text}</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label"><span className="metric-icon"><span className="ui-icon icon-card" /></span>Average spend</div>
          <div className="metric-bottom">
            <strong id="averageSpent">INR {summary.average.toFixed(2)}</strong>
            <span id="averageSpentNote" className="trend-neutral">{summary.count ? `${summary.count} records` : 'No data yet'}</span>
          </div>
        </article>
      </section>

      <div className="content-grid">
        <section className="left-column">
          <ExpenseForm
            editing={editing}
            onDone={() => {
              setEditing(null);
              loadAll();
            }}
          />
          <ExpenseTable expenses={expenses} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
        </section>

        <aside className="right-column">
          <CategoryInsight expenses={expenses} />
          <section className="panel vacancy-panel">
            <div className="panel-head">
              <h2>Quick actions</h2>
              <span className="dots">...</span>
            </div>
            <a href="#expenseForm" className="action-row" onClick={(e) => { e.preventDefault(); document.getElementById('expenseForm')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <span>F</span><div><strong>Food budget</strong><small>Track meals</small></div>
            </a>
            <a href="#expenseForm" className="action-row" onClick={(e) => { e.preventDefault(); document.getElementById('expenseForm')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <span>B</span><div><strong>Bills</strong><small>Review utilities</small></div>
            </a>
            <a href="#transactions" className="action-row" onClick={(e) => { e.preventDefault(); document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <span>R</span><div><strong>Recent records</strong><small>View details</small></div>
            </a>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
