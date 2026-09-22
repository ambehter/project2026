async function renderRestaurants() {
  const list = document.getElementById('list');
  const data = await api.restaurants();
  const items = data.items || [];

  if (!items.length) {
    list.innerHTML = '<div class="alert alert-info">Рестораны не найдены</div>';
    return;
  }

  list.innerHTML = items.map(r => `
    <div class="col">
      <div class="card h-100 shadow-sm">
        <img src="${r.image_url}" class="card-img-top" alt="${r.name}" style="height:180px;object-fit:cover;">
        <div class="card-body">
          <h5 class="card-title">${r.name}</h5>
          <p class="card-text text-muted mb-1">${r.cuisine} · ${r.city}</p>
          <p class="card-text">⭐ ${r.rating}</p>
          <a href="restaurant-detail.html?id=${r.id}" class="btn btn-primary btn-sm">Выбрать столик</a>
        </div>
      </div>
    </div>
  `).join('');
}