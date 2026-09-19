import { formatDate, getInitials } from '../../utils/dates';
import { getCategoryColor } from '../../utils/themes';

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

// One expense ledger row — same cells/classes as the legacy table rows.
export function ExpenseRow({ expense, onEdit, onDelete }) {
  return (
    <tr>
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
  );
}

export default ExpenseRow;
