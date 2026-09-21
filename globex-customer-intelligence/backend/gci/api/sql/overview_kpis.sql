-- Headline KPIs for a period. Grain: one row.
-- Only eligible positive orders count as sales; cancellation invoices supply returns.
WITH period_orders AS (
    SELECT invoice, customer_id, gross_amount, return_amount, is_eligible_positive, is_cancellation
    FROM orders
    WHERE order_at >= :start_at AND order_at < :end_at
),
per_customer AS (
    SELECT customer_id, count(*) AS positive_orders
    FROM period_orders
    WHERE is_eligible_positive AND customer_id IS NOT NULL
    GROUP BY customer_id
)
SELECT
    coalesce(sum(gross_amount)  FILTER (WHERE is_eligible_positive), 0)          AS gross_sales,
    coalesce(sum(return_amount) FILTER (WHERE is_cancellation), 0)               AS return_amount,
    count(*) FILTER (WHERE is_eligible_positive)                                 AS orders,
    count(*) FILTER (WHERE is_eligible_positive AND customer_id IS NULL)         AS anonymous_orders,
    (SELECT count(*) FROM per_customer)                                          AS purchasing_customers,
    (SELECT count(*) FROM per_customer WHERE positive_orders >= 2)               AS repeat_customers
FROM period_orders;
