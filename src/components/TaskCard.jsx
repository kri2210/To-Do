import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { tasksAPI } from "../api/api";
import { PriorityBadge, StatusBadge } from "./Badges";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isDeadlineSoon(deadline) {
  if (!deadline) return false;
  const d = new Date(deadline);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 2;
}

export default function TaskCard({ task, onEdit, onDelete, onRefresh, compact = false }) {
  const { user, isEmployee } = useAuth();
  const { toast } = useToast();

  const priorityColors = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444" };

  const handleStatusChange = async (newStatus) => {
    try {
      await tasksAPI.update(task.id || task._id, { status: newStatus });
      toast(`Status updated to "${newStatus}"`, "success");
      onRefresh?.();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await tasksAPI.delete(task.id || task._id);
      toast("Task deleted.", "success");
      onRefresh?.();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to delete.", "error");
    }
  };

  const assignees = task.assignedTo || [];
  const deadline = task.deadline;
  const isOverdue = task.status === "Overdue";
  const isSoon = isDeadlineSoon(deadline);

  return (
    <div className="task-card" style={{ "--priority-color": priorityColors[task.priority] }}>
      <div className="task-card-header">
        <h3 className="task-card-title">{task.title}</h3>
        <div className="task-card-badges">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>

      {task.description && !compact && (
        <p className="task-card-desc">{task.description}</p>
      )}

      <div className="task-card-meta">
        <span className={isOverdue ? "overdue-deadline" : isSoon ? "deadline-soon" : ""}>
          {formatDate(deadline)}
          {isOverdue ? " (Overdue)" : isSoon ? " (Due soon)" : ""}
        </span>
        <span> {task.category}</span>
        {task.assignedBy && <span> By: {task.assignedBy.name}</span>}
      </div>

      <div className="task-card-footer">
        <div className="task-card-assignees">
          {assignees.slice(0, 4).map((a, i) => (
            <div key={a.id || i} className="assignee-avatar" title={a.name}>
              {a.name?.charAt(0).toUpperCase()}
            </div>
          ))}
          {assignees.length > 4 && (
            <div className="assignee-avatar" style={{ background: "#64748b" }}>
              +{assignees.length - 4}
            </div>
          )}
        </div>

        <div className="task-card-actions">
          {/* Status update dropdown */}
          <div className="task-card-action">Status:</div>
          {task.status !== "Completed" && (
            <select
              className="filter-select"
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ fontSize: 12, padding: "5px 28px 5px 8px" }}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          )}

          {!isEmployee && onEdit && (
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(task)}>
               Edit
            </button>
          )}

          {!isEmployee && onDelete && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
