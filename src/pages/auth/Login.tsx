import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { AuthShell } from "./shared/AuthShell";
import { AuthField } from "./shared/AuthField";
import { AuthCheckbox } from "./shared/AuthCheckbox";
import { AuthButton, type AuthButtonState } from "./shared/AuthButton";
import { Terminal } from "./shared/Terminal";

// Backend enforces MFA at login itself (LoginRequest.mfa_code), not as a
// separate challenge/response step — confirmed in auth.py: a 401 with detail
// "MFA code required" means resubmit the same form with the code attached.
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  mfa_code: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CardMode = "login" | "forgot-request" | "forgot-sent";

export default function Login() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [buttonState, setButtonState] = useState<AuthButtonState>("idle");
  const [attempts, setAttempts] = useState(0);
  const [cardMode, setCardMode] = useState<CardMode>("login");

  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) navigate("/execution", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const emailValue = watch("email");

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setButtonState("loading");
    try {
      const data = await login(values);
      setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user, remember });
      setButtonState("success");
      await sleep(450);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/execution";
      navigate(from, { replace: true });
    } catch (err) {
      setButtonState("idle");
      if (err instanceof ApiError) {
        const detail = (err.body as { detail?: string } | null)?.detail ?? err.message;
        if (detail === "MFA code required") {
          setMfaRequired(true);
          setServerError("Enter your authenticator code to continue.");
          return;
        }
        if (detail === "Invalid credentials") setAttempts((a) => Math.min(5, a + 1));
        setServerError(detail);
        return;
      }
      setServerError("Could not reach the server. Try again.");
    }
  };

  return (
    <AuthShell
      panel={
        <SessionMonitor attempts={attempts} credentialsStarted={!!emailValue} />
      }
    >
      <div className="auth-card">
        {cardMode === "login" && (
          <div className="auth-card-content" key="login">
            <div className="auth-eyebrow">● Session Auth · Secure</div>
            <h1 className="auth-h1">
              RESUME YOUR
              <br />
              <span className="accent">SESSION</span>
            </h1>
            <p className="auth-sub">Your risk core stays warm between sessions. Sign in to reconnect.</p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <AuthField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
              <AuthField
                label="Password"
                passwordToggle
                capsLockWarning
                autoComplete="current-password"
                error={errors.password?.message}
                {...register("password")}
              />

              {mfaRequired && (
                <AuthField
                  label="Authenticator code"
                  inputMode="numeric"
                  autoFocus
                  style={{ fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "2px" }}
                  {...register("mfa_code")}
                />
              )}

              <div className="auth-row">
                <AuthCheckbox checked={remember} onChange={setRemember}>
                  Remember this terminal
                </AuthCheckbox>
                <button type="button" className="auth-link" onClick={() => setCardMode("forgot-request")}>
                  Forgot password?
                </button>
              </div>

              {serverError && (
                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "var(--danger)", marginBottom: 18, marginTop: -10 }}>
                  &gt; auth_failed: {serverError}
                </p>
              )}

              <AuthButton idleLabel="LOG IN" loadingText="> authenticating... risk_gate PASS 0.4ms" state={buttonState} />
            </form>

            <div className="auth-divider">OR</div>
            <button type="button" className="auth-ghost-btn">
              ⬡ Continue with hardware key
            </button>

            <p className="auth-footer-line">
              New to Pi?{" "}
              <Link to="/signup" className="auth-link">
                Create an account →
              </Link>
            </p>
          </div>
        )}

        {cardMode === "forgot-request" && (
          <ForgotRequestCard onBack={() => setCardMode("login")} onSent={() => setCardMode("forgot-sent")} defaultEmail={emailValue} />
        )}

        {cardMode === "forgot-sent" && <ForgotSentCard onBack={() => setCardMode("login")} />}
      </div>
    </AuthShell>
  );
}

