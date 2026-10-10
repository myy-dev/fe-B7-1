import { useEffect, useId, useRef, type ReactNode } from 'react';

export default function ConfirmDialog({
  title,
  description,
  pending,
  confirmLabel,
  pendingLabel,
  closeLabel,
  onConfirm,
  onClose,
  error,
  danger = false,
}: {
  title: string;
  description: ReactNode;
  pending: boolean;
  confirmLabel: string;
  pendingLabel: string;
  closeLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  error?: string;
  danger?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirming = useRef(false);
  const id = useId();
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  async function confirm() {
    if (pending || confirming.current) return;
    confirming.current = true;
    try {
      await onConfirm();
    } finally {
      confirming.current = false;
    }
  }
  function close() {
    if (!pending && !confirming.current) dialog.current?.close();
  }
  return (
    <dialog
      ref={dialog}
      className="modal modal-middle"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onClose={onClose}
      onCancel={(event) => {
        if (pending || confirming.current) event.preventDefault();
      }}
    >
      <div className="modal-box space-y-4 border border-base-300 bg-base-100">
        <h2 id={`${id}-title`} className="text-lg font-bold">
          {title}
        </h2>
        <p id={`${id}-description`} className="text-sm wrap-anywhere text-base-content/70">
          {description}
        </p>
        {error && (
          <p role="alert" className="alert text-sm alert-error">
            {error}
          </p>
        )}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={close}
            autoFocus
          >
            취소
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-error' : 'btn-primary'}`}
            disabled={pending}
            onClick={() => void confirm()}
          >
            {pending && <span aria-hidden="true" className="loading loading-sm loading-spinner" />}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={closeLabel}
        disabled={pending}
        onClick={close}
      />
    </dialog>
  );
}
