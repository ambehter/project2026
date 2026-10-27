// frontend/js/profile.js
(async function () {
  // Безопасная проверка: если сервер не ответил — не выкидываем сразу
  try {
    const res = await api.me();
    if (!res || !res.user) {
      throw new Error('User not found in response');
    }
    window.currentUser = res.user; // сохраняем пользователя
  } catch (e) {
    console.error('Auth error:', e);
    location.href = 'login.html';
    return;
  }

  const user = window.currentUser;

  // Переключение вкладок
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('panel-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  // Заполнение полей профиля
  document.querySelector('#profile-form [name=name]').value  = user.full_name || '';
  document.querySelector('#profile-form [name=email]').value = user.email || '';

  // Форма профиля
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('profile-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    try {
      await api.updateProfile({
        name:  fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone') || '',
      });
      msg.innerHTML = '<div class="alert success">Профиль обновлён</div>';
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
    }
  });

  // Форма пароля
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('password-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    try {
      await api.updatePassword({
        current_password: fd.get('current_password'),
        new_password:     fd.get('new_password'),
      });
      msg.innerHTML = '<div class="alert success">Пароль изменён</div>';
      e.target.reset();
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
    }
  });

  function statusRu(s) {
    return { pending: 'Ожидает', confirmed: 'Подтверждена', cancelled: 'Отменена' }[s] || s;
  }

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
            <h3>${escapeHtml(b.restaurant_name)}</h3>
            <div class="meta">Столик №${escapeHtml(b.table_number)} · ${b.guests} гостей</div>
            <div class="meta">${escapeHtml(b.booking_date)} в ${escapeHtml(b.booking_time)}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge ${b.status}">${statusRu(b.status)}</span>
            <div style="margin-top:8px;">
              ${b.status === 'pending' ? `<button class="btn" data-id="${b.id}" data-date="${escapeHtml(b.booking_date)}" data-time="${escapeHtml(b.booking_time)}" data-guests="${b.guests}" data-act="edit">Редактировать</button>` : ''}
              ${b.status !== 'cancelled' ? `<button class="btn danger" data-id="${b.id}" data-act="cancel">Отменить</button>` : ''}
              ${b.status === 'cancelled' ? `<button class="btn danger" data-id="${b.id}" data-act="delete">Удалить</button>` : ''}
            </div>
          </div>
        </div>
      `).join('');

      box.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id, 10);
          const act = btn.dataset.act;

          if (act === 'cancel') {
            if (!confirm('Отменить бронь?')) return;
            try { await api.cancelBooking(id); loadBookings(); } catch (e) { alert('Ошибка: ' + e.message); }
          }
          if (act === 'delete') {
            if (!confirm('Удалить бронь навсегда?')) return;
            try { await api.deleteBooking(id); loadBookings(); } catch (e) { alert('Ошибка: ' + e.message); }
          }
          if (act === 'edit') {
            document.querySelector('#edit-form [name=booking_id]').value = id;
            document.querySelector('#edit-form [name=booking_date]').value = btn.dataset.date;
            document.querySelector('#edit-form [name=booking_time]').value = btn.dataset.time.slice(0,5);
            document.querySelector('#edit-form [name=guests]').value = btn.dataset.guests;
            document.getElementById('edit-modal').classList.remove('hidden');
            document.getElementById('edit-msg').innerHTML = '';
          }
        });
      });
    } catch (e) {
      box.innerHTML = `<div class="alert error">${escapeHtml(e.message)}</div>`;
    }
  }

  const editCancel = document.getElementById('edit-cancel');
  if (editCancel) {
    editCancel.addEventListener('click', () => document.getElementById('edit-modal').classList.add('hidden'));
  }

  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('edit-msg');
    msg.innerHTML = '';
    const fd = new FormData(e.target);
    const id = parseInt(fd.get('booking_id'), 10);
    try {
      await api.updateBooking(id, {
        booking_date: fd.get('booking_date'),
        booking_time: fd.get('booking_time'),
        guests:       parseInt(fd.get('guests'), 10),
      });
      msg.innerHTML = '<div class="alert success">Бронь обновлена</div>';
      setTimeout(() => {
        document.getElementById('edit-modal').classList.add('hidden');
        loadBookings();
      }, 800);
    } catch (err) {
      msg.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
    }
  });

  document.getElementById('refresh-bookings').addEventListener('click', loadBookings);
  document.getElementById('status-filter').addEventListener('change', loadBookings);

  loadBookings();
})();