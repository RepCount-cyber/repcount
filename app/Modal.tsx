"use client";

import {useEffect, useRef, type ReactNode} from "react";
import {Icon} from "./Media";

/** A native modal dialog: traps focus, closes on Escape or the close button, and locks page scroll while open. */
export default function Modal({open, title, eyebrow, onClose, children}: {open: boolean; title: string; eyebrow?: string; onClose: () => void; children: ReactNode}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const current = dialog.current;
    if (!open || !current) return;
    const previousOverflow = document.body.style.overflow;
    current.showModal();
    document.body.style.overflow = "hidden";
    return () => { current.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);
  return <dialog ref={dialog} className="rc-modal" aria-labelledby="rc-modal-title" onCancel={e => {e.preventDefault(); onClose();}}>
    {open && <div className="dialog-inner">
      <button className="close" type="button" aria-label="Close dialog" onClick={onClose}><Icon name="close" size={20}/></button>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id="rc-modal-title">{title}</h2>
      {children}
    </div>}
  </dialog>;
}
