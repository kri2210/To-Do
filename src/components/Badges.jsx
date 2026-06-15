export function PriorityBadge({ priority }) {
  const map = {
    Low:    "badge badge-low",
    Medium: "badge badge-medium",
    High:   "badge badge-high",
  };
  return (
    <span className={map[priority] || "badge"}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status, large = false }) {
  const map = {
    Pending:      "badge badge-pending",
    "In Progress":"badge badge-inprogress",
    Completed:    large ? "badge-completed-lg" : "badge badge-completed",
    Overdue:      "badge badge-overdue",
  };
  return (
    <span className={map[status] || "badge"}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className={`badge badge-role-${role}`}>
      {role}
    </span>
  );
}
