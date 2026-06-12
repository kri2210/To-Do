export default function StatCard({ label, value, icon, color = "#6C47FF", bgColor = "#EDE9FE" }) {
  return (
    <div className="stat-card" style={{ "--stat-color": color }}>
      <div className="stat-card-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value ?? 0}</div>
      </div>
      <div className="stat-icon" style={{ background: bgColor, color }}>
        <span>{icon}</span>
      </div>
    </div>
  );
}
