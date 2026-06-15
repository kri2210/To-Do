import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const adminLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tasks",     label: "Tasks" },
  { to: "/users",     label: "User Management" },
];

const seniorLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tasks",     label: "Tasks" },
  { to: "/team",      label: "Team" },
];

const employeeLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tasks",     label: "My Tasks" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    user?.role === "admin"
      ? adminLinks
      : user?.role === "senior"
      ? seniorLinks
      : employeeLinks;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`sidebar ${isOpen ? "open" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <a href="/dashboard" className="sidebar-logo" onClick={onClose}>
          <div className="sidebar-logo-text">
            To-Do<span>+</span>
          </div>
        </a>

        {/* Nav links */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              onClick={onClose}
              aria-label={link.label}
            >
              <span className="sidebar-link-text">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer: user + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={user?.name}>{user?.name || "User"}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button
            className="btn-logout"
            onClick={handleLogout}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
