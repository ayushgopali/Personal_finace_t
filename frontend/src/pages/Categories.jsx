import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import CategoryFilters from '../components/categories/CategoryFilters';
import CategorySummary from '../components/categories/CategorySummary';
import CategoryFlow from '../components/categories/CategoryFlow';
import CategoryBreakdown from '../components/categories/CategoryBreakdown';
import CategoryTrends from '../components/categories/CategoryTrends';
import CategoryDetails from '../components/categories/CategoryDetails';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { getCategoryStats } from '../utils/analytics';
import { getRecentMonths, normalizeSearchText } from '../utils/dates';

// Categories — React port of categories.html + renderCategoriesPage.
// Same range/filter/sort semantics, same donut/breakdown/trend/detail visuals.
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

  const resultCount = all.length ? `${filtered.length} of ${all.length} expenses` : 'No expenses';

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

        <CategoryFilters
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          payment={payment}
          onPayment={setPayment}
          sort={sort}
          onSort={setSort}
          resultCount={resultCount}
          loading={loading}
          onApply={() => notify('Category filters applied', 'info')}
          onClear={clear}
        />

        <CategorySummary stats={stats} filteredCount={filtered.length} rangeMonths={rangeMonths} />

        <section className="category-insight-grid">
          <div className="category-column category-left-column">
            <CategoryFlow
              stats={stats}
              loading={loading}
              quickFocus={quickFocus}
              onQuickFocus={(c) => { setCategory(c); setQuickFocus(true); }}
              onBack={() => { setCategory(''); setQuickFocus(false); }}
            />
            <CategoryTrends expenses={filtered} stats={stats} rangeMonths={rangeMonths} loading={loading} />
          </div>

          <div className="category-column category-right-column">
            <CategoryBreakdown stats={stats} loading={loading} />
          </div>
        </section>

        <CategoryDetails stats={stats} loading={loading} />
      </section>
    </AppShell>
  );
}
