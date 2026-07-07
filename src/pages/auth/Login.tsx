import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

// Backend enforces MFA at login itself (LoginRequest.mfa_code), not as a
// separate challenge/response step — confirmed in auth.py: a 401 with detail
// "MFA code required" means resubmit the same form with the code attached.
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  mfa_code: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const data = await login(values);
      setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user });
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/execution";
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.body as { detail?: string } | null)?.detail ?? err.message;
        if (detail === "MFA code required") {
          setMfaRequired(true);
          setServerError("Enter your authenticator code to continue.");
          return;
        }
        setServerError(detail);
        return;
      }
      setServerError("Could not reach the server. Try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface-card p-8 shadow-xl">
        <h1 className="mb-1 text-xl font-semibold text-text-primary">Pi OS</h1>
        <p className="mb-6 text-sm text-text-muted">Sign in to the trading terminal</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {mfaRequired && (
            <Field
              label="Authenticator code"
              type="text"
              inputMode="numeric"
              autoFocus
              className="font-mono tracking-widest"
              {...register("mfa_code")}
            />
          )}

          {serverError && <p className="text-xs text-decision-block">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
