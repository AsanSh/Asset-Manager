import { toast } from "sonner";
import { Check, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Check className="h-5 w-5 text-emerald-600" />,
      className:
        "am-card border-emerald-200/50 bg-gradient-to-br from-emerald-50/90 to-white/90",
    });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      className:
        "am-card border-red-200/50 bg-gradient-to-br from-red-50/90 to-white/90",
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      className:
        "am-card border-amber-200/50 bg-gradient-to-br from-amber-50/90 to-white/90",
    });
  },

  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Info className="h-5 w-5 text-blue-600" />,
      className:
        "am-card border-blue-200/50 bg-gradient-to-br from-blue-50/90 to-white/90",
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      className: "am-card",
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
      className: "am-card",
    });
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },
};

// Common toast messages
export const commonToasts = {
  saved: () => showToast.success("Сохранено успешно"),
  deleted: () => showToast.success("Удалено успешно"),
  updated: () => showToast.success("Обновлено успешно"),
  created: () => showToast.success("Создано успешно"),
  copied: () => showToast.success("Скопировано в буфер обмена"),
  saveFailed: () => showToast.error("Не удалось сохранить"),
  deleteFailed: () => showToast.error("Не удалось удалить"),
  loadFailed: () => showToast.error("Не удалось загрузить данные"),
  networkError: () =>
    showToast.error("Ошибка сети", {
      description: "Проверьте подключение к интернету",
    }),
  validationError: () =>
    showToast.error("Ошибка валидации", {
      description: "Проверьте правильность введенных данных",
    }),
  unauthorized: () =>
    showToast.error("Доступ запрещен", {
      description: "У вас нет прав для этого действия",
    }),
};
