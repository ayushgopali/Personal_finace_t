import { useMemo } from 'react';
import { getRecentMonths } from '../../utils/dates';
import { getCategoryColor } from '../../utils/themes';

// CategoryTrends — top-3 category trend chart.
export default function CategoryTrends({ expenses, stats, rangeMonths, loading }) {
  const trend = useMemo(() => buildTrend(expenses, stats, rangeMonths), [expenses, stats, rangeMonths]);
  return (
    <section className="panel category-trend-panel">
      <div className="panel-head">
        <h2>Category Trends</h2>
        <span className="chart-legend"><i /> top spend <i /> second <i /> third</span>
      </div>
      <div id="categoryTrendChart" className="category-trend-chart">
        {!expenses.length || !stats.entries.length ? (
          !loading ? <p className="empty-state">No category trends yet.</p> : null
        ) : (
          <div dangerouslySetInnerHTML={{ __html: trend }} />
        )}
      </div>
    </section>
  );
}

function buildTrend(expenses, stats, rangeMonths) {
  if (!expenses.length || !stats.entries.length) return '';
  const months = getRecentMonths(rangeMonths || 12);
  const topCategories = stats.entries.slice(0, 3).map(e => e.category);
  const series = topCategories.map(category => months.map(month =>
    expenses
      .filter(e => (e.category || 'Other') === category && e.date && e.date.slice(0, 7) === month.key)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  ));
  const max = Math.max(...series.flat(), 1);
  const width = 940;
  const height = 250;
  const left = 54;
  const top = 22;
  const plotWidth = 822;
  const plotHeight = 156;
  const denominator = Math.max(months.length - 1, 1);
  const gridLines = [0, 1, 2, 3, 4].map(index => {
    const y = top + (plotHeight / 4) * index;
    return `<line class="trend-grid" x1="${left}" x2="${left + plotWidth}" y1="${y}" y2="${y}"></line>`;
  }).join('');
  const labels = months.map((month, index) => {
    const x = left + (plotWidth / denominator) * index;
    return `<text class="trend-label analytics-trend-label" x="${x}" y="224">${month.label}</text>`;
  }).join('');
  const lines = series.map((values, si) => {
    const points = values.map((value, index) => {
      const x = left + (plotWidth / denominator) * index;
      const y = top + plotHeight - (value / max) * plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<polyline class="category-trend-line" style="stroke: ${getCategoryColor(topCategories[si], si)}" points="${points}"></polyline>`;
  }).join('');
  return `<svg class="category-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Category spending trends"><g>${gridLines}</g><g>${lines}</g><g>${labels}</g></svg>`
    + `<div class="category-trend-key">${topCategories.map((c, i) => `<span><i style="background: ${getCategoryColor(c, i)}"></i>${c}</span>`).join('')}</div>`;
}
