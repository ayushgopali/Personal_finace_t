import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import api from '../services/api';
import { getCategoryTotals, sumExpensesForMonth } from '../utils/analytics';
import { getMonthLabel, getRecentMonths } from '../utils/dates';

// Analytics — React port of analytics.html + initAnalyticsPage/...
// Same summary numbers, same SVG trend, same insight cards.
export default function Analytics() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeMonths, setRangeMonths] = useState(6);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = buildSummary(expenses);
  const trendSvg = buildTrendSvg(expenses, rangeMonths);
  const insights = buildInsights(expenses);

  return (
    <AppShell mainId="analyticsTop" mainClass="main-area analytics-main" activeRail="analytics">
      <section className="analytics-workspace" id="analyticsPage">
        <section className="analytics-hero">
          <div>
            <span className="analytics-kicker">Analytics</span>
            <h2>Spending intelligence</h2>
            <p>Track trends, compare months, and see where your money moves across categories.</p>
          </div>
          <div className="analytics-range" aria-label="Analytics range">
            {[6, 10, 12].map(m => (
              <button
                key={m}
                type="button"
                className={rangeMonths === m ? 'active' : ''}
                data-analytics-range={m}
                onClick={() => setRangeMonths(m)}
              >
                {m}M
              </button>
            ))}
          </div>
        </section>

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

        <section className="analytics-grid">
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
        </section>
      </section>
    </AppShell>
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
