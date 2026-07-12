type Props = {
  message: string | null;
  type: 'success' | 'error' | 'info';
  onDismiss?: () => void;
};

const bgMap: Record<string, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-amber-600',
};

export const Toast = ({ message, type, onDismiss }: Props) => {
  if (!message) return null;

  return (
    <div
      onClick={onDismiss}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg animate-slide-down cursor-pointer ${bgMap[type] ?? 'bg-amber-600'}`}
    >
      {message}
    </div>
  );
};
