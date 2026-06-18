import { useState, useEffect, useCallback } from "react";
import { documentsAPI } from "../api/api";

/* ─── Skeleton loader ──────────────────────────────────────────────────────── */
function DocSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            padding: "14px 16px",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ height: 12, width: "35%", background: "var(--border)", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 10, width: "60%", background: "var(--border)", borderRadius: 4 }} />
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

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

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
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
        }}
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        id="employee-docs-panel"
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(420px, 95vw)",
          height: "100vh",
          background: "var(--bg-sidebar)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.22s ease both",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              {employee?.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {loading ? "Loading..." : `${docs.length} document${docs.length !== 1 ? "s" : ""}`}
            </div>
          </div>
          <button
            id="close-docs-panel-btn"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: 16,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px", flex: 1 }}>
          {loading && <DocSkeleton />}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)" }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Failed to load</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>{error}</div>
              <button className="btn btn-secondary btn-sm" onClick={fetchDocs}>Retry</button>
            </div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No Docs</div>
              <div style={{ fontSize: 13 }}>
                Upload a file like{" "}
                <code style={{ background: "var(--bg-main)", padding: "2px 6px", borderRadius: 4 }}>
                  {employee?.name?.split(" ")[0]?.toLowerCase() ?? "name"}_resume.pdf
                </code>{" "}
                to Google Drive.
              </div>
            </div>
          )}

          {!loading && !error && docs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map((doc) => (
                <DocumentCard key={doc.id || doc._id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── Document card ────────────────────────────────────────────────────────── */
function DocumentCard({ doc }) {
  const dateStr = doc.uploadedAt
    ? new Date(doc.uploadedAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
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
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {dateStr}
        </div>
      </div>

      <a
        href={doc.driveLink}
        target="_blank"
        rel="noopener noreferrer"
        id={`view-doc-btn-${doc.id || doc._id}`}
        className="btn btn-secondary btn-sm"
        style={{
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontSize: 12,
        }}
      >
        View
      </a>
    </div>
  );
}
