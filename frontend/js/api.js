// п.2.3, 9.3
const API_BASE = '/backend/index.php/api';

let csrfToken = null;

async function fetchCsrfToken() {
  try {
    const res = await fetch(API_BASE + '/csrf-token', { credentials: 'include' });
    if (res.ok) {
      const text = await res.text(); // Читаем как текст
      if (text) {
        try {
          const data = JSON.parse(text); // Пытаемся превратить в JSON
          csrfToken = data.data?.csrf_token || null;
        } catch (e) {
          console.warn('CSRF JSON parse error');
        }
      }
    }
  } catch (e) {
    console.warn('CSRF token fetch failed:', e);
  }
}

// ==========================================
// ЛОГИКА КЭШИРОВАНИЯ (Stale-while-revalidate)
// ==========================================
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const key = path + '|' + method + '|' + JSON.stringify(options.body || '');
  const now = Date.now();
  const cached = apiCache.get(key);

  // 1. Проверка кэша (только для GET-запросов)
  if (method === 'GET' && cached && (now - cached.time < CACHE_TTL)) {
    // Отдаем закэшированные данные сразу, а в фоне обновляем их
    fetch(API_BASE + path, { credentials: 'include' })
      .then(res => res.json())
      .then(payload => {
        if (payload && payload.data) {
          apiCache.set(key, { data: payload.data, time: Date.now() });
        }
      }).catch(() => {});
    
    return cached.data;
  }

  // 2. Подготовка заголовков и CSRF
  const opts = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      opts.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }

  // 3. Выполнение реального запроса
  const res = await fetch(API_BASE + path, opts);
  let payload = null;
  try { payload = await res.json(); } catch (e) { /* ignore */ }

  if (!res.ok) {
    const msg = (payload && payload.error) ? payload.error : ('HTTP ' + res.status);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  // 4. Сохранение в кэш (только GET)
  if (method === 'GET' && payload && payload.data) {
    apiCache.set(key, { data: payload.data, time: now });
  }

  return payload ? payload.data : null;
}

// Первичный запрос токена при загрузке страницы
fetchCsrfToken();

const api = {
  // auth
  register: (body)      => apiFetch('/auth/register', { method: 'POST', body }),
  login:    (body)      => apiFetch('/auth/login',    { method: 'POST', body }),
  logout:   ()          => apiFetch('/auth/logout',   { method: 'POST' }),
  me:       ()          => apiFetch('/auth/me'),
  updateBooking: (id, body) => apiFetch('/bookings/' + id, { method: 'PUT', body }),
  deleteBooking: (id) => apiFetch('/bookings/' + id, { method: 'DELETE' }),

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

  // ===== admin =====
  adminStats: () => apiFetch('/admin/stats'),

  adminBookings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/admin/bookings' + (qs ? '?' + qs : ''));
  },
  adminUpdateBookingStatus: (id, status) =>
    apiFetch('/admin/bookings/' + id + '/status', { method: 'PUT', body: { status } }),
  adminUpdateBooking: (id, body) =>
    apiFetch('/admin/bookings/' + id, { method: 'PUT', body }),
  adminDeleteBooking: (id) =>
    apiFetch('/admin/bookings/' + id, { method: 'DELETE' }),

  adminUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/admin/users' + (qs ? '?' + qs : ''));
  },
  adminUpdateUserRole: (id, role) =>
    apiFetch('/admin/users/' + id + '/role', { method: 'PUT', body: { role } }),
  adminToggleUserBlock: (id, is_blocked) =>
    apiFetch('/admin/users/' + id + '/block', { method: 'PUT', body: { is_blocked } }),
  adminDeleteUser: (id) =>
    apiFetch('/admin/users/' + id, { method: 'DELETE' }),
};