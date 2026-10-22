'use strict';
import { products, offers, legacyProductId, restoreCart } from './products.js';
import { productDemos } from './demos.js';
import { initializeCheckout } from './checkout.js';
import { initializeStories } from './stories.js';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rupiah = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const safeText = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId = id => products.find(p=>p.id===id);
const offerById = id => offers.find(p=>p.id===id);
const legacyProduct = id => byId(legacyProductId(id));
const store = {get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
let cart = store.get('tigo-demo-cart-v1',[]);
cart = restoreCart(cart);
let filter='all',query='',sort='featured',detailQty=1,detailId=null,detailCartId=null;
let toastTimer;
const dialogReturnFocus=new WeakMap();
const reducedSystem = matchMedia('(prefers-reduced-motion: reduce)');
let reducedUser = store.get('tigo-reduced-motion',false)===true;
const reduced = ()=>reducedSystem.matches||reducedUser;
function updateMotion(){document.documentElement.classList.toggle('motion-off',reduced());$('#motionToggle').setAttribute('aria-pressed',String(reduced()));$('#motionToggle').setAttribute('aria-label',reduced()?'Animasi dikurangi, klik untuk mengubah preferensi':'Kurangi animasi');$('#motionToggle').title=reduced()?'Animasi dikurangi':'Kurangi animasi';if(reduced())$$('.reveal').forEach(el=>{el.classList.remove('pending');el.classList.add('in-view');});}
$('#motionToggle').addEventListener('click',()=>{reducedUser=!reducedUser;store.set('tigo-reduced-motion',reducedUser);updateMotion();notify(reducedSystem.matches?'Mengikuti pengaturan pengurangan gerak perangkat.':reducedUser?'Animasi dikurangi.':'Animasi diaktifkan.');});
reducedSystem.addEventListener('change',updateMotion);updateMotion();
function notify(text){const el=$('#toast');clearTimeout(toastTimer);el.textContent=text;el.classList.add('visible');toastTimer=setTimeout(()=>el.classList.remove('visible'),2800);}
function persistCart(){store.set('tigo-demo-cart-v1',cart);updateBadge();}
function updateBadge(){const count=cart.reduce((s,i)=>s+i.qty,0);$('#cartCount').textContent=count;$('#cartOpen').setAttribute('aria-label',`Buka keranjang, ${count} barang`);}
function subtotal(items=cart){return items.reduce((s,i)=>s+(offerById(i.id)?.price??0)*i.qty,0);}
function openDialog(id){const dialog=$('#'+id);dialogReturnFocus.set(dialog,document.activeElement);dialog.showModal();document.body.style.overflow='hidden';}
function closeDialog(id){const dialog=$('#'+id);dialog.close();}
$$('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{const opened=$$('dialog[open]'),target=dialogReturnFocus.get(dialog);if(!opened.length)document.body.style.overflow='';if(target?.isConnected&&!target.closest('dialog:not([open])')&&(!opened.length||opened.at(-1).contains(target)))target.focus({preventScroll:true});else if(!opened.length)$('#cartOpen').focus({preventScroll:true});});dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});});
document.addEventListener('click',event=>{const button=event.target.closest('[data-close]');if(button)closeDialog(button.dataset.close);const play=event.target.closest('[data-play-demo]');if(play)openProductDemo(play.dataset.playDemo);});
$('#menuToggle').addEventListener('click',()=>{const open=$('#menuToggle').getAttribute('aria-expanded')==='true';$('#menuToggle').setAttribute('aria-expanded',String(!open));$('#menuToggle').setAttribute('aria-label',open?'Buka menu':'Tutup menu');$('#mobileMenu').hidden=open;});
$$('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>{$('#mobileMenu').hidden=true;$('#menuToggle').setAttribute('aria-expanded','false');$('#menuToggle').setAttribute('aria-label','Buka menu');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#mobileMenu').hidden){$('#mobileMenu').hidden=true;$('#menuToggle').setAttribute('aria-expanded','false');$('#menuToggle').focus();}});

const eye='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/></svg>';
function renderProducts(){
  let visible=products.filter(p=>(filter==='all'||p.category===filter)&&(!query||`${p.name} ${p.short} ${p.label}`.toLocaleLowerCase('id').includes(query)));
  if(sort==='name')visible.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==='price-asc')visible.sort((a,b)=>a.price-b.price);
  if(sort==='price-desc')visible.sort((a,b)=>b.price-a.price);
  $('#productGrid').innerHTML=visible.map(p=>`<article class="product-card" data-id="${p.id}"><div class="product-photo" style="--card-bg:${p.bg}"><span class="product-index">${p.id.slice(1)}</span><span class="view-icon">${eye}</span><button class="product-image-button" data-detail="${p.id}" aria-label="Lihat detail ${p.name}"><img src="assets/${p.image}.webp" alt="${p.name}, referensi produk Montessori TIGO LAB" width="1000" height="1000" loading="lazy"></button></div><div class="product-info"><div class="product-category">${p.label}</div><h3><button class="product-name" data-detail="${p.id}">${p.name}</button></h3><p class="product-description">${p.short}</p><button class="card-demo-button" data-play-demo="${p.id}" aria-label="Lihat cara bermain ${p.name}" aria-haspopup="dialog" aria-controls="animationDialog"><span aria-hidden="true">▶</span> Cara bermain</button><div class="product-bottom"><div class="product-price">${rupiah(p.price)}<span class="example-note">per set lengkap</span></div><button class="add-button" data-add="${p.id}" aria-label="Tambah ${p.name} ke keranjang">+</button></div></div></article>`).join('');
  $('#resultCount').textContent=`Menampilkan ${visible.length} produk`;
  $('#emptySearch').hidden=visible.length>0;
}
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;$$('[data-filter]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderProducts();}));
$('#productSearch').addEventListener('input',e=>{query=e.target.value.trim().replace(/\s+/g,' ').toLocaleLowerCase('id');renderProducts();});
$('#productSort').addEventListener('change',e=>{sort=e.target.value;renderProducts();});
$('#resetSearch').addEventListener('click',()=>{query='';filter='all';sort='featured';$('#productSearch').value='';$('#productSort').value='featured';$$('[data-filter]').forEach(b=>{const active=b.dataset.filter==='all';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderProducts();$('#productSearch').focus();});
$('#productGrid').addEventListener('click',e=>{const detail=e.target.closest('[data-detail]'),add=e.target.closest('[data-add]');if(detail)showProduct(detail.dataset.detail);if(add)addToCart(add.dataset.add,1,add);});
function showProduct(id,cartId=null){
  const p=byId(id),previous=cart.find(i=>i.id===cartId);
  detailId=id;detailQty=previous?.qty??1;detailCartId=cartId;
  const contents=p.setContents?`<p class="complete-set-note">${p.setContents}</p>`:'';
  const review=cartId?'<p class="cart-set-notice">Tipe produk kini digabung menjadi satu set lengkap. Periksa jumlah set sebelum menyimpan.</p>':'';
  $('#productDetail').innerHTML=`<div class="detail-layout"><div class="detail-image" style="--detail-bg:${p.bg}"><img src="assets/${p.image}.webp" alt="${p.name}, gambar referensi dari katalog TIGO LAB" width="1000" height="1000"></div><div class="detail-copy"><div class="eyebrow">MONTESSORI / ${p.label}</div><h2 id="detailTitle">${p.name}</h2><p class="detail-description">${p.description}</p><button class="text-link detail-demo-button" data-play-demo="${p.id}" aria-haspopup="dialog" aria-controls="animationDialog"><span aria-hidden="true">▶</span> Lihat animasi cara bermain</button><div class="detail-price"><output id="detailPriceValue">${rupiah(p.price)}</output><span>Harga per set lengkap · termasuk kemasan</span></div>${contents}${review}<div class="detail-meta"><div><span>Kode produk</span><strong id="detailCode">${p.code}</strong></div><div><span>Bahan & kelengkapan</span><strong>Menunggu konfirmasi</strong></div><div><span>Pemesanan</span><strong>QRIS sandbox</strong></div></div><div class="detail-actions"><div class="qty-control" aria-label="Jumlah set"><button type="button" data-detail-qty="-1" aria-label="Kurangi jumlah">−</button><output id="detailQty" aria-live="polite">${detailQty}</output><button type="button" data-detail-qty="1" aria-label="Tambah jumlah">+</button></div><button class="button button-blue" id="detailAdd">${cartId?'Ganti dengan set lengkap':'Tambah ke keranjang'} <span aria-hidden="true">+</span></button></div></div></div>`;
  openDialog('productDialog');
}
$('#productDetail').addEventListener('click',event=>{
  const qty=event.target.closest('[data-detail-qty]');
  if(qty){detailQty=Math.max(1,Math.min(99,detailQty+Number(qty.dataset.detailQty)));$('#detailQty').textContent=detailQty;}
  const button=event.target.closest('#detailAdd');
  if(!button||!detailId)return;
  if(detailCartId){
    const other=cart.find(i=>i.id===detailId);
    if((other?.qty??0)+detailQty>99){notify('Maksimal 99 set per produk. Kurangi jumlah terlebih dahulu.');return;}
    cart=cart.filter(i=>i.id!==detailCartId);
    addToCart(detailId,detailQty,button);renderCart();closeDialog('productDialog');return;
  }
  addToCart(detailId,detailQty,button);button.textContent='Ditambahkan ✓';
  setTimeout(()=>{if(button.isConnected)button.innerHTML='Tambah ke keranjang <span aria-hidden="true">+</span>';},1200);
});
function flyToCart(p,from){if(reduced()||document.querySelector('dialog[open]')||!from)return;const source=from.closest('.product-card')?.querySelector('img')||from;const a=source.getBoundingClientRect(),b=$('#cartOpen').getBoundingClientRect();if(b.bottom<0||a.top>innerHeight)return;const image=document.createElement('img');image.className='fly-image';image.src=`assets/${p.image}.webp`;image.alt='';image.style.left=`${a.left+a.width/2-29}px`;image.style.top=`${Math.min(a.top+a.height/2,innerHeight-70)}px`;document.body.append(image);const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-Math.min(a.top+a.height/2,innerHeight-70)-29;const animation=image.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.25)`,opacity:.2}],{duration:430,easing:'cubic-bezier(.3,.7,.3,1)'});animation.finished.finally(()=>image.remove());}
function addToCart(id,qty=1,from=null){const p=offerById(id);if(!p)return;const existing=cart.find(i=>i.id===id);if(existing){if(existing.qty>=99){notify('Maksimal 99 set per pilihan produk.');return;}existing.qty=Math.min(99,existing.qty+qty);}else cart.push({id,qty:Math.min(99,qty)});persistCart();flyToCart(p,from);$('#cartCount').classList.remove('bump');void $('#cartCount').offsetWidth;$('#cartCount').classList.add('bump');notify(`${p.name} ditambahkan ke keranjang.`);}
function renderCart(){
  if(!cart.length){$('#cartContents').innerHTML='<div class="cart-empty"><div class="empty-shapes" aria-hidden="true">○ △ □</div><h3>Masih ada ruang untuk ide baru.</h3><p>Jelajahi koleksi dan tambahkan<br>aktivitas yang menarik perhatian.</p><button class="button button-blue" data-close="cartDialog">Jelajahi koleksi →</button></div>';$('#cartSummary').hidden=true;return;}
  const unselected=cart.some(i=>!offerById(i.id));
  $('#cartSummary').hidden=false;
  $('#cartContents').innerHTML=cart.map(i=>{
    const offer=offerById(i.id),p=offer??legacyProduct(i.id);
    const name=offer?p.name:`${p.name} — Type ${i.id.split('-T')[1]} sebelumnya`;
    return `<div class="cart-row"><img src="assets/${p.image}.webp" alt="${name}" width="74" height="79"><div><div class="cart-row-name">${name}</div><div class="cart-row-price">${offer?rupiah(offer.price)+' / set lengkap':'Tinjau harga set lengkap: '+rupiah(p.price)}</div>${!offer?`<button class="cart-set-button" data-cart-set="${i.id}">Pilih set lengkap</button>`:''}<div class="cart-row-controls"><div class="qty-control"><button data-cart-qty="${i.id}" data-delta="-1" aria-label="Kurangi jumlah ${name}">−</button><output aria-label="Jumlah ${p.name}">${i.qty}</output><button data-cart-qty="${i.id}" data-delta="1" aria-label="Tambah jumlah ${name}">+</button></div><button class="remove-item" data-remove="${i.id}" aria-label="Hapus ${name}">Hapus</button></div></div></div>`;
  }).join('');
  $('#cartSummary').innerHTML=`<div class="cart-subtotal"><span>${unselected?'Subtotal (set terpilih)':'Subtotal produk'}</span><strong>${rupiah(subtotal())}</strong></div>${unselected?'<p class="cart-set-notice">Pilihan tipe lama telah digabung menjadi set lengkap. Tinjau pilihan dari keranjang sebelumnya untuk melanjutkan.</p>':''}<p class="small-note">QRIS sandbox untuk pengujian. Tidak ada uang nyata atau pengiriman barang.</p><button class="button button-blue full-width" id="checkoutOpen" ${unselected?'disabled':''}>${unselected?'Tinjau pilihan set':'Checkout QRIS sandbox'} <span aria-hidden="true">→</span></button>`;
}
$('#cartOpen').addEventListener('click',()=>{renderCart();openDialog('cartDialog');});
$('#cartContents').addEventListener('click',e=>{const choice=e.target.closest('[data-cart-set]');if(choice){showProduct(legacyProductId(choice.dataset.cartSet),choice.dataset.cartSet);return;}const qty=e.target.closest('[data-cart-qty]'),remove=e.target.closest('[data-remove]');if(qty){const item=cart.find(i=>i.id===qty.dataset.cartQty);if(!item)return;item.qty=Math.max(1,Math.min(99,item.qty+Number(qty.dataset.delta)));persistCart();renderCart();const replacement=$(`#cartContents button[data-cart-qty="${item.id}"][data-delta="${qty.dataset.delta}"]`);replacement?.focus({preventScroll:true});}if(remove){cart=cart.filter(i=>i.id!==remove.dataset.remove);persistCart();renderCart();notify('Produk dihapus dari keranjang.');}});
initializeCheckout({ getCart:()=>cart, products:offers, openDialog, closeDialog, notify, onPaid(order){ const same=JSON.stringify(cart.map(i=>[i.id,i.qty]).sort())===JSON.stringify(order.items.map(i=>[i.id,i.qty]).sort()); if(same){cart=[];persistCart();} } });
const featured=['M09',...products.filter(p=>p.id!=='M09').map(p=>p.id)];let heroSlide=0;
function setHero(delta){heroSlide=(heroSlide+delta+featured.length)%featured.length;const p=byId(featured[heroSlide]);const img=$('#heroImage');img.classList.remove('switching');img.src=`assets/${p.image}.webp`;img.alt=`${p.name}, gambar referensi produk Montessori TIGO LAB`;$('#heroProductName').textContent=p.name;$('#heroIndex').textContent=`PILIHAN ${p.id.slice(1)} / 10`;void img.offsetWidth;img.classList.add('switching');}
function openProductDemo(id){
  const product=byId(id),demo=productDemos[id];
  if(!product||!demo||$('#animationDialog').open)return;
  const video=$('#demoVideo');
  video.pause();
  $('#animationProductName').textContent=product.name;
  $('#animationTitle').textContent=demo.title;
  $('#animationDescription').textContent=demo.description;
  $('#animationSteps').replaceChildren(...demo.steps.map(text=>{const item=document.createElement('li');item.textContent=text;return item;}));
  $('#animationError').hidden=true;
  $('#animationDownload').href=demo.video;
  $('#videoFallback').href=demo.video;
  video.setAttribute('aria-label',`Animasi cara bermain ${product.name}`);
  if(video.dataset.product!==id){
    video.poster=demo.poster;
    video.src=demo.video;
    video.dataset.product=id;
    video.load();
  }
  video.currentTime=0;
  openDialog('animationDialog');
  video.play().catch(()=>{/* Visitor can use native controls if playback needs another tap. */});
}
$('#animationDialog').addEventListener('close',()=>{$('#demoVideo').pause();});
$('#demoVideo').addEventListener('error',()=>{$('#animationError').hidden=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)$('#demoVideo').pause();});
$('#heroPrev').addEventListener('click',()=>setHero(-1));$('#heroNext').addEventListener('click',()=>setHero(1));
$('#replayMotion').addEventListener('click',()=>openProductDemo(featured[heroSlide]));
renderProducts();updateBadge();initializeStories({reduced});
const benefitsSection=$('#kelebihan');
if(benefitsSection&&'IntersectionObserver' in window){
  let benefitsVisible=false;
  const updateBenefitMotion=()=>benefitsSection.classList.toggle('icons-active',benefitsVisible&&!document.hidden);
  const benefitsObserver=new IntersectionObserver(([entry])=>{benefitsVisible=entry.isIntersecting;updateBenefitMotion();},{threshold:.1});
  benefitsObserver.observe(benefitsSection);
  document.addEventListener('visibilitychange',updateBenefitMotion);
}
if('IntersectionObserver' in window&&!reduced()){document.documentElement.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('pending');entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.08});$$('.reveal').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight)el.classList.add('pending');observer.observe(el);});}
