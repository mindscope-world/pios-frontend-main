import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, className = "", ...inputProps }: FieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-muted">{label}</label>
      <input
        className={`w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent ${className}`}
        {...inputProps}
      />
      {error && <p className="mt-1 text-xs text-decision-block">{error}</p>}
    </div>
  );
}
