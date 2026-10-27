// п.9.4, 9.5
async function checkAuth() {
  try {
    const data = await api.me();
    if (data && data.user) showUser(data.user);
    return data.user;
  } catch (e) {
    showGuest();
    return null;
  }
}

function showUser(user) {
  const guestBox = document.getElementById('guest-links');
  const userBox  = document.getElementById('user-links');
  const nameEl   = document.getElementById('user-name');
  const mgrLink  = document.getElementById('manager-link');

  if (guestBox) guestBox.classList.add('hidden');
  if (userBox)  userBox.classList.remove('hidden');

  // ИСПРАВЛЕНО: используем full_name (а не name)
  if (nameEl) {
    nameEl.textContent = user.full_name || user.login || '';
  }

  // Логика для ссылки "Панель менеджера"
  if (mgrLink) {
    if (user.role === 'manager' || user.role === 'admin') {
      mgrLink.classList.remove('hidden');
    } else {
      mgrLink.classList.add('hidden');
    }
  }

  // 👇 ЛОГИКА ДЛЯ ССЫЛКИ "АДМИНКА" 👇
  const nav = document.querySelector('.nav');
  if (nav) {
    let adminLink = document.getElementById('admin-link');
    
    // Если админ, а ссылки еще нет — создаем её
    if (user.role === 'admin' && !adminLink) {
      adminLink = document.createElement('a');
      adminLink.href = 'admin.html';
      adminLink.id = 'admin-link';
      adminLink.textContent = 'Админка';
      
      // Вставляем перед кнопкой "Выйти"
      const logoutBtn = nav.querySelector('#logout-btn');
      if (logoutBtn) {
        nav.insertBefore(adminLink, logoutBtn);
      } else {
        nav.appendChild(adminLink); // на случай, если кнопки выхода нет
      }
    } 
    // Если ссылка уже есть, но пользователь не админ — скрываем
    else if (adminLink && user.role !== 'admin') {
      adminLink.classList.add('hidden');
    }
    // Если ссылка есть и пользователь админ — показываем
    else if (adminLink && user.role === 'admin') {
      adminLink.classList.remove('hidden');
    }
  }
}

function showGuest() {
  const guestBox = document.getElementById('guest-links');
  const userBox  = document.getElementById('user-links');
  if (guestBox) guestBox.classList.remove('hidden');
  if (userBox)  userBox.classList.add('hidden');

  // Скрываем ссылку на админку, если пользователь вышел
  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    adminLink.classList.add('hidden');
  }
}

function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch (e) {}
    location.href = 'index.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initLogout();
});