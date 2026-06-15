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

function SkeletonStatGrid({ count = 5 }) {
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

function buildEmployeePerf(teamTasks = []) {
  const map = {};
  teamTasks.forEach((task) => {
    (task.assignedTo || []).forEach((a) => {
      if (!map[a.name]) map[a.name] = { name: a.name, total: 0, done: 0 };
      map[a.name].total++;
      if (task.status === "Completed") map[a.name].done++;
    });
  });
  return Object.values(map).map((e) => ({
    ...e,
    rate: e.total > 0 ? Math.round((e.done / e.total) * 100) : 0,
  }));
}

export default function SeniorDashboard() {
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
  const totalTeamTasks = (c.myPending ?? 0) + (c.myInProgress ?? 0) + (c.myCompleted ?? 0) + (c.myOverdue ?? 0);

  return (
    <div className="page-wrapper">
      <motion.div style={{ marginBottom: 28 }} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Welcome, {user?.name?.split(" ")[0]}! 
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          Manage your team and track task progress.
        </p>
      </motion.div>

      {loading ? <SkeletonStatGrid count={5} /> : (
        <div className="stats-grid">
          <StatCard label="Assigned by Admin" value={c.assignedToMe}   color="#6C47FF" bgColor="#EDE9FE" />
          <StatCard label="Team Tasks"        value={totalTeamTasks}   color="#0369A1" bgColor="#E0F2FE" />
          <StatCard label="Pending"           value={c.myPending}      color="#F59E0B" bgColor="#FEF3C7" />
          <StatCard label="Completed"         value={c.myCompleted}    color="#10B981" bgColor="#D1FAE5" />
          <StatCard label="Overdue"           value={c.myOverdue}      color="#EF4444" bgColor="#FEE2E2" />
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 28 }}>
        {/* Team Progress */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3 className="table-title">Team Progress</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 0 }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 16 }}>
                      <div className="skeleton skeleton-line" style={{ flex: 2 }} />
                      <div className="skeleton skeleton-line-sm" style={{ flex: 1 }} />
                    </div>
                  ))}
                </td></tr>
              ) : data?.teamProgress?.length > 0 ? data.teamProgress.map((t) => (
                <tr key={t.id || t._id}>
                  <td style={{ fontWeight: 600, maxWidth: 140 }} className="truncate">{t.title}</td>
                  <td style={{ fontSize: 13 }}>{t.assignedTo?.map((a) => a.name).join(", ") || "—"}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ fontSize: 12 }}>{formatDate(t.deadline)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="table-empty">No team tasks yet. Create a task!</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Employee Performance */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3 className="table-title">Employee Performance</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Assigned</th>
                <th>Done</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {buildEmployeePerf(data?.teamProgress).length > 0
                ? buildEmployeePerf(data?.teamProgress).map((emp) => (
                  <tr key={emp.name}>
                    <td style={{ fontWeight: 600 }}>{emp.name}</td>
                    <td>{emp.total}</td>
                    <td>{emp.done}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${emp.rate}%`,
                            background: emp.rate >= 80 ? "linear-gradient(90deg,#10B981,#059669)"
                                       : emp.rate >= 50 ? "linear-gradient(90deg,#F59E0B,#D97706)"
                                       : "linear-gradient(90deg,#EF4444,#DC2626)"
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, minWidth: 34 }}>{emp.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))
                : <tr><td colSpan={4} className="table-empty">No data yet</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
