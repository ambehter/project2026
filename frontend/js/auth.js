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

  if (nameEl) {
    nameEl.textContent = user.full_name || user.login || '';
  }

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
    
    if (user.role === 'admin' && !adminLink) {
      adminLink = document.createElement('a');
      adminLink.href = 'admin.html';
      adminLink.id = 'admin-link';
      adminLink.textContent = 'Админка';
      
      const logoutBtn = nav.querySelector('#logout-btn');
      if (logoutBtn) {
        nav.insertBefore(adminLink, logoutBtn);
      } else {
        nav.appendChild(adminLink);
      }
    } 
    else if (adminLink && user.role !== 'admin') {
      adminLink.classList.add('hidden');
    }
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

/* =========================================================
   RIPPLE-ЭФФЕКТ ДЛЯ КНОПОК
   ========================================================= */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn, .btn-rb');
  if (!btn) return;
  
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement('span');
  
  span.className = 'ripple';
  span.style.width = span.style.height = size + 'px';
  span.style.left = (e.clientX - rect.left - size / 2) + 'px';
  span.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
  
  btn.appendChild(span);
  setTimeout(() => span.remove(), 600);
});