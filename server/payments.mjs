import { createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { offers } from '../dist/products.js';
import { mutate,Conflict } from './storage.mjs';
import { GatewayError } from './midtrans.mjs';

export class PaymentError extends Error {
  constructor(status,message,code='PAYMENT_ERROR'){super(message);this.status=status;this.code=code;}
}
const hash=value=>createHash('sha256').update(value).digest('hex');
const clean=(value,max)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const orderPath=id=>`orders/${id}.json`;
const validId=id=>/^TIGO-SBX-[a-f0-9]{24}$/.test(id??'');
function qrPath(data,previous){
  for(const action of [...(data.actions??[])].sort((a,b)=>(b.name==='generate-qr-code-v2')-(a.name==='generate-qr-code-v2'))){
    try{const url=new URL(action.url);if(['api.midtrans.com','api.sandbox.midtrans.com'].includes(url.hostname)&&/^\/v[24]\/qris\/[\w-]+\/qr-code$/.test(url.pathname))return url.pathname;}catch{}
  }
  return previous??`/v2/qris/${data.transaction_id}/qr-code`;
}
export function providerTime(value){
  if(typeof value!=='string')return null;
  const iso=value.includes('T')?value:value.replace(' ','T')+'+07:00';
  const date=new Date(iso);return Number.isFinite(date.getTime())?date.toISOString():null;
}

export function validateCheckout(input){
  if(!input || !/^[a-zA-Z0-9_-]{20,80}$/.test(input.idempotencyKey??''))throw new PaymentError(400,'Permintaan checkout tidak valid. Buka kembali keranjang.');
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>15)throw new PaymentError(400,'Pilih 1 sampai 15 pilihan produk dan tipe.');
  const quantities=new Map();
  for(const item of input.items){
    if(!offers.some(p=>p.id===item?.id)||!Number.isInteger(item.qty)||item.qty<1||item.qty>99)throw new PaymentError(400,'Produk, tipe, atau jumlah tidak valid. Pilih tipe produk dari katalog.');
    quantities.set(item.id,(quantities.get(item.id)??0)+item.qty);
    if(quantities.get(item.id)>99)throw new PaymentError(400,'Maksimal 99 set per pilihan produk.');
  }
  const items=[...quantities].sort().map(([id,qty])=>{const p=offers.find(p=>p.id===id);return {id,code:p.code,name:p.name,qty,price:p.price};});
  const total=items.reduce((sum,item)=>sum+item.price*item.qty,0);
  if(total>10_000_000)throw new PaymentError(400,'Maksimal Rp10.000.000 untuk satu pembayaran QRIS. Kurangi jumlah barang.');
  if(!Number.isSafeInteger(input.expectedTotal)||input.expectedTotal!==total)throw new PaymentError(409,'Harga berubah. Muat ulang katalog dan periksa total sebelum membayar.');
  const c=input.customer??{};
  const customer={name:clean(c.name,80),email:clean(c.email,160).toLowerCase(),phone:clean(c.phone,24),city:clean(c.city,80)};
  const phoneDigits=customer.phone.replace(/\D/g,'');
  const phoneValid=!customer.phone || /^[+\d ()-]{8,24}$/.test(customer.phone)&&phoneDigits.length>=8&&phoneDigits.length<=15;
  if(customer.name.length<2||customer.city.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)||!phoneValid)throw new PaymentError(400,'Lengkapi nama, email, kota, dan nomor telepon yang valid.');
  return {items,customer,total,subtotal:total,shipping:0};
}

