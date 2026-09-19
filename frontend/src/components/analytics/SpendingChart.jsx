import { sumExpensesForMonth } from '../../utils/analytics';
import { getRecentMonths } from '../../utils/dates';

// SpendingChart — the analytics spending-trend panel (same SVG math).
export default function SpendingChart({ expenses, rangeMonths, loading }) {
  const trendSvg = buildTrendSvg(expenses, rangeMonths);
  return (
    <section className="panel analytics-trend-panel">
      <div className="panel-head">
        <h2>Spending Trends</h2>
        <span className="chart-legend"><i /> spending <i /> transactions</span>
      </div>
      <div id="analyticsTrendChart" className="analytics-trend-chart">
        {loading ? (
          <p className="loading">Loading analytics...</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: trendSvg }} />
        )}
      </div>
    </section>
  );
}

function buildTrendSvg(expenses, rangeMonths) {
  if (!expenses.length) {
    return '<p class="empty-state">No spending trend yet. Add expenses to see analytics.</p>';
  }
  const months = getRecentMonths(rangeMonths);
  const monthlyTotals = months.map(month => sumExpensesForMonth(expenses, month.key));
  const transactionCounts = months.map(month => expenses.filter(e => e.date && e.date.slice(0, 7) === month.key).length);
  const totalMax = Math.max(...monthlyTotals, 1);
  const countMax = Math.max(...transactionCounts, 1);
  const width = 960;
  const height = 360;
  const left = 56;
  const top = 34;
  const plotWidth = 840;
  const plotHeight = 244;
  const denominator = Math.max(months.length - 1, 1);
  const points = monthlyTotals.map((value, index) => {
    const x = left + (plotWidth / denominator) * index;
    const y = top + plotHeight - (value / totalMax) * plotHeight;
    return { x, y, value };
  });
  const countPoints = transactionCounts.map((value, index) => {
    const x = left + (plotWidth / denominator) * index;
    const y = top + plotHeight - ((value / countMax) * 0.78) * plotHeight;
    return { x, y, value };
  });
  const areaPoints = `${left},${top + plotHeight} ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} ${left + plotWidth},${top + plotHeight}`;
  const gridLines = [0, 1, 2, 3, 4].map(index => {
    const y = top + (plotHeight / 4) * index;
    return `<line class="trend-grid" x1="${left}" x2="${left + plotWidth}" y1="${y}" y2="${y}"></line>`;
  }).join('');
  const labels = months.map((month, index) => {
    const x = left + (plotWidth / denominator) * index;
    return `<text class="trend-label analytics-trend-label" x="${x}" y="326">${month.label}</text>`;
  }).join('');
  const dots = points.map((point, index) => `
    <circle class="analytics-point" cx="${point.x}" cy="${point.y}" r="6">
      <title>${months[index].label}: INR ${point.value.toFixed(2)}</title>
    </circle>
  `).join('');
  return `
    <svg class="analytics-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Analytics spending trend chart">
      <defs>
        <linearGradient id="analyticsAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2563EB" stop-opacity="0.12"></stop>
          <stop offset="100%" stop-color="#2563EB" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <g>${gridLines}</g>
      <polygon class="analytics-area" points="${areaPoints}"></polygon>
      <polyline class="trend-line analytics-main-line" points="${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"></polyline>
      <polyline class="trend-line-soft analytics-soft-line" points="${countPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"></polyline>
      <g>${dots}</g>
      <g>${labels}</g>
    </svg>
  `;
}
