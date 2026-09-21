"""Relational schema.

Grain of each table (see docs/architecture.md for the full data dictionary):

* import_runs          one row per import attempt of a source file
* raw_transactions     one row per spreadsheet/CSV line, values preserved as text
* transactions         one row per *accepted* raw line, typed and flagged (cleaning layer)
* products             one row per stock code
* customers            one row per identified customer (anonymous lines never create one)
* orders               one row per invoice (positive orders and cancellation invoices)
* order_items          one row per accepted, non-duplicate line item (child of orders)
* customer_snapshots   one row per (customer, cutoff date): features before the cutoff,
                       labels from the following 30-day window
* customer_segments    one row per (segmentation run, customer)
* model_runs           one row per trained model version
* predictions          one row per (model run, customer)

Joining orders to order_items multiplies rows by the number of lines; monetary columns on
``orders`` are already aggregated, so sum ``orders`` for invoice-level totals and
``order_items`` for product-level totals. Never sum ``orders.gross_amount`` after joining
``order_items``.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from gci.db.base import Base

MONEY = Numeric(14, 4)


class ImportRun(Base):
    __tablename__ = "import_runs"
    __table_args__ = (
        Index(
            "ux_import_runs_sha256_succeeded",
            "file_sha256",
            unique=True,
            postgresql_where=text("status = 'succeeded'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_path: Mapped[str] = mapped_column(Text)
    source_kind: Mapped[str] = mapped_column(String(16))  # xlsx | csv
    file_sha256: Mapped[str] = mapped_column(String(64), index=True)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24))  # running|succeeded|failed|skipped_duplicate
    rows_read: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    rows_accepted: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    rows_excluded: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    rows_flagged: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    sheets: Mapped[list | None] = mapped_column(JSONB)
    validation_summary: Mapped[dict | None] = mapped_column(JSONB)
    error_message: Mapped[str | None] = mapped_column(Text)

    raw_transactions: Mapped[list[RawTransaction]] = relationship(
        back_populates="import_run", cascade="all, delete-orphan", passive_deletes=True
    )


class RawTransaction(Base):
    """Source lines exactly as read (every field kept as text) plus the validation verdict."""

    __tablename__ = "raw_transactions"
    __table_args__ = (
        Index("ix_raw_transactions_run_status", "import_run_id", "validation_status"),
        Index("ix_raw_transactions_row_hash", "row_hash"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    import_run_id: Mapped[int] = mapped_column(
        ForeignKey("import_runs.id", ondelete="CASCADE"), index=True
    )
    sheet_name: Mapped[str] = mapped_column(String(64))
    sheet_row: Mapped[int] = mapped_column(Integer)  # 1-based data row within the sheet
    invoice_raw: Mapped[str | None] = mapped_column(Text)
    stock_code_raw: Mapped[str | None] = mapped_column(Text)
    description_raw: Mapped[str | None] = mapped_column(Text)
    quantity_raw: Mapped[str | None] = mapped_column(Text)
    invoice_date_raw: Mapped[str | None] = mapped_column(Text)
    unit_price_raw: Mapped[str | None] = mapped_column(Text)
    customer_id_raw: Mapped[str | None] = mapped_column(Text)
    country_raw: Mapped[str | None] = mapped_column(Text)
    row_hash: Mapped[str] = mapped_column(String(64))
    validation_status: Mapped[str] = mapped_column(String(16))  # accepted | excluded
    exclusion_reasons: Mapped[list | None] = mapped_column(JSONB)
    flags: Mapped[list | None] = mapped_column(JSONB)

    import_run: Mapped[ImportRun] = relationship(back_populates="raw_transactions")


class Transaction(Base):
    """Cleaned, typed line items (accepted rows only). Flags decide eligibility downstream."""

    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_customer_date", "customer_id", "invoice_date"),
        Index("ix_transactions_invoice", "invoice"),
        Index("ix_transactions_stock_code", "stock_code"),
        Index("ix_transactions_invoice_date", "invoice_date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    raw_transaction_id: Mapped[int] = mapped_column(
        ForeignKey("raw_transactions.id", ondelete="CASCADE"), unique=True
    )
    import_run_id: Mapped[int] = mapped_column(
        ForeignKey("import_runs.id", ondelete="CASCADE"), index=True
    )
    invoice: Mapped[str] = mapped_column(String(32))
    stock_code: Mapped[str] = mapped_column(String(32))
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[int] = mapped_column(Integer)
    invoice_date: Mapped[datetime] = mapped_column(DateTime)
    unit_price: Mapped[Decimal] = mapped_column(MONEY)
    customer_id: Mapped[str | None] = mapped_column(String(32))
    country: Mapped[str | None] = mapped_column(String(64))
    line_amount: Mapped[Decimal] = mapped_column(MONEY)
    is_cancellation: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    is_non_product: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    is_eligible_sale: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    is_eligible_return: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )


class Product(Base):
    __tablename__ = "products"

    stock_code: Mapped[str] = mapped_column(String(32), primary_key=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_non_product: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    first_sold_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_sold_at: Mapped[datetime | None] = mapped_column(DateTime)
    units_sold: Mapped[int] = mapped_column(BigInteger, default=0, server_default=text("0"))
    gross_sales: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default=text("0"))
    order_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        Index("ix_customers_country", "country"),
        Index("ix_customers_last_order_at", "last_order_at"),
    )

    customer_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    country: Mapped[str | None] = mapped_column(String(64))
    first_order_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_order_at: Mapped[datetime | None] = mapped_column(DateTime)
    order_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    return_order_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    gross_sales: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default=text("0"))
    return_amount: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default=text("0"))
    net_revenue: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default=text("0"))
    units: Mapped[int] = mapped_column(BigInteger, default=0, server_default=text("0"))
    distinct_products: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    orders: Mapped[list[Order]] = relationship(back_populates="customer")


class Order(Base):
    """One row per invoice. Monetary columns are pre-aggregated from eligible lines."""

    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_customer_order_at", "customer_id", "order_at"),
        Index("ix_orders_order_at", "order_at"),
        Index("ix_orders_eligible_positive", "is_eligible_positive"),
    )

    invoice: Mapped[str] = mapped_column(String(32), primary_key=True)
    customer_id: Mapped[str | None] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="SET NULL")
    )
    country: Mapped[str | None] = mapped_column(String(64))
    order_at: Mapped[datetime] = mapped_column(DateTime)
    is_cancellation: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    line_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    product_line_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    units: Mapped[int] = mapped_column(BigInteger, default=0, server_default=text("0"))
    gross_amount: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default=text("0"))
    return_amount: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default=text("0"))
    net_amount: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default=text("0"))
    is_eligible_positive: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )

    customer: Mapped[Customer | None] = relationship(back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan", passive_deletes=True
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        Index("ix_order_items_invoice", "invoice"),
        Index("ix_order_items_stock_code", "stock_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    transaction_id: Mapped[int] = mapped_column(
        ForeignKey("transactions.id", ondelete="CASCADE"), unique=True
    )
    invoice: Mapped[str] = mapped_column(ForeignKey("orders.invoice", ondelete="CASCADE"))
    stock_code: Mapped[str] = mapped_column(ForeignKey("products.stock_code"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(MONEY)
    line_amount: Mapped[Decimal] = mapped_column(MONEY)
    is_eligible_sale: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    is_eligible_return: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )

    order: Mapped[Order] = relationship(back_populates="items")


class CustomerSnapshot(Base):
    """Point-in-time features (strictly before ``cutoff_date``) and forward-looking labels."""

    __tablename__ = "customer_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "customer_id", "cutoff_date", name="ux_customer_snapshots_customer_cutoff"
        ),
        Index("ix_customer_snapshots_cutoff", "cutoff_date"),
        Index("ix_customer_snapshots_split", "dataset_split"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="CASCADE")
    )
    cutoff_date: Mapped[date] = mapped_column(Date)
    horizon_days: Mapped[int] = mapped_column(Integer, default=30, server_default=text("30"))
    lookback_days: Mapped[int] = mapped_column(Integer, default=365, server_default=text("365"))

    # Features (all computed from orders with order_at < cutoff_date)
    tenure_days: Mapped[int] = mapped_column(Integer)
    recency_days: Mapped[int] = mapped_column(Integer)
    orders_lifetime: Mapped[int] = mapped_column(Integer)
    spend_lifetime: Mapped[float] = mapped_column(Float)
    avg_order_value: Mapped[float] = mapped_column(Float)
    orders_lookback: Mapped[int] = mapped_column(Integer)
    spend_lookback: Mapped[float] = mapped_column(Float)
    orders_90: Mapped[int] = mapped_column(Integer)
    spend_90: Mapped[float] = mapped_column(Float)
    orders_60: Mapped[int] = mapped_column(Integer)
    spend_60: Mapped[float] = mapped_column(Float)
    orders_30: Mapped[int] = mapped_column(Integer)
    spend_30: Mapped[float] = mapped_column(Float)
    spend_prior_90: Mapped[float] = mapped_column(Float)
    spend_trend: Mapped[float] = mapped_column(Float)
    mean_interpurchase_days: Mapped[float | None] = mapped_column(Float)
    last_interpurchase_days: Mapped[float | None] = mapped_column(Float)
    distinct_products: Mapped[int] = mapped_column(Integer)
    return_orders_lifetime: Mapped[int] = mapped_column(Integer)
    return_amount_lifetime: Mapped[float] = mapped_column(Float)
    is_uk: Mapped[bool] = mapped_column(Boolean)

    # Labels (from orders with cutoff_date <= order_at < cutoff_date + horizon_days)
    outcome_window_complete: Mapped[bool] = mapped_column(Boolean)
    label_purchased: Mapped[bool | None] = mapped_column(Boolean)
    label_spend: Mapped[float | None] = mapped_column(Float)
    dataset_split: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ModelRun(Base):
    __tablename__ = "model_runs"
    __table_args__ = (Index("ix_model_runs_type_active", "model_type", "is_active"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_type: Mapped[str] = mapped_column(String(32))  # segmentation|classification|regression
    model_version: Mapped[str] = mapped_column(String(64), unique=True)
    algorithm: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(
        String(16), default="trained", server_default=text("'trained'")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    mlflow_run_id: Mapped[str | None] = mapped_column(String(64))
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data_cutoff: Mapped[date | None] = mapped_column(Date)
    scoring_cutoff: Mapped[date | None] = mapped_column(Date)
    train_start: Mapped[date | None] = mapped_column(Date)
    train_end: Mapped[date | None] = mapped_column(Date)
    validation_start: Mapped[date | None] = mapped_column(Date)
    validation_end: Mapped[date | None] = mapped_column(Date)
    test_start: Mapped[date | None] = mapped_column(Date)
    test_end: Mapped[date | None] = mapped_column(Date)
    n_train: Mapped[int | None] = mapped_column(Integer)
    n_validation: Mapped[int | None] = mapped_column(Integer)
    n_test: Mapped[int | None] = mapped_column(Integer)
    params: Mapped[dict | None] = mapped_column(JSONB)
    metrics: Mapped[dict | None] = mapped_column(JSONB)
    comparison: Mapped[list | None] = mapped_column(JSONB)
    feature_names: Mapped[list | None] = mapped_column(JSONB)
    artifact_path: Mapped[str | None] = mapped_column(Text)
    data_version: Mapped[str | None] = mapped_column(String(64))
    code_version: Mapped[str | None] = mapped_column(String(64))
    limitations: Mapped[list | None] = mapped_column(JSONB)


class CustomerSegment(Base):
    __tablename__ = "customer_segments"
    __table_args__ = (
        UniqueConstraint("model_run_id", "customer_id", name="ux_customer_segments_run_customer"),
        Index("ix_customer_segments_customer", "customer_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    model_run_id: Mapped[int] = mapped_column(ForeignKey("model_runs.id", ondelete="CASCADE"))
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="CASCADE")
    )
    cutoff_date: Mapped[date] = mapped_column(Date)
    cluster_id: Mapped[int] = mapped_column(Integer)
    segment_name: Mapped[str] = mapped_column(String(64))
    recency_days: Mapped[int] = mapped_column(Integer)
    frequency: Mapped[int] = mapped_column(Integer)
    monetary: Mapped[float] = mapped_column(Float)


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        UniqueConstraint("model_run_id", "customer_id", name="ux_predictions_run_customer"),
        Index("ix_predictions_customer", "customer_id"),
        Index("ix_predictions_run_rank", "model_run_id", "rank"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    model_run_id: Mapped[int] = mapped_column(ForeignKey("model_runs.id", ondelete="CASCADE"))
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="CASCADE")
    )
    snapshot_id: Mapped[int | None] = mapped_column(
        ForeignKey("customer_snapshots.id", ondelete="SET NULL")
    )
    prediction_type: Mapped[str] = mapped_column(String(32))
    cutoff_date: Mapped[date] = mapped_column(Date)
    probability: Mapped[float | None] = mapped_column(Float)
    predicted_spend: Mapped[float | None] = mapped_column(Float)
    rank: Mapped[int | None] = mapped_column(Integer)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
