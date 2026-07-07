import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { mfaSetup, mfaVerify } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

type Phase = "loading" | "already-enabled" | "provisioning" | "verifying" | "done" | "error";

export default function MfaSetup() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [phase, setPhase] = useState<Phase>("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasStartedSetup = useRef(false);

  useEffect(() => {
    // Snapshot mfa_enabled once on mount rather than depending on it reactively —
    // a successful verify() below flips this same field, and a reactive
    // dependency would re-run this effect and stomp the "done" phase back to
    // "already-enabled" right after success.
    if (user?.mfa_enabled) {
      setPhase("already-enabled");
      return;
    }

    // StrictMode double-invokes effects in dev by mounting, cleaning up, then
    // mounting again — synchronously, before the async call below resolves.
    // /auth/mfa/setup is not idempotent (each call generates and persists a
    // NEW secret), so a second concurrent call would overwrite the secret the
    // first call's QR is showing, and the two responses could resolve out of
    // order. Guard with a ref (not a "cancelled" flag torn down on cleanup,
    // which would also discard the one real request's result) so the
    // mutating call only ever fires once for the life of this component.
    if (hasStartedSetup.current) return;
    hasStartedSetup.current = true;

    (async () => {
      try {
        const res = await mfaSetup();
        // Rendered entirely client-side from the provisioning URI — the
        // TOTP secret never leaves the browser via a third-party QR service.
        const dataUrl = await QRCode.toDataURL(res.qr_uri, { margin: 1, width: 220 });
        setQrDataUrl(dataUrl);
        setSecret(res.secret);
        setPhase("provisioning");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setPhase("already-enabled");
          return;
        }
        setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Could not start MFA setup.");
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVerify = async () => {
    setPhase("verifying");
    setError(null);
    try {
      await mfaVerify(code);
      patchUser({ mfa_enabled: true });
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Invalid code, try again.");
      setPhase("provisioning");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-surface-border bg-surface-card p-8">
      <h1 className="mb-1 text-lg font-semibold text-text-primary">Two-factor authentication</h1>
      <p className="mb-6 text-sm text-text-muted">Protect your account with an authenticator app (TOTP).</p>

      {phase === "loading" && <p className="text-sm text-text-muted">Loading…</p>}

      {phase === "already-enabled" && (
        <p className="text-sm text-dq-pass">MFA is already enabled on your account.</p>
      )}

      {(phase === "provisioning" || phase === "verifying") && qrDataUrl && (
        <div className="space-y-4">
          <img src={qrDataUrl} alt="MFA QR code" className="mx-auto rounded-md bg-white p-2" />
          {secret && (
            <p className="text-center text-xs text-text-muted">
              Can't scan? Enter this key manually:{" "}
              <span className="font-mono tracking-widest text-text-primary">{secret}</span>
            </p>
          )}
          <Field
            label="Enter the 6-digit code from your app"
            type="text"
            inputMode="numeric"
            className="text-center font-mono tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <p className="text-xs text-decision-block">{error}</p>}
          <Button onClick={onVerify} disabled={phase === "verifying" || code.length === 0} className="w-full">
            {phase === "verifying" ? "Verifying…" : "Enable MFA"}
          </Button>
        </div>
      )}

      {phase === "done" && <p className="text-sm text-dq-pass">MFA enabled. You'll need a code at your next login.</p>}

      {phase === "error" && <p className="text-sm text-decision-block">{error}</p>}
    </div>
  );
}
