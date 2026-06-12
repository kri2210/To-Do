import { useState, useEffect, useCallback } from "react";
import { usersAPI } from "../api/api";
import { useToast } from "../context/ToastContext";
import { RoleBadge } from "../components/Badges";
import UserModal from "../components/UserModal";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data);
    } catch {
      toast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    try {
      await usersAPI.delete(u.id || u._id);
      toast("User deleted.", "success");
      fetchUsers();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to delete user.", "error");
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "All" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleGroups = {
    admin: filtered.filter((u) => u.role === "admin"),
    senior: filtered.filter((u) => u.role === "senior"),
    employee: filtered.filter((u) => u.role === "employee"),
  };

  return (
    <div className="page-wrapper">
      <div className="section-header">
        <div>
          <h1 className="section-title">User Management </h1>
          <p className="section-subtitle">{users.length} total users</p>
        </div>
        <button className="btn btn-primary" id="add-user-btn" onClick={() => { setEditUser(null); setModalOpen(true); }}>
           Add User
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Admins", count: roleGroups.admin.length, color: "#5B21B6" },
          { label: "Seniors", count: roleGroups.senior.length, color: "#0369A1" },
          { label: "Employees", count: roleGroups.employee.length, color: "#166534",  },
        ].map((s) => (
          <div key={s.label} className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input className="search-input" placeholder="Search by name or email..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="All">All Roles</option>
          <option value="admin">Admin</option>
          <option value="senior">Senior</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-spinner"><div className="spinner"></div></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon"></div>
                  <div className="empty-state-title">No users found</div>
                </div>
              </td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id || u._id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="sidebar-avatar" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{u.email}</td>
                <td><RoleBadge role={u.role} /></td>
                <td>
                  <span className="badge" style={{ background: u.isActive !== false ? "#D1FAE5" : "#FEE2E2", color: u.isActive !== false ? "#065F46" : "#991B1B" }}>
                    {u.isActive !== false ? " Active" : "⏸ Inactive"}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{formatDate(u.createdAt)}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditUser(u); setModalOpen(true); }}>
                       Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditUser(null); }}
        onSaved={fetchUsers}
        editUser={editUser}
      />
    </div>
  );
}
