document.addEventListener('DOMContentLoaded', () => {
    loadRestaurants();

    document.getElementById('searchBtn')?.addEventListener('click', () => loadRestaurants());
    document.getElementById('resetBtn')?.addEventListener('click', resetFilters);
    document.getElementById('searchRestaurant')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadRestaurants();
    });
    document.getElementById('cuisineFilter')?.addEventListener('change', () => loadRestaurants());
});

let currentOffset = 0;
const LIMIT = 12;

function resetFilters() {
    document.getElementById('searchRestaurant').value = '';
    document.getElementById('cuisineFilter').value = 'all';
    currentOffset = 0;
    loadRestaurants();
}

async function loadRestaurants(append = false) {
    const search  = document.getElementById('searchRestaurant')?.value.trim() || '';
    const cuisine = document.getElementById('cuisineFilter')?.value || 'all';

    const params = new URLSearchParams();
    if (search)  params.append('search', search);
    if (cuisine && cuisine !== 'all') params.append('cuisine', cuisine);
    params.append('limit', LIMIT);
    params.append('offset', append ? currentOffset : 0);

    const url = `restaurants?${params.toString()}`;

    try {
        const data = await apiRequest(url);
        renderRestaurants(Array.isArray(data) ? data : (data.restaurants || []), append);
    } catch (err) {
        console.error('Ошибка загрузки ресторанов:', err);
        document.getElementById('restaurantList').innerHTML =
            `<p style="color:red;">Ошибка загрузки: ${err.message}</p>`;
    }
}

function renderRestaurants(list, append = false) {
    const container = document.getElementById('restaurantList');

    if (!append) container.innerHTML = '';

    if (list.length === 0 && !append) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">Рестораны не найдены</p>';
        document.getElementById('loadMoreContainer').style.display = 'none';
        return;
    }

    list.forEach(r => {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        card.innerHTML = `
            <img src="${r.image_url || 'https://via.placeholder.com/400x200?text=RestoBook'}"
                 alt="${r.name}" loading="lazy">
            <div class="info">
                <h3>${r.name}</h3>
                <p class="cuisine">${getCuisineLabel(r.cuisine)}</p>
                <p class="address">📍 ${r.address || '—'}</p>
                <p class="desc">${r.description || ''}</p>
                <a href="restaurant-detail.html?id=${r.id}" class="btn">Выбрать столик</a>
            </div>
        `;
        container.appendChild(card);
    });

    currentOffset += list.length;
    document.getElementById('loadMoreContainer').style.display =
        list.length < LIMIT ? 'none' : 'block';

    // привязка кнопки "Загрузить ещё"
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.onclick = () => loadRestaurants(true);
    }
}

function getCuisineLabel(code) {
    const map = {
        italian: 'Итальянская', japanese: 'Японская', chinese: 'Китайская',
        french: 'Французская', russian: 'Русская', american: 'Американская'
    };
    return map[code] || code || '';
}