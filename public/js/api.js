const API = {
  _token: localStorage.getItem('pw_token') || '',
  getToken() { return this._token; },
  setToken(t) { this._token = t; if(t) localStorage.setItem('pw_token',t); else localStorage.removeItem('pw_token'); },

  async _fetch(url, opts = {}) {
    const headers = { ...opts.headers };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
    const res = await fetch(url, { ...opts, headers });
    const data = await res.json();
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
  },

  // Auth
  register(body) { return this._fetch('/api/auth/register', { method:'POST', body:JSON.stringify(body) }); },
  login(body) { return this._fetch('/api/auth/login', { method:'POST', body:JSON.stringify(body) }); },
  me() { return this._fetch('/api/auth/me'); },
  updateProfile(body) { return this._fetch('/api/auth/profile', { method:'PUT', body:JSON.stringify(body) }); },
  changePassword(body) { return this._fetch('/api/auth/password', { method:'PUT', body:JSON.stringify(body) }); },
  getNotifications() { return this._fetch('/api/auth/notifications'); },
  readNotification(id) { return this._fetch(`/api/auth/notifications/${id}/read`, { method:'PUT' }); },

  // Photos
  getPhotos(params = {}) { const qs = new URLSearchParams(params).toString(); return this._fetch(`/api/photos?${qs}`); },
  getPhoto(id) { return this._fetch(`/api/photos/${id}`); },
  uploadPhotos(formData) { return this._fetch('/api/photos', { method:'POST', body:formData }); },
  deletePhoto(id) { return this._fetch(`/api/photos/${id}`, { method:'DELETE' }); },
  likePhoto(id) { return this._fetch(`/api/photos/${id}/like`, { method:'POST' }); },
  getComments(id) { return this._fetch(`/api/photos/${id}/comments`); },
  addComment(id, content) { return this._fetch(`/api/photos/${id}/comments`, { method:'POST', body:JSON.stringify({content}) }); },

  // Users
  getUserProfile(id) { return this._fetch(`/api/users/${id}/profile`); },

  // Admin
  getAdminStats() { return this._fetch('/api/admin/stats'); },
  getAdminUsers(params) { const qs = new URLSearchParams(params).toString(); return this._fetch(`/api/admin/users?${qs}`); },
  updateUserStatus(id, status) { return this._fetch(`/api/admin/users/${id}/status`, { method:'PUT', body:JSON.stringify({status}) }); },
  updateUserRole(id, role) { return this._fetch(`/api/admin/users/${id}/role`, { method:'PUT', body:JSON.stringify({role}) }); },
  getInvites() { return this._fetch('/api/admin/invites'); },
  createInvites(body) { return this._fetch('/api/admin/invites', { method:'POST', body:JSON.stringify(body) }); },
  adminDeletePhoto(id) { return this._fetch(`/api/admin/photos/${id}`, { method:'DELETE' }); },
  adminDeleteComment(id) { return this._fetch(`/api/admin/comments/${id}`, { method:'DELETE' }); }
};
