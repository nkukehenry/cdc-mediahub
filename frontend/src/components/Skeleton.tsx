import { cn } from '@/utils/fileUtils';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />;
}
