(() => {
  const vp = document.getElementById('catsViewport');
  const prev = document.getElementById('catsPrev');
  const next = document.getElementById('catsNext');
  if (!vp || !prev || !next) return;

  const step = () => Math.max(1, Math.round(vp.clientWidth * 0.95));

  function scrollByPage(dir) {
    vp.scrollBy({ left: dir * step(), behavior: 'smooth' });
  }

  function updateButtons() {
    const atStart = vp.scrollLeft <= 2;
    const atEnd = vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 2;
    prev.disabled = atStart;
    next.disabled = atEnd;
  }

  prev.addEventListener('click', () => scrollByPage(-1));
  next.addEventListener('click', () => scrollByPage(1));
  vp.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);

  // Клавіатура для доступності
  vp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByPage(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByPage(-1); }
  });

  // Початковий стан
  updateButtons();
})();
