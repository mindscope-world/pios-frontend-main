import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerUser } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { AuthShell } from "./shared/AuthShell";
import { AuthField } from "./shared/AuthField";
import { AuthCheckbox } from "./shared/AuthCheckbox";
import { AuthButton, type AuthButtonState } from "./shared/AuthButton";
import { Terminal } from "./shared/Terminal";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STEP_LABELS = ["01 IDENTITY", "02 SECURITY", "03 CALIBRATE"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RiskProfile = "conservative" | "balanced" | "aggressive";

const RISK_PROFILES: { value: RiskProfile; label: string; sub: string }[] = [
  { value: "conservative", label: "CONSERVATIVE", sub: "kelly_mult 0.25" },
  { value: "balanced", label: "BALANCED", sub: "kelly_mult 0.50" },
  { value: "aggressive", label: "AGGRESSIVE", sub: "kelly_mult 0.75" },
];

function passwordStrength(pw: string): { label: string; pct: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length === 0) return { label: "", pct: 0, color: "var(--border-hair)" };
  if (score <= 1) return { label: "WEAK", pct: 30, color: "var(--danger)" };
  if (score <= 3) return { label: "ACCEPTABLE", pct: 65, color: "var(--accent)" };
  return { label: "HARDENED", pct: 100, color: "var(--success)" };
}

