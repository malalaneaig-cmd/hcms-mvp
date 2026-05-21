import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('hcms_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && location.pathname !== '/login' && !location.pathname.startsWith('/book')) {
      localStorage.removeItem('hcms_token');
      localStorage.removeItem('hcms_user');
      location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Resource helpers ─────────────────────────────────────
export const Auth = {
  login:    (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (data)            => api.post('/auth/register', data).then((r) => r.data),
  me:       ()                => api.get('/auth/me').then((r) => r.data),
};

// Admin-only — backend enforces role check
export const Staff = {
  list:   () => api.get('/auth/users').then((r) => r.data),
  create: (data) => api.post('/auth/register', data).then((r) => r.data),
};

export const Patients = {
  list:   (search) => api.get('/patients', { params: { search } }).then((r) => r.data),
  get:    (id)     => api.get(`/patients/${id}`).then((r) => r.data),
  create: (data)   => api.post('/patients', data).then((r) => r.data),
  update: (id, d)  => api.patch(`/patients/${id}`, d).then((r) => r.data),
  remove: (id)     => api.delete(`/patients/${id}`).then((r) => r.data),
  notes:  (id)     => api.get(`/patients/${id}/notes`).then((r) => r.data),
};

export const Doctors = {
  list:   ()      => api.get('/doctors').then((r) => r.data),
  public: ()      => axios.get('/api/doctors/public').then((r) => r.data),
  create: (data)  => api.post('/doctors', data).then((r) => r.data),
  remove: (id)    => api.delete(`/doctors/${id}`).then((r) => r.data),
};

export const Appointments = {
  list:    (params)  => api.get('/appointments', { params }).then((r) => r.data),
  create:  (data)    => api.post('/appointments', data).then((r) => r.data),
  publicBook: (data) => axios.post('/api/appointments/public', data).then((r) => r.data),
  setStatus: (id, s) => api.patch(`/appointments/${id}/status`, { status: s }).then((r) => r.data),
  remove:  (id)      => api.delete(`/appointments/${id}`).then((r) => r.data),
};

export const Notes = {
  create: (data) => api.post('/notes', data).then((r) => r.data),
  remove: (id)   => api.delete(`/notes/${id}`).then((r) => r.data),
};

export const Invoices = {
  list:   (params)  => api.get('/invoices', { params }).then((r) => r.data),
  create: (data)    => api.post('/invoices', data).then((r) => r.data),
  setStatus: (id, s)=> api.patch(`/invoices/${id}/status`, { status: s }).then((r) => r.data),
  remove: (id)      => api.delete(`/invoices/${id}`).then((r) => r.data),
};
