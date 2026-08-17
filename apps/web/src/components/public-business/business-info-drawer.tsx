"use client";

import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import businessShowcase from "./business-showcase.module.css";

export function BusinessInfoDrawer({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  function openDrawer() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setOpen(true);
  }

  function closeDrawer() {
    dialogRef.current?.close();
  }

  function handleClose() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDrawer();
  }

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href^='#']");
    if (link) closeDrawer();
  }

  return (
    <>
      <div className={businessShowcase.infoDock} id="business-info">
        <button
          ref={triggerRef}
          className={businessShowcase.infoTrigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="business-info-dialog"
          onClick={openDrawer}
        >
          <span aria-hidden="true" className={businessShowcase.infoTriggerIcon}>
            i
          </span>
          <span>
            <strong>Info locale</strong>
            <small>Orari, contatti e dettagli</small>
          </span>
          <span aria-hidden="true" className={businessShowcase.infoTriggerArrow}>
            →
          </span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className={businessShowcase.infoDrawer}
        id="business-info-dialog"
        aria-labelledby="business-info-title"
        aria-describedby="business-info-description"
        aria-modal="true"
        onClose={handleClose}
        onClick={handleBackdropClick}
      >
        <div className={businessShowcase.drawerPanel}>
          <header className={businessShowcase.drawerHeader}>
            <div>
              <span>Dettagli</span>
              <h2 id="business-info-title">Info locale</h2>
              <p id="business-info-description">
                Orari, contatti, servizi e informazioni utili, quando ti servono.
              </p>
            </div>
            <button
              className={businessShowcase.drawerClose}
              type="button"
              onClick={closeDrawer}
              aria-label="Chiudi info locale"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div className={businessShowcase.drawerBody} onClick={handleContentClick}>
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}
