import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Boxes,
  FileClock,
  PackageX,
  ShoppingBag,
  ShoppingCart,
  Tags,
  TrendingUp,
  Trash2,
  Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

const REPORTS = [
  { slug: 'inventory', title: 'Inventory report', description: 'Stock on hand with cost and retail value, per variant and location.', icon: Boxes, permission: 'report:view' },
  { slug: 'stock-movements', title: 'Stock movement report', description: 'Every stock change, filterable by date, product, type, user and location.', icon: FileClock, permission: 'report:view' },
  { slug: 'purchases', title: 'Purchase report', description: 'What was ordered, from whom, and how much is still outstanding.', icon: ShoppingCart, permission: 'report:view' },
  { slug: 'sales', title: 'Sales report', description: 'Sales by order, with units, discounts and payment method.', icon: ShoppingBag, permission: 'report:view' },
  { slug: 'profit', title: 'Profit report', description: 'Revenue less cost of goods sold, with gross profit and margin.', icon: TrendingUp, permission: 'report:financial' },
  { slug: 'low-stock', title: 'Low stock report', description: 'Everything at or below its reorder level, with the shortfall.', icon: AlertTriangle, permission: 'report:view' },
  { slug: 'out-of-stock', title: 'Out of stock report', description: 'Variants with nothing left to sell.', icon: PackageX, permission: 'report:view' },
  { slug: 'damaged', title: 'Damaged stock report', description: 'Damaged and lost stock, with the cost written off.', icon: Trash2, permission: 'report:view' },
  { slug: 'suppliers', title: 'Supplier report', description: 'Spend by supplier, units purchased and outstanding balances.', icon: Truck, permission: 'report:view' },
  { slug: 'categories', title: 'Category report', description: 'Stock value and sales performance by category.', icon: Tags, permission: 'report:view' },
  { slug: 'product-performance', title: 'Product performance', description: 'Best and worst sellers, with stock still on hand.', icon: Banknote, permission: 'report:view' },
];

export default function ReportsPage() {
  const { can } = useAuth();
  const available = REPORTS.filter((report) => can(report.permission));

  return (
    <>
      <PageHeader
        title="Reports"
        description="Every report can be filtered by date and location, and exported to CSV."
        breadcrumbs={[{ label: 'Reports' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {available.map((report) => (
          <Link
            key={report.slug}
            to={`/reports/${report.slug}`}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex h-full items-start gap-3 p-5">
                <span className="shrink-0 rounded-lg bg-slate-100 p-2.5 text-slate-700">
                  <report.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{report.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
