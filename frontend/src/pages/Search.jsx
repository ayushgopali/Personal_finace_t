import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SpendoraSelect from '../components/SpendoraSelect';
import DatePicker from '../components/DatePicker';
import { CategoryIcon } from '../components/ExpenseTable';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { filterSearchExpenses } from '../utils/analytics';
import { formatDate, getInitials, normalizeSearchText } from '../utils/dates';

// Search — React port of search.html + initSearchPage/renderSearchResults.
// Same filters, same matching/sort, same row markup.
const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Amount high to low' },
  { value: 'amount-asc', label: 'Amount low to high' },
  { value: 'name-asc', label: 'Name A to Z' },
  { value: 'category-asc', label: 'Category A to Z' }
];

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

          <div className="search-filter-toolbar" aria-label="Search filters">
            <label className="toolbar-field">
              <span>Category</span>
              <SpendoraSelect
                id="searchCategory"
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
                id="searchPaymentMethod"
                value={paymentMethod}
                onChange={setPaymentMethod}
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
              <span>From</span>
              <div className="spendora-date-picker search-date-picker" data-placeholder="dd-mm-yyyy">
                <DatePicker id="searchStartDate" value={startDate} onChange={setStartDate} placeholder="dd-mm-yyyy" />
              </div>
            </label>
            <label className="toolbar-field">
              <span>To</span>
              <div className="spendora-date-picker search-date-picker" data-placeholder="dd-mm-yyyy">
                <DatePicker id="searchEndDate" value={endDate} onChange={setEndDate} placeholder="dd-mm-yyyy" />
              </div>
            </label>
            <label className="toolbar-field">
              <span>Sort</span>
              <SpendoraSelect
                id="searchSort"
                value={sort}
                onChange={setSort}
                placeholder="Newest first"
                options={SORT_OPTIONS}
              />
            </label>
            <button type="button" className="btn-primary" id="applySearchBtn" onClick={() => notify('Search filters applied', 'info')}>
              Apply
            </button>
            <button type="button" className="btn-secondary" id="clearSearchBtn" onClick={clear}>
              Clear
            </button>
          </div>

          <div className="search-bar-shell">
            <span className="ui-icon icon-search" aria-hidden="true" />
            <input
              type="search"
              id="expenseSearch"
              autoComplete="off"
              placeholder="Search across expenses, categories, payment methods, and notes"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <span className="search-live-pill">Live</span>
          </div>
        </section>

        <section className="panel search-results-panel">
          <div className="panel-head">
            <h2>All expenses</h2>
            <span className="dots">...</span>
          </div>
          <div id="searchResults" className="search-results-list">
            {loading ? (
              <p className="loading">Loading expenses...</p>
            ) : !results.length ? (
              <div className="search-empty-state">
                <span className="ui-icon icon-search" aria-hidden="true" />
                <strong>No matching expenses</strong>
                <p>Try a different keyword, category, payment method, or date range.</p>
              </div>
            ) : (
              <div className="search-results-table">
                <div className="search-results-head">
                  <span>Expense</span>
                  <span>Category</span>
                  <span>Payment</span>
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Actions</span>
                </div>
                {results.map(expense => {
                  const description = expense.description || 'Untitled expense';
                  const cat = expense.category || 'Other';
                  const pay = expense.paymentMethod || 'Unknown';
                  return (
                    <article className="search-result-row" key={expense._id}>
                      <div className="search-expense-cell">
                        <span className="table-avatar">{getInitials(description)}</span>
                        <div>
                          <strong>{description}</strong>
                          {expense.notes ? <small>{expense.notes}</small> : <small>No notes added</small>}
                        </div>
                      </div>
                      <div>
                        <span className="category-name" data-category={cat}>
                          <CategoryIcon category={expense.category} /> {cat}
                        </span>
                      </div>
                      <div>
                        <span className="payment-method-text" data-payment-method={pay}>{pay}</span>
                      </div>
                      <div>{formatDate(expense.date)}</div>
                      <div className="search-amount">INR {Number(expense.amount || 0).toFixed(2)}</div>
                      <div className="expense-actions">
                        <button className="btn-edit" onClick={() => handleEdit(expense._id)}>
                          <span className="ui-icon icon-edit" aria-hidden="true" />
                          Edit
                        </button>
                        <button className="btn-delete" onClick={() => handleDelete(expense._id)}>
                          <span className="ui-icon icon-trash" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
