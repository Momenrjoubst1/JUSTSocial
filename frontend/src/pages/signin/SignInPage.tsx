import { Label, Checkbox, Card, CardContent } from "@/components/ui/core";
import { Mail, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import {
  signInWithEmail,
  signInWithFacebook,
  signInWithGoogle,
} from "@/lib/supabaseClient";
import { useTitle } from "@/context/TitleContext";
import { useLanguage } from "@/context/LanguageContext";

interface SignInPageProps {
  onClose?: () => void;
  onSwitchToSignUp?: () => void;
  onLoginSuccess?: (email: string) => void;
}

export default function SignInPage({
  onClose,
  onSwitchToSignUp,
  onLoginSuccess,
}: SignInPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { t } = useLanguage();
  const { setBaseTitle } = useTitle();

  useEffect(() => {
    setBaseTitle(String(t("auth:signin.pageTitle")));
  }, [setBaseTitle, t]);

  const resolveSignInError = (message?: string) => {
    if (!message) {
      return String(t("auth:signin.errors.default"));
    }

    if (message.includes("Invalid login credentials")) {
      return String(t("auth:signin.errors.invalidCredentials"));
    }

    if (message.includes("User not found")) {
      return String(t("auth:signin.errors.emailNotRegistered"));
    }

    if (
      message.toLowerCase().includes("not confirmed") ||
      message.toLowerCase().includes("email not confirmed")
    ) {
      return String(t("auth:signin.errors.emailNotConfirmed"));
    }

    if (message.toLowerCase().includes("user not found")) {
      return String(t("auth:signin.errors.accountNotFound"));
    }

    return message || String(t("auth:signin.errors.signInFailed"));
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      localStorage.setItem("auth_provider", "google");
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || String(t("auth:signin.errors.google")));
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      localStorage.setItem("auth_provider", "facebook");
      await signInWithFacebook();
    } catch (err: any) {
      setError(err.message || String(t("auth:signin.errors.facebook")));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError(String(t("auth:signin.errors.fillAllFields")));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signInError } = await signInWithEmail(
        trimmedEmail,
        trimmedPassword,
      );

      if (signInError) {
        setError(resolveSignInError(signInError.message));
        return;
      }

      if (data.user) {
        if (rememberMe) {
          localStorage.setItem("rememberEmail", trimmedEmail);
        }

        setTimeout(() => {
          onLoginSuccess?.(trimmedEmail);
          onClose?.();
        }, 500);
      }
    } catch (err: any) {
      setError(resolveSignInError(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-2xl border border-border bg-popover/95 backdrop-blur-xl">
      <CardContent className="p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {String(t("auth:signin.title"))}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {String(t("auth:signin.subtitle"))}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground/50 hover:text-foreground transition-colors text-xl leading-none"
              aria-label={String(t("common:close"))}
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-foreground/70 text-sm">
            {String(t("auth:signin.emailLabel"))}
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Mail className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="email"
                type="email"
                placeholder={String(t("auth:signin.emailPlaceholder"))}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-foreground/70 text-sm">
            {String(t("auth:signin.passwordLabel"))}
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Lock className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="password"
                type="password"
                placeholder={String(t("auth:signin.passwordPlaceholder"))}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleSubmit(e as any);
                  }
                }}
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
              className="border-[#262626] data-[state=checked]:bg-[#FFFFFF] data-[state=checked]:border-[#FFFFFF]"
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal text-muted-foreground cursor-pointer"
            >
              {String(t("auth:signin.rememberMe"))}
            </Label>
          </div>
          <button
            className="text-sm text-[#A1A1A1] hover:text-[#FFFFFF] hover:underline transition-colors"
            disabled={isLoading}
          >
            {String(t("auth:signin.forgotPassword"))}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-12 text-base font-semibold rounded-xl bg-[#FFFFFF] text-[#0A0A0A] hover:bg-[#E2E2E2] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading
            ? String(t("auth:signin.submitting"))
            : String(t("auth:signin.submit"))}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground/50">
            {String(t("auth:signin.socialDivider"))}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-11 rounded-xl border border-border bg-muted/50 flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              width={18}
              height={18}
              className="shrink-0 dark:invert"
            />
            {String(t("auth:signin.google"))}
          </button>

          <button
            onClick={handleFacebookSignIn}
            disabled={isLoading}
            className="w-full h-11 rounded-xl border border-border bg-muted/50 flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              width={18}
              height={18}
              className="shrink-0"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {String(t("auth:signin.facebook"))}
          </button>
        </div>

        <p className="text-center text-sm text-[#525252] mt-1">
          {String(t("auth:signin.noAccount"))}{" "}
          <span
            onClick={onSwitchToSignUp}
            className="text-[#FFFFFF] cursor-pointer hover:underline font-medium transition-colors"
          >
            {String(t("auth:signin.switchSignup"))}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
