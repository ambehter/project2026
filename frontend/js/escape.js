// js/escape.js — утилита для безопасного вывода данных
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Безопасная вставка текста
function setText(el, text) {
  if (el) el.textContent = text ?? '';
}