import { CategoryIcon } from '../expenses/ExpenseRow';
import { formatDate, getInitials } from '../../utils/dates';

// SearchResults — the results panel (same rows, same actions).
export default function SearchResults({ results, loading, onEdit, onDelete }) {
  return (
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
            {results.map(expense => (
              <SearchResultRow key={expense._id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SearchResultRow({ expense, onEdit, onDelete }) {
  const description = expense.description || 'Untitled expense';
  const cat = expense.category || 'Other';
  const pay = expense.paymentMethod || 'Unknown';
  return (
    <article className="search-result-row">
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
        <button className="btn-edit" onClick={() => onEdit(expense._id)}>
          <span className="ui-icon icon-edit" aria-hidden="true" />
          Edit
        </button>
        <button className="btn-delete" onClick={() => onDelete(expense._id)}>
          <span className="ui-icon icon-trash" aria-hidden="true" />
          Delete
        </button>
      </div>
    </article>
  );
}
