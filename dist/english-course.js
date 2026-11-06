const $ = selector => document.querySelector(selector);
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
let reducedUser = false;
try { reducedUser = JSON.parse(localStorage.getItem('tigo-reduced-motion')) === true; } catch {}
function updateMotion() {
  const reduced = reducedUser || systemMotion.matches;
  document.documentElement.classList.toggle('motion-off', reduced);
  $('#motionToggle').setAttribute('aria-pressed', String(reduced));
  $('#motionToggle').setAttribute('aria-label', reduced ? 'Animasi dikurangi, klik untuk mengubah preferensi' : 'Kurangi animasi');
}
$('#motionToggle').addEventListener('click', () => {
  reducedUser = !reducedUser;
  try { localStorage.setItem('tigo-reduced-motion', JSON.stringify(reducedUser)); } catch {}
  updateMotion();
});
systemMotion.addEventListener('change', updateMotion);
updateMotion();

function closeMenu(restoreFocus = false) {
  $('#mobileMenu').hidden = true;
  $('#menuToggle').setAttribute('aria-expanded', 'false');
  $('#menuToggle').setAttribute('aria-label', 'Buka menu');
  if (restoreFocus) $('#menuToggle').focus();
}
$('#menuToggle').addEventListener('click', () => {
  const open = $('#menuToggle').getAttribute('aria-expanded') === 'true';
  $('#mobileMenu').hidden = open;
  $('#menuToggle').setAttribute('aria-expanded', String(!open));
  $('#menuToggle').setAttribute('aria-label', open ? 'Buka menu' : 'Tutup menu');
});
document.querySelectorAll('#mobileMenu a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#mobileMenu').hidden) closeMenu(true);
});

const dialog = $('#emotionDialog');
let returnFocus;
document.querySelectorAll('[data-open-emotion]').forEach(button => button.addEventListener('click', () => {
  returnFocus = button;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}));
$('#emotionClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
let activityNavigation = false;
dialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  if (activityNavigation) {
    activityNavigation = false;
    const target = $('#activityTitle');
    target.tabIndex = -1;
    location.hash = 'ide-aktivitas';
    target.focus({preventScroll: true});
    $('#ide-aktivitas').scrollIntoView({behavior: reducedUser || systemMotion.matches ? 'instant' : 'smooth', block: 'start'});
  } else returnFocus?.focus({preventScroll: true});
});
$('#emotionActivityLink').addEventListener('click', () => {
  activityNavigation = true;
  dialog.close();
});
