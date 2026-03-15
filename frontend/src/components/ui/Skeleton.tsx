interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-bark-200 dark:bg-bark-700 rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-bark-800 rounded-xl border border-bark-100 dark:border-bark-700 shadow-sm overflow-hidden">
      <Skeleton className="h-36 rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="h-6 w-16 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
