import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Renders a show/hide eye toggle and switches type between password/text. */
  passwordToggle?: boolean;
  /** Shows an inline amber warning if Caps Lock is on while this field is focused. */
  capsLockWarning?: boolean;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, error, passwordToggle, capsLockWarning, type, className, id, ...inputProps },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [revealed, setRevealed] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const resolvedType = passwordToggle ? (revealed ? "text" : "password") : type;

  const handleKeyEvent = capsLockWarning
    ? (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (typeof e.getModifierState === "function") setCapsOn(e.getModifierState("CapsLock"));
      }
    : undefined;

  return (
    <div className={`auth-field ${error ? "has-error" : ""} ${className ?? ""}`}>
      <div className="auth-field-input-wrap">
        <input
          ref={ref}
          id={fieldId}
          type={resolvedType}
          placeholder=" "
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          {...inputProps}
        />
        <label className="auth-field-label" htmlFor={fieldId}>
          {label}
        </label>
        <div className="auth-field-underline" />
        {passwordToggle && (
          <button
            type="button"
            className="auth-eye-btn"
            onClick={() => setRevealed((v) => !v)}
            tabIndex={-1}
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {capsLockWarning && (
        <div className={`auth-capslock ${capsOn ? "show" : ""}`}>⇪ Caps Lock is on</div>
      )}
      <div className={`auth-field-error ${error ? "show" : ""}`}>{error}</div>
    </div>
  );
});

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path
        d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path
        d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 2l16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
