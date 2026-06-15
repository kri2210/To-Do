import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { tasksAPI } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { PriorityBadge, StatusBadge } from "./Badges";

/* ── helpers ── */
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDateTime(d) {
  if (!d) return "—";
  return `${formatDate(d)} · ${formatTime(d)}`;
}

const ACTION_LABELS = {
  created:         "Created",
  status_change:   "Status changed",
  progress_update: "Progress updated",
  comment:         "Comment",
  edited:          "Edited",
};

function fireConfetti() {
  confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 },
    colors: ["#6C47FF","#10B981","#F59E0B","#3B82F6","#EC4899"], ticks: 220 });
}

/* ── animation variants ── */
const panelVariants = {
  hidden:  { x: "100%", opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", damping: 28, stiffness: 280 } },
  exit:    { x: "100%", opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
};

const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
};

/* ── component ── */
export default function TaskDetailModal({ task, onClose, onRefresh }) {
  const { user, isEmployee } = useAuth();
  const { toast } = useToast();

  const [detail, setDetail]       = useState(task);
  const [progress, setProgress]   = useState(task?.progress ?? 0);
  const [comment, setComment]     = useState("");
  const [status, setStatus]       = useState(task?.status ?? "Pending");
  const [saving, setSaving]       = useState(false);
  const [posting, setPosting]     = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const logEndRef = useRef(null);

  /* Sync when task prop changes */
  useEffect(() => {
    if (task) {
      setDetail(task);
      setProgress(task.progress ?? 0);
      setStatus(task.status ?? "Pending");
    }
  }, [task]);

  /* Scroll log to bottom on new entry */
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.activityLog?.length]);

  /* Save progress + optional status */
  const handleSaveProgress = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const wasCompleted = detail.status !== "Completed" && (status === "Completed" || progress === 100);
      const res = await tasksAPI.updateProgress(detail.id || detail._id, { progress, note: "", status });
      setDetail(res.data);
      setStatus(res.data.status);
      setProgress(res.data.progress);
      toast("Progress saved!", "success");
      if (wasCompleted) fireConfetti();
      onRefresh?.();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save progress.", "error");
    } finally {
      setSaving(false);
    }
  }, [detail, progress, status, toast, onRefresh]);

  /* Post comment */
  const handlePostComment = useCallback(async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await tasksAPI.addComment(detail.id || detail._id, { text: comment.trim() });
      setDetail(res.data);
      setComment("");
      toast("Comment added!", "success");
      onRefresh?.();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to post comment.", "error");
    } finally {
      setPosting(false);
    }
  }, [detail, comment, toast, onRefresh]);

  const handleCommentKey = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePostComment();
  };

  /* Progress slider colour */
  const sliderColor =
    progress === 100 ? "#10B981" :
    progress >= 50   ? "#6C47FF" :
    progress > 0     ? "#F59E0B" : "#9999B3";

  const isCompleted = detail?.status === "Completed";
  const canEdit = !isEmployee || (detail?.assignedTo || []).some(
    (a) => (a.id || a._id)?.toString() === user?._id?.toString()
  );

  if (!task) return null;

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Overlay */}
          <motion.div
            className="task-detail-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          {/* Side panel */}
          <motion.div
            className="task-detail-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={`Task detail: ${detail?.title}`}
          >
            {/* ── Header ── */}
            <div className="task-detail-header">
              <div className="task-detail-header-top">
                <h2 className={`task-detail-title ${isCompleted ? "completed-title" : ""}`}>
                  {detail?.title}
                </h2>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={onClose}
                  aria-label="Close detail panel"
                >
                  Close
                </button>
              </div>

              {/* Status + Priority + Category badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <StatusBadge status={detail?.status} large={isCompleted} />
                <PriorityBadge priority={detail?.priority} />
                {detail?.category && (
                  <span className="badge" style={{ background: "#EDE9FE", color: "#5B21B6" }}>
                    {detail.category}
                  </span>
                )}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{
              display: "flex", borderBottom: "1px solid var(--border)",
              padding: "0 24px", flexShrink: 0, background: "#fff"
            }}>
              {["activity", "details"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
                    background: "transparent",
                    color: activeTab === tab ? "var(--primary)" : "var(--text-muted)",
                    fontWeight: activeTab === tab ? 700 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "var(--font)",
                    transition: "all 0.15s",
                    textTransform: "capitalize",
                  }}
                >
                  {tab === "activity" ? "Activity" : "Details"}
                </button>
              ))}
            </div>

            {/* ── Body ── */}
            <div className="task-detail-body">

              {/* ── ACTIVITY TAB ── */}
              {activeTab === "activity" && (
                <>
                  {/* Progress section */}
                  {canEdit && (
                    <div className="task-detail-section">
                      <div className="task-detail-section-label">Progress & Status</div>

                      {/* Progress slider */}
                      <div className="progress-slider-wrapper" style={{ marginBottom: 12 }}>
                        <input
                          type="range"
                          className="progress-slider"
                          min={0}
                          max={100}
                          step={5}
                          value={progress}
                          onChange={(e) => setProgress(Number(e.target.value))}
                          disabled={isCompleted}
                          aria-label="Task progress"
                        />
                        <span className="progress-value" style={{ color: sliderColor }}>
                          {progress}%
                        </span>
                      </div>

                      {/* Big progress bar */}
                      <div className="progress-bar" style={{ height: 8, marginBottom: 14 }}>
                        <div
                          className={`progress-fill ${isCompleted ? "progress-fill-completed" : ""}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Status selector */}
                      {!isCompleted && (
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            Status:
                          </label>
                          <select
                            className="form-select"
                            style={{ padding: "7px 36px 7px 12px", fontSize: 13 }}
                            value={status}
                            onChange={(e) => {
                              setStatus(e.target.value);
                              if (e.target.value === "Completed") setProgress(100);
                            }}
                            aria-label="Task status"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      )}

                      {!isCompleted && (
                        <button
                          className="btn btn-primary btn-sm w-full"
                          onClick={handleSaveProgress}
                          disabled={saving}
                          style={{ justifyContent: "center" }}
                        >
                          {saving ? "Saving…" : "Save Progress"}
                        </button>
                      )}

                      {isCompleted && (
                        <div className="badge-completed-lg" style={{ width: "100%", justifyContent: "center" }}>
                          Task Completed!
                          {detail?.completedAt && (
                            <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 11, marginLeft: 6 }}>
                              · {formatDate(detail.completedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ height: 1, background: "var(--border)", margin: "4px 0 20px" }} />

                  {/* Activity Log */}
                  <div className="task-detail-section">
                    <div className="task-detail-section-label" style={{ display: "flex", alignItems: "center" }}>
                      Activity Log
                      <span style={{
                        marginLeft: "auto", fontSize: 11, fontWeight: 600,
                        color: "var(--text-muted)", textTransform: "none", letterSpacing: 0
                      }}>
                        {(detail?.activityLog || []).length} entries
                      </span>
                    </div>

                    <div className="activity-log">
                      {(detail?.activityLog || []).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>
                          No activity yet.
                        </div>
                      ) : (
                        [...(detail?.activityLog || [])]
                          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                          .map((entry, i) => (
                            <motion.div
                              key={entry._id || i}
                              className="activity-item"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                            >
                              <div className={`activity-dot activity-dot-${entry.action?.replace("_", "-") || "edited"}`} style={{ fontSize: 11, fontWeight: 700 }}>
                                {(ACTION_LABELS[entry.action] || "Edit").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="activity-content">
                                <div className="activity-note">{entry.note}</div>
                                <div className="activity-meta">
                                  {entry.user?.name && (
                                    <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                                      {entry.user.name}
                                    </span>
                                  )}
                                  {entry.user?.name && " · "}
                                  {formatDateTime(entry.timestamp)}
                                  {entry.progress !== undefined && entry.action === "progress_update" && (
                                    <span style={{ marginLeft: 6, color: "#10B981", fontWeight: 700 }}>
                                      {entry.progress}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))
                      )}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                </>
              )}

              {/* ── DETAILS TAB ── */}
              {activeTab === "details" && (
                <>
                  {detail?.description && (
                    <div className="task-detail-section">
                      <div className="task-detail-section-label">Description</div>
                      <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>
                        {detail.description}
                      </p>
                    </div>
                  )}

                  <div className="task-detail-section">
                    <div className="task-detail-section-label">Details</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Deadline",   value: formatDate(detail?.deadline) },
                        { label: "Category",   value: detail?.category },
                        { label: "Created by", value: detail?.assignedBy?.name },
                        ...(isCompleted && detail?.completedAt
                          ? [{ label: "Completed", value: formatDateTime(detail.completedAt) }]
                          : []),
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "var(--radius-sm)",
                            background: "var(--primary-subtle)", display: "flex",
                            alignItems: "center", justifyContent: "center", flexShrink: 0,
                            fontSize: 11, fontWeight: 700, color: "var(--primary)"
                          }}>
                            {label.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                              {label}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {value || "—"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assignees */}
                  <div className="task-detail-section">
                    <div className="task-detail-section-label">Assignees ({(detail?.assignedTo || []).length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(detail?.assignedTo || []).map((a, i) => (
                        <div key={a.id || i} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px", borderRadius: "var(--radius-md)",
                          background: "var(--bg-main)"
                        }}>
                          <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                            {a.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Completion notes */}
                  {detail?.completionNotes && (
                    <div className="task-detail-section">
                      <div className="task-detail-section-label">Completion Notes</div>
                      <p style={{
                        fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
                        padding: "12px", background: "#D1FAE5", borderRadius: "var(--radius-md)",
                        borderLeft: "3px solid #10B981"
                      }}>
                        {detail.completionNotes}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer: Comment input ── */}
            <div className="task-detail-footer">
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                Add Note / Comment
              </div>
              <div className="comment-input-wrapper">
                <textarea
                  className="comment-textarea"
                  placeholder="Type a note… (Ctrl+Enter to send)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={handleCommentKey}
                  rows={2}
                  aria-label="Add a comment or note"
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handlePostComment}
                  disabled={posting || !comment.trim()}
                  aria-label="Send comment"
                  style={{ height: 40, alignSelf: "flex-end" }}
                >
                  {posting ? "…" : "Send"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
