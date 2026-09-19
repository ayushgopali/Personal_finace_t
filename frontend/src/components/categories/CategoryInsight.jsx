import { getCategoryColor } from '../../utils/themes';

// React equivalent of renderCategoryInsight() — same markup/classes.
export default function CategoryInsight({ expenses }) {
  const totals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other';
    acc[category] = (acc[category] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
  const grandTotal = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <section className="panel insight-panel" id="categories">
      <div className="panel-head">
        <h2>Category Insight</h2>
        <span className="dots">...</span>
      </div>
      <div id="categoryInsight" className="category-insight">
        {!entries.length ? (
          <p className="empty-state">No categories yet.</p>
        ) : (
          entries.map(([category, amount]) => {
            const percent = grandTotal ? Math.round((amount / grandTotal) * 100) : 0;
            return (
              <div className="insight-row" key={category}>
                <div className="insight-badge" style={{ background: getCategoryColor(category), color: '#FFFFFF' }}>
                  {category.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="insight-name">{category}</div>
                  <div className="insight-bar">
                    <span style={{ width: `${percent}%`, background: getCategoryColor(category) }} />
                  </div>
                </div>
                <div className="insight-percent">{percent}%</div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
