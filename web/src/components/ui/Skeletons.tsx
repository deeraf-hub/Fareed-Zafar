export const ProductCardSkeleton = () => (
  <div className="card overflow-hidden">
    <div className="skeleton aspect-4/3 rounded-none" />
    <div className="space-y-3 p-4">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-5 w-24" />
      <div className="skeleton h-11 w-full" />
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

export const ProductDetailSkeleton = () => (
  <div className="grid gap-8 lg:grid-cols-2">
    <div className="skeleton aspect-4/3 w-full" />
    <div className="space-y-4">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-8 w-3/4" />
      <div className="skeleton h-6 w-32" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-11 w-48" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
  <div className="space-y-3" aria-hidden="true">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((__, colIndex) => (
          <div key={colIndex} className="skeleton h-5" />
        ))}
      </div>
    ))}
  </div>
);

export const StatCardSkeleton = () => (
  <div className="card space-y-3 p-5">
    <div className="skeleton h-4 w-24" />
    <div className="skeleton h-8 w-20" />
  </div>
);