export class PaymentService {
  constructor({store,gateway,key,createPdf,now=()=>Date.now()}){
    this.store=store;this.gateway=gateway;this.key=key;this.createPdf=createPdf;this.now=now;
  }
  token(key){return createHmac('sha256',this.key).update('tigo-sandbox-access-v1:'+key).digest('base64url');}
  async read(id,token){
    if(!validId(id))throw new PaymentError(404,'Pesanan tidak ditemukan.');
    const record=await this.store.read(orderPath(id));
    if(!record || !equal(record.value.tokenHash,hash(token??'')))throw new PaymentError(404,'Pesanan tidak ditemukan atau tautan akses tidak valid.');
    return record.value;
  }
  view(order,token){
    return {id:order.id,environment:'sandbox',status:order.status,items:order.items,customer:order.customer,
      subtotal:order.subtotal,shipping:order.shipping,total:order.total,createdAt:order.createdAt,expiresAt:order.expiresAt,
      paidAt:order.paidAt??null,receiptReady:!!order.receiptReady,receiptId:order.receiptId??null,
      localTest:!!order.localTest,
      ...(order.status==='pending'&&order.provider?{simulatorQrUrl:'https://api.sandbox.midtrans.com'+order.provider.qrPath}:{}),
      ...(token?{accessToken:token}:{}),message:order.message??null};
  }
  async rateLimit(ip){
    const bucket=Math.floor(this.now()/3600000);
    const id=createHmac('sha256',this.key).update('rate:'+ip).digest('hex').slice(0,24);
    await mutate(this.store,`rate/${bucket}-${id}.json`,current=>{
      if((current?.count??0)>=12)throw new PaymentError(429,'Terlalu banyak percobaan checkout. Silakan coba lagi nanti.');
      return {count:(current?.count??0)+1,expiresAt:new Date((bucket+2)*3600000).toISOString()};
    });
  }
  async create(input,ip='unknown'){
    const data=validateCheckout(input),token=this.token(input.idempotencyKey);
    const id='TIGO-SBX-'+hash(input.idempotencyKey).slice(0,24);
    const fingerprint=createHmac('sha256',this.key).update(JSON.stringify(data)).digest('hex');
    const existing=await this.store.read(orderPath(id));
    if(existing){
      if(!equal(existing.value.tokenHash,hash(token))||existing.value.fingerprint!==fingerprint)throw new PaymentError(409,'Isi checkout berubah. Mulai pembayaran baru dari keranjang.');
      return this.view(existing.value,token);
    }
    await this.rateLimit(ip);
    const order={schema:1,id,...data,status:'creating',tokenHash:hash(token),fingerprint,localTest:!!this.gateway.isTestDouble,
      // The key is needed only to make retry recovery deterministic; never expose it.
      createdAt:new Date(this.now()).toISOString(),expiresAt:new Date(this.now()+15*60000).toISOString(),lastChecked:0};
    try{await this.store.write(orderPath(id),order);}
    catch(error){if(error instanceof Conflict)return this.create(input,ip);throw error;}
    try {
      const response=await this.gateway.charge(order);
      const updated=await this.apply(id,response);
      return this.view(updated,token);
    } catch(error){
      if(!(error instanceof GatewayError))throw error;
      const updated=await mutate(this.store,orderPath(id),current=>({...current,
        status:current.status==='paid'?'paid':error.retryable?'creating':'failed',
        message:error.retryable?'Koneksi terputus saat membuat QRIS. Cek status untuk melanjutkan transaksi yang sama.':'QRIS belum dapat dibuat. Akun Midtrans perlu diperiksa.',
      }));
      return this.view(updated,token);
    }
  }
  verify(order,data){
    if(!data || data.order_id!==order.id || data.payment_type!=='qris' || data.currency&&data.currency!=='IDR')throw new PaymentError(422,'Referensi pembayaran tidak cocok.');
    if(!/^\d+(\.0{1,2})?$/.test(String(data.gross_amount)) || Number(data.gross_amount)!==order.total)throw new PaymentError(422,'Nominal pembayaran tidak cocok dengan pesanan.');
    if(order.provider?.transactionId && data.transaction_id!==order.provider.transactionId)throw new PaymentError(422,'Referensi transaksi tidak cocok.');
    if(order.provider?.merchantId && data.merchant_id && data.merchant_id!==order.provider.merchantId)throw new PaymentError(422,'Merchant pembayaran tidak cocok.');
    if(!/^[a-zA-Z0-9_-]{8,100}$/.test(data.transaction_id??''))throw new PaymentError(422,'Identitas transaksi tidak valid.');
  }
  async apply(id,data){
    const updated=await mutate(this.store,orderPath(id),current=>{
      if(!current)throw new PaymentError(404,'Pesanan tidak ditemukan.');
      this.verify(current,data);
      const raw=data.transaction_status;
      let status=current.status;
      if(['refund','partial_refund'].includes(raw))status='refunded';
      else if(status==='refunded')return null;
      else if(raw==='settlement' && String(data.status_code)==='200' && (!data.fraud_status || data.fraud_status==='accept'))status='paid';
      else if(status==='paid')return null; // Late pending/expire notifications never erase a verified payment.
      else if(raw==='expire')status='expired';
      else if(['deny','cancel','failure'].includes(raw))status='failed';
      else if(raw==='pending')status='pending';
      else status='review';
      return {...current,status,message:null,lastChecked:this.now(),
        provider:{transactionId:data.transaction_id,merchantId:data.merchant_id??current.provider?.merchantId??null,status:raw,qrPath:qrPath(data,current.provider?.qrPath)},
        expiresAt:providerTime(data.expiry_time)??current.expiresAt,
        ...(status==='paid'?{paidAt:current.paidAt??providerTime(data.settlement_time)??new Date(this.now()).toISOString(),receiptId:`SBX-${id.slice(-12).toUpperCase()}`}:{})};
    });
    return updated.status==='paid'?this.receiptAttempt(updated):updated;
  }
  async resume(idempotencyKey){
    if(!/^[a-zA-Z0-9_-]{20,80}$/.test(idempotencyKey??''))throw new PaymentError(400,'Tautan pesanan tidak valid.');
    const id='TIGO-SBX-'+hash(idempotencyKey).slice(0,24),token=this.token(idempotencyKey);
    return this.view(await this.read(id,token),token);
  }
  async receiptAttempt(order){
    try{return await this.ensureReceipt(order);}catch{return order;}
  }
  async ensureReceipt(order){
    if(order.receiptReady)return order;
    const bytes=await this.createPdf(order);
    await this.store.putPdf(order.id,bytes);
    return mutate(this.store,orderPath(order.id),current=>current.status==='paid'?{...current,receiptReady:true}:null);
  }
  async status(id,token,{refresh=false}={}){
    let order=await this.read(id,token);
    if(order.status==='paid')return this.view(await this.receiptAttempt(order));
    if(!['pending','creating'].includes(order.status))return this.view(order);
    let claimed=false;
    if(refresh || this.now()-(order.lastChecked??0)>=12000){
      order=await mutate(this.store,orderPath(id),current=>{
        claimed=false;
        // The lease is shared across requests/instances, including manual refreshes.
        if(this.now()-(current.lastChecked??0)<4000)return null;
        claimed=true;return {...current,lastChecked:this.now()};
      });
    }
    if(claimed){
      try{
        let data=await this.gateway.status(id);
        // Retrying the same merchant order ID recovers a charge timeout without a new invoice.
        if(!data && order.status==='creating')data=await this.gateway.charge(order);
        if(data)order=await this.apply(id,data);
      }catch(error){if(!(error instanceof GatewayError))throw error;}
    }
    return this.view(order);
  }
  async notification(body){
    if(!this.gateway.validNotification(body))throw new PaymentError(403,'Notifikasi tidak valid.');
    if(!validId(body.order_id))throw new PaymentError(400,'Referensi pesanan tidak valid.');
    const record=await this.store.read(orderPath(body.order_id));
    if(!record)throw new PaymentError(404,'Pesanan belum tersedia.');
    this.verify(record.value,body);
    const verified=await this.gateway.status(body.order_id);
    if(!verified)throw new PaymentError(503,'Status pembayaran belum tersedia.');
    const result=await this.apply(body.order_id,verified);
    if(result.status==='paid'&&!result.receiptReady)throw new PaymentError(503,'Bukti pembayaran sedang disiapkan.');
    return {received:true};
  }
  async qr(id,token){
    const order=await this.read(id,token);
    if(order.status!=='pending'||!order.provider?.transactionId)throw new PaymentError(409,'QRIS tidak aktif. Periksa status pesanan.');
    return this.gateway.qr(order);
  }
  async cancel(id,token){
    let order=await this.read(id,token);
    const latest=await this.gateway.status(id);
    if(latest)order=await this.apply(id,latest);
    if(order.status==='paid'||!['pending','creating'].includes(order.status))return this.view(order);
    try{await this.gateway.cancel(id);}catch(error){if(!(error instanceof GatewayError))throw error;}
    const confirmed=await this.gateway.status(id);
    if(confirmed)order=await this.apply(id,confirmed);
    return this.view(order);
  }
  async receipt(id,token){
    let order=await this.read(id,token);
    if(order.status!=='paid')throw new PaymentError(409,'Bukti pembayaran tersedia setelah lunas terverifikasi.');
    order=await this.ensureReceipt(order);
    const bytes=await this.store.getPdf(id);
    if(!bytes)throw new PaymentError(503,'Bukti pembayaran sedang disiapkan. Coba lagi.');
    return {bytes,id:order.receiptId};
  }
}
