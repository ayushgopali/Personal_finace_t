import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import AnalyticsSummary from '../components/analytics/AnalyticsSummary';
import SpendingChart from '../components/analytics/SpendingChart';
import ExpenseInsights from '../components/analytics/ExpenseInsights';
import api from '../services/api';

// Analytics — React port of analytics.html + initAnalyticsPage.
// Same summary numbers, same SVG trend, same insight cards.
export default function Analytics() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeMonths, setRangeMonths] = useState(6);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell mainId="analyticsTop" mainClass="main-area analytics-main" activeRail="analytics">
      <section className="analytics-workspace" id="analyticsPage">
        <section className="analytics-hero">
          <div>
            <span className="analytics-kicker">Analytics</span>
            <h2>Spending intelligence</h2>
            <p>Track trends, compare months, and see where your money moves across categories.</p>
          </div>
          <div className="analytics-range" aria-label="Analytics range">
            {[6, 10, 12].map(m => (
              <button
                key={m}
                type="button"
                className={rangeMonths === m ? 'active' : ''}
                data-analytics-range={m}
                onClick={() => setRangeMonths(m)}
              >
                {m}M
              </button>
            ))}
          </div>
        </section>

        <AnalyticsSummary expenses={expenses} />

        <section className="analytics-grid">
          <SpendingChart expenses={expenses} rangeMonths={rangeMonths} loading={loading} />
          <ExpenseInsights expenses={expenses} loading={loading} />
        </section>
      </section>
    </AppShell>
  );
}
