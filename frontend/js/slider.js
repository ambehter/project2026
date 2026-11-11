(function () {
  const slider = document.getElementById('rb-slider');
  if (!slider) return; // Если слайдера нет на странице — выходим

  const track = document.getElementById('rb-slider-track');
  const slides = Array.from(track.children);
  const dotsBox = document.getElementById('rb-slider-dots');
  const prevBtn = document.getElementById('rb-prev');
  const nextBtn = document.getElementById('rb-next');

  const AUTOPLAY_MS = 3000; // 3 секунды
  let index = 0;
  let timer = null;
  let isPaused = false; // Флаг паузы

  // 1. Создаем точки-индикаторы
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'rb-slider__dot';
    dot.type = 'button';
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => goTo(i, true));
    dotsBox.appendChild(dot);
  });
  const dots = Array.from(dotsBox.children);

  // 2. Функция отрисовки слайда (сдвигаем трек)
  function render() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, i) => d.setAttribute('aria-selected', i === index ? 'true' : 'false'));
  }

  // 3. Функция перехода на конкретный слайд
  function goTo(i, userAction) {
    index = (i + slides.length) % slides.length;
    render();
    if (userAction) restartAutoplay(); // Сбрасываем таймер после клика
  }

  function next() { goTo(index + 1, false); }
  function prev() { goTo(index - 1, false); }

  // 4. Логика автопрокрутки
  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(() => {
      // Если не на паузе и вкладка браузера активна — листаем
      if (!isPaused && !document.hidden) next();
    }, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (timer) clearInterval(timer);
  }

  function restartAutoplay() {
    startAutoplay();
  }

  // 5. Обработчики кликов по стрелкам
  prevBtn.addEventListener('click', () => { prev(); restartAutoplay(); });
  nextBtn.addEventListener('click', () => { next(); restartAutoplay(); });

  // 6. Пауза при наведении мышки
  slider.addEventListener('mouseenter', () => { isPaused = true; });
  slider.addEventListener('mouseleave', () => { isPaused = false; });

  // 7. Старт при загрузке страницы
  render();
  startAutoplay();
})();