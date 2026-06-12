import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { tasksAPI } from "../api/api";
import { useToast } from "../context/ToastContext";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";

const STATUS_OPTIONS = ["All", "Pending", "In Progress", "Completed", "Overdue"];
const PRIORITY_OPTIONS = ["All", "Low", "Medium", "High"];
const CATEGORY_OPTIONS = ["All", "Task", "Project", "Own"];

export default function Tasks() {
  const { user, isEmployee } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== "All") params.status = filterStatus;
      if (filterPriority !== "All") params.priority = filterPriority;
      if (filterCategory !== "All") params.category = filterCategory;
      if (search.trim()) params.search = search.trim();

      const res = await tasksAPI.getAll(params);
      setTasks(res.data);
    } catch (err) {
      toast("Failed to load tasks.", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchTasks, 300);
    return () => clearTimeout(debounce);
  }, [fetchTasks]);

  const handleEdit = (task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditTask(null);
    setModalOpen(true);
  };

  return (
    <div className="page-wrapper">
      <div className="section-header">
        <div>
          <h1 className="section-title">
            {isEmployee ? "My Tasks" : "Task Management"} 
          </h1>
          <p className="section-subtitle">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} found
          </p>
        </div>
        {!isEmployee && (
          <button className="btn btn-primary" onClick={handleCreate} id="create-task-btn">
             Create Task
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            id="task-search"
            className="search-input"
            placeholder="Search by task title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select id="filter-status" className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
        </select>

        <select id="filter-priority" className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p === "All" ? "All Priorities" : p}</option>)}
        </select>

        <select id="filter-category" className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
        </select>

        {(filterStatus !== "All" || filterPriority !== "All" || filterCategory !== "All" || search) && (
          <button className="btn btn-secondary btn-sm" onClick={() => {
            setSearch(""); setFilterStatus("All"); setFilterPriority("All"); setFilterCategory("All");
          }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <div className="empty-state-title">No tasks found</div>
            <div className="empty-state-desc">
              {!isEmployee ? "Create your first task to get started!" : "No tasks have been assigned to you yet."}
            </div>
            {!isEmployee && (
              <button className="btn btn-primary mt-4" onClick={handleCreate}>
                Create Task
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <TaskCard
              key={task.id || task._id}
              task={task}
              onEdit={handleEdit}
              onDelete={() => fetchTasks()}
              onRefresh={fetchTasks}
            />
          ))}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        onSaved={fetchTasks}
        editTask={editTask}
      />
    </div>
  );
}
