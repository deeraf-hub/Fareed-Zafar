# Analytical SQL

Readable queries used by the API services and the notebooks. Grain and double-counting rules:

| Table | Grain | Monetary columns |
|---|---|---|
| `orders` | one invoice | `gross_amount`, `return_amount`, `net_amount` are already summed over eligible lines |
| `order_items` | one accepted, non-duplicate line | `line_amount` = quantity x unit price |
| `customers` | one identified customer | lifetime aggregates of eligible orders |
| `customer_snapshots` | one customer at one cutoff | features before the cutoff, labels after it |

Sum `orders` for invoice- or customer-level revenue. Join `order_items` only for product-level
questions, and never sum `orders.gross_amount` after that join (each invoice would be counted once
per line).
