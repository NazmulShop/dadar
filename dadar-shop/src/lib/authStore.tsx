import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* =========================================================
 * Dadar Shop — Real Auth (Brevo OTP + JWT + PostgreSQL)
 * ---------------------------------------------------------
 * All auth operations hit /api/auth/* backend endpoints.
 * JWT token stored in localStorage, sent as Bearer header.
 * OTP: 6 digits, valid 10 min, 60s resend cooldown.
 * ========================================================= */

export type AuthRole = "admin" | "user" | "seller";
export type Lang = "en" | "bn";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AuthRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl?: string;
  createdAt: number;
}

/**
 * /login can finish two ways:
 *  - a normal user gets a session immediately, same as before.
 *  - the Super Admin account instead gets a `ticket` and must complete
 *    email-OTP + secret-key steps (verifyAdminOtp / verifyAdminSecret)
 *    before a session is created. devOtp is only ever populated in local
 *    dev (no BREVO_API_KEY configured on the backend).
 */
export type LoginResult =
  | { kind: "session"; user: AuthUser }
  | { kind: "admin_verification_required"; ticket: string; devOtp?: string }
  | { kind: "requires_verification"; email: string };

interface Session {
  token: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  remember: boolean;
}

interface LockState {
  failures: number;
  lockedUntil?: number;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  lang: Lang;
  loading: boolean;
}

interface AuthApi extends AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  setLang: (l: Lang) => void;
  t: (k: TranslationKey) => string;
  login: (email: string, password: string, remember: boolean) => Promise<LoginResult>;
  verifyAdminOtp: (ticket: string, code: string) => Promise<void>;
  verifyAdminSecret: (ticket: string, secretKey: string, remember: boolean) => Promise<AuthUser>;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    secretKey?: string;
  }) => Promise<AuthUser>;
  logout: () => void;
  requestOtp: (channel: "email", target: string) => Promise<string>;
  verifyOtp: (target: string, code: string) => Promise<LoginResult>;
  verifyEmail: (code: string) => Promise<void>;
  sendVerificationEmail: () => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (input: { name?: string; phone?: string }) => Promise<AuthUser>;
  getLockInfo: (email: string) => Promise<LockState>;
  /** Returns the current session's bearer token, or undefined if signed out. */
  getToken: () => string | undefined;
}

const AuthContext = createContext<AuthApi | null>(null);

const LS_SESSION = "dadar.auth.session.v2";
const LS_LANG = "dadar.auth.lang.v1";

const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

// When VITE_API_URL is set (e.g. https://api.dadar.shop) we hit that origin
// directly. When empty (local dev), we fall back to relative "/api/auth"
// which is proxied by Vite to the backend.
const API_ORIGIN = ((import.meta as any).env?.VITE_API_URL ?? "").replace(/\/$/, "");
const API_BASE = `${API_ORIGIN}/api/auth`;

async function apiCall<T = unknown>(
  path: string,
  opts: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(rest.headers as Record<string, string> ?? {}),
  };

  const resp = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const msg =
      (data as any)?.error ??
      (data as any)?.message ??
      `Request failed (${resp.status})`;
    throw Object.assign(new Error(msg), { status: resp.status, data });
  }

  return data as T;
}

/* ── translations ── */
export type TranslationKey =
  | "auth.login"
  | "auth.register"
  | "auth.email"
  | "auth.phone"
  | "auth.password"
  | "auth.confirmPassword"
  | "auth.name"
  | "auth.remember"
  | "auth.forgot"
  | "auth.signin"
  | "auth.signup"
  | "auth.or"
  | "auth.continueGoogle"
  | "auth.continueFacebook"
  | "auth.haveAccount"
  | "auth.noAccount"
  | "auth.otpLogin"
  | "auth.sendOtp"
  | "auth.verifyOtp"
  | "auth.enterOtp"
  | "auth.resend"
  | "auth.forgotTitle"
  | "auth.forgotSub"
  | "auth.sendReset"
  | "auth.resetTitle"
  | "auth.newPassword"
  | "auth.resetBtn"
  | "auth.verifyEmailTitle"
  | "auth.verifyPhoneTitle"
  | "auth.welcome"
  | "auth.subtitle"
  | "auth.invalidCreds"
  | "auth.accountLocked"
  | "auth.rateLimited"
  | "auth.success"
  | "auth.logout"
  | "auth.tagline"
  | "auth.demoHint"
  | "auth.adminOtpTitle"
  | "auth.adminOtpSub"
  | "auth.adminSecretTitle"
  | "auth.adminSecretSub"
  | "auth.secretKey"
  | "auth.continue"
  | "auth.invalidSecret";

