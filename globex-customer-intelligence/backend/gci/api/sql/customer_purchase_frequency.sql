-- Purchase frequency distribution. Grain: one row per order-count bucket.
-- Uses a CTE for the per-customer count so the bucket step never touches order_items.
WITH per_customer AS (
    SELECT customer_id, count(*) AS positive_orders
    FROM orders
    WHERE is_eligible_positive AND customer_id IS NOT NULL
      AND order_at >= :start_at AND order_at < :end_at
    GROUP BY customer_id
)
SELECT
    CASE WHEN positive_orders = 1 THEN '1 order'
         WHEN positive_orders BETWEEN 2 AND 3 THEN '2-3 orders'
         WHEN positive_orders BETWEEN 4 AND 9 THEN '4-9 orders'
         ELSE '10+ orders' END                                                  AS bucket,
    min(positive_orders)                                                        AS bucket_order,
    count(*)                                                                    AS customers,
    round(100.0 * count(*) / sum(count(*)) OVER (), 1)                          AS share_pct
FROM per_customer
GROUP BY 1
ORDER BY 2;
