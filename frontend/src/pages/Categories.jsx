import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import SpendoraSelect from '../components/SpendoraSelect';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { getCategoryStats } from '../utils/analytics';
import { formatDate, getRecentMonths, normalizeSearchText } from '../utils/dates';
import { getCategoryColor } from '../utils/themes';
import { CategoryIcon } from '../components/ExpenseTable';

// Categories — React port of categories.html + renderCategoriesPage/...
// Same range/filter/sort semantics, same donut/breakdown/trend/detail visuals.
const SORT_OPTIONS = [
  { value: 'amount-desc', label: 'Highest spend' },
  { value: 'amount-asc', label: 'Lowest spend' },
  { value: 'name-asc', label: 'Category A to Z' },
  { value: 'transactions-desc', label: 'Most transactions' }
];

export default function Categories() {
  const { notify } = useToast();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeMonths, setRangeMonths] = useState(6);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [payment, setPayment] = useState('');
  const [sort, setSort] = useState('amount-desc');
  const [quickFocus, setQuickFocus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listExpenses();
      setAll(Array.isArray(data) ? data : []);
    } catch {
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    const rangeKeys = rangeMonths ? new Set(getRecentMonths(rangeMonths).map(m => m.key)) : null;
    return all.filter(expense => {
      if (rangeKeys && (!expense.date || !rangeKeys.has(expense.date.slice(0, 7)))) return false;
      if (category && expense.category !== category) return false;
      if (payment && expense.paymentMethod !== payment) return false;
      if (!q) return true;
      const text = normalizeSearchText([expense.description, expense.category, expense.paymentMethod, expense.notes].filter(Boolean).join(' '));
      return q.split(/\s+/).every(term => text.includes(term));
    });
  }, [all, query, category, payment, rangeMonths]);

  const stats = useMemo(() => getCategoryStats(filtered, sort), [filtered, sort]);

  const clear = () => {
    setQuery('');
    setCategory('');
    setPayment('');
    setSort('amount-desc');
    setQuickFocus(false);
    notify('Category filters cleared', 'info');
  };

  const donutSvg = useMemo(() => buildDonutSvg(stats), [stats]);
  const trend = useMemo(() => buildTrend(filtered, stats, rangeMonths), [filtered, stats, rangeMonths]);

  return (
    <AppShell mainId="categoriesTop" mainClass="main-area categories-main" activeRail="categories">
      <section className="categories-workspace" id="categoriesPage">
        <section className="analytics-hero categories-hero">
          <div>
            <span className="analytics-kicker">Categories</span>
            <h2>Category intelligence</h2>
            <p>Explore where your spending is concentrated, compare category momentum, and watch every expense update the picture live.</p>
          </div>
          <div className="analytics-range" aria-label="Category range">
            {[{ v: 3, l: '3M' }, { v: 6, l: '6M' }, { v: 12, l: '12M' }, { v: 0, l: 'All' }].map(r => (
              <button
                key={r.l}
                type="button"
                className={rangeMonths === r.v ? 'active' : ''}
                data-category-range={r.v}
                onClick={() => setRangeMonths(r.v)}
              >
                {r.l}
              </button>
            ))}
          </div>
        </section>

        <section className="panel category-control-panel">
          <div className="panel-head search-panel-head">
            <div>
              <h2>Live category filters</h2>
              <p>Filter category analytics by search, category, payment method, and sort preference.</p>
            </div>
            <span className="search-count" id="categoryResultCount">
              {loading ? 'Loading' : all.length ? `${filtered.length} of ${all.length} expenses` : 'No expenses'}
            </span>
          </div>
          <div className="search-filter-toolbar category-filter-toolbar" aria-label="Category filters">
            <label className="toolbar-field">
              <span>Search</span>
              <input type="search" id="categorySearch" autoComplete="off" placeholder="Food, UPI, notes" value={query} onChange={e => setQuery(e.target.value)} />
            </label>
            <label className="toolbar-field">
              <span>Category</span>
              <SpendoraSelect
                id="categoryFocus"
                value={category}
                onChange={setCategory}
                placeholder="All Categories"
                kind="category"
                options={[
                  { value: '', label: 'All Categories' },
                  { value: 'Food', label: 'Food' },
                  { value: 'Transport', label: 'Transport' },
                  { value: 'Shopping', label: 'Shopping' },
                  { value: 'Bills', label: 'Bills' },
                  { value: 'Entertainment', label: 'Entertainment' },
                  { value: 'Health', label: 'Health' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
            </label>
            <label className="toolbar-field">
              <span>Payment</span>
              <SpendoraSelect
                id="categoryPayment"
                value={payment}
                onChange={setPayment}
                placeholder="All Methods"
                kind="payment"
                options={[
                  { value: '', label: 'All Methods' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Credit Card', label: 'Credit Card' },
                  { value: 'Debit Card', label: 'Debit Card' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'Net Banking', label: 'Net Banking' }
                ]}
              />
            </label>
            <label className="toolbar-field">
              <span>Sort</span>
              <SpendoraSelect id="categorySort" value={sort} onChange={setSort} placeholder="Highest spend" options={SORT_OPTIONS} />
            </label>
            <button type="button" className="btn-primary" id="applyCategoryFiltersBtn" onClick={() => notify('Category filters applied', 'info')}>
              Apply
            </button>
            <button type="button" className="btn-secondary" id="clearCategoryFiltersBtn" onClick={clear}>
              Clear
            </button>
          </div>
        </section>

        <section className="analytics-stat-grid category-stat-grid" aria-label="Category summary">
          <article className="analytics-stat-card">
            <span>Total categorized</span>
            <strong id="categoryTotalSpend">INR {stats.total.toFixed(2)}</strong>
            <small id="categoryTotalNote">{`${filtered.length} transaction${filtered.length === 1 ? '' : 's'} in view`}</small>
          </article>
          <article className="analytics-stat-card">
            <span>Active categories</span>
            <strong id="categoryActiveCount">{stats.entries.length}</strong>
            <small id="categoryActiveNote">{rangeMonths ? `${rangeMonths} month window` : 'All-time view'}</small>
          </article>
          <article className="analytics-stat-card">
            <span>Leading category</span>
            <strong id="categoryLeader">{stats.entries[0] ? stats.entries[0].category : 'None'}</strong>
            <small id="categoryLeaderNote">{stats.entries[0] ? `${stats.entries[0].percent}% of filtered spend` : 'No category leader'}</small>
          </article>
          <article className="analytics-stat-card">
            <span>Average per category</span>
            <strong id="categoryAverageSpend">INR {(stats.entries.length ? stats.total / stats.entries.length : 0).toFixed(2)}</strong>
            <small id="categoryAverageNote">Across active categories</small>
          </article>
        </section>

        <section className="category-insight-grid">
          <div className="category-column category-left-column">
            <section className="panel category-flow-panel">
              <div className="panel-head">
                <div className="panel-title-with-action">
                  <button
                    type="button"
                    className="panel-back-button"
                    id="categoryFlowBack"
                    aria-label="Go back"
                    hidden={!quickFocus}
                    onClick={() => { setCategory(''); setQuickFocus(false); }}
                  >
                    <span className="ui-icon icon-back" aria-hidden="true" />
                  </button>
                  <h2>Category Flow</h2>
                </div>
                <span className="dots">...</span>
              </div>
              <div id="categoryFlowVisual" className="category-flow-visual">
                {loading ? (
                  <p className="loading">Loading category flow...</p>
                ) : !stats.entries.length ? (
                  <div className="search-empty-state">
                    <span className="ui-icon icon-list" aria-hidden="true" />
                    <strong>No category data yet</strong>
                    <p>Add expenses or loosen the filters to see category flow.</p>
                  </div>
                ) : (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: donutSvg }} />
                    <div className="category-flow-tags">
                      {stats.entries.slice(0, 5).map((entry, index) => (
                        <button
                          key={entry.category}
                          type="button"
                          className="category-flow-tag"
                          onClick={() => {
                            setCategory(entry.category);
                            setQuickFocus(true);
                          }}
                        >
                          <i style={{ background: getCategoryColor(entry.category, index) }} />
                          <span>{entry.category}</span>
                          <strong>{entry.percent}%</strong>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="panel category-trend-panel">
              <div className="panel-head">
                <h2>Category Trends</h2>
                <span className="chart-legend"><i /> top spend <i /> second <i /> third</span>
              </div>
              <div id="categoryTrendChart" className="category-trend-chart">
                {!filtered.length || !stats.entries.length ? (
                  !loading ? <p className="empty-state">No category trends yet.</p> : null
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: trend }} />
                )}
              </div>
            </section>
          </div>

          <div className="category-column category-right-column">
            <section className="panel category-breakdown-panel">
              <div className="panel-head">
                <h2>Breakdown</h2>
                <span className="dots">...</span>
              </div>
              <div id="categoryBreakdownList" className="category-breakdown-list">
                {!stats.entries.length ? (
                  !loading ? <p className="empty-state">No categories match these filters.</p> : null
                ) : (
                  (() => {
                    const max = Math.max(...stats.entries.map(e => e.amount), 1);
                    return stats.entries.map((entry, index) => {
                      const width = Math.max((entry.amount / max) * 100, entry.amount ? 8 : 0);
                      return (
                        <article className="category-breakdown-row" key={entry.category}>
                          <span className="category-breakdown-icon" style={{ ['--category-color']: getCategoryColor(entry.category, index) }}>
                            {entry.category.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="category-breakdown-title">
                              <strong>{entry.category}</strong>
                              <em>{entry.percent}%</em>
                            </div>
                            <i><span style={{ width: `${width}%`, background: getCategoryColor(entry.category, index) }} /></i>
                            <small>{entry.count} transaction{entry.count === 1 ? '' : 's'} - {entry.topPayment}</small>
                          </div>
                          <strong>INR {entry.amount.toFixed(2)}</strong>
                        </article>
                      );
                    });
                  })()
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="panel category-detail-panel">
          <div className="panel-head">
            <h2>Category Details</h2>
            <span className="dots">...</span>
          </div>
          <div id="categoryDetailCards" className="category-detail-cards">
            {!stats.entries.length ? (
              !loading ? <p className="empty-state">No category details yet.</p> : null
            ) : (
              stats.entries.slice(0, 6).map(entry => {
                const largest = entry.largestExpense;
                const largestNote = largest ? `${largest.description || 'Untitled'} - INR ${Number(largest.amount || 0).toFixed(2)}` : 'No largest expense';
                return (
                  <article className="category-detail-card" key={entry.category}>
                    <div>
                      <span>{entry.category}</span>
                      <strong>{entry.percent}%</strong>
                    </div>
                    <p>{largestNote}</p>
                    <small>Last activity {entry.latestDate ? formatDate(entry.latestDate) : 'N/A'}</small>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function buildDonutSvg(stats) {
  if (!stats.entries.length) return '';
  let offset = 0;
  const segments = stats.entries.map((entry, index) => {
    const percent = stats.total ? (entry.amount / stats.total) * 100 : 0;
    const dashOffset = -offset;
    offset += percent;
    const color = getCategoryColor(entry.category, index);
    return `<circle class="category-donut-segment" cx="50" cy="50" r="35" pathLength="100" stroke="${color}" stroke-dasharray="${percent.toFixed(3)} ${Math.max(100 - percent, 0).toFixed(3)}" stroke-dashoffset="${dashOffset.toFixed(3)}"><title>${entry.category}: INR ${entry.amount.toFixed(2)} (${Math.round(percent)}%)</title></circle>`;
  }).join('');
  return `<div class="category-donut-wrap"><svg class="category-donut-svg" viewBox="0 0 100 100" role="img" aria-label="Category flow donut chart"><circle class="category-donut-track" cx="50" cy="50" r="35" pathLength="100"></circle>${segments}</svg><div class="category-donut-center"><span>Total</span><strong>INR ${stats.total.toFixed(0)}</strong><small>${stats.entries.length} categories</small></div></div>`;
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

export { CategoryIcon };
