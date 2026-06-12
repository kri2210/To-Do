import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import SeniorDashboard from "./pages/SeniorDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Tasks from "./pages/Tasks";
import UserManagement from "./pages/UserManagement";
import Team from "./pages/Team";

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "senior") return <SeniorDashboard />;
  return <EmployeeDashboard />;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = {
    "/dashboard": "Dashboard",
    "/tasks": "Tasks",
    "/users": "User Management",
    "/team": "Team",
  }[location.pathname] || "TaskFlow";

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="top-header">
          <div>
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              <span></span><span></span><span></span>
            </button>
          </div>
          <div style={{ flex: 1, marginLeft: 12 }}>
            <div className="top-header-title">{pageTitle}</div>
          </div>
          <div className="top-header-actions">
            <div style={{
              fontSize: 12,
              color: "var(--text-muted)",
              background: "var(--bg-main)",
              padding: "6px 12px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
            }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={["admin"]}><UserManagement /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute roles={["senior"]}><Team /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-spinner" style={{ height: "100vh" }}>
      <div className="spinner"></div>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/*" element={user ? <AppLayout /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