export default function Signup() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"forward" | "back">("forward");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [twoFactorOptIn, setTwoFactorOptIn] = useState(false);

  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<AuthButtonState>("idle");
  const [rebooting, setRebooting] = useState(false);
  const [provisioned, setProvisioned] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/execution", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNext = () => {
    setFieldError(null);
    if (step === 0) {
      if (fullName.trim().length === 0) return setFieldError("Full name is required.");
      if (!EMAIL_RE.test(email)) return setFieldError("Enter a valid email.");
    }
    if (step === 1) {
      if (password.length < 8) return setFieldError("Password must be at least 8 characters.");
      if (password !== confirm) return setFieldError("Passwords don't match.");
    }
    setDir("forward");
    setStep((s) => Math.min(2, s + 1));
  };

  const goBack = () => {
    setFieldError(null);
    setDir("back");
    setStep((s) => Math.max(0, s - 1));
  };

  const onSubmit = async () => {
    if (!termsAccepted) {
      setFieldError("Accept the terms to continue.");
      return;
    }
    setFieldError(null);
    setButtonState("loading");
    try {
      const data = await registerUser({ full_name: fullName.trim(), email, password });
      setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user });
      setButtonState("success");
      setSessionId(data.access_token.slice(-10));
      await sleep(400);
      setRebooting(true);
      await sleep(260);
      setRebooting(false);
      setProvisioned(true);
      await sleep(1100);
      // twoFactorOptIn has no dedicated register-time backend field (POST
      // /auth/register has no mfa param) — honored client-side by routing
      // to the real MFA setup flow (auth.py: POST /auth/mfa/setup) instead.
      navigate(twoFactorOptIn ? "/settings/mfa" : "/execution", { replace: true });
    } catch (err) {
      setButtonState("idle");
      if (err instanceof ApiError) {
        const detail = (err.body as { detail?: string } | null)?.detail ?? err.message;
        if (detail === "Email already registered") {
          setStep(0);
          setFieldError(detail);
          return;
        }
        setFieldError(detail);
        return;
      }
      setFieldError("Could not reach the server. Try again.");
    }
  };

  const strength = passwordStrength(password);

  return (
    <AuthShell hideTicker panel={<ProvisioningMonitor step={step} rebooting={rebooting} provisioned={provisioned} sessionId={sessionId} />}>
      <div className="auth-card">
        <div className="auth-eyebrow">● New Operator · Provisioning</div>
        <h1 className="auth-h1">
          BUILD YOUR
          <br />
          <span className="accent">RISK CORE</span>
        </h1>
        <p className="auth-sub">60 seconds to provision your instance. No credit card for the 14-day sandbox.</p>

        <div className="auth-stepper">
          <div className="auth-stepper-track">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`auth-stepper-seg ${i < step ? "done" : i === step ? "active" : ""}`} />
            ))}
          </div>
          <div className="auth-stepper-labels">
            {STEP_LABELS.map((label, i) => (
              <span key={label} className={i < step ? "done" : i === step ? "active" : ""}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className={`auth-step-pane ${dir === "back" ? "back" : ""}`} key={step}>
          {step === 0 && (
            <>
              <AuthField label="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <AuthField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <AuthField label="Firm / desk (optional)" autoComplete="organization" value={firm} onChange={(e) => setFirm(e.target.value)} />
            </>
          )}

          {step === 1 && (
            <>
              <AuthField
                label="Password"
                passwordToggle
                capsLockWarning
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {password.length > 0 && (
                <div className="auth-strength">
                  <div className="auth-strength-track">
                    <div className="auth-strength-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
                  </div>
                  <div className="auth-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </div>
                </div>
              )}
              <AuthField
                label="Confirm password"
                passwordToggle
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={{ marginTop: 22 }}
              />
              <div className="auth-toggle-row">
                <span className="auth-toggle-label">Enable two-factor authentication</span>
                <button
                  type="button"
                  className={`auth-toggle ${twoFactorOptIn ? "on" : ""}`}
                  onClick={() => setTwoFactorOptIn((v) => !v)}
                  aria-pressed={twoFactorOptIn}
                  aria-label="Enable two-factor authentication"
                >
                  <span className="auth-toggle-thumb" />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-risk-grid">
                {RISK_PROFILES.map((p) => (
                  <label key={p.value} className={`auth-risk-card ${riskProfile === p.value ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="risk-profile"
                      checked={riskProfile === p.value}
                      onChange={() => setRiskProfile(p.value)}
                    />
                    <div className="auth-risk-label">{p.label}</div>
                    <div className="auth-risk-sub">{p.sub}</div>
                  </label>
                ))}
              </div>
              <div className="auth-row" style={{ marginBottom: 18 }}>
                <AuthCheckbox checked={termsAccepted} onChange={setTermsAccepted}>
                  I agree to the Terms &amp; Risk Disclosure
                </AuthCheckbox>
              </div>
            </>
          )}
        </div>

        {fieldError && (
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "var(--danger)", marginBottom: 16, marginTop: -8 }}>
            &gt; {fieldError}
          </p>
        )}

        <div className="auth-step-actions">
          {step > 0 && (
            <button type="button" className="auth-step-back-btn" onClick={goBack}>
              ← Back
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="auth-btn" onClick={goNext}>
              CONTINUE <span className="auth-btn-arrow">→</span>
            </button>
          ) : (
            <AuthButton
              idleLabel="PROVISION ACCOUNT"
              loadingText="> allocating risk_core... oco_engine READY"
              successLabel="Provisioned"
              state={buttonState}
              type="button"
              onClick={onSubmit}
            />
          )}
        </div>

        <p className="auth-footer-line">
          Already have a terminal?{" "}
          <Link to="/login" className="auth-link">
            Log in →
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function ProvisioningMonitor({
  step,
  rebooting,
  provisioned,
  sessionId,
}: {
  step: number;
  rebooting: boolean;
  provisioned: boolean;
  sessionId: string;
}) {
  if (provisioned) {
    return (
      <Terminal
        title="pi_os · auth_core · provisioning"
        rebooting={rebooting}
        lines={[
          <span key="w0">
            <span className="auth-t-prompt">›</span> <span className="auth-t-pass">WELCOME ABOARD</span>
          </span>,
          <span key="w1">
            <span className="auth-t-prompt">›</span> <span className="auth-t-key">session_id</span>{" "}
            <span className="auth-t-val">{sessionId}</span>
          </span>,
          <span key="w2">
            <span className="auth-t-prompt">›</span> <span className="auth-t-key">sandbox_capital</span>{" "}
            <span className="auth-t-pass">$100,000 (paper)</span>
          </span>,
          <span key="w3">
            <span className="auth-t-prompt">›</span> <span className="auth-t-comment">redirecting to terminal...</span>
            <span className="auth-cursor" />
          </span>,
        ]}
      />
    );
  }

  const stepStatus = (i: number) => (i < step ? "done" : i === step ? "progress" : "pending");
  const dots = (status: string) =>
    status === "done" ? "●●●" : status === "progress" ? "●●○" : "○○○";
  const label = (status: string) => (status === "done" ? "DONE" : status === "progress" ? "IN_PROGRESS" : "PENDING");
  const cls = (status: string) => (status === "done" ? "auth-t-pass" : status === "progress" ? "auth-t-progress" : "auth-t-pending");

  return (
    <Terminal
      title="pi_os · auth_core · provisioning"
      rebooting={rebooting}
      lines={[
        <span key="p0">
          <span className="auth-t-prompt">›</span> <span className="auth-t-comment">// new_operator_init</span>
        </span>,
        ...[0, 1, 2].map((i) => {
          const status = stepStatus(i);
          const names = ["step_01_identity", "step_02_security", "step_03_calibration"];
          return (
            <span key={`p${i + 1}`}>
              <span className="auth-t-prompt">›</span> <span className="auth-t-key">{names[i]}</span>{" "}
              <span className={cls(status)}>
                [{dots(status)}] {label(status)}
              </span>
            </span>
          );
        }),
        <span key="p4" className="auth-t-divider" />,
        <span key="p5">
          <span className="auth-t-prompt">›</span> <span className="auth-t-key">sandbox_capital</span>{" "}
          <span className="auth-t-val">$100,000 (paper)</span>
        </span>,
        <span key="p6">
          <span className="auth-t-prompt">›</span> <span className="auth-t-key">regime_feed</span>{" "}
          <span className="auth-t-progress">CONNECTING...</span>
        </span>,
      ]}
      stats={[
        { label: "Sandbox Days", value: 14, format: (n) => `${Math.round(n)}`, color: "var(--accent)" },
        { label: "Base Kelly", value: 50, format: (n) => `${(n / 100).toFixed(2)}`, color: "var(--info-blue)" },
        { label: "Setup Progress", value: ((step + 1) / 3) * 100, format: (n) => `${Math.round(n)}%`, color: "var(--success)" },
      ]}
    />
  );
}
