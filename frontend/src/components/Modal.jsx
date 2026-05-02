import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-card border border-slate-200 w-full ${widths[size]}`}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg">{title}</h3>
          <button onClick={onClose} className="btn-ghost px-2 py-1">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
