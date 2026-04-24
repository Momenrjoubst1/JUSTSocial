import { Label, Checkbox, Card, CardContent } from "@/components/ui/core";
import { Mail, Lock, User } from "lucide-react";
import { useState, useEffect } from "react";
import {
  signUpWithEmail,
  supabase,
  signInWithFacebook,
  signInWithGoogle,
  saveUserProfileImage,
} from "@/lib/supabaseClient";
import { useTitle } from "@/context/TitleContext";
import { useLanguage } from "@/context/LanguageContext";

interface SignUpPageProps {
  onClose?: () => void;
  onSwitchToSignIn?: () => void;
  onSignupSuccess?: (email: string) => void;
}

export default function SignUpPage({
  onClose,
  onSwitchToSignIn,
  onSignupSuccess,
}: SignUpPageProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { setBaseTitle } = useTitle();
  const { t } = useLanguage();

  useEffect(() => {
    setBaseTitle(String(t("auth:signup.pageTitle")));
  }, [setBaseTitle, t]);

  const resolveSignUpError = (message?: string) => {
    if (!message) {
      return String(t("auth:signup.errors.default"));
    }

    if (message.includes("already registered") || message.includes("User already registered")) {
      return String(t("auth:signup.errors.emailInUse"));
    }

    return message;
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");

    try {
      localStorage.setItem("auth_provider", "google");
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || String(t("auth:signup.errors.google")));
      setIsLoading(false);
    }
  };

  const handleFacebookSignUp = async () => {
    setIsLoading(true);
    setError("");

    try {
      localStorage.setItem("auth_provider", "facebook");
      await signInWithFacebook();
    } catch (err: any) {
      setError(err.message || String(t("auth:signup.errors.facebook")));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!fullName || !username || !email || !password || !confirmPassword) {
      setError(String(t("auth:signup.errors.fillAllFields")));
      return;
    }

    if (username.length < 3) {
      setError(String(t("auth:signup.errors.usernameMinLength")));
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setError(String(t("auth:signup.errors.usernameFormat")));
      return;
    }

    if (password !== confirmPassword) {
      setError(String(t("auth:signup.errors.passwordsMismatch")));
      return;
    }

    if (password.length < 6) {
      setError(String(t("auth:signup.errors.passwordMinLength")));
      return;
    }

    if (!agreeTerms) {
      setError(String(t("auth:signup.errors.termsRequired")));
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingUser } = await supabase
        .from("public_profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (existingUser) {
        setError(String(t("auth:signup.errors.usernameTaken")));
        return;
      }

      const { data, error: signUpError } = await signUpWithEmail(email, password);

      if (signUpError) {
        setError(resolveSignUpError(signUpError.message));
        return;
      }

      if (data.user) {
        const defaultProfileImage =
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzM3NDE1MSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0yMiA4NSBBIDMyIDMyIDAgMCAxIDc4IDg1IFEgNzggNjggNTAgNjggUSAyMiA2OCAyMiA4NSBaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==";

        const { error: insertError } = await supabase
          .from("users")
          .update({
            full_name: fullName,
            username: username.toLowerCase(),
            avatar_url: defaultProfileImage,
          })
          .eq("id", data.user.id);

        if (!insertError) {
          await saveUserProfileImage(data.user.id, defaultProfileImage);
        }

        const { error: loginError } = await signUpWithEmail(email, password);
        setSuccessMessage(
          loginError
            ? String(t("auth:signup.successSignIn"))
            : String(t("auth:signup.successRedirecting")),
        );

        setTimeout(() => {
          onSignupSuccess?.(email);
          onClose?.();
        }, 1500);
      }
    } catch (err: any) {
      setError(resolveSignUpError(err.message));
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
              {String(t("auth:signup.title"))}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {String(t("auth:signup.subtitle"))}
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
          <Label htmlFor="fullname" className="text-foreground/70 text-sm">
            {String(t("auth:signup.fullNameLabel"))}
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <User className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="fullname"
                type="text"
                placeholder={String(t("auth:signup.fullNamePlaceholder"))}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="username" className="text-foreground/70 text-sm">
            {String(t("auth:signup.usernameLabel"))}
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <span className="text-[#A1A1A1] shrink-0 font-bold select-none">@</span>
              <input
                id="username"
                type="text"
                placeholder={String(t("auth:signup.usernamePlaceholder"))}
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email" className="text-foreground/70 text-sm">
            {String(t("auth:signup.emailLabel"))}
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Mail className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="signup-email"
                type="email"
                placeholder={String(t("auth:signup.emailPlaceholder"))}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-password" className="text-foreground/70 text-sm">
            {String(t("auth:signup.passwordLabel"))}
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Lock className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="signup-password"
                type="password"
                placeholder={String(t("auth:signup.passwordPlaceholder"))}
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password" className="text-foreground/70 text-sm">
            {String(t("auth:signup.confirmPasswordLabel"))}
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Lock className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="confirm-password"
                type="password"
                placeholder={String(t("auth:signup.confirmPasswordPlaceholder"))}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
            disabled={isLoading}
            className="border-[#262626] mt-0.5 data-[state=checked]:bg-[#FFFFFF] data-[state=checked]:border-[#FFFFFF]"
          />
          <Label
            htmlFor="terms"
            className="text-sm font-normal text-muted-foreground cursor-pointer leading-relaxed"
          >
            {String(t("auth:signup.terms"))}{" "}
            <span className="text-[#FFFFFF] hover:underline cursor-pointer transition-colors">
              {String(t("auth:signup.termsOfService"))}
            </span>{" "}
            {String(t("auth:signup.and"))}{" "}
            <span className="text-[#FFFFFF] hover:underline cursor-pointer transition-colors">
              {String(t("auth:signup.privacyPolicy"))}
            </span>
          </Label>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-sm text-green-300">
            {successMessage}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-12 text-base font-semibold rounded-xl bg-[#FFFFFF] text-[#0A0A0A] hover:bg-[#E2E2E2] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading
            ? String(t("auth:signup.submitting"))
            : String(t("auth:signup.submit"))}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground/50">
            {String(t("auth:signup.socialDivider"))}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleSignUp}
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
            {String(t("auth:signup.google"))}
          </button>

          <button
            onClick={handleFacebookSignUp}
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
            {String(t("auth:signup.facebook"))}
          </button>
        </div>

        <p className="text-center text-sm text-[#525252] mt-1">
          {String(t("auth:signup.hasAccount"))}{" "}
          <span
            onClick={onSwitchToSignIn}
            className="text-[#FFFFFF] cursor-pointer hover:underline font-medium transition-colors"
          >
            {String(t("auth:signup.switchSignin"))}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
