interface ProductsGridSkeletonProps {
  count?: number;
}

export function ProductsGridSkeleton({ count = 12 }: ProductsGridSkeletonProps) {
  return (
    <div className="grid min-w-0 max-w-full grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
        >
          <div className="aspect-square animate-pulse bg-stone-200" />
          <div className="space-y-2.5 p-3">
            <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
            <div className="h-4 w-full animate-pulse rounded-full bg-stone-200" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-200" />
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 w-12 animate-pulse rounded-full bg-stone-200" />
              <div className="h-3 w-14 animate-pulse rounded-full bg-stone-200" />
            </div>
            <div className="h-4 w-24 animate-pulse rounded-full bg-stone-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
