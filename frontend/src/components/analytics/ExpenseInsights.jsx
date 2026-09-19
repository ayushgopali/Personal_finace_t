import { getCategoryTotals, sumExpensesForMonth } from '../../utils/analytics';
import { getMonthLabel, getRecentMonths } from '../../utils/dates';

// ExpenseInsights — the analytics insight cards (same calculations).
export default function ExpenseInsights({ expenses, loading }) {
  const insights = buildInsights(expenses);
  return (
    <section className="panel analytics-insight-panel">
      <div className="panel-head">
        <h2>Expense Insights</h2>
        <span className="dots">...</span>
      </div>
      <div id="analyticsInsightList" className="analytics-insight-list">
        {!expenses.length && !loading ? (
          <p className="empty-state">No insights yet. Add expenses to unlock analytics.</p>
        ) : (
          insights.map(item => (
            <article className="analytics-insight-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function buildInsights(expenses) {
  if (!expenses.length) return [];
  const largest = [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
  const methods = expenses.reduce((acc, expense) => {
    const method = expense.paymentMethod || 'Unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
  const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];
  const months = getRecentMonths(2);
  const previousMonthTotal = months.length > 1 ? sumExpensesForMonth(expenses, months[0].key) : 0;
  const currentMonthTotal = months.length > 1 ? sumExpensesForMonth(expenses, months[1].key) : 0;
  const delta = previousMonthTotal ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;
  const categories = getCategoryTotals(expenses);
  const categoryTotal = categories.reduce((sum, item) => sum + item.amount, 0);
  return [
    {
      label: 'Largest expense',
      value: largest ? `INR ${Number(largest.amount || 0).toFixed(2)}` : 'INR 0.00',
      note: largest ? largest.description || 'Untitled expense' : 'No expenses yet'
    },
    {
      label: 'Preferred payment',
      value: topMethod ? topMethod[0] : 'None',
      note: topMethod ? `${topMethod[1]} transaction${topMethod[1] === 1 ? '' : 's'}` : 'No payment data'
    },
    {
      label: 'Month over month',
      value: previousMonthTotal ? `${delta >= 0 ? '+' : ''}${Math.round(delta)}%` : 'New',
      note: `${getMonthLabel(months[1]?.key)} vs ${getMonthLabel(months[0]?.key)}`
    },
    {
      label: 'Category concentration',
      value: categories[0] && categoryTotal ? `${Math.round((categories[0].amount / categoryTotal) * 100)}%` : '0%',
      note: categories[0] ? `${categories[0].category} leads spend` : 'No category data'
    }
  ];
}
