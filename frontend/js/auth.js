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
  if (nameEl)   nameEl.textContent = user.name;
  if (mgrLink) {
    if (user.role === 'manager' || user.role === 'admin') {
      mgrLink.classList.remove('hidden');
    } else {
      mgrLink.classList.add('hidden');
    }
  }
}

function showGuest() {
  const guestBox = document.getElementById('guest-links');
  const userBox  = document.getElementById('user-links');
  if (guestBox) guestBox.classList.remove('hidden');
  if (userBox)  userBox.classList.add('hidden');
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