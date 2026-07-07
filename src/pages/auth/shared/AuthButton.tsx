import { useTypedReveal } from "./useTypedReveal";

export type AuthButtonState = "idle" | "loading" | "success";

export function AuthButton({
  idleLabel,
  loadingText,
  successLabel = "Verified",
  state,
  type = "submit",
  disabled,
  onClick,
}: {
  idleLabel: string;
  loadingText: string;
  successLabel?: string;
  state: AuthButtonState;
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const typed = useTypedReveal(loadingText, state === "loading");

  return (
    <button
      type={type}
      onClick={onClick}
      className={`auth-btn ${state === "success" ? "success" : ""}`}
      disabled={disabled || state !== "idle"}
    >
      {state === "idle" && (
        <>
          {idleLabel} <span className="auth-btn-arrow">→</span>
        </>
      )}
      {state === "loading" && <span className="auth-btn-loading">{typed || " "}</span>}
      {state === "success" && (
        <>
          <CheckIcon /> {successLabel}
        </>
      )}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
