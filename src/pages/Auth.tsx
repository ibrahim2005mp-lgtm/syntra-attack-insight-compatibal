import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
  Lock,
  Mail,
  MailCheck,
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

type AuthMethod = "password" | "email-otp";
type PasswordMode = "signIn" | "signUp";

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [method, setMethod] = useState<AuthMethod>("password");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signIn");
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
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
      try {
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
      } catch {
        // Auth backends throw on invalid credentials and policy violations;
        // a backend may surface its own user-safe message first.
        throw new Error(
          passwordMode === "signUp"
            ? "Could not create the account — the email may already be registered."
            : "Incorrect email or password.",
        );
      }
    });
  };

  /* ----------------------------- email OTP ------------------------------ */

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");

    const check = validateEmailCredential(email);
    if (!check.valid || typeof check.value !== "string") {
      setError(check.error ? CREDENTIAL_ERRORS[check.error] : CREDENTIAL_ERRORS.email);
      return;
    }
    const verifiedEmail = check.value;

    run(async () => {
      await signIn("email-otp", { email: verifiedEmail });
      setOtpEmail(verifiedEmail);
      toast.success("Verification code sent", {
        description: `Check ${verifiedEmail} for the 6-digit code.`,
      });
    });
  };

  const handleOtpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = otpEmail ?? "";
    run(async () => {
      await signIn("email-otp", { email, code: otp });
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

  const submitOtpDisabled = isLoading || otp.length !== 6;
  const otpStep = otpEmail !== null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <SyntraLogo size={30} withSubtitle />
          </div>

          <div className="syn-card overflow-hidden">
            {otpStep ? (
              /* ===================== email OTP verification ===================== */
              <>
                <div className="px-6 pb-2 pt-6 text-center">
                  <h1 className="text-lg font-semibold text-foreground">Check your email</h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We've sent a 6-digit code to {otpEmail}
                  </p>
                </div>
                <form onSubmit={handleOtpSubmit}>
                  <div className="flex flex-col gap-4 px-6 pb-5 pt-4">
                    <input type="hidden" name="email" value={otpEmail ?? ""} />
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                            (e.target as HTMLElement).closest("form")?.requestSubmit();
                          }
                        }}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <p role="alert" className="text-center text-xs text-[var(--syntra-danger)]">
                        {error}
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={submitOtpDisabled}
                      className="syn-btn-primary w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify code
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setOtpEmail(null);
                        setOtp("");
                        setError(null);
                      }}
                      disabled={isLoading}
                      className="w-full text-muted-foreground"
                    >
                      Use a different email
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              /* ======================= method selection ========================= */
              <>
                <div className="px-6 pb-3 pt-6 text-center">
                  <h1 className="text-lg font-semibold text-foreground">
                    Sign in to SYNTRA
                  </h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use your account, or continue with a one-time email code.
                  </p>
                </div>

                {/* method switcher */}
                <div
                  className="mx-6 mb-4 grid grid-cols-2 gap-1 rounded-md border border-border bg-[var(--syntra-surface-soft)] p-1"
                  role="tablist"
                  aria-label="Sign-in method"
                >
                  {(
                    [
                      { id: "password", label: "Password", icon: Lock },
                      { id: "email-otp", label: "Email code", icon: MailCheck },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={method === id}
                      onClick={() => {
                        setMethod(id);
                        setError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                        method === id
                          ? "bg-[var(--syntra-orange)] text-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {method === "password" ? (
                  /* ===================== password sign-in/up ====================== */
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
                            passwordMode === "signUp"
                              ? "new-password"
                              : "current-password"
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
                ) : (
                  /* ========================= email OTP form ======================= */
                  <form onSubmit={handleEmailSubmit}>
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
                        ) : (
                          <>
                            Send code
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        No password needed — we email you a one-time code that
                        expires in 15 minutes.
                      </p>
                    </div>
                  </form>
                )}

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
              </>
            )}

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
