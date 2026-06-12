import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { tasksAPI } from "../api/api";
import StatCard from "../components/StatCard";
import { PriorityBadge, StatusBadge, RoleBadge } from "../components/Badges";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.getAnalytics()
      .then((res) => setAnalytics(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-spinner"><div className="spinner"></div></div>
  );

  const c = analytics?.counts || {};

  return (
    <div className="page-wrapper">
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>
          Good {getTimeOfDay()}, {user?.name?.split(" ")[0]}! 
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
          Here's what's happening in your organization today.
        </p>
      </div>

      {/* Stat Cards — Users */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
          Organization Overview
        </h2>
      </div>
      <div className="stats-grid">
        <StatCard label="Total Users" value={c.totalUsers}  color="#6C47FF" bgColor="#EDE9FE" />
        <StatCard label="Total Seniors" value={c.totalSeniors}  color="#0369A1" bgColor="#E0F2FE" />
        <StatCard label="Total Employees" value={c.totalEmployees}  color="#166534" bgColor="#F0FDF4" />
        <StatCard label="Total Tasks" value={c.totalTasks}  color="#7C3AED" bgColor="#F5F3FF" />
      </div>

      {/* Stat Cards — Tasks */}
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
          Task Status
        </h2>
      </div>
      <div className="stats-grid">
        <StatCard label="Pending Tasks" value={c.pending} color="#F59E0B" bgColor="#FEF3C7" />
        <StatCard label="In Progress" value={c.inProgress}  color="#3B82F6" bgColor="#DBEAFE" />
        <StatCard label="Completed" value={c.completed}  color="#10B981" bgColor="#D1FAE5" />
        <StatCard label="Overdue" value={c.overdue}  color="#EF4444" bgColor="#FEE2E2" />
      </div>

      {/* Tables Row */}
      <div className="grid grid-2" style={{ marginTop: 28 }}>
        {/* Recent Tasks */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3 className="table-title"> Recent Tasks</h3>
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
            <h3 className="table-title"> Recent Completions</h3>
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
                  <td><span className="badge" style={{ background: "#EDE9FE", color: "#5B21B6" }}>{t.category}</span></td>
                  <td style={{ fontSize: 13 }}>{t.assignedBy?.name || "—"}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="table-empty">No completions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priority & Category breakdown */}
      {analytics && (
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Tasks by Priority</h3>
            {analytics.tasksByPriority.map((p) => {
              const pct = c.totalTasks ? Math.round((p.count / c.totalTasks) * 100) : 0;
              const colors = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444" };
              return (
                <div key={p._id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p._id}</span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.count} ({pct}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: colors[p._id] || "var(--primary)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}> Tasks by Category</h3>
            {analytics.tasksByCategory.map((cat) => {
              const pct = c.totalTasks ? Math.round((cat.count / c.totalTasks) * 100) : 0;
              return (
                <div key={cat._id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{cat._id}</span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{cat.count} ({pct}%)</span>
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

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
