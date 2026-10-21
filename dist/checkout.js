const $=selector=>document.querySelector(selector);
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keys={active:'tigo-qris-sandbox-active-v1',pending:'tigo-qris-sandbox-attempt-v1',owned:'tigo-qris-sandbox-owned-v1',cleared:'tigo-qris-sandbox-cleared-v1'};
function read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));}catch{}}
const validAccess=value=>value&&/^TIGO-SBX-[a-f0-9]{24}$/.test(value.id)&&/^[\w-]{43}$/.test(value.token);

export function initializeCheckout({getCart,products,openDialog,closeDialog,notify,onPaid}){
  let config=null,active=read(keys.active),order=null,pollTimer,countdownTimer,busy=false,qrUrl=null,qrLoading=null;
  if(!validAccess(active))active=null;
  const dialog=$('#paymentDialog'),form=$('#checkoutForm');
  const cartTotal=()=>getCart().reduce((sum,i)=>sum+products.find(p=>p.id===i.id).price*i.qty,0);
  function error(target,message){$(target).textContent=message??'';$(target).hidden=!message;}
  async function api(action,{method='GET',data,auth=false,binary=false}={}){
    const query=new URLSearchParams({action,...(auth?{orderId:active.id}:{})});
    let response;
    try{response=await fetch('/api/payments?'+query,{method,cache:'no-store',headers:{
      ...(data?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+active.token}:{}),
    },...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(25000)});}
    catch{throw new Error('Koneksi terputus. Cek status lagi; jangan membuat pembayaran baru.');}
    if(!response.ok){let payload;try{payload=await response.json();}catch{}const failure=new Error(payload?.message??'Layanan pembayaran belum tersedia.');failure.status=response.status;failure.code=payload?.error;throw failure;}
    return binary?response.blob():response.json();
  }
  function trackOwned(id){const ids=read(keys.owned,[]);if(!ids.includes(id))save(keys.owned,[...ids,id].slice(-30));}
  function remember(next){
    const token=next.accessToken??(active?.id===next.id?active.token:null);
    if(!validAccess({id:next.id,token}))throw new Error('Akses pesanan tidak tersedia. Buka kembali tautan pesanan pribadi.');
    active={id:next.id,token};save(keys.active,active);$('#resumePayment').hidden=false;
    order=next;
  }
  function stopPolling(){clearTimeout(pollTimer);clearInterval(countdownTimer);}
  function revokeQr(){if(qrUrl)URL.revokeObjectURL(qrUrl);qrUrl=null;qrLoading=null;$('#paymentQrImage').removeAttribute('src');}
  function countdown(){
    if(!order||order.status!=='pending')return;
    const remaining=Math.max(0,Math.ceil((new Date(order.expiresAt).getTime()-Date.now())/1000));
    $('#paymentCountdown').textContent=remaining?`Berlaku ${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`:'Waktu pembayaran berakhir. Memeriksa status ke Midtrans…';
  }
  async function loadQr(){
    if(!order||order.status!=='pending'||qrUrl||qrLoading===active.id||!dialog.open)return;
    const id=active.id;qrLoading=id;
    try{const blob=await api('qr',{auth:true,binary:true});if(active?.id!==id||!dialog.open)return;
      qrUrl=URL.createObjectURL(blob);$('#paymentQrImage').src=qrUrl;
    }catch(failure){error('#paymentError',failure.message);}finally{if(qrLoading===id)qrLoading=null;}
  }
  function render(){
    if(!order)return;
    const pending=order.status==='pending',paid=order.status==='paid',creating=order.status==='creating';
    const labels={pending:'Menunggu pembayaran uji',paid:'Lunas terverifikasi · sandbox',creating:'Menyiapkan QRIS',expired:'QRIS kedaluwarsa',failed:'Pembayaran tidak selesai',review:'Perlu pemeriksaan',refunded:'Pembayaran dikembalikan'};
    $('#paymentHeading').textContent=paid?'Pembayaran uji berhasil.':'Bayar dengan QRIS.';
    $('#paymentNotice').textContent=order.localTest?'Pengujian lokal, bukan transaksi Midtrans. QR ini tidak dapat dibayar dengan uang nyata.':'Mode uji. Gunakan simulator Midtrans; jangan bayar dengan aplikasi bank atau e-wallet sungguhan.';
    $('#paymentStatus').textContent=labels[order.status]??'Memeriksa pembayaran';$('#paymentStatus').dataset.state=order.status;
    $('#paymentAmount').textContent=rupiah(order.total);$('#paymentOrder').textContent=order.id;
    $('#paymentSuccessIcon').hidden=!paid;$('#paymentQrArea').hidden=!pending;
    $('#paymentSimulator').hidden=!pending;$('#paymentSimulator').href=order.localTest?'/__test/simulator?orderId='+encodeURIComponent(order.id):'https://simulator.sandbox.midtrans.com/v2/qris/index';
    $('#paymentSimulator').textContent=order.localTest?'Buka simulator pengujian lokal ↗':'Buka simulator Midtrans ↗';
    $('#paymentCopyQrUrl').hidden=!pending||order.localTest;$('#paymentDownloadQr').hidden=!pending;
    $('#paymentCheck').hidden=!pending&&!creating&&!(paid&&!order.receiptReady);
    $('#paymentCancel').hidden=!pending;
    $('#paymentDownloadReceipt').hidden=!paid||!order.receiptReady;
    $('#paymentRetry').hidden=!['expired','failed'].includes(order.status);
    $('#paymentMessage').textContent=paid?(order.receiptReady?'Bukti pembayaran uji sudah dibuat otomatis dan siap diunduh.':'Pembayaran terverifikasi. Bukti PDF sedang disiapkan otomatis.'):
      pending?(order.localTest?'Buka simulator pengujian lokal, pilih skenario, lalu kembali untuk melihat statusnya.':'Salin URL QRIS, tempel di simulator, selesaikan pembayaran uji, lalu kembali ke halaman ini.'):
      creating?(order.message??'Sedang menyiapkan QRIS sesuai total barang. Transaksi yang sama akan dilanjutkan jika koneksi terputus.'):
      order.status==='expired'?'QRIS ini sudah kedaluwarsa. Kamu dapat membuat pembayaran uji baru.':
      order.status==='failed'?'Pembayaran tidak selesai. Keranjang tetap tersimpan.':
      'Status pesanan perlu diperiksa sebelum melanjutkan pembayaran.';
    $('#paymentCustomer').textContent=`${order.customer.name} · ${order.customer.city}`;
    $('#paymentItems').innerHTML=order.items.map(i=>`<div class="summary-item"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${rupiah(i.price*i.qty)}</span></div>`).join('')+`<div class="shipping-line"><span>Ongkir simulasi</span><span>${rupiah(order.shipping)}</span></div>`;
    if(paid){
      const cleared=read(keys.cleared,[]);
      if(read(keys.owned,[]).includes(order.id)&&!cleared.includes(order.id)){onPaid(order);save(keys.cleared,[...cleared,order.id].slice(-30));}
    }
    if(!pending)revokeQr();else{countdown();loadQr();}
  }
  function schedule(){
    clearTimeout(pollTimer);
    if(dialog.open&&!document.hidden&&order&&(['pending','creating'].includes(order.status)||order.status==='paid'&&!order.receiptReady))pollTimer=setTimeout(()=>refresh(false),5000);
  }
  async function refresh(manual=false){
    if(!active||busy)return;
    busy=true;$('#paymentCheck').disabled=true;
    try{const next=await api(manual?'refresh':'status',{method:manual?'POST':'GET',auth:true});remember(next);error('#paymentError',null);render();}
    catch(failure){error('#paymentError',failure.message);}
    finally{busy=false;$('#paymentCheck').disabled=false;schedule();}
  }
  async function showPayment(next){
    if(next){if(active?.id!==next.id)revokeQr();remember(next);}
    if(!active)return;
    error('#paymentError',null);
    if(!dialog.open)openDialog('paymentDialog');
    render();clearInterval(countdownTimer);countdownTimer=setInterval(countdown,1000);
    await refresh(false);
  }
  async function availability(){
    const area=$('#checkoutAvailability');
    try{config=await api('config');area.textContent=config.ready?(config.localTest?'Pengujian lokal: bukan transaksi Midtrans.':'QRIS sandbox tersedia. Selesaikan pembayaran uji melalui simulator Midtrans.'):'QRIS sandbox belum terhubung. Pemilik website sedang menyiapkan akun uji Midtrans.';
      area.dataset.ready=String(config.ready);$('#checkoutSubmit').disabled=!config.ready||cartTotal()>10000000;
    }catch{config=null;area.textContent='Pembayaran sandbox sedang disiapkan. Coba lagi setelah beberapa saat.';$('#checkoutSubmit').disabled=true;}
  }
  function renderCheckout(){
    const cart=getCart();$('#checkoutSummary').innerHTML=cart.map(i=>{const p=products.find(p=>p.id===i.id);return `<div class="summary-item"><span>${escapeHtml(p.name)} × ${i.qty}</span><span>${rupiah(p.price*i.qty)}</span></div>`;}).join('')+`<div class="shipping-line"><span>Ongkir simulasi</span><span>Rp0</span></div><div class="summary-line"><span>Total pembayaran uji</span><strong>${rupiah(cartTotal())}</strong></div>`;
    $('#checkoutSubmit').textContent='Buat QRIS '+rupiah(cartTotal());
    if(cartTotal()>10000000)error('#checkoutError','Maksimal Rp10.000.000 per pembayaran QRIS. Kurangi jumlah barang.');
  }
  async function beginCheckout(){
    if(!getCart().length)return;
    closeDialog('cartDialog');
    if(active){
      try{remember(await api('status',{auth:true}));const unseenPaid=order.status==='paid'&&read(keys.owned,[]).includes(order.id)&&!read(keys.cleared,[]).includes(order.id);if(['pending','creating','review'].includes(order.status)||unseenPaid){await showPayment();return;}}
      catch(failure){if(failure.status!==404){notify(failure.message);return;}active=null;save(keys.active,null);}
    }
    renderCheckout();error('#checkoutError',cartTotal()>10000000?'Maksimal Rp10.000.000 per pembayaran QRIS. Kurangi jumlah barang.':null);
    openDialog('checkoutDialog');availability();
  }
  $('#cartSummary').addEventListener('click',event=>{if(event.target.closest('#checkoutOpen'))beginCheckout();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!config?.ready||!form.reportValidity()||!getCart().length)return;
    busy=true;$('#checkoutSubmit').disabled=true;$('#checkoutSubmit').textContent='Menyiapkan QRIS…';error('#checkoutError',null);
    let attempt=read(keys.pending);if(typeof attempt!=='string'||!/^[\w-]{20,80}$/.test(attempt)){attempt=crypto.randomUUID();save(keys.pending,attempt);}
    try{
      let result;
      try{result=await api('resume',{method:'POST',data:{idempotencyKey:attempt}});}catch(failure){if(failure.status!==404)throw failure;}
      if(!result)result=await api('create',{method:'POST',data:{idempotencyKey:attempt,expectedTotal:cartTotal(),items:getCart().map(i=>({id:i.id,qty:i.qty})),customer:{name:$('#checkoutName').value.trim(),email:$('#checkoutEmail').value.trim(),phone:$('#checkoutPhone').value.trim(),city:$('#checkoutCity').value.trim()}}});
      remember(result);trackOwned(result.id);save(keys.pending,null);closeDialog('checkoutDialog');busy=false;await showPayment(result);
    }catch(failure){error('#checkoutError',failure.message);}
    finally{busy=false;$('#checkoutSubmit').disabled=!config?.ready||cartTotal()>10000000;$('#checkoutSubmit').textContent='Buat QRIS '+rupiah(cartTotal());}
  });
  $('#paymentCheck').addEventListener('click',()=>refresh(true));
  $('#resumePayment').addEventListener('click',async()=>{
    if(!active){const attempt=read(keys.pending);if(attempt){try{const next=await api('resume',{method:'POST',data:{idempotencyKey:attempt}});trackOwned(next.id);remember(next);save(keys.pending,null);}catch(failure){notify(failure.message);return;}}}
    showPayment();
  });
  $('#paymentRetry').addEventListener('click',()=>{
    if(!order||!['expired','failed'].includes(order.status))return;
    active=null;order=null;save(keys.active,null);save(keys.pending,null);$('#resumePayment').hidden=true;
    closeDialog('paymentDialog');if(getCart().length){renderCheckout();openDialog('checkoutDialog');availability();}else notify('Tambahkan produk ke keranjang untuk membuat pembayaran baru.');
  });
  $('#paymentCancel').addEventListener('click',async()=>{
    if(busy||!active)return;busy=true;$('#paymentCancel').disabled=true;
    try{remember(await api('cancel',{method:'POST',auth:true}));render();if(['pending','creating'].includes(order.status))error('#paymentError','Pembatalan belum terkonfirmasi. Cek status sebelum membuat pembayaran baru.');}
    catch(failure){error('#paymentError',failure.message);}finally{busy=false;$('#paymentCancel').disabled=false;schedule();}
  });
  async function download(action,name){
    try{const blob=await api(action,{auth:true,binary:true}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    catch(failure){error('#paymentError',failure.message);}
  }
  $('#paymentDownloadReceipt').addEventListener('click',()=>download('receipt',`TIGO-LAB-${order.receiptId}.pdf`));
  $('#paymentDownloadQr').addEventListener('click',()=>download('qr',`TIGO-LAB-${order.id}-sandbox.png`));
  async function copy(value){try{await navigator.clipboard.writeText(value);notify('Disalin.');}catch{error('#paymentError','Penyalinan tidak diizinkan browser. Gunakan tautan pesanan pada alamat halaman.');}}
  $('#paymentCopyQrUrl').addEventListener('click',()=>{if(order?.simulatorQrUrl)copy(order.simulatorQrUrl);});
  $('#paymentCopyLink').addEventListener('click',()=>{if(active){const url=location.origin+'/#pesanan='+active.id+'.'+active.token;history.replaceState(null,'',url);copy(url);}});
  dialog.addEventListener('close',()=>{stopPolling();revokeQr();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(pollTimer);else if(dialog.open)refresh(false);});
  if(active||read(keys.pending))$('#resumePayment').hidden=false;
  const match=location.hash.match(/^#pesanan=(TIGO-SBX-[a-f0-9]{24})\.([\w-]{43})$/);
  if(match){active={id:match[1],token:match[2]};save(keys.active,active);$('#resumePayment').hidden=false;showPayment();}
  availability();
}
