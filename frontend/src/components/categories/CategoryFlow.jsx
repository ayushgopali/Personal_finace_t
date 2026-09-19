import { useMemo } from 'react';
import { getCategoryColor } from '../../utils/themes';

// CategoryFlow — donut visual + quick-focus tags + back button.
export default function CategoryFlow({ stats, loading, quickFocus, onQuickFocus, onBack }) {
  const donutSvg = useMemo(() => buildDonutSvg(stats), [stats]);
  return (
    <section className="panel category-flow-panel">
      <div className="panel-head">
        <div className="panel-title-with-action">
          <button
            type="button"
            className="panel-back-button"
            id="categoryFlowBack"
            aria-label="Go back"
            hidden={!quickFocus}
            onClick={onBack}
          >
            <span className="ui-icon icon-back" aria-hidden="true" />
          </button>
          <h2>Category Flow</h2>
        </div>
        <span className="dots">...</span>
      </div>
      <div id="categoryFlowVisual" className="category-flow-visual">
        {loading ? (
          <p className="loading">Loading category flow...</p>
        ) : !stats.entries.length ? (
          <div className="search-empty-state">
            <span className="ui-icon icon-list" aria-hidden="true" />
            <strong>No category data yet</strong>
            <p>Add expenses or loosen the filters to see category flow.</p>
          </div>
        ) : (
          <>
            <div dangerouslySetInnerHTML={{ __html: donutSvg }} />
            <div className="category-flow-tags">
              {stats.entries.slice(0, 5).map((entry, index) => (
                <button
                  key={entry.category}
                  type="button"
                  className="category-flow-tag"
                  onClick={() => onQuickFocus(entry.category)}
                >
                  <i style={{ background: getCategoryColor(entry.category, index) }} />
                  <span>{entry.category}</span>
                  <strong>{entry.percent}%</strong>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function buildDonutSvg(stats) {
  if (!stats.entries.length) return '';
  let offset = 0;
  const segments = stats.entries.map((entry, index) => {
    const percent = stats.total ? (entry.amount / stats.total) * 100 : 0;
    const dashOffset = -offset;
    offset += percent;
    const color = getCategoryColor(entry.category, index);
    return `<circle class="category-donut-segment" cx="50" cy="50" r="35" pathLength="100" stroke="${color}" stroke-dasharray="${percent.toFixed(3)} ${Math.max(100 - percent, 0).toFixed(3)}" stroke-dashoffset="${dashOffset.toFixed(3)}"><title>${entry.category}: INR ${entry.amount.toFixed(2)} (${Math.round(percent)}%)</title></circle>`;
  }).join('');
  return `<div class="category-donut-wrap"><svg class="category-donut-svg" viewBox="0 0 100 100" role="img" aria-label="Category flow donut chart"><circle class="category-donut-track" cx="50" cy="50" r="35" pathLength="100"></circle>${segments}</svg><div class="category-donut-center"><span>Total</span><strong>INR ${stats.total.toFixed(0)}</strong><small>${stats.entries.length} categories</small></div></div>`;
}
