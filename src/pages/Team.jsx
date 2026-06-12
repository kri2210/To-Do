import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { tasksAPI } from "../api/api";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";

export default function TeamPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await tasksAPI.getAll();
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const myAssigned = tasks.filter((t) => t.assignedBy?.id === user.id || t.assignedBy?._id === user.id);

  return (
    <div className="page-wrapper">
      <div className="section-header">
        <div>
          <h1 className="section-title">Team Tasks </h1>
          <p className="section-subtitle">Tasks assigned to your team</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
           Assign Task
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <StatCard label="Total Assigned" value={myAssigned.length}  color="#6C47FF" bgColor="#EDE9FE" />
        <StatCard label="Pending" value={myAssigned.filter(t => t.status === "Pending").length}  color="#F59E0B" bgColor="#FEF3C7" />
        <StatCard label="In Progress" value={myAssigned.filter(t => t.status === "In Progress").length}  color="#3B82F6" bgColor="#DBEAFE" />
        <StatCard label="Completed" value={myAssigned.filter(t => t.status === "Completed").length}  color="#10B981" bgColor="#D1FAE5" />
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : myAssigned.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <div className="empty-state-title">No tasks assigned yet</div>
            <div className="empty-state-desc">Assign tasks to your team members to get started.</div>
            <button className="btn btn-primary mt-4" onClick={() => setModalOpen(true)}> Assign Task</button>
          </div>
        </div>
      ) : (
        <div className="tasks-grid">
          {myAssigned.map((task) => (
            <TaskCard key={task.id || task._id} task={task} onRefresh={fetchTasks} />
          ))}
        </div>
      )}

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchTasks} />
    </div>
  );
}
