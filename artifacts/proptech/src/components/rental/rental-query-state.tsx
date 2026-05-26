import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api-error";

interface RentalQueryStateProps {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  skeletonRows?: number;
  children: React.ReactNode;
}

export function RentalQueryState({
  isLoading,
  isError,
  error,
  onRetry,
  skeletonRows = 5,
  children,
}: RentalQueryStateProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-900">Не удалось загрузить данные</p>
          <p className="text-sm text-red-700 mt-1">{getApiErrorMessage(error)}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5" />
              Повторить
            </Button>
          )}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
