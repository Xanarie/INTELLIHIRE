import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { CheckCircle2, X } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [toast,    setToast]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setToast({ type: "success", message: "Login successful!" });
      setTimeout(() => navigate("/admin"), 1000);
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded">
            Login
          </button>
        </form>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border bg-white ${
            toast.type === "success" ? "border-emerald-100" : "border-rose-100"
          }`}>
            <div className={`mt-0.5 ${toast.type === "success" ? "text-emerald-500" : "text-rose-500"}`}>
              {toast.type === "success" ? <CheckCircle2 size={18} /> : <X size={18} />}
            </div>
            <div className="min-w-[220px]">
              <div className="text-sm font-bold text-slate-800">
                {toast.type === "success" ? "Success" : "Error"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{toast.message}</div>
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