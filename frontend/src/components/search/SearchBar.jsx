// SearchBar — the live search input shell.
export default function SearchBar({ query, onQuery }) {
  return (
    <div className="search-bar-shell">
      <span className="ui-icon icon-search" aria-hidden="true" />
      <input
        type="search"
        id="expenseSearch"
        autoComplete="off"
        placeholder="Search across expenses, categories, payment methods, and notes"
        value={query}
        onChange={e => onQuery(e.target.value)}
      />
      <span className="search-live-pill">Live</span>
    </div>
  );
}
