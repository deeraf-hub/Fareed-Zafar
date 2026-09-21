-- Monthly spend for one customer. Grain: one row per month with any order.
SELECT date_trunc('month', order_at)::date                                  AS month,
       coalesce(sum(gross_amount)  FILTER (WHERE is_eligible_positive), 0)  AS gross_sales,
       coalesce(sum(gross_amount)  FILTER (WHERE is_eligible_positive), 0)
         + coalesce(sum(return_amount) FILTER (WHERE is_cancellation), 0)   AS net_revenue,
       count(*) FILTER (WHERE is_eligible_positive)                         AS orders
FROM orders
WHERE customer_id = :customer_id
GROUP BY 1
ORDER BY 1;