const T: Record<Lang, Record<TranslationKey, string>> = {
  en: {
    "auth.login": "Sign in",
    "auth.register": "Create account",
    "auth.email": "Email",
    "auth.phone": "Phone number",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm password",
    "auth.name": "Full name",
    "auth.remember": "Remember me for 30 days",
    "auth.forgot": "Forgot password?",
    "auth.signin": "Sign in",
    "auth.signup": "Create account",
    "auth.or": "or continue with",
    "auth.continueGoogle": "Continue with Google",
    "auth.continueFacebook": "Continue with Facebook",
    "auth.haveAccount": "Already have an account?",
    "auth.noAccount": "New to Dadar Shop?",
    "auth.otpLogin": "Sign in with OTP",
    "auth.sendOtp": "Send code",
    "auth.verifyOtp": "Verify",
    "auth.enterOtp": "Enter the 6-digit code",
    "auth.resend": "Resend code",
    "auth.forgotTitle": "Forgot your password?",
    "auth.forgotSub": "Enter your account email and we'll send a reset code.",
    "auth.sendReset": "Send reset code",
    "auth.resetTitle": "Set a new password",
    "auth.newPassword": "New password",
    "auth.resetBtn": "Update password",
    "auth.verifyEmailTitle": "Verify your email",
    "auth.verifyPhoneTitle": "Verify your phone",
    "auth.welcome": "Welcome back",
    "auth.subtitle": "Sign in to keep shopping.",
    "auth.invalidCreds": "Invalid email or password.",
    "auth.accountLocked": "Too many attempts. Account temporarily locked. Try again later.",
    "auth.rateLimited": "Please wait before requesting another code.",
    "auth.success": "Success",
    "auth.logout": "Sign out",
    "auth.tagline": "Shop anything, beautifully.",
    "auth.demoHint": "",
    "auth.adminOtpTitle": "Verify your identity",
    "auth.adminOtpSub": "This account requires extra verification. Enter the code we emailed you.",
    "auth.adminSecretTitle": "Enter admin secret key",
    "auth.adminSecretSub": "One last step — enter the admin secret key to finish signing in.",
    "auth.secretKey": "Secret key",
    "auth.continue": "Continue",
    "auth.invalidSecret": "Invalid secret key.",
  },
  bn: {
    "auth.login": "সাইন ইন",
    "auth.register": "অ্যাকাউন্ট তৈরি",
    "auth.email": "ইমেইল",
    "auth.phone": "মোবাইল নম্বর",
    "auth.password": "পাসওয়ার্ড",
    "auth.confirmPassword": "পাসওয়ার্ড নিশ্চিত করুন",
    "auth.name": "পূর্ণ নাম",
    "auth.remember": "৩০ দিনের জন্য মনে রাখুন",
    "auth.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
    "auth.signin": "সাইন ইন",
    "auth.signup": "অ্যাকাউন্ট তৈরি করুন",
    "auth.or": "অথবা চালিয়ে যান",
    "auth.continueGoogle": "Google দিয়ে চালিয়ে যান",
    "auth.continueFacebook": "Facebook দিয়ে চালিয়ে যান",
    "auth.haveAccount": "আগে থেকেই অ্যাকাউন্ট আছে?",
    "auth.noAccount": "দাদার শপে নতুন?",
    "auth.otpLogin": "OTP দিয়ে সাইন ইন",
    "auth.sendOtp": "কোড পাঠান",
    "auth.verifyOtp": "যাচাই করুন",
    "auth.enterOtp": "৬-সংখ্যার কোড লিখুন",
    "auth.resend": "আবার পাঠান",
    "auth.forgotTitle": "পাসওয়ার্ড ভুলে গেছেন?",
    "auth.forgotSub": "আপনার ইমেইল লিখুন, আমরা একটি রিসেট কোড পাঠাব।",
    "auth.sendReset": "রিসেট কোড পাঠান",
    "auth.resetTitle": "নতুন পাসওয়ার্ড সেট করুন",
    "auth.newPassword": "নতুন পাসওয়ার্ড",
    "auth.resetBtn": "পাসওয়ার্ড আপডেট",
    "auth.verifyEmailTitle": "ইমেইল যাচাই করুন",
    "auth.verifyPhoneTitle": "ফোন যাচাই করুন",
    "auth.welcome": "আবার স্বাগতম",
    "auth.subtitle": "কেনাকাটা চালিয়ে যেতে সাইন ইন করুন।",
    "auth.invalidCreds": "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।",
    "auth.accountLocked": "অনেকবার ভুল চেষ্টা। অ্যাকাউন্ট সাময়িক বন্ধ। পরে চেষ্টা করুন।",
    "auth.rateLimited": "নতুন কোড চাওয়ার আগে অপেক্ষা করুন।",
    "auth.success": "সফল",
    "auth.logout": "সাইন আউট",
    "auth.tagline": "সুন্দরভাবে যেকোনো কিছু কিনুন।",
    "auth.demoHint": "",
    "auth.adminOtpTitle": "পরিচয় যাচাই করুন",
    "auth.adminOtpSub": "এই অ্যাকাউন্টের জন্য অতিরিক্ত যাচাই প্রয়োজন। আপনার ইমেইলে পাঠানো কোডটি দিন।",
    "auth.adminSecretTitle": "অ্যাডমিন সিক্রেট কোড দিন",
    "auth.adminSecretSub": "শেষ ধাপ — সাইন ইন সম্পন্ন করতে অ্যাডমিন সিক্রেট কোড দিন।",
    "auth.secretKey": "সিক্রেট কোড",
    "auth.continue": "চালিয়ে যান",
    "auth.invalidSecret": "সিক্রেট কোড সঠিক নয়।",
  },
};

