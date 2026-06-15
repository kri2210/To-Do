import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { tasksAPI } from "../api/api";
import { PriorityBadge, StatusBadge } from "../components/Badges";


function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

/* Animated stat counter */
function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const target = value ?? 0;
    const diff = target - prevRef.current;
    if (diff === 0) return;
    let start = prevRef.current;
    const steps = Math.min(Math.abs(diff), 30);
    const step = diff / steps;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      start += step;
      setDisplay(Math.round(start));
      if (i >= steps) { clearInterval(timer); setDisplay(target); prevRef.current = target; }
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

function StatCard({ label, value, color, bgColor }) {
  return (
    <motion.div
      className="stat-card"
      style={{ "--stat-color": color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value stat-value-animated">
          <AnimatedCounter value={value} />
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="stats-grid">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="skeleton-card" style={{ minHeight: 100 }}>
          <div className="skeleton skeleton-line-sm" style={{ width: "50%", marginBottom: 14 }} />
          <div className="skeleton skeleton-line-lg" style={{ width: "40%" }} />
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="table-wrapper">
      <div className="table-header">
        <div className="skeleton skeleton-line" style={{ width: 140 }} />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 20 }}>
          <div className="skeleton skeleton-line" style={{ flex: 2 }} />
          <div className="skeleton" style={{ width: 60, height: 20, borderRadius: "var(--radius-full)" }} />
          <div className="skeleton" style={{ width: 70, height: 20, borderRadius: "var(--radius-full)" }} />
          <div className="skeleton skeleton-line-sm" style={{ flex: 1 }} />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = () => {
    tasksAPI.getAnalytics()
      .then((res) => setAnalytics(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAnalytics(); }, []);

  /* Refresh analytics on real-time task events */
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchAnalytics();
    socket.on("task:updated",  refresh);
    socket.on("task:progress", refresh);
    return () => { socket.off("task:updated", refresh); socket.off("task:progress", refresh); };
  }, [socket]);

  const c = analytics?.counts || {};

  return (
    <div className="page-wrapper">
      {/* Welcome */}
      <motion.div
        style={{ marginBottom: 28 }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Good {getTimeOfDay()}, {user?.name?.split(" ")[0]}! 
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          Here's what's happening in your organization today.
        </p>
      </motion.div>

      {/* Users stat cards */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>
          Organization Overview
        </h2>
      </div>

      {loading ? <SkeletonStatGrid count={4} /> : (
        <div className="stats-grid">
          <StatCard label="Total Users"     value={c.totalUsers}     color="#6C47FF" bgColor="#EDE9FE" />
          <StatCard label="Total Seniors"   value={c.totalSeniors}   color="#0369A1" bgColor="#E0F2FE" />
          <StatCard label="Total Employees" value={c.totalEmployees} color="#166534" bgColor="#F0FDF4" />
          <StatCard label="Total Tasks"     value={c.totalTasks}     color="#7C3AED" bgColor="#F5F3FF" />
        </div>
      )}

      {/* Task status cards */}
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>
          Task Status
        </h2>
      </div>

      {loading ? <SkeletonStatGrid count={4} /> : (
        <div className="stats-grid">
          <StatCard label="Pending"     value={c.pending}    color="#F59E0B" bgColor="#FEF3C7" />
          <StatCard label="In Progress" value={c.inProgress} color="#3B82F6" bgColor="#DBEAFE" />
          <StatCard label="Completed"   value={c.completed}  color="#10B981" bgColor="#D1FAE5" />
          <StatCard label="Overdue"     value={c.overdue}    color="#EF4444" bgColor="#FEE2E2" />
        </div>
      )}

      {/* Tables */}
      <div className="grid grid-2" style={{ marginTop: 28 }}>
        {loading ? (
          <>
            <SkeletonTable />
            <SkeletonTable />
          </>
        ) : (
          <>
            {/* Recent Tasks */}
            <div className="table-wrapper">
              <div className="table-header">
                <h3 className="table-title">Recent Tasks</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.recentTasks?.length > 0 ? analytics.recentTasks.map((t) => (
                    <tr key={t.id || t._id}>
                      <td style={{ fontWeight: 600, maxWidth: 160 }} className="truncate">{t.title}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ fontSize: 13 }}>{formatDate(t.deadline)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="table-empty">No tasks yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Recent Completions */}
            <div className="table-wrapper">
              <div className="table-header">
                <h3 className="table-title">Recent Completions</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Category</th>
                    <th>Assigned By</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.recentCompletions?.length > 0 ? analytics.recentCompletions.map((t) => (
                    <tr key={t.id || t._id}>
                      <td style={{ fontWeight: 600, maxWidth: 160 }} className="truncate">{t.title}</td>
                      <td><span className="badge" style={{ background: "#D1FAE5", color: "#065F46" }}>{t.category}</span></td>
                      <td style={{ fontSize: 13 }}>{t.assignedBy?.name || "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="table-empty">No completions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Priority & Category breakdown */}
      {!loading && analytics && (
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Tasks by Priority</h3>
            {analytics.tasksByPriority.map((p) => {
              const pct = c.totalTasks ? Math.round((p.count / c.totalTasks) * 100) : 0;
              const colors = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444" };
              return (
                <div key={p._id} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p._id}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{p.count} ({pct}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors[p._id] || "var(--primary)"}, ${colors[p._id] || "var(--primary-light)"})` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Tasks by Category</h3>
            {analytics.tasksByCategory.map((cat) => {
              const pct = c.totalTasks ? Math.round((cat.count / c.totalTasks) * 100) : 0;
              return (
                <div key={cat._id} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{cat._id}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{cat.count} ({pct}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
