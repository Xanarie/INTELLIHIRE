import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig"; // ← use the shared initialized instance
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff, CheckCircle2, X, Loader2 } from "lucide-react";

const NAVY = "#1A3C6E";
const TEAL = "#00AECC";

export default function Login() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Fetch role + name from Firestore users collection using the shared db instance
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          localStorage.setItem('role',     data.permission_role || 'Recruiter');
          localStorage.setItem('userName', data.name || user.email?.split('@')[0] || 'User');
        } else {
          localStorage.setItem('role',     'Recruiter');
          localStorage.setItem('userName', user.displayName || user.email?.split('@')[0] || 'User');
        }
      } catch {
        // Firestore read failed (e.g. security rules) — fall back safely, don't block login
        localStorage.setItem('role',     'Recruiter');
        localStorage.setItem('userName', user.displayName || user.email?.split('@')[0] || 'User');
      }

      setToast({ type: "success", message: "Login successful!" });
      setTimeout(() => navigate("/admin"), 1000);
    } catch (error) {
      const msg =
        error.code === 'auth/user-not-found'     ||
        error.code === 'auth/wrong-password'      ||
        error.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : error.message;
      setToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white"
        style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #0D2645 60%, ${TEAL} 100%)` }}
      >
        <div>
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base" style={{ background: TEAL, color: NAVY }}>
              IH
            </div>
            <div>
              <p className="font-black text-base leading-tight">IntelliHire</p>
              <p className="text-[10px] text-white/50 font-medium tracking-widest uppercase">AdminHub</p>
            </div>
          </div>

          <h1 className="text-4xl font-black leading-tight mb-4">
            Smarter hiring,<br />
            <span style={{ color: TEAL }}>intelligently sorted.</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            AI-powered applicant management for ProgressPro Services Inc. — from resume parsing to final endorsement.
          </p>
        </div>

        {/* Bottom tagline */}
        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} ProgressPro Services Inc.
        </p>
      </div>

      {/* ── Right panel (form) ──────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: NAVY, color: TEAL }}>
              IH
            </div>
            <p className="font-black text-slate-800">IntelliHire</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-800">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-1">Sign in to your admin account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 bg-white text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300"
                onFocus={e  => e.target.style.borderColor = TEAL}
                onBlur={e   => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 px-4 pr-11 rounded-xl border-2 border-slate-200 bg-white text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300"
                  onFocus={e => e.target.style.borderColor = TEAL}
                  onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 mt-2"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)` }}
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border bg-white ${
            toast.type === "success" ? "border-emerald-100" : "border-rose-100"
          }`}>
            <div className={`mt-0.5 ${toast.type === "success" ? "text-emerald-500" : "text-rose-500"}`}>
              {toast.type === "success" ? <CheckCircle2 size={18} /> : <X size={18} />}
            </div>
            <div className="min-w-[200px]">
              <p className="text-sm font-bold text-slate-800">
                {toast.type === "success" ? "Success" : "Error"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-300 hover:text-slate-500 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}