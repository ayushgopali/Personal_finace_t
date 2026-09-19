import { getCategoryTotals } from '../../utils/analytics';
import { getMonthLabel } from '../../utils/dates';

// AnalyticsSummary — the four analytics stat cards (same ids/values).
export default function AnalyticsSummary({ expenses }) {
  const summary = buildSummary(expenses);
  return (
    <section className="analytics-stat-grid" aria-label="Analytics summary">
      <article className="analytics-stat-card">
        <span>Total analyzed</span>
        <strong id="analyticsTotal">{summary.totalText}</strong>
        <small id="analyticsTotalNote">{summary.totalNote}</small>
      </article>
      <article className="analytics-stat-card">
        <span>This month</span>
        <strong id="analyticsMonth">{summary.monthText}</strong>
        <small id="analyticsMonthNote">{summary.monthNote}</small>
      </article>
      <article className="analytics-stat-card">
        <span>Top category</span>
        <strong id="analyticsTopCategory">{summary.topCategory}</strong>
        <small id="analyticsTopCategoryNote">{summary.topCategoryNote}</small>
      </article>
      <article className="analytics-stat-card">
        <span>Average transaction</span>
        <strong id="analyticsAverage">{summary.averageText}</strong>
        <small id="analyticsAverageNote">Across all records</small>
      </article>
    </section>
  );
}

function buildSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const average = expenses.length ? total / expenses.length : 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = expenses
    .filter(e => e.date && e.date.slice(0, 7) === currentMonth)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const categories = getCategoryTotals(expenses);
  const topCategory = categories[0];
  return {
    totalText: `INR ${total.toFixed(2)}`,
    totalNote: `${expenses.length} transaction${expenses.length === 1 ? '' : 's'} analyzed`,
    monthText: `INR ${monthTotal.toFixed(2)}`,
    monthNote: `${getMonthLabel(currentMonth)} live spend`,
    topCategory: topCategory ? topCategory.category : 'None',
    topCategoryNote: topCategory ? `INR ${topCategory.amount.toFixed(2)} total` : 'Waiting for data',
    averageText: `INR ${average.toFixed(2)}`
  };
}
