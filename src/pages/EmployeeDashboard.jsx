import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { tasksAPI } from "../api/api";
import { StatusBadge, PriorityBadge } from "../components/Badges";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
}

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

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    tasksAPI.getMyAnalytics()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData();
    socket.on("task:updated",  refresh);
    socket.on("task:progress", refresh);
    return () => { socket.off("task:updated", refresh); socket.off("task:progress", refresh); };
  }, [socket]);

  const c = data?.counts || {};
  const totalTasks = (c.myPending ?? 0) + (c.myInProgress ?? 0) + (c.myCompleted ?? 0) + (c.myOverdue ?? 0);

  return (
    <div className="page-wrapper">
      <motion.div style={{ marginBottom: 28 }} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.5px" }}>
          My Workspace 
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          Welcome back, {user?.name}! Here are your tasks.
        </p>
      </motion.div>

      {/* Stats */}
      {loading ? (
        <div className="stats-grid">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-card" style={{ minHeight: 100 }}>
              <div className="skeleton skeleton-line-sm" style={{ width: "50%", marginBottom: 14 }} />
              <div className="skeleton skeleton-line-lg" style={{ width: "40%" }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="stats-grid">
          <StatCard label="My Tasks"    value={totalTasks}      color="#6C47FF" bgColor="#EDE9FE" />
          <StatCard label="Pending"     value={c.myPending}     color="#F59E0B" bgColor="#FEF3C7" />
          <StatCard label="In Progress" value={c.myInProgress}  color="#3B82F6" bgColor="#DBEAFE" />
          <StatCard label="Completed"   value={c.myCompleted}   color="#10B981" bgColor="#D1FAE5" />
          <StatCard label="Overdue"     value={c.myOverdue}     color="#EF4444" bgColor="#FEE2E2" />
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 28 }}>
        {/* Today's Tasks */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3 className="table-title">Today's Tasks</h3>
            {data?.todayTasks?.length > 0 && (
              <span className="badge" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
                {data.todayTasks.length} due today
              </span>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 16 }}>
                      <div className="skeleton skeleton-line" style={{ flex: 2 }} />
                      <div className="skeleton" style={{ width: 50, height: 20, borderRadius: "var(--radius-full)" }} />
                    </div>
                  ))}
                </td></tr>
              ) : data?.todayTasks?.length > 0 ? data.todayTasks.map((t) => (
                <tr key={t.id || t._id}>
                  <td style={{ fontWeight: 600, maxWidth: 180 }} className="truncate">{t.title}</td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3}>
                    <div className="table-empty">
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                      No tasks due today!
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming Deadlines */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3 className="table-title">Upcoming Deadlines</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Deadline</th>
                <th>Time Left</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 16 }}>
                      <div className="skeleton skeleton-line" style={{ flex: 2 }} />
                      <div className="skeleton skeleton-line-sm" style={{ flex: 1 }} />
                    </div>
                  ))}
                </td></tr>
              ) : data?.upcomingDeadlines?.length > 0 ? data.upcomingDeadlines.map((t) => {
                const days = daysUntil(t.deadline);
                return (
                  <tr key={t.id || t._id}>
                    <td style={{ fontWeight: 600, maxWidth: 160 }} className="truncate">{t.title}</td>
                    <td style={{ fontSize: 13 }}>
                      {formatDate(t.deadline)}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: days <= 1 ? "#EF4444" : days <= 3 ? "#F59E0B" : "#10B981",
                        background: days <= 1 ? "#FEE2E2" : days <= 3 ? "#FEF3C7" : "#D1FAE5",
                        padding: "2px 10px", borderRadius: "var(--radius-full)",
                      }}>
                        {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days} days`}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={3}>
                    <div className="table-empty">
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                      No upcoming deadlines!
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
