import { BlobStore } from './storage.mjs';
import { Midtrans } from './midtrans.mjs';
import { PaymentService,PaymentError } from './payments.mjs';
import { createReceipt } from './receipt.mjs';

let singleton;
export function configuration(){
  const ready=!!(process.env.MIDTRANS_SERVER_KEY?.startsWith('SB-Mid-server-')&&process.env.BLOB_READ_WRITE_TOKEN);
  return {ready,environment:'sandbox',methods:['qris'],shipping:0,expiresInMinutes:15,localTest:false};
}
function service(){
  if(!configuration().ready)throw new PaymentError(503,'QRIS sandbox sedang disiapkan. Akun uji Midtrans belum terhubung.','SETUP_REQUIRED');
  const key=process.env.MIDTRANS_SERVER_KEY;
  const base=new URL(process.env.APP_BASE_URL??'https://tigo-lab.vercel.app').origin;
  if(!base.startsWith('https://'))throw new PaymentError(503,'Konfigurasi sandbox belum selesai.');
  return singleton??=new PaymentService({store:new BlobStore(),gateway:new Midtrans(key,base),key,createPdf:createReceipt});
}
export function headers(res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
}
function json(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));}
async function body(req){
  if(Number(req.headers['content-length']??0)>16000)throw new PaymentError(413,'Data checkout terlalu besar.');
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  let source=typeof req.body==='string'?req.body:null;
  if(source===null){let size=0;const chunks=[];for await(const part of req){size+=part.length;if(size>16000)throw new PaymentError(413,'Data checkout terlalu besar.');chunks.push(part);}source=Buffer.concat(chunks).toString();}
  try{return JSON.parse(source);}catch{throw new PaymentError(400,'Data permintaan tidak valid.');}
}
function checkOrigin(req){
  const origin=req.headers.origin;if(!origin)return;
  const allowed=[process.env.APP_BASE_URL??'https://tigo-lab.vercel.app',process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:null];
  if(!process.env.VERCEL)allowed.push('http://127.0.0.1:4180','http://localhost:4180');
  if(!allowed.includes(origin))throw new PaymentError(403,'Asal permintaan tidak diizinkan.');
}
function fail(res,error){
  if(error instanceof PaymentError)return json(res,error.status,{error:error.code,message:error.message});
  // Do not log payloads, customer records, request headers, or credentials.
  console.error('Payment operation failed:',error.name??'Error');
  json(res,503,{error:'TEMPORARILY_UNAVAILABLE',message:'Layanan pembayaran belum dapat dihubungi. Coba periksa status kembali.'});
}
export function paymentHandler(getService=service,getConfig=configuration){return async(req,res)=>{
  headers(res);
  try{
    const url=new URL(req.url,'https://tigo-lab.vercel.app'),action=url.searchParams.get('action')??'config';
    if(action==='config'&&req.method==='GET')return json(res,200,getConfig());
    const api=getService();
    if(action==='resume'&&req.method==='POST'){
      checkOrigin(req);return json(res,200,await api.resume((await body(req)).idempotencyKey));
    }
    if(action==='create'&&req.method==='POST'){
      checkOrigin(req);const result=await api.create(await body(req),String(req.headers['x-forwarded-for']??req.socket?.remoteAddress??'unknown').split(',')[0].trim());
      return json(res,200,result);
    }
    const id=url.searchParams.get('orderId'),authorization=req.headers.authorization??'';
    const token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
    if(action==='status'&&req.method==='GET')return json(res,200,await api.status(id,token));
    if(action==='refresh'&&req.method==='POST'){checkOrigin(req);return json(res,200,await api.status(id,token,{refresh:true}));}
    if(action==='cancel'&&req.method==='POST'){checkOrigin(req);return json(res,200,await api.cancel(id,token));}
    if(action==='qr'&&req.method==='GET'){
      const qr=await api.qr(id,token);res.setHeader('Content-Type',qr.type);res.statusCode=200;return res.end(qr.bytes);
    }
    if(action==='receipt'&&req.method==='GET'){
      const receipt=await api.receipt(id,token);res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`attachment; filename="TIGO-LAB-${receipt.id}.pdf"`);res.statusCode=200;return res.end(receipt.bytes);
    }
    res.setHeader('Allow','GET, POST');throw new PaymentError(405,'Metode permintaan tidak diizinkan.');
  }catch(error){fail(res,error);}
};}
export function webhookHandler(getService=service){return async(req,res)=>{
  headers(res);
  try{
    if(req.method!=='POST')throw new PaymentError(405,'Gunakan POST.');
    return json(res,200,await getService().notification(await body(req)));
  }catch(error){fail(res,error);}
};}
