-- Cohort repeat purchasing. Grain: one row per (first-purchase month, months since first purchase).
-- The cohort month is the customer's first eligible purchase in the whole dataset (window
-- function), not within the selected range, so a customer is never re-assigned to a later cohort.
WITH customer_orders AS (
    SELECT customer_id,
           date_trunc('month', order_at)::date                                        AS order_month,
           min(date_trunc('month', order_at)::date) OVER (PARTITION BY customer_id)   AS cohort_month
    FROM orders
    WHERE is_eligible_positive AND customer_id IS NOT NULL
),
cohort_sizes AS (
    SELECT cohort_month, count(DISTINCT customer_id) AS cohort_size
    FROM customer_orders
    GROUP BY cohort_month
),
activity AS (
    SELECT cohort_month,
           (extract(year FROM order_month) - extract(year FROM cohort_month)) * 12
             + (extract(month FROM order_month) - extract(month FROM cohort_month)) AS months_since_first,
           count(DISTINCT customer_id) AS active_customers
    FROM customer_orders
    GROUP BY 1, 2
)
SELECT a.cohort_month,
       a.months_since_first::int                                   AS months_since_first,
       s.cohort_size,
       a.active_customers,
       round(a.active_customers::numeric / s.cohort_size, 4)       AS repeat_rate
FROM activity a
JOIN cohort_sizes s USING (cohort_month)
WHERE a.cohort_month >= :start_month AND a.cohort_month <= :end_month
  AND a.months_since_first BETWEEN 0 AND :max_months
ORDER BY a.cohort_month, a.months_since_first;
