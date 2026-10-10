import { useEffect, useEffectEvent } from 'react';

export default function FeedbackToast({
  message,
  error = false,
  closeLabel,
  onClose,
}: {
  message: string;
  error?: boolean;
  closeLabel: string;
  onClose: () => void;
}) {
  const dismiss = useEffectEvent(onClose);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(timer);
  }, [message, error]);
  return (
    <div className="toast toast-center toast-top z-50 w-max max-w-full px-4">
      <div
        role={error ? 'alert' : 'status'}
        className={`alert text-sm shadow-lg ${error ? 'alert-error' : 'alert-success'}`}
      >
        <span>{message}</span>
        <button
          type="button"
          aria-label={closeLabel}
          className="btn btn-circle btn-ghost btn-xs"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
