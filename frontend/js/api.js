// п.2.3, 9.3
const API_BASE = '/backend/index.php/api';

async function apiFetch(path, options = {}) {
  const opts = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(API_BASE + path, opts);
  let payload = null;
  try { payload = await res.json(); } catch (e) { /* ignore */ }
  if (!res.ok) {
    const msg = (payload && payload.error) ? payload.error : ('HTTP ' + res.status);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return payload ? payload.data : null;
}

const api = {
  // auth
  register: (body)      => apiFetch('/auth/register', { method: 'POST', body }),
  login:    (body)      => apiFetch('/auth/login',    { method: 'POST', body }),
  logout:   ()          => apiFetch('/auth/logout',   { method: 'POST' }),
  me:       ()          => apiFetch('/auth/me'),

  // restaurants
  restaurants: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/restaurants' + (qs ? '?' + qs : ''));
  },
  restaurant: (id) => apiFetch('/restaurant/' + id),

  // availability
  availability: (params) => apiFetch('/tables/availability?' + new URLSearchParams(params).toString()),

  // bookings
  createBooking: (body) => apiFetch('/bookings', { method: 'POST', body }),
  myBookings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/bookings/me' + (qs ? '?' + qs : ''));
  },
  cancelBooking: (id) => apiFetch('/bookings/cancel/' + id, { method: 'PUT' }),

  // manager
  managerBookings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/manager/bookings' + (qs ? '?' + qs : ''));
  },
  managerUpdateBooking: (id, status) =>
    apiFetch('/manager/booking/' + id, { method: 'PUT', body: { status } }),
  managerHalls: () => apiFetch('/manager/halls'),
  managerCreateHall: (body) => apiFetch('/manager/halls', { method: 'POST', body }),
  managerTables: () => apiFetch('/manager/tables'),
  managerCreateTable: (body) => apiFetch('/manager/tables', { method: 'POST', body }),

  // user
  updateProfile: (body) => apiFetch('/user/profile',  { method: 'PUT', body }),
  updatePassword: (body) => apiFetch('/user/password', { method: 'PUT', body }),
};