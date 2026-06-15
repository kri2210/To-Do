import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

import { tasksAPI } from "../api/api";
import { useToast } from "../context/ToastContext";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import TaskDetailModal from "../components/TaskDetailModal";

const STATUS_OPTIONS   = ["All", "Pending", "In Progress", "Completed", "Overdue"];
const PRIORITY_OPTIONS = ["All", "Low", "Medium", "High"];
const CATEGORY_OPTIONS = ["All", "Task", "Project", "Own"];

/* Skeleton card */
function TaskSkeleton() {
  return (
    <div className="skeleton-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="skeleton skeleton-line-lg" style={{ width: "55%" }} />
        <div className="skeleton" style={{ width: 60, height: 22, borderRadius: "var(--radius-full)" }} />
      </div>
      <div className="skeleton skeleton-line-sm" style={{ width: "80%", marginBottom: 6 }} />
      <div className="skeleton skeleton-line-sm" style={{ width: "60%" }} />
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
        <div className="skeleton" style={{ width: 80, height: 22, borderRadius: "var(--radius-full)" }} />
        <div className="skeleton" style={{ width: 90, height: 28, borderRadius: "var(--radius-md)" }} />
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function Tasks() {
  const { user, isEmployee } = useAuth();
  const { toast } = useToast();


  const [tasks,           setTasks]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editTask,        setEditTask]        = useState(null);
  const [detailTask,      setDetailTask]      = useState(null);
  const [search,          setSearch]          = useState("");
  const [filterStatus,    setFilterStatus]    = useState("All");
  const [filterPriority,  setFilterPriority]  = useState("All");
  const [filterCategory,  setFilterCategory]  = useState("All");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus   !== "All") params.status   = filterStatus;
      if (filterPriority !== "All") params.priority = filterPriority;
      if (filterCategory !== "All") params.category = filterCategory;
      if (search.trim())            params.search   = search.trim();
      const res = await tasksAPI.getAll(params);
      setTasks(res.data);
    } catch {
      toast("Failed to load tasks.", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory, search, toast]);

  /* Debounced fetch on filter change */
  useEffect(() => {
    const t = setTimeout(fetchTasks, 280);
    return () => clearTimeout(t);
  }, [fetchTasks]);



  const handleEdit = (task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditTask(null);
    setModalOpen(true);
  };

  const handleOpenDetail = (task) => setDetailTask(task);
  const handleCloseDetail = () => setDetailTask(null);

  const hasFilters = filterStatus !== "All" || filterPriority !== "All" || filterCategory !== "All" || search;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">
            {isEmployee ? "My Tasks" : "Task Management"}
          </h1>
          <p className="section-subtitle">
            {loading ? "Loading…" : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        {!isEmployee && (
          <button className="btn btn-primary" onClick={handleCreate} id="create-task-btn">
            + Create Task
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <input
            id="task-search"
            className="search-input"
            placeholder="Search by task title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
          />
        </div>

        <select id="filter-status" className="filter-select" value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by status">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
        </select>

        <select id="filter-priority" className="filter-select" value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)} aria-label="Filter by priority">
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p === "All" ? "All Priorities" : p}</option>)}
        </select>

        <select id="filter-category" className="filter-select" value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter by category">
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
        </select>

        <AnimatePresence>
          {hasFilters && (
            <motion.button
              key="clear"
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(""); setFilterStatus("All"); setFilterPriority("All"); setFilterCategory("All"); }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
            >
              ✕ Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="tasks-grid">
          {[...Array(6)].map((_, i) => <TaskSkeleton key={i} />)}
        </div>
      ) : tasks.length === 0 ? (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: 40 }}>📋</div>
            <div className="empty-state-title">No tasks found</div>
            <div className="empty-state-desc">
              {!isEmployee
                ? "Create your first task to get started!"
                : "No tasks have been assigned to you yet."}
            </div>
            {!isEmployee && (
              <button className="btn btn-primary mt-4" onClick={handleCreate}>
                + Create Task
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="tasks-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {tasks.map((task, i) => (
            <TaskCard
              key={task.id || task._id}
              task={task}
              index={i}
              onEdit={handleEdit}
              onDelete={() => fetchTasks()}
              onRefresh={fetchTasks}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </motion.div>
      )}

      {/* Task Create/Edit Modal */}
      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        onSaved={fetchTasks}
        editTask={editTask}
      />

      {/* Task Detail Side Panel */}
      <AnimatePresence>
        {detailTask && (
          <TaskDetailModal
            key={detailTask.id || detailTask._id}
            task={detailTask}
            onClose={handleCloseDetail}
            onRefresh={fetchTasks}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
