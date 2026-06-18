import { useState, useEffect, useCallback } from "react";
import { documentsAPI } from "../api/api";

/* ─── Icon helpers ─────────────────────────────────────────────────────────── */
const DOC_ICONS = {
  "Resume":       "📄",
  "PAN Card":     "🪪",
  "Aadhar Card":  "🪪",
  "Offer Letter": "✉️",
  "Certificate":  "🏅",
  "Contract":     "📝",
  "NDA":          "🔒",
  "Payslip":      "💰",
  "ID Card":      "🪪",
};
function docIcon(type) {
  return DOC_ICONS[type] ?? "📎";
}

/* ─── Skeleton loader ──────────────────────────────────────────────────────── */
function DocSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--border)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, width: "45%", background: "var(--border)", borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 10, width: "65%", background: "var(--border)", borderRadius: 6 }} />
          </div>
          <div style={{ width: 60, height: 30, background: "var(--border)", borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function EmployeeDocumentsPanel({ employee, onClose }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const employeeId = employee?.id || employee?._id;

  const fetchDocs = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await documentsAPI.getByEmployee(employeeId);
      setDocs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  /* ── Overlay backdrop ── */
  return (
    <div
      id="employee-docs-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop blur */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        id="employee-docs-panel"
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(460px, 95vw)",
          height: "100vh",
          background: "var(--bg-sidebar)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 20px",
            borderBottom: "1px solid var(--border)",
            background: "linear-gradient(135deg, var(--primary) 0%, #7C3AED 100%)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {employee?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{employee?.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                  Employee Documents
                </div>
              </div>
            </div>
            <button
              id="close-docs-panel-btn"
              onClick={onClose}
              aria-label="Close documents panel"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "50%",
                width: 34,
                height: 34,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "#fff",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            >
              ×
            </button>
          </div>

          {/* Stats pill */}
          {!loading && !error && (
            <div
              style={{
                marginTop: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              📂 {docs.length} document{docs.length !== 1 ? "s" : ""} found
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 20px", flex: 1 }}>
          {loading && <DocSkeleton />}

          {!loading && error && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Failed to load documents</div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>{error}</div>
              <button className="btn btn-secondary btn-sm" onClick={fetchDocs}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.6 }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No documents yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Upload a file like <code style={{ background: "var(--bg-main)", padding: "2px 6px", borderRadius: 4 }}>
                  {employee?.name?.split(" ")[0]?.toLowerCase() ?? "name"}_resume.pdf
                </code>{" "}
                to the <strong>Employee Documents</strong> folder in Google Drive.
              </div>
            </div>
          )}

          {!loading && !error && docs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {docs.map((doc) => (
                <DocumentCard key={doc.id || doc._id} doc={doc} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-main)",
            flexShrink: 0,
            fontSize: 12,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🔗</span>
          <span>Documents are stored in Google Drive. Click <strong>View</strong> to open.</span>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/* ─── Individual document card ─────────────────────────────────────────────── */
function DocumentCard({ doc }) {
  const icon = docIcon(doc.documentType);
  const dateStr = doc.uploadedAt
    ? new Date(doc.uploadedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        transition: "box-shadow 0.2s, border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(108,71,255,0.12)";
        e.currentTarget.style.borderColor = "var(--primary)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: "linear-gradient(135deg, rgba(108,71,255,0.12), rgba(124,58,237,0.18))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "var(--text-primary)",
            marginBottom: 3,
          }}
        >
          {doc.documentType}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={doc.documentName}
        >
          {doc.documentName}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
          {dateStr}
        </div>
      </div>

      {/* View button */}
      <a
        href={doc.driveLink}
        target="_blank"
        rel="noopener noreferrer"
        id={`view-doc-btn-${doc.id || doc._id}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "7px 14px",
          background: "linear-gradient(135deg, var(--primary), #7C3AED)",
          color: "#fff",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "opacity 0.2s, transform 0.15s",
          boxShadow: "0 2px 8px rgba(108,71,255,0.3)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.88";
          e.currentTarget.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        🔗 View
      </a>
    </div>
  );
}
