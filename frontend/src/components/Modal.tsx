import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideClose?: boolean;
}

export const Modal = ({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  className,
  hideClose = false,
}: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <motion.button
            type="button"
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-[#001a35]/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border border-white/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]',
              className,
            )}
            role="dialog"
            aria-modal="true"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#002855] via-blue-600 to-[#002855]" />

            {(title || !hideClose) && (
              <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 md:px-8">
                <div>
                  {eyebrow && (
                    <p className="mb-1 text-[9px] font-black uppercase tracking-[0.24em] text-blue-600">
                      {eyebrow}
                    </p>
                  )}
                  {title && (
                    <h2 className="text-xl font-black uppercase leading-tight tracking-tighter text-[#002855] md:text-2xl">
                      {title}
                    </h2>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                    aria-label="Cerrar ventana"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </header>
            )}

            <div className="custom-scroll flex-1 overflow-y-auto">{children}</div>

            {footer && (
              <footer className="border-t border-slate-100 bg-slate-50 px-6 py-4 md:px-8">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
