(async function () {
  const user = await checkAuth();
  if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
    document.getElementById('access-msg').innerHTML =
      '<div class="alert error">Доступ только для менеджеров</div>';
    document.querySelectorAll('.profile-tabs, .stats, .tab-panel').forEach(el => el.classList.add('hidden'));
    return;
  }

  // вкладки
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('panel-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  function statusRu(s) {
    return { pending: 'Ожидает', confirmed: 'Подтверждена', cancelled: 'Отменена' }[s] || s;
  }

  async function loadStats() {
    try {
      const data = await api.managerBookings();
      const items = data.items || [];
      const c = { pending: 0, confirmed: 0, cancelled: 0 };
      items.forEach(b => c[b.status] = (c[b.status] || 0) + 1);
      document.getElementById('stats').innerHTML = `
        <div class="stat-card"><div class="num">${items.length}</div><div class="lbl">Всего броней</div></div>
        <div class="stat-card"><div class="num">${c.pending}</div><div class="lbl">Ожидают</div></div>
        <div class="stat-card"><div class="num">${c.confirmed}</div><div class="lbl">Подтверждены</div></div>
        <div class="stat-card"><div class="num">${c.cancelled}</div><div class="lbl">Отменены</div></div>
      `;
    } catch (e) {}
  }

  async function loadBookings() {
    const box = document.getElementById('bookings-box');
    const params = {};
    const s = document.getElementById('b-status').value;
    const d = document.getElementById('b-date').value;
    if (s) params.status = s;
    if (d) params.date = d;

    box.innerHTML = '<div class="empty-state">Загрузка...</div>';
    try {
      const data = await api.managerBookings(params);
      const items = data.items || [];
      if (!items.length) {
        box.innerHTML = '<div class="empty-state">Броней нет</div>';
        return;
      }
      box.innerHTML = `
        <table>
          <thead><tr>
            <th>ID</th><th>Ресторан</th><th>Клиент</th><th>Дата/время</th>
            <th>Столик</th><th>Гостей</th><th>Статус</th><th></th>
          </tr></thead>
          <tbody>
          ${items.map(b => `
            <tr>
              <td>${b.id}</td>
              <td>${b.restaurant_name}</td>
              <td>${b.user_name}<br><span class="meta">${b.user_email}</span></td>
              <td>${b.booking_date}<br>${b.booking_time}</td>
              <td>№${b.table_number} (${b.hall_name})</td>
              <td>${b.guests}</td>
              <td><span class="badge ${b.status}">${statusRu(b.status)}</span></td>
              <td>
                ${b.status === 'pending' ? `<button class="btn" data-id="${b.id}" data-act="confirmed">Подтв.</button>` : ''}
                ${b.status !== 'cancelled' ? `<button class="btn danger" data-id="${b.id}" data-act="cancelled">Отменить</button>` : ''}
              </td>
            </tr>
          `).join('')}
          </tbody>
        </table>
      `;
      box.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.managerUpdateBooking(btn.dataset.id, btn.dataset.act);
            loadBookings();
            loadStats();
          } catch (e) { alert(e.message); }
        });
      });
    } catch (e) {
      box.innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  async function loadHalls() {
    const box = document.getElementById('halls-box');
    const sel = document.getElementById('hall-select');
    try {
      const data = await api.managerHalls();
      const items = data.items || [];
      box.innerHTML = items.length
        ? `<table>
             <thead><tr><th>ID</th><th>Название</th><th>Вместимость</th><th>Ресторан</th></tr></thead>
             <tbody>${items.map(h => `<tr><td>${h.id}</td><td>${h.name}</td><td>${h.capacity}</td><td>${h.restaurant_name}</td></tr>`).join('')}</tbody>
           </table>`
        : '<div class="empty-state">Залов нет</div>';
      sel.innerHTML = items.map(h => `<option value="${h.id}">${h.name} (${h.restaurant_name})</option>`).join('');
    } catch (e) {
      box.innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  async function loadTables() {
    const box = document.getElementById('tables-box');
    try {
      const data = await api.managerTables();
      const items = data.items || [];
      box.innerHTML = items.length
        ? `<table>
             <thead><tr><th>ID</th><th>Номер</th><th>Мест</th><th>Зал</th><th>Ресторан</th></tr></thead>
             <tbody>${items.map(t => `<tr><td>${t.id}</td><td>№${t.number}</td><td>${t.seats}</td><td>${t.hall_name}</td><td>${t.restaurant_name}</td></tr>`).join('')}</tbody>
           </table>`
        : '<div class="empty-state">Столиков нет</div>';
    } catch (e) {
      box.innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  document.getElementById('b-refresh').addEventListener('click', loadBookings);
  document.getElementById('b-status').addEventListener('change', loadBookings);
  document.getElementById('b-date').addEventListener('change', loadBookings);

  document.getElementById('hall-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('hall-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    try {
      await api.managerCreateHall({
        name: fd.get('name'),
        capacity: parseInt(fd.get('capacity'), 10),
      });
      e.target.reset();
      msg.innerHTML = '<div class="alert success">Зал создан</div>';
      loadHalls();
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${err.message}</div>`;
    }
  });

  document.getElementById('table-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('table-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    try {
      await api.managerCreateTable({
        hall_id: parseInt(fd.get('hall_id'), 10),
        number: fd.get('number'),
        seats: parseInt(fd.get('seats'), 10),
      });
      e.target.reset();
      msg.innerHTML = '<div class="alert success">Столик создан</div>';
      loadTables();
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${err.message}</div>`;
    }
  });

  loadStats();
  loadBookings();
  loadHalls();
  loadTables();
})();