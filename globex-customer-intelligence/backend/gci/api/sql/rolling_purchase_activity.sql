-- Rolling purchase activity. Grain: one row per month.
-- Active customers per month plus a trailing three-month average (window frame).
WITH monthly AS (
    SELECT date_trunc('month', order_at)::date            AS month,
           count(DISTINCT customer_id)                    AS active_customers,
           count(*)                                       AS orders
    FROM orders
    WHERE is_eligible_positive AND customer_id IS NOT NULL
      AND order_at >= :start_at AND order_at < :end_at
    GROUP BY 1
)
SELECT month,
       active_customers,
       orders,
       round(avg(active_customers) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1)
           AS active_customers_3m_avg,
       active_customers - lag(active_customers) OVER (ORDER BY month) AS change_vs_prev_month
FROM monthly
ORDER BY month;