/* ── AuthProvider ── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedLang = read<Lang>(LS_LANG, "en");
    setLangState(storedLang);

    const s = read<Session | null>(LS_SESSION, null);
    if (s && s.expiresAt > Date.now()) {
      apiCall<{ user: AuthUser }>("/me", { token: s.token })
        .then(({ user: u }) => {
          setUser(u);
          setSession(s);
        })
        .catch(() => {
          write(LS_SESSION, null);
        })
        .finally(() => setLoading(false));
    } else {
      if (s) write(LS_SESSION, null);
      setLoading(false);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write(LS_LANG, l);
  }, []);

  const t = useCallback(
    (k: TranslationKey) => T[lang][k] ?? T.en[k] ?? k,
    [lang]
  );

  const persistSession = useCallback(
    (userData: AuthUser, token: string, expiresAt: number, remember: boolean) => {
      const s: Session = {
        token,
        userId: userData.id,
        issuedAt: Date.now(),
        expiresAt,
        remember,
      };
      write(LS_SESSION, s);
      setSession(s);
      setUser(userData);
    },
    []
  );

  const getToken = useCallback((): string | undefined => session?.token, [session]);

  const login: AuthApi["login"] = async (email, password, remember) => {
    const data = await apiCall<
      | { token: string; expiresAt: number; user: AuthUser }
      | { requiresAdminVerification: true; stage: "otp"; ticket: string; devOtp?: string }
    >("/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember }),
    });

    if ("requiresAdminVerification" in data && data.requiresAdminVerification) {
      return { kind: "admin_verification_required", ticket: data.ticket, devOtp: data.devOtp };
    }

    // Email not verified — backend blocked login. Direct user to verify-email.
    if ((data as any).requiresVerification) {
      return { kind: "requires_verification", email: (data as any).email ?? "" };
    }

    const sessionData = data as { token: string; expiresAt: number; user: AuthUser };
    persistSession(sessionData.user, sessionData.token, sessionData.expiresAt, remember);
    return { kind: "session", user: sessionData.user };
  };

  // Step 2 of Super Admin login: email OTP tied to the ticket from login().
  // On success the ticket advances server-side — no session yet.
  const verifyAdminOtp: AuthApi["verifyAdminOtp"] = async (ticket, code) => {
    await apiCall<{ stage: "secret" }>("/admin-login/verify-otp", {
      method: "POST",
      body: JSON.stringify({ ticket, code }),
    });
  };

  // Step 3 of Super Admin login: secret key matched against the
  // SUPER_ADMIN_SECRET_KEY Cloudflare secret. Only now is a session created.
  const verifyAdminSecret: AuthApi["verifyAdminSecret"] = async (ticket, secretKey, remember) => {
    const data = await apiCall<{ token: string; expiresAt: number; user: AuthUser }>(
      "/admin-login/verify-secret",
      { method: "POST", body: JSON.stringify({ ticket, secretKey }) },
    );
    persistSession(data.user, data.token, data.expiresAt, remember);
    return data.user;
  };

  const register: AuthApi["register"] = async ({ name, email, phone, password, secretKey }) => {
    const body: Record<string, unknown> = { name, email, phone, password };
    if (secretKey && secretKey.trim()) body.secretKey = secretKey.trim();
    const data = await apiCall<{
      token: string;
      expiresAt: number;
      user: AuthUser;
      requiresVerification?: boolean;
    }>("/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    // Always persist the session — verify-email page needs it (requireAuth).
    // Login is blocked server-side until emailVerified=true.
    persistSession(data.user, data.token, data.expiresAt, false);
    return data.user;
  };

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      apiCall("/logout", { method: "POST", token }).catch(() => {});
    }
    write(LS_SESSION, null);
    setSession(null);
    setUser(null);
  }, [getToken]);

  const requestOtp: AuthApi["requestOtp"] = async (channel, target) => {
    const data = await apiCall<{ ok: boolean; devOtp?: string }>("/send-otp", {
      method: "POST",
      body: JSON.stringify({ channel, target, type: "otp_login" }),
    });
    // In dev mode (no Brevo key) backend logs & returns OTP for easy testing
    return data.devOtp ?? "";
  };

  const verifyOtp: AuthApi["verifyOtp"] = async (target, code) => {
    const data = await apiCall<
      | { token: string; expiresAt: number; user: AuthUser }
      | { requiresAdminVerification: true; stage: "secret"; ticket: string }
    >("/verify-otp", {
      method: "POST",
      body: JSON.stringify({ target, code, type: "otp_login" }),
    });

    if ("requiresAdminVerification" in data && data.requiresAdminVerification) {
      return { kind: "admin_verification_required", ticket: data.ticket };
    }

    const sessionData = data as { token: string; expiresAt: number; user: AuthUser };
    persistSession(sessionData.user, sessionData.token, sessionData.expiresAt, false);
    return { kind: "session", user: sessionData.user };
  };

  const verifyEmail: AuthApi["verifyEmail"] = async (code) => {
    const token = getToken();
    const data = await apiCall<{ user: AuthUser; forceRelogin?: boolean }>("/verify-email", {
      method: "POST",
      body: JSON.stringify({ code }),
      token,
    });
    if (data.forceRelogin) {
      // This account was just promoted to Super Admin. The backend already
      // revoked the session that existed before the promotion — it never
      // went through the password -> OTP -> secret gate. Clear it locally
      // too so the UI reflects "signed out" and sends them to /auth/login.
      write(LS_SESSION, null);
      setSession(null);
      setUser(null);
      throw Object.assign(new Error("ADMIN_PROMOTED_RELOGIN_REQUIRED"), {
        adminPromoted: true,
      });
    }
    setUser(data.user);
  };

  const sendVerificationEmail: AuthApi["sendVerificationEmail"] = async () => {
    const token = getToken();
    const data = await apiCall<{ ok: boolean; devOtp?: string }>(
      "/send-verification-email",
      { method: "POST", token },
    );
    // devOtp is only present in non-production environments. In production
    // the OTP is delivered by email only; we return "" here so the UI shows
    // a clean "check your inbox" message instead of a blank demo hint.
    return data.devOtp ?? "";
  };

  const forgotPassword: AuthApi["forgotPassword"] = async (email) => {
    const data = await apiCall<{ ok: boolean; devToken?: string }>("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    // devToken is only present in non-production environments (the backend
    // omits it in production — see api-worker src/routes/auth.ts). In
    // production the real reset link is delivered by email only; there is
    // no safe client-side way to fabricate a working token, since the
    // server validates the embedded OTP code against its own database.
    return data.devToken ?? "";
  };

  const resetPassword: AuthApi["resetPassword"] = async (token, newPassword) => {
    await apiCall("/reset-password", {
      method: "POST",
      body: JSON.stringify({ resetToken: token, newPassword }),
    });
  };

  const updateProfile: AuthApi["updateProfile"] = async (input) => {
    const token = getToken();
    const data = await apiCall<{ user: AuthUser }>("/me", {
      method: "PATCH",
      body: JSON.stringify(input),
      token,
    });
    setUser(data.user);
    return data.user;
  };

  const getLockInfo = useCallback(async (email: string): Promise<LockState> => {
    try {
      const data = await apiCall<{ failures: number; lockedUntil?: number }>(
        `/lock-info?email=${encodeURIComponent(email)}`,
      );
      return { failures: data.failures, lockedUntil: data.lockedUntil };
    } catch {
      return { failures: 0 };
    }
  }, []);

  const api: AuthApi = useMemo(
    () => ({
      user,
      session,
      lang,
      loading,
      isAuthenticated: !!user && !!session && session.expiresAt > Date.now(),
      isAdmin: user?.role === "admin",
      setLang,
      t,
      login,
      verifyAdminOtp,
      verifyAdminSecret,
      register,
      logout,
      requestOtp,
      verifyOtp,
      verifyEmail,
      sendVerificationEmail,
      forgotPassword,
      resetPassword,
      updateProfile,
      getLockInfo,
      getToken,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, lang, loading]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
