"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function AdminSubmitButton({
  children,
  pendingLabel,
  className = "form-button",
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className={className}
      data-pending={pending || undefined}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
