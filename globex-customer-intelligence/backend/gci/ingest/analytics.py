"""Build the analytical tables (products, customers, orders, order_items) from ``transactions``.

Everything here is set-based SQL executed inside PostgreSQL. Rebuilding replaces the analytical
tables and, because they are its inputs, also clears snapshots, segments and predictions
(model runs are kept; re-run ``gci build-features`` and ``gci predict`` afterwards).
"""

from __future__ import annotations

import logging

from sqlalchemy import text

from gci.db.session import session_scope

log = logging.getLogger(__name__)

_TRUNCATE = """
TRUNCATE predictions, customer_segments, customer_snapshots,
         order_items, orders, customers, products
RESTART IDENTITY CASCADE
"""

_PRODUCTS = """
INSERT INTO products (stock_code, description, is_non_product, first_sold_at, last_sold_at,
                      units_sold, gross_sales, order_count)
SELECT stock_code,
       mode() WITHIN GROUP (ORDER BY description) FILTER (WHERE description IS NOT NULL),
       bool_or(is_non_product),
       min(invoice_date) FILTER (WHERE is_eligible_sale),
       max(invoice_date) FILTER (WHERE is_eligible_sale),
       coalesce(sum(quantity)    FILTER (WHERE is_eligible_sale), 0),
       coalesce(sum(line_amount) FILTER (WHERE is_eligible_sale), 0),
       count(DISTINCT invoice)   FILTER (WHERE is_eligible_sale)
FROM transactions
WHERE NOT is_duplicate
GROUP BY stock_code
"""

_CUSTOMERS = """
INSERT INTO customers (customer_id, country, order_count, return_order_count, gross_sales,
                       return_amount, net_revenue, units, distinct_products, updated_at)
SELECT customer_id,
       mode() WITHIN GROUP (ORDER BY country) FILTER (WHERE country IS NOT NULL),
       0, 0, 0, 0, 0, 0, 0, now()
FROM transactions
WHERE customer_id IS NOT NULL AND NOT is_duplicate
GROUP BY customer_id
"""

_ORDERS = """
WITH lines AS (
    SELECT invoice, customer_id, country, invoice_date, quantity, line_amount,
           is_cancellation, is_non_product, is_eligible_sale, is_eligible_return
    FROM transactions
    WHERE NOT is_duplicate
),
agg AS (
    SELECT invoice,
           max(customer_id)                                        AS customer_id,
           mode() WITHIN GROUP (ORDER BY country)                  AS country,
           min(invoice_date)                                       AS order_at,
           bool_or(is_cancellation)                                AS is_cancellation,
           count(*)                                                AS line_count,
           count(*) FILTER (WHERE NOT is_non_product)              AS product_line_count,
           coalesce(sum(quantity)    FILTER (WHERE is_eligible_sale), 0)   AS units,
           coalesce(sum(line_amount) FILTER (WHERE is_eligible_sale), 0)   AS gross_amount,
           coalesce(sum(line_amount) FILTER (WHERE is_eligible_return), 0) AS return_amount
    FROM lines
    GROUP BY invoice
)
INSERT INTO orders (invoice, customer_id, country, order_at, is_cancellation, is_anonymous,
                    line_count, product_line_count, units, gross_amount, return_amount,
                    net_amount, is_eligible_positive)
SELECT invoice, customer_id, country, order_at, is_cancellation, customer_id IS NULL,
       line_count, product_line_count, units, gross_amount, return_amount,
       gross_amount + return_amount,
       (NOT is_cancellation) AND gross_amount > 0
FROM agg
"""

_ORDER_ITEMS = """
INSERT INTO order_items (transaction_id, invoice, stock_code, quantity, unit_price, line_amount,
                         is_eligible_sale, is_eligible_return)
SELECT id, invoice, stock_code, quantity, unit_price, line_amount,
       is_eligible_sale, is_eligible_return
FROM transactions
WHERE NOT is_duplicate
"""

_CUSTOMER_AGG = """
UPDATE customers c
SET first_order_at     = s.first_order_at,
    last_order_at      = s.last_order_at,
    order_count        = s.order_count,
    return_order_count = s.return_order_count,
    gross_sales        = s.gross_sales,
    return_amount      = s.return_amount,
    net_revenue        = s.gross_sales + s.return_amount,
    units              = s.units,
    updated_at         = now()
FROM (
    SELECT customer_id,
           min(order_at) FILTER (WHERE is_eligible_positive)  AS first_order_at,
           max(order_at) FILTER (WHERE is_eligible_positive)  AS last_order_at,
           count(*)      FILTER (WHERE is_eligible_positive)  AS order_count,
           count(*)      FILTER (WHERE is_cancellation AND return_amount < 0)
                                                              AS return_order_count,
           coalesce(sum(gross_amount), 0)                     AS gross_sales,
           coalesce(sum(return_amount), 0)                    AS return_amount,
           coalesce(sum(units), 0)                            AS units
    FROM orders
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
) s
WHERE s.customer_id = c.customer_id
"""

_CUSTOMER_VARIETY = """
UPDATE customers c
SET distinct_products = d.n
FROM (
    SELECT o.customer_id, count(DISTINCT oi.stock_code) AS n
    FROM orders o
    JOIN order_items oi ON oi.invoice = o.invoice
    WHERE oi.is_eligible_sale AND o.customer_id IS NOT NULL
    GROUP BY o.customer_id
) d
WHERE d.customer_id = c.customer_id
"""

_ANALYZE = "ANALYZE products, customers, orders, order_items"


def build_analytics() -> dict[str, int]:
    """Rebuild the analytical layer. Returns row counts per table."""
    with session_scope() as session:
        session.execute(text(_TRUNCATE))
        session.execute(text(_PRODUCTS))
        session.execute(text(_CUSTOMERS))
        session.execute(text(_ORDERS))
        session.execute(text(_ORDER_ITEMS))
        session.execute(text(_CUSTOMER_AGG))
        session.execute(text(_CUSTOMER_VARIETY))
        session.execute(text(_ANALYZE))
        counts = {}
        for table in ("products", "customers", "orders", "order_items"):
            counts[table] = int(session.execute(text(f"SELECT count(*) FROM {table}")).scalar())
    log.info("analytics built", extra=counts)
    return counts
