import SpendoraSelect from '../SpendoraSelect';

export const CATEGORY_SORT_OPTIONS = [
  { value: 'amount-desc', label: 'Highest spend' },
  { value: 'amount-asc', label: 'Lowest spend' },
  { value: 'name-asc', label: 'Category A to Z' },
  { value: 'transactions-desc', label: 'Most transactions' }
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Food', label: 'Food' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Bills', label: 'Bills' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Health', label: 'Health' },
  { value: 'Other', label: 'Other' }
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Debit Card', label: 'Debit Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Net Banking', label: 'Net Banking' }
];

// CategoryFilters — live search/category/payment/sort toolbar.
export default function CategoryFilters({
  query, onQuery,
  category, onCategory,
  payment, onPayment,
  sort, onSort,
  resultCount, loading,
  onApply, onClear
}) {
  return (
    <section className="panel category-control-panel">
      <div className="panel-head search-panel-head">
        <div>
          <h2>Live category filters</h2>
          <p>Filter category analytics by search, category, payment method, and sort preference.</p>
        </div>
        <span className="search-count" id="categoryResultCount">
          {loading ? 'Loading' : resultCount}
        </span>
      </div>
      <div className="search-filter-toolbar category-filter-toolbar" aria-label="Category filters">
        <label className="toolbar-field">
          <span>Search</span>
          <input type="search" id="categorySearch" autoComplete="off" placeholder="Food, UPI, notes" value={query} onChange={e => onQuery(e.target.value)} />
        </label>
        <label className="toolbar-field">
          <span>Category</span>
          <SpendoraSelect
            id="categoryFocus"
            value={category}
            onChange={onCategory}
            placeholder="All Categories"
            kind="category"
            options={CATEGORY_OPTIONS}
          />
        </label>
        <label className="toolbar-field">
          <span>Payment</span>
          <SpendoraSelect
            id="categoryPayment"
            value={payment}
            onChange={onPayment}
            placeholder="All Methods"
            kind="payment"
            options={PAYMENT_OPTIONS}
          />
        </label>
        <label className="toolbar-field">
          <span>Sort</span>
          <SpendoraSelect id="categorySort" value={sort} onChange={onSort} placeholder="Highest spend" options={CATEGORY_SORT_OPTIONS} />
        </label>
        <button type="button" className="btn-primary" id="applyCategoryFiltersBtn" onClick={onApply}>
          Apply
        </button>
        <button type="button" className="btn-secondary" id="clearCategoryFiltersBtn" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}
