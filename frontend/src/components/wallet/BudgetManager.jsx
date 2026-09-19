// BudgetManager — monthly budget input, meter, insights, and status alert.
export default function BudgetManager({
  budget, spent, percent, remaining,
  status, statusClass, txCount, average, topCategory,
  budgetInput, onBudgetInput, onSaveBudget
}) {
  return (
    <section className="panel budget-manager-panel">
      <div className="panel-head">
        <h2>Monthly Budget Manager</h2>
        <span className={`budget-status-pill ${statusClass}`} id="budgetStatusPill">{status.label}</span>
      </div>

      <div className="budget-input-row">
        <label>
          <span>Monthly budget</span>
          <input
            type="number"
            id="monthlyBudgetInput"
            min="0"
            step="100"
            placeholder="Enter amount in INR"
            value={budgetInput}
            onChange={e => onBudgetInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveBudget();
              }
            }}
          />
        </label>
        <button type="button" className="btn-primary" id="saveBudgetBtn" onClick={onSaveBudget}>Update</button>
      </div>

      <div className={`budget-meter-card ${statusClass}`} id="budgetMeterCard">
        <div className="budget-meter-top">
          <div>
            <span>Spent this month</span>
            <strong id="budgetSpent">INR {spent.toFixed(2)}</strong>
          </div>
          <div>
            <span>Budget</span>
            <strong id="budgetLimit">{budget > 0 ? `INR ${budget.toFixed(2)}` : 'INR 0.00'}</strong>
          </div>
        </div>

        <div className="budget-progress-shell" aria-label="Monthly budget usage">
          <span id="budgetProgressFill" className={statusClass} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>

        <div className="budget-meter-bottom">
          <strong id="budgetPercent">{budget > 0 ? `${Math.round(percent)}%` : '0%'}</strong>
          <span id="budgetRemaining">
            {budget <= 0
              ? 'Set a budget to start tracking.'
              : remaining >= 0
                ? `INR ${remaining.toFixed(2)} remaining this month.`
                : `INR ${Math.abs(remaining).toFixed(2)} over budget.`}
          </span>
        </div>
      </div>

      <div className="budget-insight-grid">
        <article>
          <span>Transactions</span>
          <strong id="budgetTransactions">{txCount}</strong>
        </article>
        <article>
          <span>Average spend</span>
          <strong id="budgetAverage">INR {average.toFixed(2)}</strong>
        </article>
        <article>
          <span>Top category</span>
          <strong id="budgetTopCategory">{topCategory ? topCategory.category : 'None'}</strong>
        </article>
      </div>

      <div className={`budget-alert ${statusClass}`} id="budgetAlert">
        {status.message}
      </div>
    </section>
  );
}
