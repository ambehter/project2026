(async function () {
  const user = await checkAuth();
  if (!user) {
    location.href = 'login.html';
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

  // профиль
  document.querySelector('#profile-form [name=name]').value = user.name || '';
  document.querySelector('#profile-form [name=email]').value = user.email || '';

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('profile-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    try {
      await api.updateProfile({
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone') || '',
      });
      msg.innerHTML = '<div class="alert success">Профиль обновлён</div>';
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${err.message}</div>`;
    }
  });

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('password-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    try {
      await api.updatePassword({
        current_password: fd.get('current_password'),
        new_password: fd.get('new_password'),
      });
      msg.innerHTML = '<div class="alert success">Пароль изменён</div>';
      e.target.reset();
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${err.message}</div>`;
    }
  });

  // брони
  async function loadBookings() {
    const box = document.getElementById('bookings-list');
    const status = document.getElementById('status-filter').value;
    box.innerHTML = '<div class="empty-state">Загрузка...</div>';
    try {
      const data = await api.myBookings(status ? { status } : {});
      const items = data.items || [];
      if (!items.length) {
        box.innerHTML = '<div class="empty-state">Броней пока нет</div>';
        return;
      }
      box.innerHTML = items.map(b => `
        <div class="booking-card">
          <div>
            <h3>${b.restaurant_name}</h3>
            <div class="meta">Столик №${b.table_number} · ${b.guests} гостей</div>
            <div class="meta">${b.booking_date} в ${b.booking_time}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge ${b.status}">${statusRu(b.status)}</span>
            ${b.status !== 'cancelled' ? `<div style="margin-top:8px;"><button class="btn danger" data-id="${b.id}">Отменить</button></div>` : ''}
          </div>
        </div>
      `).join('');
      box.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Отменить бронь?')) return;
          try {
            await api.cancelBooking(btn.dataset.id);
            loadBookings();
          } catch (e) { alert(e.message); }
        });
      });
    } catch (e) {
      box.innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  function statusRu(s) {
    return { pending: 'Ожидает', confirmed: 'Подтверждена', cancelled: 'Отменена' }[s] || s;
  }

  document.getElementById('refresh-bookings').addEventListener('click', loadBookings);
  document.getElementById('status-filter').addEventListener('change', loadBookings);
  loadBookings();
})();