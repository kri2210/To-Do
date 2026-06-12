import { useState, useEffect } from "react";
import { usersAPI } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const EMPTY_FORM = {
  title: "",
  description: "",
  assignedTo: [],
  deadline: "",
  time: "23:59",
  priority: "Medium",
  category: "Task",
};

export default function TaskModal({ open, onClose, onSaved, editTask = null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Load users to assign to
    usersAPI.getAll(user.role === "senior" ? { role: "employee" } : {})
      .then((res) => setUsers(res.data.filter((u) => u.id !== user.id)))
      .catch(() => {});

    if (editTask) {
      const dl = editTask.deadline ? new Date(editTask.deadline) : null;
      setForm({
        title: editTask.title || "",
        description: editTask.description || "",
        assignedTo: editTask.assignedTo?.map((u) => u.id || u._id) || [],
        deadline: dl ? dl.toISOString().split("T")[0] : "",
        time: dl ? dl.toTimeString().slice(0, 5) : "23:59",
        priority: editTask.priority || "Medium",
        category: editTask.category || "Task",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, editTask, user]);

  const validate = () => {
    const e = {};
    if (!form.title.trim() || form.title.trim().length < 3)
      e.title = "Title must be at least 3 characters.";
    if (!form.deadline) e.deadline = "Deadline is required.";
    else {
      const selected = new Date(form.deadline);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (selected < today) e.deadline = "Deadline cannot be in the past.";
    }
    if (form.assignedTo.length === 0) e.assignedTo = "Select at least one assignee.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const deadlineISO = new Date(`${form.deadline}T${form.time || "23:59"}`).toISOString();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo,
        deadline: deadlineISO,
        priority: form.priority,
        category: form.category,
      };

      const { tasksAPI } = await import("../api/api");
      if (editTask) {
        await tasksAPI.update(editTask.id || editTask._id, payload);
        toast("Task updated successfully!", "success");
      } else {
        await tasksAPI.create(payload);
        toast("Task created successfully!", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save task.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (id) => {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(id)
        ? prev.assignedTo.filter((a) => a !== id)
        : [...prev.assignedTo, id],
    }));
    setErrors((e) => ({ ...e, assignedTo: undefined }));
  };

  if (!open) return null;

  // Minimum date for deadline picker
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{editTask ? " Edit Task" : " Create Task"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label required">Task Title</label>
              <input
                className="form-input"
                placeholder="Enter task title..."
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: "" }); }}
              />
              {errors.title && <div className="form-error">⚠ {errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Add task details..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Deadline Date</label>
                <input
                  type="date"
                  className="form-input"
                  min={today}
                  value={form.deadline}
                  onChange={(e) => { setForm({ ...form, deadline: e.target.value }); setErrors({ ...errors, deadline: "" }); }}
                />
                {errors.deadline && <div className="form-error">⚠ {errors.deadline}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Deadline Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="Low" color="#10B981"> Low</option>
                  <option value="Medium" color="#F59E0B"> Medium</option>
                  <option value="High" color="#EF4444"> High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="Task">Task</option>
                  <option value="Project">Project</option>
                  <option value="Own">Own</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Assign To</label>
              <div className="assignee-list">
                {users.length === 0 ? (
                  <div style={{ padding: "12px", color: "var(--text-muted)", fontSize: 13 }}>
                    No users available to assign.
                  </div>
                ) : (
                  users.map((u) => (
                    <label key={u.id || u._id} className="assignee-item">
                      <input
                        type="checkbox"
                        checked={form.assignedTo.includes(u.id || u._id)}
                        onChange={() => toggleAssignee(u.id || u._id)}
                      />
                      <div className="sidebar-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="assignee-item-name">{u.name}</span>
                      <span className="assignee-item-role">{u.role}</span>
                    </label>
                  ))
                )}
              </div>
              {errors.assignedTo && <div className="form-error">⚠ {errors.assignedTo}</div>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : editTask ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
