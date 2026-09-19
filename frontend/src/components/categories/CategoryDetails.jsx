import { formatDate } from '../../utils/dates';

// CategoryDetails — largest-expense detail cards per category.
export default function CategoryDetails({ stats, loading }) {
  return (
    <section className="panel category-detail-panel">
      <div className="panel-head">
        <h2>Category Details</h2>
        <span className="dots">...</span>
      </div>
      <div id="categoryDetailCards" className="category-detail-cards">
        {!stats.entries.length ? (
          !loading ? <p className="empty-state">No category details yet.</p> : null
        ) : (
          stats.entries.slice(0, 6).map(entry => {
            const largest = entry.largestExpense;
            const largestNote = largest ? `${largest.description || 'Untitled'} - INR ${Number(largest.amount || 0).toFixed(2)}` : 'No largest expense';
            return (
              <article className="category-detail-card" key={entry.category}>
                <div>
                  <span>{entry.category}</span>
                  <strong>{entry.percent}%</strong>
                </div>
                <p>{largestNote}</p>
                <small>Last activity {entry.latestDate ? formatDate(entry.latestDate) : 'N/A'}</small>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
