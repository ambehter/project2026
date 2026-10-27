// frontend/js/admin.js
(async function () {
  // 1. Проверка авторизации и прав
  const user = await checkAuth();
  if (!user || user.role !== 'admin') {
    document.getElementById('access-msg').innerHTML =
      '<div class="alert error">Доступ только для администратора</div>';
    document.querySelectorAll('.profile-tabs, .stats, .tab-panel')
      .forEach(el => el.classList.add('hidden'));
    return;
  }

  /* =========================================================
   * ВКЛАДКИ
   * ========================================================= */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('panel-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  // Вспомогательная функция для перевода статусов
  const statusRu = s => ({ pending: 'Ожидает', confirmed: 'Подтверждена', cancelled: 'Отменена' }[s] || s);

  /* =========================================================
   * СТАТИСТИКА
   * ========================================================= */
  async function loadStats() {
    try {
      const s = await api.adminStats();
      document.getElementById('stats').innerHTML = `
        <div class="stat-card"><div class="num">${s.users}</div><div class="lbl">Пользователей</div></div>
        <div class="stat-card"><div class="num">${s.blocked}</div><div class="lbl">Заблокировано</div></div>
        <div class="stat-card"><div class="num">${s.restaurants}</div><div class="lbl">Ресторанов</div></div>
        <div class="stat-card"><div class="num">${s.bookings}</div><div class="lbl">Всего броней</div></div>
        <div class="stat-card"><div class="num">${s.pending}</div><div class="lbl">Ожидают</div></div>
        <div class="stat-card"><div class="num">${s.confirmed}</div><div class="lbl">Подтверждены</div></div>
        <div class="stat-card"><div class="num">${s.cancelled}</div><div class="lbl">Отменены</div></div>
      `;
    } catch (e) {
      console.error('Stats error:', e);
    }
  }

  /* =========================================================
   * ОБЩИЕ ФУНКЦИИ (СОРТИРОВКА И ПАГИНАЦИЯ)
   * ========================================================= */
  function bindSorting(container, state, reload) {
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (state.sort === key) {
          state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort = key;
          state.dir = 'asc';
        }
        state.page = 1; // при смене сортировки сбрасываем на 1 страницу
        reload();
      });
    });
  }

  function renderPager(el, page, pages, onGo) {
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = `<button class="btn" data-p="${page - 1}" ${page === 1 ? 'disabled' : ''}>←</button>`;
    const from = Math.max(1, page - 2);
    const to   = Math.min(pages, page + 2);
    
    if (from > 1) html += `<button class="btn" data-p="1">1</button>`;
    if (from > 2) html += `<span style="padding:6px">…</span>`;
    for (let i = from; i <= to; i++) {
      html += `<button class="btn ${i === page ? 'active' : ''}" data-p="${i}">${i}</button>`;
    }
    if (to < pages - 1) html += `<span style="padding:6px">…</span>`;
    if (to < pages) html += `<button class="btn" data-p="${pages}">${pages}</button>`;
    html += `<button class="btn" data-p="${page + 1}" ${page === pages ? 'disabled' : ''}>→</button>`;
    
    el.innerHTML = html;
    el.querySelectorAll('button[data-p]').forEach(b => {
      b.addEventListener('click', () => {
        const p = parseInt(b.dataset.p, 10);
        if (p >= 1 && p <= pages) {
          onGo(p);
        }
      });
    });
  }

  /* =========================================================
   * БРОНИ
   * ========================================================= */
  let bState = { page: 1, per_page: 10, sort: 'id', dir: 'desc' };

  async function loadBookings() {
    const box   = document.getElementById('bookings-box');
    const pager = document.getElementById('bookings-pager');
    const params = {
      page: bState.page, per_page: bState.per_page,
      sort: bState.sort, dir: bState.dir,
    };
    const q = document.getElementById('b-q').value.trim();
    const s = document.getElementById('b-status').value;
    const d = document.getElementById('b-date').value;
    if (q) params.q = q;
    if (s) params.status = s;
    if (d) params.date = d;

    box.innerHTML = '<div class="empty-state">Загрузка...</div>';
    try {
      const data = await api.adminBookings(params);
      const items = data.items || [];
      if (!items.length) {
        box.innerHTML = '<div class="empty-state">Броней нет</div>';
        pager.innerHTML = '';
        return;
      }
      
      box.innerHTML = `
        <table>
          <thead><tr>
            <th data-sort="id">ID</th>
            <th>Клиент</th>
            <th>Ресторан</th>
            <th data-sort="booking_date">Дата/время</th>
            <th>Столик</th>
            <th data-sort="guests">Гостей</th>
            <th data-sort="status">Статус</th>
            <th>Действия</th>
          </tr></thead>
          <tbody>
          ${items.map(b => `
            <tr>
              <td>${b.id}</td>
              <td>
                ${escapeHtml(b.user_name)}<br>
                <span class="meta" style="font-size:0.8rem;color:#666">${escapeHtml(b.user_email)}</span>
              </td>
              <td>${escapeHtml(b.restaurant_name)}</td>
              <td>${escapeHtml(b.booking_date)}<br>${escapeHtml(b.booking_time)}</td>
              <td>№${escapeHtml(b.table_number)} (${escapeHtml(b.hall_name)})</td>
              <td>${b.guests}</td>
              <td><span class="badge ${b.status}">${statusRu(b.status)}</span></td>
              <td style="white-space:nowrap;">
                ${b.status !== 'confirmed' ? `<button class="btn btn-rb-sm" data-act="confirm" data-id="${b.id}" title="Подтвердить">✓</button>` : ''}
                ${b.status !== 'pending'   ? `<button class="btn btn-rb-sm" data-act="pending" data-id="${b.id}" title="Вернуть в ожидание">⟳</button>` : ''}
                <button class="btn btn-rb-sm" data-act="edit" data-id="${b.id}"
                        data-date="${escapeHtml(b.booking_date)}"
                        data-time="${escapeHtml(b.booking_time)}"
                        data-guests="${b.guests}"
                        data-status="${b.status}"
                        data-comment="${escapeHtml(b.comment || '')}">✎</button>
                <button class="btn danger btn-rb-sm" data-act="delete" data-id="${b.id}" title="Удалить">✕</button>
              </td>
            </tr>
          `).join('')}
          </tbody>
        </table>
      `;
      
      bindSorting(box, bState, loadBookings);
      renderPager(pager, data.page, data.pages, p => { bState.page = p; loadBookings(); });

      // Обработчики кнопок в таблице
      box.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id, 10);
          const act = btn.dataset.act;
          try {
            if (act === 'confirm' || act === 'pending') {
              await api.adminUpdateBookingStatus(id, act === 'confirm' ? 'confirmed' : 'pending');
              loadBookings(); loadStats();
            }
            if (act === 'delete') {
              if (!confirm('Удалить бронь #' + id + '?')) return;
              await api.adminDeleteBooking(id);
              loadBookings(); loadStats();
            }
            if (act === 'edit') {
              document.querySelector('#edit-form [name=booking_id]').value = id;
              document.querySelector('#edit-form [name=booking_date]').value = btn.dataset.date;
              document.querySelector('#edit-form [name=booking_time]').value = btn.dataset.time.slice(0,5);
              document.querySelector('#edit-form [name=guests]').value = btn.dataset.guests;
              document.querySelector('#edit-form [name=status]').value = btn.dataset.status;
              document.querySelector('#edit-form [name=comment]').value = btn.dataset.comment;
              document.getElementById('edit-msg').innerHTML = '';
              document.getElementById('edit-modal').classList.remove('hidden');
            }
          } catch (e) {
            alert(e.message);
          }
        });
      });
    } catch (e) {
      box.innerHTML = `<div class="alert error">${escapeHtml(e.message)}</div>`;
    }
  }

  // Модалка редактирования
  document.getElementById('edit-cancel').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.add('hidden');
  });

  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('edit-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    const id = parseInt(fd.get('booking_id'), 10);
    
    try {
      await api.adminUpdateBooking(id, {
        booking_date: fd.get('booking_date'),
        booking_time: fd.get('booking_time'),
        guests: parseInt(fd.get('guests'), 10),
        status: fd.get('status'),
        comment: fd.get('comment'),
      });
      msg.innerHTML = '<div class="alert success">Сохранено</div>';
      setTimeout(() => {
        document.getElementById('edit-modal').classList.add('hidden');
        loadBookings(); loadStats();
      }, 500);
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
    }
  });

  // Фильтры броней
  document.getElementById('b-search').addEventListener('click', () => {
    bState.page = 1; loadBookings();
  });
  document.getElementById('b-status').addEventListener('change', () => {
    bState.page = 1; loadBookings();
  });
  document.getElementById('b-date').addEventListener('change', () => {
    bState.page = 1; loadBookings();
  });
  document.getElementById('b-per').addEventListener('change', (e) => {
    bState.per_page = parseInt(e.target.value, 10);
    bState.page = 1; loadBookings();
  });

  /* =========================================================
   * ПОЛЬЗОВАТЕЛИ
   * ========================================================= */
  let uState = { page: 1, per_page: 10, sort: 'id', dir: 'desc' };

  async function loadUsers() {
    const box   = document.getElementById('users-box');
    const pager = document.getElementById('users-pager');
    const params = {
      page: uState.page, per_page: uState.per_page,
      sort: uState.sort, dir: uState.dir,
    };
    const q = document.getElementById('u-q').value.trim();
    const role = document.getElementById('u-role').value;
    if (q) params.q = q;
    if (role) params.role = role;

    box.innerHTML = '<div class="empty-state">Загрузка...</div>';
    try {
      const data = await api.adminUsers(params);
      const items = data.items || [];
      if (!items.length) {
        box.innerHTML = '<div class="empty-state">Пользователей нет</div>';
        pager.innerHTML = '';
        return;
      }

      box.innerHTML = `
        <table>
          <thead><tr>
            <th data-sort="id">ID</th>
            <th data-sort="login">Логин</th>
            <th data-sort="full_name">ФИО</th>
            <th data-sort="email">Email</th>
            <th data-sort="role">Роль</th>
            <th>Статус</th>
            <th data-sort="created_at">Создан</th>
            <th>Действия</th>
          </tr></thead>
          <tbody>
          ${items.map(u => `
            <tr>
              <td>${u.id}</td>
              <td>${escapeHtml(u.login)}</td>
              <td>${escapeHtml(u.full_name)}</td>
              <td>${escapeHtml(u.email)}</td>
              <td>
                <select data-uid="${u.id}" data-act="role" style="padding:4px;">
                  ${['user','manager','admin'].map(r =>
                    `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
                  ).join('')}
                </select>
              </td>
              <td>
                ${parseInt(u.is_blocked,10) === 1
                  ? '<span class="badge cancelled">заблокирован</span>'
                  : '<span class="badge confirmed">активен</span>'}
              </td>
              <td>${escapeHtml(u.created_at)}</td>
              <td style="white-space:nowrap;">
                <button class="btn btn-rb-sm" data-act="block" data-id="${u.id}"
                        data-block="${parseInt(u.is_blocked,10) === 1 ? 0 : 1}">
                  ${parseInt(u.is_blocked,10) === 1 ? 'Разблок.' : 'Блок.'}
                </button>
                <button class="btn danger btn-rb-sm" data-act="delete" data-id="${u.id}">✕</button>
              </td>
            </tr>
          `).join('')}
          </tbody>
        </table>
      `;
      
      bindSorting(box, uState, loadUsers);
      renderPager(pager, data.page, data.pages, p => { uState.page = p; loadUsers(); });

      // Инлайн-смена роли
      box.querySelectorAll('select[data-act=role]').forEach(sel => {
        sel.addEventListener('change', async () => {
          try {
            await api.adminUpdateUserRole(parseInt(sel.dataset.uid, 10), sel.value);
            loadStats();
          } catch (e) {
            alert(e.message);
            loadUsers(); // откатить визуально, если ошибка
          }
        });
      });
      
      // Блокировка и удаление
      box.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id, 10);
          try {
            if (btn.dataset.act === 'block') {
              const block = parseInt(btn.dataset.block, 10);
              if (!confirm((block ? 'Заблокировать' : 'Разблокировать') + ' пользователя #' + id + '?')) return;
              await api.adminToggleUserBlock(id, block);
              loadUsers(); loadStats();
            }
            if (btn.dataset.act === 'delete') {
              if (!confirm('Удалить пользователя #' + id + '? Все его брони тоже удалятся.')) return;
              await api.adminDeleteUser(id);
              loadUsers(); loadStats();
            }
          } catch (e) { alert(e.message); }
        });
      });
    } catch (e) {
      box.innerHTML = `<div class="alert error">${escapeHtml(e.message)}</div>`;
    }
  }

  // Фильтры пользователей
  document.getElementById('u-search').addEventListener('click', () => {
    uState.page = 1; loadUsers();
  });
  document.getElementById('u-role').addEventListener('change', () => {
    uState.page = 1; loadUsers();
  });
  document.getElementById('u-per').addEventListener('change', (e) => {
    uState.per_page = parseInt(e.target.value, 10);
    uState.page = 1; loadUsers();
  });

  /* =========================================================
   * ЗАПУСК
   * ========================================================= */
  loadStats();
  loadBookings();
  loadUsers();
})();