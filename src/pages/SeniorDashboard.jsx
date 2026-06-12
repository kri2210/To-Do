import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { tasksAPI } from "../api/api";
import StatCard from "../components/StatCard";
import { StatusBadge, PriorityBadge } from "../components/Badges";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SeniorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.getMyAnalytics()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const c = data?.counts || {};

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>
          Welcome, {user?.name?.split(" ")[0]}! 
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
          Manage your team and track task progress.
        </p>
      </div>

      <div className="stats-grid">
        <StatCard label="Assigned By Admin" value={c.assignedToMe}  color="#6C47FF" bgColor="#EDE9FE" />
        <StatCard label="Assigned To Team" value={c.myPending + c.myInProgress + c.myCompleted + c.myOverdue}  color="#0369A1" bgColor="#E0F2FE" />
        <StatCard label="Pending" value={c.myPending}  color="#F59E0B" bgColor="#FEF3C7" />
        <StatCard label="Completed" value={c.myCompleted}  color="#10B981" bgColor="#D1FAE5" />
        <StatCard label="Overdue" value={c.myOverdue}  color="#EF4444" bgColor="#FEE2E2" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 28 }}>
        {/* Team Progress */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3 className="table-title"> Team Progress</h3>
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
              {data?.teamProgress?.length > 0 ? data.teamProgress.map((t) => (
                <tr key={t.id || t._id}>
                  <td style={{ fontWeight: 600, maxWidth: 140 }} className="truncate">{t.title}</td>
                  <td style={{ fontSize: 13 }}>
                    {t.assignedTo?.map((a) => a.name).join(", ") || "—"}
                  </td>
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
            <h3 className="table-title"> Employee Performance</h3>
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
                          <div className="progress-fill" style={{ width: `${emp.rate}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{emp.rate}%</span>
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
