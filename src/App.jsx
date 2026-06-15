import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

// Route-level code splitting
const Login           = lazy(() => import("./pages/Login"));
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard"));
const SeniorDashboard = lazy(() => import("./pages/SeniorDashboard"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const Tasks           = lazy(() => import("./pages/Tasks"));
const UserManagement  = lazy(() => import("./pages/UserManagement"));
const Team            = lazy(() => import("./pages/Team"));

function PageSkeleton() {
  return (
    <div className="page-wrapper">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="skeleton skeleton-line-lg" style={{ width: "40%" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-line" style={{ width: "60%" }} />
              <div className="skeleton skeleton-line-lg" style={{ width: "40%" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-card" style={{ height: 110 }}>
              <div className="skeleton skeleton-line" style={{ width: "70%" }} />
              <div className="skeleton skeleton-line-sm" style={{ width: "50%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === "admin")  return <AdminDashboard />;
  if (user?.role === "senior") return <SeniorDashboard />;
  return <EmployeeDashboard />;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const pageTitle = {
    "/dashboard": "Dashboard",
    "/tasks":     "Tasks",
    "/users":     "User Management",
    "/team":      "Team",
  }[location.pathname] || "To-Do+";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Glassmorphism header */}
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className={`hamburger ${sidebarOpen ? "open" : ""}`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={sidebarOpen}
            >
              <span /><span /><span />
            </button>
            <div>
              <div className="top-header-title">{pageTitle}</div>
            </div>
          </div>

          <div className="top-header-actions">
            <div className="header-date-pill">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </div>
            {/* User avatar pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 12px 5px 6px",
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              cursor: "default",
            }}>
              <div className="sidebar-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                {initials}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                {user?.name?.split(" ")[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Routes with Suspense */}
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
            <Route path="/tasks"     element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/users"     element={<ProtectedRoute roles={["admin"]}><UserManagement /></ProtectedRoute>} />
            <Route path="/team"      element={<ProtectedRoute roles={["senior"]}><Team /></ProtectedRoute>} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-spinner" style={{ height: "100vh" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <Suspense fallback={<div className="loading-spinner" style={{ height: "100vh" }}><div className="spinner" /></div>}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/*"     element={user ? <AppLayout /> : <Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
