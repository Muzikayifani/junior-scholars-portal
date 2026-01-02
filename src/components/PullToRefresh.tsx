import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    maxPull: 120
  });

  const progress = Math.min(pullDistance / 80, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div className={cn("relative", className)} {...handlers}>
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-opacity duration-200",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: Math.max(pullDistance - 40, 8),
        }}
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-lg",
          isRefreshing && "animate-pulse"
        )}>
          <RefreshCw
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-200",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: isRefreshing 
                ? undefined 
                : `rotate(${progress * 360}deg)`
            }}
          />
        </div>
      </div>

      {/* Content with transform */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
