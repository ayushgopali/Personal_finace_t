from __future__ import annotations

from datetime import date, datetime, timedelta

import altair as alt
import pandas as pd
import requests
import streamlit as st
import streamlit.components.v1 as components


API_URL = "http://localhost:3000/api"

st.set_page_config(
    page_title="Spendora Live Graphs",
    layout="wide",
    initial_sidebar_state="collapsed",
)


st.markdown(
    """
    <style>
        :root {
            --ink: #171714;
            --muted: #6f7066;
            --lime: #dbff34;
            --cream: #fbfaf3;
            --line: rgba(23, 23, 20, .12);
        }

        html,
        body,
        .stApp {
            background: transparent;
        }

        .block-container {
            max-width: 100%;
            padding: 0;
        }

        header[data-testid="stHeader"],
        div[data-testid="stToolbar"],
        div[data-testid="stDecoration"],
        #MainMenu,
        footer {
            display: none;
        }

        .graph-shell {
            min-height: 430px;
            padding: 18px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: linear-gradient(180deg, rgba(255, 254, 248, .96), rgba(251, 250, 243, .88));
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, .7);
        }

        .graph-top {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: start;
            gap: 16px;
            margin-bottom: 14px;
        }

        .graph-top h3 {
            margin: 0 0 7px;
            color: var(--ink);
            font-size: 1.35rem;
            line-height: 1;
            letter-spacing: 0;
            font-weight: 950;
        }

        .graph-top p {
            margin: 0;
            color: var(--muted);
            font-size: .88rem;
            line-height: 1.45;
        }

        .live-pill {
            min-height: 34px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 0 12px;
            border-radius: 999px;
            color: var(--ink);
            background: var(--lime);
            font-size: .78rem;
            font-weight: 900;
            white-space: nowrap;
        }

        .live-pill::before {
            content: "";
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #171714;
            animation: pulse 1.2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: .35; transform: scale(.82); }
            50% { opacity: 1; transform: scale(1); }
        }

        .metric-row {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
        }

        .mini-metric {
            min-height: 86px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 12px;
            background: #fffef8;
        }

        .mini-metric span {
            display: block;
            color: var(--muted);
            font-size: .74rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .08em;
        }

        .mini-metric strong {
            display: block;
            margin-top: 11px;
            color: var(--ink);
            font-size: 1.45rem;
            line-height: 1;
            font-weight: 950;
        }

        .stAlert {
            border-radius: 12px;
        }

        @media (max-width: 720px) {
            .graph-top,
            .metric-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
    """,
    unsafe_allow_html=True,
)


components.html(
    """
    <script>
        setTimeout(() => window.parent.postMessage({ type: "spendora-graph-ready" }, "*"), 200);
        setTimeout(() => window.location.reload(), 8000);
    </script>
    """,
    height=0,
)


@st.cache_data(ttl=5)
def fetch_expenses() -> pd.DataFrame:
    response = requests.get(f"{API_URL}/expenses", timeout=4)
    response.raise_for_status()
    rows = response.json()
    if not rows:
        return pd.DataFrame(columns=["description", "amount", "category", "date", "paymentMethod"])

    data = pd.DataFrame(rows)
    data["amount"] = pd.to_numeric(data["amount"], errors="coerce").fillna(0)
    data["date"] = pd.to_datetime(data["date"], errors="coerce")
    data["category"] = data["category"].fillna("Other")
    return data.dropna(subset=["date"])


def empty_chart_message() -> None:
    st.info("No expense data yet. Add expenses in the main website and this graph will update automatically.")


def render_dashboard(expenses: pd.DataFrame) -> None:
    today = pd.Timestamp(date.today())
    month_start = today.replace(day=1)
    month_data = expenses[expenses["date"] >= month_start]
    total = float(expenses["amount"].sum())
    month_total = float(month_data["amount"].sum())
    average = float(expenses["amount"].mean()) if len(expenses) else 0

    st.markdown(
        f"""
        <div class="graph-shell">
            <div class="graph-top">
                <div>
                    <h3>Live Spending Intelligence</h3>
                    <p>Realtime Streamlit graphs powered by the expenses from your main website.</p>
                </div>
                <div class="live-pill">Live sync</div>
            </div>
            <div class="metric-row">
                <div class="mini-metric"><span>Total tracked</span><strong>INR {total:,.0f}</strong></div>
                <div class="mini-metric"><span>This month</span><strong>INR {month_total:,.0f}</strong></div>
                <div class="mini-metric"><span>Average spend</span><strong>INR {average:,.0f}</strong></div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    last_30 = today - pd.Timedelta(days=30)
    daily = (
        expenses[expenses["date"] >= last_30]
        .groupby(pd.Grouper(key="date", freq="D"))["amount"]
        .sum()
        .reset_index()
    )
    all_days = pd.DataFrame({"date": pd.date_range(last_30, today, freq="D")})
    daily = all_days.merge(daily, on="date", how="left").fillna({"amount": 0})

    category = (
        expenses.groupby("category", as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=False)
    )

    trend = (
        alt.Chart(daily)
        .mark_area(
            line={"color": "#171714", "strokeWidth": 3},
            color=alt.Gradient(
                gradient="linear",
                stops=[
                    alt.GradientStop(color="#dbff34", offset=0),
                    alt.GradientStop(color="rgba(219,255,52,0.05)", offset=1),
                ],
                x1=1,
                x2=1,
                y1=0,
                y2=1,
            ),
            interpolate="monotone",
        )
        .encode(
            x=alt.X("date:T", title=None, axis=alt.Axis(labelColor="#6f7066", grid=False)),
            y=alt.Y("amount:Q", title=None, axis=alt.Axis(labelColor="#6f7066", gridColor="#e5e1d3")),
            tooltip=[
                alt.Tooltip("date:T", title="Date", format="%d %b %Y"),
                alt.Tooltip("amount:Q", title="Amount", format=",.2f"),
            ],
        )
        .properties(height=235)
    )

    bars = (
        alt.Chart(category)
        .mark_bar(cornerRadiusTopRight=8, cornerRadiusBottomRight=8, color="#171714")
        .encode(
            y=alt.Y("category:N", title=None, sort="-x", axis=alt.Axis(labelColor="#171714", labelFontWeight=700)),
            x=alt.X("amount:Q", title=None, axis=alt.Axis(labelColor="#6f7066", gridColor="#e5e1d3")),
            tooltip=[
                alt.Tooltip("category:N", title="Category"),
                alt.Tooltip("amount:Q", title="Amount", format=",.2f"),
            ],
        )
        .properties(height=235)
    )

    left, right = st.columns([1.25, 0.85], gap="medium")
    with left:
        st.altair_chart(trend.configure_view(strokeWidth=0), use_container_width=True)
    with right:
        st.altair_chart(bars.configure_view(strokeWidth=0), use_container_width=True)


try:
    expenses_df = fetch_expenses()
    if expenses_df.empty:
        st.markdown('<div class="graph-shell">', unsafe_allow_html=True)
        empty_chart_message()
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        render_dashboard(expenses_df)
except Exception as exc:
    st.markdown('<div class="graph-shell">', unsafe_allow_html=True)
    st.error(f"Streamlit graph could not reach the Node API: {exc}")
    st.markdown("</div>", unsafe_allow_html=True)
