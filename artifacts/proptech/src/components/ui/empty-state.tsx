import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <Icon className="h-10 w-10 text-gray-400" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-gray-600 max-w-sm mb-6">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button onClick={action.onClick} className="am-press">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="am-press"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Preset Empty States
export function NoDataEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      title="Нет данных"
      description="Добавьте первую запись, чтобы начать работу"
      action={
        onAdd
          ? {
              label: "Добавить",
              onClick: onAdd,
            }
          : undefined
      }
    />
  );
}

export function NoResultsEmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      title="Ничего не найдено"
      description="Попробуйте изменить параметры поиска или фильтры"
      action={
        onClear
          ? {
              label: "Сбросить фильтры",
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Ошибка загрузки"
      description="Не удалось загрузить данные. Попробуйте еще раз"
      action={
        onRetry
          ? {
              label: "Повторить",
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
