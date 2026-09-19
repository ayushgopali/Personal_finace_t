import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import SearchFilters from '../components/search/SearchFilters';
import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { filterSearchExpenses } from '../utils/analytics';
import { normalizeSearchText } from '../utils/dates';

// Search — React port of search.html + initSearchPage/renderSearchResults.
// Same filters, same matching/sort, same row markup.
export default function Search() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('date-desc');

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

  const results = useMemo(() => {
    const filters = {
      query: normalizeSearchText(query),
      category,
      paymentMethod,
      startDate,
      endDate,
      sort
    };
    return filterSearchExpenses(all, filters);
  }, [all, query, category, paymentMethod, startDate, endDate, sort]);

  const clear = () => {
    setQuery('');
    setCategory('');
    setPaymentMethod('');
    setSort('date-desc');
    setStartDate('');
    setEndDate('');
    notify('Search cleared', 'info');
  };

  const handleEdit = (id) => {
    // Same handoff the legacy pages used (sessionStorage key), now as a route.
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
    <AppShell mainId="searchTop" mainClass="main-area search-main" activeRail="search">
      <section className="search-workspace" id="searchPage">
        <section className="panel search-control-panel">
          <div className="panel-head search-panel-head">
            <div>
              <h2>Search expenses</h2>
              <p>Find transactions by name, category, payment method, or notes.</p>
            </div>
            <span className="search-count" id="searchResultCount">
              {loading ? 'Loading' : all.length ? `${results.length} of ${all.length} expenses` : 'No expenses'}
            </span>
          </div>

          <SearchFilters
            category={category}
            onCategory={setCategory}
            paymentMethod={paymentMethod}
            onPaymentMethod={setPaymentMethod}
            startDate={startDate}
            onStartDate={setStartDate}
            endDate={endDate}
            onEndDate={setEndDate}
            sort={sort}
            onSort={setSort}
            onApply={() => notify('Search filters applied', 'info')}
            onClear={clear}
          />

          <SearchBar query={query} onQuery={setQuery} />
        </section>

        <SearchResults results={results} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </section>
    </AppShell>
  );
}
