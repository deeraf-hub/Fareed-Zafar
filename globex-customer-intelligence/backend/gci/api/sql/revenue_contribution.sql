-- Revenue concentration. Grain: one row per customer decile (1 = top 10% by gross sales).
-- ntile() is a window function over customers ranked by spending in the period.
WITH per_customer AS (
    SELECT customer_id, sum(gross_amount) AS gross_sales
    FROM orders
    WHERE is_eligible_positive AND customer_id IS NOT NULL
      AND order_at >= :start_at AND order_at < :end_at
    GROUP BY customer_id
),
ranked AS (
    SELECT customer_id, gross_sales,
           ntile(10) OVER (ORDER BY gross_sales DESC) AS decile
    FROM per_customer
)
SELECT decile,
       count(*)                                                  AS customers,
       sum(gross_sales)                                          AS gross_sales,
       round(sum(gross_sales) / sum(sum(gross_sales)) OVER (), 4) AS revenue_share,
       round(sum(sum(gross_sales)) OVER (ORDER BY decile)
             / sum(sum(gross_sales)) OVER (), 4)                  AS cumulative_share
FROM ranked
GROUP BY decile
ORDER BY decile;
