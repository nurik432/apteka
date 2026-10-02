import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PosDialogProps {
  title: string;
  subtitle?: ReactNode;
  /** Блок справа в шапке, например сумма к оплате */
  headerRight?: ReactNode;
  width?: number;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Общая оболочка окон кассы. data-pos-modal отключает горячие клавиши кассы, пока окно открыто. */
export default function PosDialog({ title, subtitle, headerRight, width = 420, onClose, footer, children, className = '' }: PosDialogProps) {
  return createPortal(
    <div
      className="pos-modal-overlay"
      data-pos-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`pos-dialog animate-scaleIn ${className}`} style={{ maxWidth: width }}>
        <div className="pos-dialog-head">
          <div className="min-w-0 flex-1">
            <h3 className="pos-dialog-title">{title}</h3>
            {subtitle && <p className="pos-dialog-sub">{subtitle}</p>}
          </div>
          {headerRight}
        </div>
        <div className="pos-dialog-body">{children}</div>
        {footer && <div className="pos-dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
