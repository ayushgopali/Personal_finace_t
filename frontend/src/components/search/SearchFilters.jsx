import SpendoraSelect from '../SpendoraSelect';
import DatePicker from '../DatePicker';

export const SEARCH_SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Amount high to low' },
  { value: 'amount-asc', label: 'Amount low to high' },
  { value: 'name-asc', label: 'Name A to Z' },
  { value: 'category-asc', label: 'Category A to Z' }
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

// SearchFilters — category/payment/date/sort toolbar + Apply/Clear.
export default function SearchFilters({
  category, onCategory,
  paymentMethod, onPaymentMethod,
  startDate, onStartDate,
  endDate, onEndDate,
  sort, onSort,
  onApply, onClear
}) {
  return (
    <div className="search-filter-toolbar" aria-label="Search filters">
      <label className="toolbar-field">
        <span>Category</span>
        <SpendoraSelect
          id="searchCategory"
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
          id="searchPaymentMethod"
          value={paymentMethod}
          onChange={onPaymentMethod}
          placeholder="All Methods"
          kind="payment"
          options={PAYMENT_OPTIONS}
        />
      </label>
      <label className="toolbar-field">
        <span>From</span>
        <div className="spendora-date-picker search-date-picker" data-placeholder="dd-mm-yyyy">
          <DatePicker id="searchStartDate" value={startDate} onChange={onStartDate} placeholder="dd-mm-yyyy" />
        </div>
      </label>
      <label className="toolbar-field">
        <span>To</span>
        <div className="spendora-date-picker search-date-picker" data-placeholder="dd-mm-yyyy">
          <DatePicker id="searchEndDate" value={endDate} onChange={onEndDate} placeholder="dd-mm-yyyy" />
        </div>
      </label>
      <label className="toolbar-field">
        <span>Sort</span>
        <SpendoraSelect
          id="searchSort"
          value={sort}
          onChange={onSort}
          placeholder="Newest first"
          options={SEARCH_SORT_OPTIONS}
        />
      </label>
      <button type="button" className="btn-primary" id="applySearchBtn" onClick={onApply}>
        Apply
      </button>
      <button type="button" className="btn-secondary" id="clearSearchBtn" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