function ForgotRequestCard({
  onBack,
  onSent,
  defaultEmail,
}: {
  onBack: () => void;
  onSent: () => void;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [state, setState] = useState<AuthButtonState>("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    // No backend password-reset endpoint exists yet (no /auth/forgot-password
    // route in app/api/v1/endpoints/auth.py) — this plays the intended UX
    // flow client-side only. See the honest note on the confirmation card.
    await sleep(1300);
    onSent();
  };

  return (
    <div className="auth-card-content" key="forgot-request">
      <button className="auth-back-link" onClick={onBack} type="button">
        <span className="arrow">←</span> Back to login
      </button>
      <h1 className="auth-h1">RESET ACCESS</h1>
      <p className="auth-sub">We'll send a signed reset link. Links expire in 15 minutes — this isn't a toy.</p>
      <form onSubmit={onSubmit}>
        <AuthField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <AuthButton idleLabel="SEND RESET LINK" loadingText="> dispatching reset token... audit_hash 0x9f3a...c7b2" state={state} />
      </form>
    </div>
  );
}

function ForgotSentCard({ onBack }: { onBack: () => void }) {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  return (
    <div className="auth-card-content" key="forgot-sent">
      <div className="auth-confirm">
        <div className="auth-confirm-icon">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="auth-confirm-title">CHECK YOUR INBOX</div>
        <p className="auth-confirm-sub">
          If an account matches, a reset link is on its way.
          <br />
          {countdown > 0 ? (
            <span className="auth-confirm-countdown">Resend available in {countdown}s</span>
          ) : (
            <button type="button" className="auth-link" onClick={() => setCountdown(60)}>
              Resend link
            </button>
          )}
        </p>
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#4a4d54", lineHeight: 1.6 }}>
          Preview flow — password-reset email delivery isn't wired up server-side yet.
        </p>
        <button className="auth-back-link" onClick={onBack} type="button" style={{ marginTop: 16 }}>
          <span className="arrow">←</span> Back to login
        </button>
      </div>
    </div>
  );
}

function SessionMonitor({ attempts, credentialsStarted }: { attempts: number; credentialsStarted: boolean }) {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false, timeZoneName: "short" }).replace(" ", " · ");
  const lines = [
    <span key="l0">
      <span className="auth-t-prompt">›</span> <span className="auth-t-comment">// session handshake · {time}</span>
    </span>,
    <span key="l1">
      <span className="auth-t-prompt">›</span> <span className="auth-t-key">device_fingerprint</span>{" "}
      <span className="auth-t-pass">VERIFIED</span>
    </span>,
    <span key="l2">
      <span className="auth-t-prompt">›</span> <span className="auth-t-key">tls_channel</span>{" "}
      <span className="auth-t-pass">ESTABLISHED 1.2ms</span>
    </span>,
    <span key="l3">
      <span className="auth-t-prompt">›</span> <span className="auth-t-key">risk_core_status</span> <span className="auth-t-pass">WARM</span>
    </span>,
    <span key="l4" className="auth-t-divider" />,
    <span key="l5">
      <span className="auth-t-prompt">›</span> <span className="auth-t-key">last_session_pnl</span> <span className="auth-t-val">+$842</span>
    </span>,
    <span key="l6">
      <span className="auth-t-prompt">›</span> <span className="auth-t-key">auth_attempts</span>{" "}
      <span className={attempts > 2 ? "auth-t-progress" : "auth-t-val"}>{attempts} / 5</span>
    </span>,
    <span key="l7">
      <span className="auth-t-prompt">›</span>{" "}
      <span className="auth-t-comment">{credentialsStarted ? "credentials received, awaiting submit" : "waiting for credentials..."}</span>
      <span className="auth-cursor" />
    </span>,
  ];

  return (
    <Terminal
      title="pi_os · auth_core · session_log"
      lines={lines}
      stats={[
        { label: "Last Session P&L", value: 842, format: (n) => `+$${Math.round(n)}`, color: "var(--success)" },
        { label: "Device Trust", value: 97, format: (n) => `${Math.round(n)}%`, color: "var(--accent)" },
        { label: "Regime Conf.", value: 91, format: (n) => `${Math.round(n)}%`, color: "var(--info-blue)" },
      ]}
    />
  );
}
