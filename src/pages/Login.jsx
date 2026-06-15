import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login, googleLogin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required.";
    if (!form.password) e.password = "Password is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const userData = await login(form.email, form.password);
      toast(`Welcome back, ${userData.name}! 👋`, "success");
      navigate("/dashboard");
    } catch (err) {
      toast(err.response?.data?.message || "Login failed. Check your credentials.", "error");
      setErrors({ general: err.response?.data?.message || "Invalid email or password." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    try {
      const userData = await googleLogin(response.credential);
      toast(`Welcome back, ${userData.name}! 👋`, "success");
      navigate("/dashboard");
    } catch (err) {
      toast(err.response?.data?.message || "Google login failed.", "error");
      setErrors({ general: err.response?.data?.message || "Google login failed." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id-here.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", width: "100%" }
        );
      } else {
        setTimeout(initializeGoogleSignIn, 100);
      }
    };

    initializeGoogleSignIn();
  }, []);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">✅</div>
          <h1 className="login-title">To-Do</h1>
          <p className="login-subtitle">Employee Task Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 16,
              color: "#DC2626",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              ❌ {errors.general}
            </div>
          )}

          <div className="form-group">
            <label className="form-label required">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="your@company.com"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({}); }}
              autoComplete="email"
            />
            {errors.email && <div className="form-error">⚠ {errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({}); }}
              autoComplete="current-password"
            />
            {errors.password && <div className="form-error">⚠ {errors.password}</div>}
          </div>

          <button id="login-btn" type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="spinner spinner-sm" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }}></span>
                Signing in...
              </span>
            ) : "Sign In →"}
          </button>
        </form>

        <div className="login-divider" style={{
          display: "flex",
          alignItems: "center",
          margin: "20px 0",
          color: "var(--text-secondary)",
          fontSize: 12,
        }}>
          <span style={{ flex: 1, borderBottom: "1px solid var(--border)" }}></span>
          <span style={{ padding: "0 10px", fontWeight: 500 }}>or continue with</span>
          <span style={{ flex: 1, borderBottom: "1px solid var(--border)" }}></span>
        </div>

        <div id="google-signin-btn" style={{ width: "100%", display: "flex", justifyContent: "center" }}></div>
      </div>
    </div>
  );
}
