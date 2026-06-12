import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login } = useAuth();
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

        
      </div>
    </div>
  );
}
