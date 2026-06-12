import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { tasksAPI } from "../api/api";
import StatCard from "../components/StatCard";
import { StatusBadge, PriorityBadge } from "../components/Badges";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function EmployeeDashboard() {
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
          My Workspace 
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
          Welcome back, {user?.name}! Here are your tasks.
        </p>
      </div>

      <div className="stats-grid">
        <StatCard label="My Tasks" value={(c.myPending || 0) + (c.myInProgress || 0) + (c.myCompleted || 0) + (c.myOverdue || 0)}  color="#6C47FF" bgColor="#EDE9FE" />
        <StatCard label="Pending" value={c.myPending}  color="#F59E0B" bgColor="#FEF3C7" />
        <StatCard label="In Progress" value={c.myInProgress} color="#3B82F6" bgColor="#DBEAFE" />
        <StatCard label="Completed" value={c.myCompleted} color="#10B981" bgColor="#D1FAE5" />
        <StatCard label="Overdue" value={c.myOverdue} color="#EF4444" bgColor="#FEE2E2" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 28 }}>
        {/* Today's Tasks */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3 className="table-title"> Today's Tasks</h3>
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
              {data?.todayTasks?.length > 0 ? data.todayTasks.map((t) => (
                <tr key={t.id || t._id}>
                  <td style={{ fontWeight: 600, maxWidth: 180 }} className="truncate">{t.title}</td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3}>
                    <div className="table-empty">
                      <div className="table-empty-icon"></div>
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
            <h3 className="table-title"> Upcoming Deadlines</h3>
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
              {data?.upcomingDeadlines?.length > 0 ? data.upcomingDeadlines.map((t) => {
                const days = daysUntil(t.deadline);
                return (
                  <tr key={t.id || t._id}>
                    <td style={{ fontWeight: 600, maxWidth: 160 }} className="truncate">{t.title}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(t.deadline)}</td>
                    <td>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: days <= 1 ? "#EF4444" : days <= 3 ? "#F59E0B" : "#10B981",
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
                      <div className="table-empty-icon"></div>
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
