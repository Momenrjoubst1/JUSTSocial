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

  useEffect(() => {
    setBaseTitle('Sign Up • JUST Social');
  }, [setBaseTitle]);

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");
    try {
      localStorage.setItem('auth_provider', 'google');
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "An error occurred during Google sign up");
      setIsLoading(false);
    }
  };

  const handleFacebookSignUp = async () => {
    setIsLoading(true);
    setError("");
    try {
      localStorage.setItem('auth_provider', 'facebook');
      await signInWithFacebook();
    } catch (err: any) {
      setError(err.message || "An error occurred during Facebook sign up");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validate inputs
    if (!fullName || !username || !email || !password || !confirmPassword) {
      setError("Please fill all fields");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    // Validate username format (only letters, numbers, and underscores)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!agreeTerms) {
      setError("You must agree to the terms of service");
      return;
    }

    setIsLoading(true);
    try {
      // Check if username is already taken before signing up
      const { data: existingUser } = await supabase
        .from("public_profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (existingUser) {
        setError("This username is already taken. Please choose another one.");
        setIsLoading(false);
        return;
      }

      // Register user in Supabase Auth
      const { data, error } = await signUpWithEmail(email, password);

      if (error) {
        // Check if email is already in use
        if (
          error.message.includes("already registered") ||
          error.message.includes("User already registered")
        ) {
          setError(
            "This email is already in use. Try signing in or use a different email"
          );
        } else {
          setError(error.message || "Failed to create account");
        }
      } else if (data.user) {
        // Generate default profile image URL
        const defaultProfileImage = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzM3NDE1MSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0yMiA4NSBBIDMyIDMyIDAgMCAxIDc4IDg1IFEgNzggNjggNTAgNjggUSAyMiA2OCAyMiA4NSBaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==";

        // Add user details to users table (Trigger already created the row, so we just UPDATE it)
        const { error: insertError } = await supabase
          .from("users")
          .update({
            full_name: fullName,
            username: username.toLowerCase(),
            avatar_url: defaultProfileImage,
          })
          .eq('id', data.user.id);

        if (insertError) {
          console.error("Error adding data:", insertError);
          // User was successfully created in Auth
        } else {
          // Make sure profile image is saved
          await saveUserProfileImage(data.user.id, defaultProfileImage);
        }

        // Auto-login after successful sign-up
        const { error: loginError } = await signUpWithEmail(email, password);
        if (!loginError) {
          setSuccessMessage("Account created successfully! Redirecting...");
          // Show success message briefly
          setTimeout(() => {
            onSignupSuccess?.(email);
            onClose?.();
          }, 1500);
        } else {
          setSuccessMessage(
            "Account created! Please sign in with your email and password."
          );
          setTimeout(() => {
            onSignupSuccess?.(email);
            onClose?.();
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while creating account");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card className="w-full max-w-md rounded-2xl shadow-2xl border border-border bg-popover/95 backdrop-blur-xl">
      <CardContent className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Account</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Join JUST Social and start connecting
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground/50 hover:text-foreground transition-colors text-xl leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* Full Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullname" className="text-foreground/70 text-sm">
            Full Name
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <User className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="fullname"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Username */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="username" className="text-foreground/70 text-sm">
            Username
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <span className="text-[#A1A1A1] shrink-0 font-bold select-none">@</span>
              <input
                id="username"
                type="text"
                placeholder="johndoe123"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email" className="text-foreground/70 text-sm">
            Email Address
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Mail className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="signup-email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-sm text-foreground placeholder:text-muted-foreground/50 p-0 w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-password" className="text-foreground/70 text-sm">
            Password
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Lock className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="signup-password"
                type="password"
                placeholder="••••••••"
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

        {/* Confirm Password */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password" className="text-foreground/70 text-sm">
            Confirm Password
          </Label>
          <div className="relative group">
            <div className="relative flex items-center gap-3 bg-[#161616] rounded-lg px-4 h-12 w-full border border-[#262626] group-hover:border-[#3a3a3a] transition-colors">
              <Lock className="h-4 w-4 text-[#A1A1A1] shrink-0" />
              <input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
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

        {/* Terms */}
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
            I agree to the{" "}
            <span className="text-[#FFFFFF] hover:underline cursor-pointer transition-colors">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-[#FFFFFF] hover:underline cursor-pointer transition-colors">
              Privacy Policy
            </span>
          </Label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-sm text-green-300">
            {successMessage}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-12 text-base font-semibold rounded-xl bg-[#FFFFFF] text-[#0A0A0A] hover:bg-[#E2E2E2] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground/50">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social login buttons */}
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
            Continue with Google
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
            Continue with Facebook
          </button>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-[#525252] mt-1">
          Already have an account?{" "}
          <span
            onClick={onSwitchToSignIn}
            className="text-[#FFFFFF] cursor-pointer hover:underline font-medium transition-colors"
          >
            Sign In
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
