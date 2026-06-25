import { Star } from "lucide-react";

interface ProductRatingStarsProps {
  rating?: number | null;
  showValue?: boolean;
  sizeClassName?: string;
}

const getSafeRating = (rating?: number | null) => {
  if (typeof rating !== "number" || !Number.isFinite(rating)) {
    return 0;
  }

  return Math.min(Math.max(rating, 0), 5);
};

export function ProductRatingStars({
  rating,
  showValue = true,
  sizeClassName = "h-4 w-4",
}: ProductRatingStarsProps) {
  const safeRating = getSafeRating(rating);

  return (
    <div
      className="inline-flex items-center gap-1.5"
      aria-label={`Rating ${safeRating.toFixed(1)} out of 5`}
    >
      <div className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => {
          const fillPercent = Math.min(Math.max(safeRating - index, 0), 1) * 100;

          return (
            <span key={index} className="relative inline-flex">
              <Star className={`${sizeClassName} text-stone-300`} />
              <span
                className="absolute inset-0 overflow-hidden text-amber-400"
                style={{ width: `${fillPercent}%` }}
              >
                <Star className={`${sizeClassName} fill-amber-400`} />
              </span>
            </span>
          );
        })}
      </div>

      {showValue ? (
        <span className="text-sm font-semibold text-gray-900">
          {safeRating.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
