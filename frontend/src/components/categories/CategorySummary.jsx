// CategorySummary — total/active/leader/average stat cards.
export default function CategorySummary({ stats, filteredCount, rangeMonths }) {
  return (
    <section className="analytics-stat-grid category-stat-grid" aria-label="Category summary">
      <article className="analytics-stat-card">
        <span>Total categorized</span>
        <strong id="categoryTotalSpend">INR {stats.total.toFixed(2)}</strong>
        <small id="categoryTotalNote">{`${filteredCount} transaction${filteredCount === 1 ? '' : 's'} in view`}</small>
      </article>
      <article className="analytics-stat-card">
        <span>Active categories</span>
        <strong id="categoryActiveCount">{stats.entries.length}</strong>
        <small id="categoryActiveNote">{rangeMonths ? `${rangeMonths} month window` : 'All-time view'}</small>
      </article>
      <article className="analytics-stat-card">
        <span>Leading category</span>
        <strong id="categoryLeader">{stats.entries[0] ? stats.entries[0].category : 'None'}</strong>
        <small id="categoryLeaderNote">{stats.entries[0] ? `${stats.entries[0].percent}% of filtered spend` : 'No category leader'}</small>
      </article>
      <article className="analytics-stat-card">
        <span>Average per category</span>
        <strong id="categoryAverageSpend">INR {(stats.entries.length ? stats.total / stats.entries.length : 0).toFixed(2)}</strong>
        <small id="categoryAverageNote">Across active categories</small>
      </article>
    </section>
  );
}
