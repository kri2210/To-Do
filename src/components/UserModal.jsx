import { useState } from "react";
import { useToast } from "../context/ToastContext";
import { usersAPI } from "../api/api";

const EMPTY_FORM = { name: "", email: "", password: "", role: "employee" };

export default function UserModal({ open, onClose, onSaved, editUser = null }) {
  const { toast } = useToast();
  const [form, setForm] = useState(editUser || EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Reset form when editUser changes
  useState(() => {
    if (open) {
      setForm(editUser ? { name: editUser.name, email: editUser.email, password: "", role: editUser.role } : EMPTY_FORM);
      setErrors({});
    }
  }, [open, editUser]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email is required.";
    if (!editUser && (!form.password || form.password.length < 6)) e.password = "Password must be at least 6 characters.";
    if (!form.role) e.role = "Role is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;

      if (editUser) {
        await usersAPI.update(editUser.id || editUser._id, payload);
        toast("User updated successfully!", "success");
      } else {
        await usersAPI.create(payload);
        toast("User created successfully!", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save user.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title">{editUser ? " Edit User" : " Add User"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label required">Full Name</label>
              <input className="form-input" placeholder="Krish shah" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div className="form-error">⚠ {errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">Email</label>
              <input className="form-input" type="email" placeholder="example@itechnotion.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <div className="form-error">⚠ {errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span className={editUser ? "" : "required" }>Password</span>
                {editUser && <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>Leave blank to keep current</span>}
              </label>
              <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {errors.password && <div className="form-error">⚠ {errors.password}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">Role</label>
              <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="employee"> Employee</option>
                <option value="senior"> Senior</option>
                <option value="admin"> Admin</option>
              </select>
              {errors.role && <div className="form-error">⚠ {errors.role}</div>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : editUser ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
