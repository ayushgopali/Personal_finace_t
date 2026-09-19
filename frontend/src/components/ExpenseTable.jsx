import { formatDate, getInitials } from '../utils/dates';
import { getCategoryColor } from '../utils/themes';

// React equivalent of displayExpenses() — same table, same classes.
export default function ExpenseTable({ expenses, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <section className="panel expenses-panel" id="transactions">
        <div className="panel-head">
          <h2>Expenses</h2>
          <span className="dots">...</span>
        </div>
        <div id="expensesList" className="expenses-list">
          <p className="loading">Loading expenses...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel expenses-panel" id="transactions">
      <div className="panel-head">
        <h2>Expenses</h2>
        <span className="dots">...</span>
      </div>
      <div id="expensesList" className="expenses-list">
        {expenses.length === 0 ? (
          <p className="empty-state">No expenses found. Add your first expense above.</p>
        ) : (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense._id}>
                  <td data-label="Description">
                    <span className="expense-name">
                      <span className="table-avatar">{getInitials(expense.description)}</span>
                      {expense.description}
                    </span>
                  </td>
                  <td data-label="Category">
                    <span className="category-name" data-category={expense.category || 'Other'}>
                      <CategoryIcon category={expense.category} /> {expense.category}
                    </span>
                  </td>
                  <td data-label="Payment">
                    <span className="payment-method-text" data-payment-method={expense.paymentMethod || 'Unknown'}>
                      {expense.paymentMethod || 'Unknown'}
                    </span>
                  </td>
                  <td data-label="Date">{formatDate(expense.date)}</td>
                  <td data-label="Amount">INR {Number(expense.amount || 0).toFixed(2)}</td>
                  <td data-label="Actions">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

const CATEGORY_ICON_CLASS = {
  Food: 'food',
  Transport: 'transport',
  Shopping: 'shopping',
  Bills: 'bills',
  Entertainment: 'entertainment',
  Health: 'health',
  Other: 'other'
};

export function CategoryIcon({ category }) {
  const icon = CATEGORY_ICON_CLASS[category] || 'other';
  return (
    <span className={`category-icon icon-${icon}`} style={{ color: getCategoryColor(category) }} aria-hidden="true" />
  );
}
