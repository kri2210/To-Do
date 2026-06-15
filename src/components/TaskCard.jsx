import { useCallback } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
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

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.65 },
    colors: ["#6C47FF", "#10B981", "#F59E0B", "#3B82F6", "#EC4899"],
    ticks: 200,
  });
}

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

const priorityColors = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444" };

export default function TaskCard({
  task, onEdit, onDelete, onRefresh, onOpenDetail, compact = false, index = 0
}) {
  const { user, isEmployee } = useAuth();
  const { toast } = useToast();

  const isCompleted = task.status === "Completed";
  const isOverdue   = task.status === "Overdue";
  const isSoon      = isDeadlineSoon(task.deadline);
  const progress    = task.progress ?? 0;
  const assignees   = task.assignedTo || [];

  const handleStatusChange = useCallback(async (e) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    try {
      await tasksAPI.update(task.id || task._id, { status: newStatus });
      toast(`Status updated to "${newStatus}"`, "success");
      if (newStatus === "Completed") fireConfetti();
      onRefresh?.();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to update status.", "error");
    }
  }, [task, toast, onRefresh]);

  const handleDelete = useCallback(async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await tasksAPI.delete(task.id || task._id);
      toast("Task deleted.", "success");
      onRefresh?.();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to delete.", "error");
    }
  }, [task, toast, onRefresh]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    onEdit?.(task);
  }, [task, onEdit]);

  const handleCardClick = () => onOpenDetail?.(task);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.05 }}
      className={`task-card ${isCompleted ? "task-completed" : ""}`}
      style={{ "--priority-color": priorityColors[task.priority] }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      aria-label={`Task: ${task.title}. Click to view details.`}
    >
      {/* DONE ribbon */}
      {isCompleted && <div className="task-done-ribbon" aria-hidden="true">DONE</div>}

      {/* Header */}
      <div className="task-card-header">
        <h3 className={`task-card-title ${isCompleted ? "completed" : ""}`}>
          {task.title}
        </h3>
        <div className="task-card-badges">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Description */}
      {task.description && !compact && (
        <p className="task-card-desc">{task.description}</p>
      )}

      {/* Meta row — text only, no icons */}
      <div className="task-card-meta">
        <span className={isOverdue ? "overdue-deadline" : isSoon ? "deadline-soon" : ""}>
          {formatDate(task.deadline)}
          {isOverdue ? " · Overdue" : isSoon ? " · Due soon" : ""}
        </span>
        {task.category && <span>{task.category}</span>}
        {task.assignedBy && <span>By: {task.assignedBy.name}</span>}
        {isCompleted && task.completedAt && (
          <span className="completed-date-pill">
            Done: {formatDate(task.completedAt)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="task-card-progress">
          <div className="task-card-progress-row">
            <span className="task-card-progress-label">Progress</span>
            <span className="task-card-progress-pct">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${isCompleted ? "progress-fill-completed" : ""}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="task-card-footer">
        {/* Assignees as name chips */}
        <div className="task-card-assignees">
          {assignees.slice(0, 3).map((a, i) => (
            <div key={a.id || i} className="assignee-chip" title={a.name}>
              {a.name}
            </div>
          ))}
          {assignees.length > 3 && (
            <div className="assignee-chip assignee-chip-more">
              +{assignees.length - 3} more
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
          {!isCompleted && (
            <select
              className="filter-select"
              value={task.status}
              onChange={handleStatusChange}
              style={{ fontSize: 12, padding: "5px 28px 5px 8px" }}
              aria-label="Update task status"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          )}

          {!isEmployee && onEdit && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleEditClick}
              aria-label="Edit task"
            >
              Edit
            </button>
          )}

          {!isEmployee && onDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              aria-label="Delete task"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Click hint — text only */}
      <div className="task-card-click-hint">View details</div>
    </motion.div>
  );
}
