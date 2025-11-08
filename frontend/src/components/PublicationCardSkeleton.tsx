import Skeleton from './Skeleton';

export default function PublicationCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 md:p-4 space-y-4">
      <Skeleton className="w-full aspect-[16/10] rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
      </div>
    </div>
  );
}
