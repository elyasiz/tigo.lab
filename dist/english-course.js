import {productDemos} from './demos.js';

const $ = selector => document.querySelector(selector);
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
let reducedUser = false;
try { reducedUser = JSON.parse(localStorage.getItem('tigo-reduced-motion')) === true; } catch {}
function updateMotion() {
  const reduced = reducedUser || systemMotion.matches;
  document.documentElement.classList.toggle('motion-off', reduced);
  $('#motionToggle').setAttribute('aria-pressed', String(reduced));
  $('#motionToggle').setAttribute('aria-label', reduced ? 'Animasi dikurangi, klik untuk mengubah preferensi' : 'Kurangi animasi');
  if (reduced) $('#emotionDemoVideo')?.pause();
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
  document.body.style.overflow = document.querySelector('dialog[open]') ? 'hidden' : '';
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

const animationDialog = $('#emotionAnimationDialog');
const demoVideo = $('#emotionDemoVideo');
const demo = productDemos.E01;
let animationReturnFocus;
$('#emotionAnimationTitle').textContent = demo.title;
$('#emotionAnimationDescription').textContent = demo.description;
$('#emotionAnimationSteps').replaceChildren(...demo.steps.map(step => {
  const li = document.createElement('li');
  li.textContent = step;
  return li;
}));
document.querySelectorAll('[data-play-emotion]').forEach(button => button.addEventListener('click', () => {
  if (animationDialog.open) return;
  animationReturnFocus = button;
  demoVideo.pause();
  $('#emotionAnimationError').hidden = true;
  if (!demoVideo.getAttribute('src') || demoVideo.error) {
    demoVideo.poster = demo.poster;
    demoVideo.src = demo.video;
    demoVideo.load();
  }
  demoVideo.currentTime = 0;
  animationDialog.showModal();
  document.body.style.overflow = 'hidden';
  if (!reducedUser && !systemMotion.matches) {
    demoVideo.play().catch(() => { /* Native controls remain available. */ });
  }
}));
$('#emotionAnimationClose').addEventListener('click', () => animationDialog.close());
animationDialog.addEventListener('close', () => {
  demoVideo.pause();
  document.body.style.overflow = document.querySelector('dialog[open]') ? 'hidden' : '';
  animationReturnFocus?.focus({preventScroll: true});
});
animationDialog.addEventListener('click', event => {
  if (event.target !== animationDialog) return;
  const box = animationDialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) animationDialog.close();
});
demoVideo.addEventListener('error', () => { $('#emotionAnimationError').hidden = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) demoVideo.pause(); });
window.addEventListener('pagehide', () => demoVideo.pause());


const teachingProducts = {
  'cvc-word': {
    name: 'CVC Word',
    image: 'assets/english-cvc-word.png',
    width: 572, height: 436,
    category: 'ENGLISH COURSE / PHONICS',
    description: 'Media huruf untuk mendampingi pengenalan pola consonant–vowel–consonant (CVC) dan latihan membaca kata sederhana bersama pengajar.',
    focus: 'Fonik & membaca awal',
    example: 'Coba kata “cat”, “sun”, atau “dog”. Ajak anak mengenali bunyi awal, tengah, dan akhir, lalu menggabungkannya menjadi kata. Pengajar dapat menyesuaikan contoh dengan level belajar anak.',
    background: 'var(--soft-blue)'
  },
  'confident-wheel': {
    name: 'Confident Wheel',
    image: 'assets/english-confident-wheel-front.webp',
    width: 1254, height: 1254,
    category: 'ENGLISH COURSE / SPEAKING',
    description: 'Roda visual untuk membuka percakapan dan kegiatan berbicara dalam bahasa Inggris. Gunakan petunjuk yang terlihat pada roda sebagai awal kegiatan bersama pengajar.',
    focus: 'Latihan berbicara & percakapan',
    example: 'Pilih salah satu petunjuk pada roda. Ajak anak mencoba berbicara dalam bahasa Inggris, lalu beri kesempatan mengulang dengan pendampingan pengajar.',
    background: 'var(--cream)'
  }
};
const teachingDialog = $('#teachingProductDialog');
let teachingReturnFocus;
document.querySelectorAll('[data-open-teaching]').forEach(button => button.addEventListener('click', () => {
  const product = teachingProducts[button.dataset.openTeaching];
  if (!product || teachingDialog.open) return;
  teachingReturnFocus = button;
  $('#teachingProductTitle').textContent = product.name;
  $('#teachingProductCategory').textContent = product.category;
  $('#teachingProductDescription').textContent = product.description;
  $('#teachingProductFocus').textContent = product.focus;
  $('#teachingProductExample').textContent = product.example;
  const image = $('#teachingProductImage');
  image.src = product.image;
  image.alt = product.name + ', gambar produk TIGO LAB';
  image.width = product.width;
  image.height = product.height;
  $('#teachingProductPhoto').style.background = product.background;
  $('#teachingProductClose').setAttribute('aria-label', 'Tutup detail ' + product.name);
  teachingDialog.showModal();
  document.body.style.overflow = 'hidden';
}));
$('#teachingProductClose').addEventListener('click', () => teachingDialog.close());
teachingDialog.addEventListener('close', () => {
  document.body.style.overflow = document.querySelector('dialog[open]') ? 'hidden' : '';
  teachingReturnFocus?.focus({preventScroll: true});
});
teachingDialog.addEventListener('click', event => {
  if (event.target !== teachingDialog) return;
  const box = teachingDialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) teachingDialog.close();
});


// The supplied film starts with native controls and retains its original sound.
const englishFilm = $('#englishShowcaseVideo');
if (englishFilm) {
  const filmError = $('#englishFilmError');
  englishFilm.addEventListener('error', () => { filmError.hidden = false; });
  const filmSource = englishFilm.querySelector('source');
  filmSource?.addEventListener('error', () => { filmError.hidden = false; });
  englishFilm.addEventListener('playing', () => { filmError.hidden = true; });
  document.addEventListener('play', event => {
    if (!(event.target instanceof HTMLVideoElement)) return;
    document.querySelectorAll('video').forEach(video => {
      if (video !== event.target) video.pause();
    });
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) englishFilm.pause();
  });
  window.addEventListener('pagehide', () => englishFilm.pause());
  const filmDialogObserver = new MutationObserver(() => {
    if (document.querySelector('dialog[open]')) englishFilm.pause();
  });
  document.querySelectorAll('dialog').forEach(dialog => filmDialogObserver.observe(dialog, {attributes: true, attributeFilter: ['open']}));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) englishFilm.pause();
    }).observe(englishFilm);
  }
}
