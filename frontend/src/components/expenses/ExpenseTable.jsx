import { ExpenseRow } from './ExpenseRow';

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
                <ExpenseRow key={expense._id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
