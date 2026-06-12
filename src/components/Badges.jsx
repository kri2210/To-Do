export function PriorityBadge({ priority }) {
  const map = {
    Low: "badge badge-low",
    Medium: "badge badge-medium",
    High: "badge badge-high",
  };
  const dots = { Low: "", Medium: "", High: "" };
  return (
    <span className={map[priority] || "badge"}>
      {dots[priority]} {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    Pending: "badge badge-pending",
    "In Progress": "badge badge-inprogress",
    Completed: "badge badge-completed",
    Overdue: "badge badge-overdue",
  };
  const icons = {
    Pending: "",
    "In Progress": "",
    Completed: "",
    Overdue: "",
  };
  const normalized = status === "In Progress" ? "inprogress" : status?.toLowerCase();
  return (
    <span className={map[status] || "badge"}>
      {icons[status]} {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className={`badge badge-role-${role}`}>
      {role === "admin" ? "" : role === "senior" ? "" : ""} {role}
    </span>
  );
}
