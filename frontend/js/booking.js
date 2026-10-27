// п.9.2 booking.js — только для страницы ресторана
(function () {
  const params = new URLSearchParams(location.search);
  const restaurantId = parseInt(params.get('id') || '0', 10);
  let selectedTable = null;

  async function loadRestaurant() {
    const box = document.getElementById('rest');
    try {
      const data = await api.restaurant(restaurantId);
      const r = data.restaurant;
      box.innerHTML = `
        <div style="display:flex;gap:20px;flex-wrap:wrap;">
          <img src="${r.image_url || 'https://via.placeholder.com/400x250'}"
               style="width:340px;height:220px;object-fit:cover;border-radius:12px;">
          <div style="flex:1;min-width:220px;">
            <h1>${r.name}</h1>
            <p style="color:var(--muted);margin-bottom:8px;">${r.cuisine || ''} · ${r.city || ''}</p>
            <p style="margin-bottom:8px;">⭐ ${r.rating}</p>
            <p style="margin-bottom:8px;">${r.address || ''}</p>
            <p>${r.description || ''}</p>
          </div>
        </div>
      `;
    } catch (e) {
      box.innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  async function checkAvailability() {
    const date = document.getElementById('b-date').value;
    const time = document.getElementById('b-time').value;
    const guests = document.getElementById('b-guests').value;
    const msg = document.getElementById('booking-msg');
    const box = document.getElementById('tables');
    msg.innerHTML = '';
    box.innerHTML = '';

    if (!date || !time || !guests) {
      msg.innerHTML = '<div class="alert error">Заполните дату, время и количество гостей</div>';
      return;
    }
    try {
      const data = await api.availability({ restaurantId, date, time, guests });
      const items = data.items || [];
      if (!items.length) {
        box.innerHTML = '<div class="empty-state">Нет свободных столиков на выбранное время</div>';
        return;
      }
      box.innerHTML = items.map(t => `
        <div class="table-card" data-id="${t.id}" data-num="${t.number}" data-seats="${t.seats}">
          <div class="num">№${t.number}</div>
          <div class="seats">${t.seats} мест</div>
          <div class="seats">${t.hall_name}</div>
        </div>
      `).join('');
      box.querySelectorAll('.table-card').forEach(el => {
        el.addEventListener('click', () => {
          box.querySelectorAll('.table-card').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          selectedTable = {
            id: parseInt(el.dataset.id, 10),
            number: el.dataset.num,
            seats: el.dataset.seats,
          };
          document.getElementById('sel-num').textContent = selectedTable.number;
          document.getElementById('sel-seats').textContent = selectedTable.seats;
          document.getElementById('book-wrap').classList.remove('hidden');
        });
      });
    } catch (e) {
      msg.innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  async function book() {
    const msg = document.getElementById('booking-msg');
    msg.innerHTML = '';
    if (!selectedTable) {
      msg.innerHTML = '<div class="alert error">Выберите столик</div>';
      return;
    }
    const me = await checkAuth();
    if (!me) {
      msg.innerHTML = '<div class="alert info">Войдите, чтобы забронировать столик. <a href="login.html">Войти</a></div>';
      return;
    }
    try {
      await api.createBooking({
        table_id: selectedTable.id,
        booking_date: document.getElementById('b-date').value,
        booking_time: document.getElementById('b-time').value,
        guests: parseInt(document.getElementById('b-guests').value, 10),
      });
      msg.innerHTML = '<div class="alert success">Бронь создана! Статус: pending. Смотрите в <a href="profile.html">личном кабинете</a>.</div>';
      document.getElementById('book-wrap').classList.add('hidden');
      selectedTable = null;
      checkAvailability();
    } catch (e) {
      msg.innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadRestaurant();
    // по умолчанию — сегодня
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('b-date').value = today;
    document.getElementById('check-btn').addEventListener('click', checkAvailability);
    document.getElementById('book-btn').addEventListener('click', book);
  });
})();