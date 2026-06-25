interface ShopsGridSkeletonProps {
  count?: number;
}

export function ShopsGridSkeleton({ count = 9 }: ShopsGridSkeletonProps) {
  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
        >
          <div className="relative h-36 bg-stone-100">
            <div className="h-full w-full animate-pulse bg-stone-200" />
            <div className="absolute left-1/2 bottom-0 h-20 w-20 -translate-x-1/2 translate-y-1/2 rounded-full border-4 border-white bg-white">
              <div className="h-full w-full animate-pulse rounded-full bg-stone-200" />
            </div>
          </div>
          <div className="space-y-3 px-5 pb-5 pt-12">
            <div className="mx-auto h-5 w-36 animate-pulse rounded-full bg-stone-200" />
            <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-stone-200" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-stone-200" />
              <div className="mx-auto h-3 w-3/4 animate-pulse rounded-full bg-stone-200" />
            </div>
            <div className="mx-auto h-4 w-40 animate-pulse rounded-full bg-stone-200" />
            <div className="h-10 w-full animate-pulse rounded-full bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
