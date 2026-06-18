import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login:       (data) => api.post("/auth/login", data),
  googleLogin: (token) => api.post("/auth/google-login", { token }),
  getMe:       ()     => api.get("/auth/me"),
  seed:        ()     => api.post("/auth/seed"),
};

// Users
export const usersAPI = {
  getAll: (params)     => api.get("/users", { params }),
  create: (data)       => api.post("/users", data),
  update: (id, data)   => api.put(`/users/${id}`, data),
  delete: (id)         => api.delete(`/users/${id}`),
};

// Tasks
export const tasksAPI = {
  getAll:         (params)     => api.get("/tasks", { params }),
  getById:        (id)         => api.get(`/tasks/${id}`),
  create:         (data)       => api.post("/tasks", data),
  update:         (id, data)   => api.put(`/tasks/${id}`, data),
  updateProgress: (id, data)   => api.patch(`/tasks/${id}/progress`, data),
  delete:         (id)         => api.delete(`/tasks/${id}`),
  addComment:     (id, data)   => api.post(`/tasks/${id}/comment`, data),
  getAnalytics:   ()           => api.get("/tasks/analytics"),
  getMyAnalytics: ()           => api.get("/tasks/my-analytics"),
};

// Documents
export const documentsAPI = {
  getByEmployee: (employeeId) => api.get("/documents", { params: { employeeId } }),
  create:        (data)       => api.post("/documents", data),
};

export default api;

