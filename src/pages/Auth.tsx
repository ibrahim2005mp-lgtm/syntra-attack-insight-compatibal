import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { SyntraLogo } from "@/components/Logo";
import {
  validateEmailCredential,
  validatePasswordCredential,
  CREDENTIAL_ERRORS,
} from "@/security/credentialsValidation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  UserX,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/investigate") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

type PasswordMode = "signIn" | "signUp";

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signIn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const run = async (fn: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in could not be completed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------ password ------------------------------ */

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    const emailCheck = validateEmailCredential(email);
    if (!emailCheck.valid) {
      setError(CREDENTIAL_ERRORS[emailCheck.error ?? "email"]);
      return;
    }
    if (typeof password !== "string" || password.length === 0) {
      setError(CREDENTIAL_ERRORS.empty);
      return;
    }

    if (passwordMode === "signUp") {
      if (password !== confirmPassword) {
        setError(CREDENTIAL_ERRORS.mismatch);
        return;
      }
      const pwCheck = validatePasswordCredential(password);
      if (!pwCheck.valid) {
        setError(CREDENTIAL_ERRORS[pwCheck.error ?? "weak"]);
        return;
      }
    }

    run(async () => {
      await signIn("password", {
        flow: passwordMode,
        email: emailCheck.value as string,
        password,
      });
      toast.success(
        passwordMode === "signUp" ? "Account created" : "Signed in",
        {
          description:
            passwordMode === "signUp"
              ? "Welcome to SYNTRA — your investigation workspace is ready."
              : "Welcome back — redirecting to your workspace.",
        },
      );
      navigate(redirect);
    });
  };

  /* -------------------------------- guest ------------------------------- */

  const handleGuestLogin = () =>
    run(async () => {
      await signIn("anonymous");
      navigate(redirect);
    });

  /* ------------------------------- shared ------------------------------- */

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <SyntraLogo size={30} withSubtitle />
          </div>

          <div className="syn-card overflow-hidden">
            <div className="px-6 pb-3 pt-6 text-center">
              <h1 className="text-lg font-semibold text-foreground">
                Sign in to SYNTRA
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Use your account to continue to your workspace.
              </p>
            </div>

            {/* ===================== password sign-in/up ====================== */}
            <form onSubmit={handlePasswordSubmit}>
              <div className="flex flex-col gap-3 px-6 pb-5">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="email"
                    placeholder="name@example.com"
                    type="email"
                    autoComplete="email"
                    className="pl-9"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="password"
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      passwordMode === "signUp" ? "new-password" : "current-password"
                    }
                    className="pl-9 pr-9"
                    disabled={isLoading}
                    required
                    minLength={passwordMode === "signUp" ? 8 : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {passwordMode === "signUp" && (
                  <>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        name="confirmPassword"
                        placeholder="Confirm password"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        className="pl-9 pr-9"
                        disabled={isLoading}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      At least 8 characters, with an uppercase letter, a
                      lowercase letter and a digit.
                    </p>
                  </>
                )}

                {error && (
                  <p role="alert" className="text-xs text-[var(--syntra-danger)]">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="syn-btn-primary w-full"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : passwordMode === "signUp" ? (
                    <>
                      Create account
                      <ArrowRight className="size-4" />
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode(passwordMode === "signIn" ? "signUp" : "signIn");
                    setError(null);
                  }}
                  className="text-center text-xs text-muted-foreground transition-colors hover:text-[var(--syntra-orange)]"
                >
                  {passwordMode === "signIn"
                    ? "New to SYNTRA? Create an account"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>

            {/* guest */}
            <div className="px-6 pb-5">
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[var(--syntra-surface)] px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGuestLogin}
                disabled={isLoading}
                className="w-full"
              >
                <UserX className="size-4" />
                Continue as Guest
              </Button>
            </div>

            <div className="border-t border-border bg-[var(--syntra-surface-soft)] px-6 py-3 text-center text-[11px] text-muted-foreground">
              Secured by{" "}
              <a
                href="https://freebuff.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-[var(--syntra-orange)]"
              >
                freebuff.com
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to use SYNTRA for defensive and educational
            cybersecurity analysis.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
