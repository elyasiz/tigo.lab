const $ = selector => document.querySelector(selector);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = false;
try { reducedMotion = JSON.parse(localStorage.getItem('tigo-reduced-motion')) === true; } catch {}
function updateMotion() {
  const reduced = reducedMotion || motionPreference.matches;
  document.documentElement.classList.toggle('motion-off', reduced);
  $('#motionToggle').setAttribute('aria-pressed', String(reduced));
  $('#motionToggle').setAttribute('aria-label', reduced ? 'Animasi dikurangi, klik untuk mengubah preferensi' : 'Kurangi animasi');
}
$('#motionToggle').addEventListener('click', () => {
  reducedMotion = !reducedMotion;
  try { localStorage.setItem('tigo-reduced-motion', JSON.stringify(reducedMotion)); } catch {}
  updateMotion();
});
motionPreference.addEventListener('change', updateMotion);
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

const photoDialog = $('#codingPhotoDialog');
$('#openCodingPhoto').addEventListener('click', () => {
  photoDialog.showModal();
  document.body.style.overflow = 'hidden';
});
$('#closeCodingPhoto').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  $('#openCodingPhoto').focus({preventScroll: true});
});
photoDialog.addEventListener('click', event => {
  if (event.target !== photoDialog) return;
  const rect = photoDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) photoDialog.close();
});

// No network request or local storage: visitors explicitly copy their enquiry.
const inquiryForm = $('#codingInquiryForm');
inquiryForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!inquiryForm.reportValidity()) return;
  const data = new FormData(inquiryForm);
  const value = name => String(data.get(name) ?? '').trim();
  const notes = value('notes');
  $('#codingSummaryText').value = [
    'Halo TIGO LAB, saya ingin menanyakan Code Tiles — Unplugged Coding.',
    '',
    `Kebutuhan: ${value('requestType')}`,
    `Nama sekolah / pemesan: ${value('school')}`,
    `Kelompok usia: ${value('age')}`,
    `Perkiraan jumlah: ${value('quantity')} set`,
    `Kota tujuan: ${value('city')}`,
    ...(notes ? [`Catatan: ${notes}`] : []),
    '',
    'Mohon informasi pilihan set, kelengkapan, kesesuaian usia, harga, dan pengiriman. Terima kasih.'
  ].join('\n');
  $('#codingSummary').hidden = false;
  $('#codingFormStatus').textContent = 'Ringkasan siap. Salin dan bagikan kepada tim TIGO LAB untuk menanyakan produk. Pertanyaan belum dikirim.';
  $('#codingSummaryText').focus();
});
$('#copyCodingSummary').addEventListener('click', async () => {
  const text = $('#codingSummaryText');
  try {
    await navigator.clipboard.writeText(text.value);
    $('#codingFormStatus').textContent = 'Ringkasan berhasil disalin. Bagikan kepada tim TIGO LAB untuk menanyakan produk.';
  } catch {
    text.focus();
    text.select();
    $('#codingFormStatus').textContent = 'Pilih Salin pada teks yang sudah ditandai, lalu bagikan kepada tim TIGO LAB.';
  }
});
