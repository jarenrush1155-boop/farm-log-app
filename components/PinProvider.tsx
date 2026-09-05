'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type RequestPinOptions = {
  title?: string;
  message?: string;
};

type PinApi = {
  requestPin: (options?: RequestPinOptions) => Promise<string | null>;
  requestPinForDelete: (entityLabel?: string) => Promise<string | null>;
};

type PendingRequest = {
  title: string;
  message?: string;
  resolve: (value: string | null) => void;
};

const PinContext = createContext<PinApi | null>(null);

export function usePin(): PinApi {
  const ctx = useContext(PinContext);
  if (!ctx) {
    throw new Error('usePin must be used within PinProvider');
  }
  return ctx;
}

export default function PinProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback((value: string | null) => {
    setPending((current) => {
      if (current) current.resolve(value);
      return null;
    });
    setPin('');
  }, []);

  const requestPin = useCallback((options?: RequestPinOptions) => {
    return new Promise<string | null>((resolve) => {
      setPin('');
      setPending({
        title: options?.title ?? 'Enter PIN',
        message: options?.message,
        resolve,
      });
    });
  }, []);

  const requestPinForDelete = useCallback(
    async (entityLabel = 'this record') => {
      if (!window.confirm(`Delete ${entityLabel}? This cannot be undone.`)) {
        return null;
      }
      return requestPin({
        title: 'Enter PIN to delete',
        message: `Confirm deletion of ${entityLabel}.`,
      });
    },
    [requestPin]
  );

  const api = useMemo<PinApi>(
    () => ({
      requestPin,
      requestPinForDelete,
    }),
    [requestPin, requestPinForDelete]
  );

  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [pending]);

  useEffect(() => {
    if (!pending) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending, close]);

  const submit = () => {
    const trimmed = pin.trim();
    if (!trimmed) return;
    close(trimmed);
  };

  return (
    <PinContext.Provider value={api}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-emerald-100 p-5 sm:p-6 safe-bottom">
            <h2 id="pin-modal-title" className="text-lg font-semibold text-gray-900">
              {pending.title}
            </h2>
            {pending.message && (
              <p className="mt-2 text-sm text-gray-600">{pending.message}</p>
            )}

            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label htmlFor="pin-modal-input" className="sr-only">
                PIN
              </label>
              <input
                id="pin-modal-input"
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="form-input border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />

              <div className="mt-5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => close(null)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pin.trim()}
                  className="btn-primary w-full sm:w-auto"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PinContext.Provider>
  );
}
