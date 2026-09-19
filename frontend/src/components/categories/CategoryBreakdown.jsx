import { getCategoryColor } from '../../utils/themes';

// CategoryBreakdown — per-category bars with counts and top payment.
export default function CategoryBreakdown({ stats, loading }) {
  return (
    <section className="panel category-breakdown-panel">
      <div className="panel-head">
        <h2>Breakdown</h2>
        <span className="dots">...</span>
      </div>
      <div id="categoryBreakdownList" className="category-breakdown-list">
        {!stats.entries.length ? (
          !loading ? <p className="empty-state">No categories match these filters.</p> : null
        ) : (
          (() => {
            const max = Math.max(...stats.entries.map(e => e.amount), 1);
            return stats.entries.map((entry, index) => {
              const width = Math.max((entry.amount / max) * 100, entry.amount ? 8 : 0);
              return (
                <article className="category-breakdown-row" key={entry.category}>
                  <span className="category-breakdown-icon" style={{ ['--category-color']: getCategoryColor(entry.category, index) }}>
                    {entry.category.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className="category-breakdown-title">
                      <strong>{entry.category}</strong>
                      <em>{entry.percent}%</em>
                    </div>
                    <i><span style={{ width: `${width}%`, background: getCategoryColor(entry.category, index) }} /></i>
                    <small>{entry.count} transaction{entry.count === 1 ? '' : 's'} - {entry.topPayment}</small>
                  </div>
                  <strong>INR {entry.amount.toFixed(2)}</strong>
                </article>
              );
            });
          })()
        )}
      </div>
    </section>
  );
}
