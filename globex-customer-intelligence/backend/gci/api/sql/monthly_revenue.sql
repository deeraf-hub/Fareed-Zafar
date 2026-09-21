-- Monthly revenue trend. Grain: one row per calendar month.
-- Gross sales come from eligible positive orders; net revenue adds recorded returns.
SELECT
    date_trunc('month', order_at)::date                                         AS month,
    coalesce(sum(gross_amount)  FILTER (WHERE is_eligible_positive), 0)         AS gross_sales,
    coalesce(sum(gross_amount)  FILTER (WHERE is_eligible_positive), 0)
      + coalesce(sum(return_amount) FILTER (WHERE is_cancellation), 0)          AS net_revenue,
    count(*) FILTER (WHERE is_eligible_positive)                                AS orders,
    count(DISTINCT customer_id) FILTER (WHERE is_eligible_positive)             AS purchasing_customers
FROM orders
WHERE order_at >= :start_at AND order_at < :end_at
GROUP BY 1
ORDER BY 1;
