import { createHash, timingSafeEqual } from 'node:crypto';
const BASE='https://api.sandbox.midtrans.com';

export class GatewayError extends Error {
  constructor(message,retryable=true){super(message);this.retryable=retryable;}
}
export class Midtrans {
  constructor(key,baseUrl,fetcher=fetch){
    if(!key?.startsWith('SB-Mid-server-'))throw new Error('A sandbox Server Key is required.');
    this.key=key;this.baseUrl=baseUrl;this.fetcher=fetcher;
  }
  async request(path,body) {
    let response;
    try {response=await this.fetcher(BASE+path,{
      method:body?'POST':'GET',headers:{Accept:'application/json','Content-Type':'application/json',
        Authorization:`Basic ${Buffer.from(this.key+':').toString('base64')}`,
        ...(body?{'X-Override-Notification':this.baseUrl+'/api/midtrans'}:{}),
      },...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000),
    });} catch {throw new GatewayError('Midtrans belum dapat dihubungi. Cek status kembali tanpa membuat pembayaran baru.');}
    let data;try{data=await response.json();}catch{throw new GatewayError('Respons Midtrans belum dapat dibaca.');}
    if(String(data.status_code)==='404')return null;
    if(!response.ok || !['200','201','202'].includes(String(data.status_code))) {
      throw new GatewayError('Transaksi sandbox belum dapat dibuat. Periksa aktivasi QRIS pada akun Midtrans.',response.status>=500||data.status_code==='406');
    }
    return data;
  }
  async charge(order) {
    return this.request('/v2/charge',{
      payment_type:'qris',qris:{acquirer:'gopay'},
      transaction_details:{order_id:order.id,gross_amount:order.total},
      item_details:order.items.map(i=>({id:i.id,name:i.name.slice(0,50),price:i.price,quantity:i.qty})),
      customer_details:{first_name:order.customer.name,email:order.customer.email,
        ...(order.customer.phone?{phone:order.customer.phone}:{})},
      custom_expiry:{expiry_duration:15,unit:'minute'},
    });
  }
  status(id){return this.request(`/v2/${encodeURIComponent(id)}/status`);}
  cancel(id){return this.request(`/v2/${encodeURIComponent(id)}/cancel`,{});}
  validNotification(body) {
    if(!body || !/^[a-f0-9]{128}$/i.test(body.signature_key??''))return false;
    const expected=createHash('sha512').update(String(body.order_id)+String(body.status_code)+String(body.gross_amount)+this.key).digest();
    return timingSafeEqual(expected,Buffer.from(body.signature_key,'hex'));
  }
  async qr(order) {
    // Host and path are constructed here; provider-controlled URLs never become SSRF targets.
    const path=order.provider.qrPath;
    if(!/^\/v[24]\/qris\/[\w-]+\/qr-code$/.test(path??''))throw new GatewayError('Referensi QRIS tidak valid.',false);
    const url=BASE+path;
    const response=await this.fetcher(url,{headers:{Authorization:`Basic ${Buffer.from(this.key+':').toString('base64')}`},signal:AbortSignal.timeout(12000),redirect:'error'});
    if(!response.ok || !/^image\/(png|jpeg)/.test(response.headers.get('content-type')??''))throw new GatewayError('Gambar QRIS belum tersedia. Coba muat kembali.');
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>1024*1024)throw new GatewayError('Ukuran QRIS tidak valid.');
    return {bytes,type:response.headers.get('content-type').split(';')[0]};
  }
}
