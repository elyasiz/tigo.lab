import { createServer } from 'node:http';
import { stat,readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve,extname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paymentHandler,webhookHandler,configuration } from '../server/http.mjs';
import { PaymentService } from '../server/payments.mjs';
import { createReceipt } from '../server/receipt.mjs';
import { FileStore } from './local-store.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url))),dist=resolve(root,'dist');
const fixtures=process.argv.includes('--fixtures');
if(process.env.VERCEL)throw new Error('The local dev server cannot run on Vercel.');
const port=Number(process.env.PORT??4180);
let local,gateway;
if(fixtures){
  const {LocalGateway,TEST_KEY}=await import('../test/support.mjs');
  const store=new FileStore(resolve(root,'tmp/local-payment-fixtures'));gateway=new LocalGateway(store);
  local=new PaymentService({store,gateway,key:TEST_KEY,createPdf:createReceipt});
}
const payments=fixtures?paymentHandler(()=>local,()=>({...configuration(),ready:true,localTest:true})):paymentHandler();
const webhook=fixtures?webhookHandler(()=>local):webhookHandler();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/api/payments')return payments(req,res);
    if(url.pathname==='/api/midtrans')return webhook(req,res);
    if(fixtures&&url.pathname==='/__test/simulator'){
      const id=url.searchParams.get('orderId');if(!/^TIGO-SBX-[a-f0-9]{24}$/.test(id??'')){res.writeHead(400);return res.end();}
      res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(`<!doctype html><html lang="id"><meta name="viewport" content="width=device-width"><title>Simulator pengujian lokal</title><style>body{font:16px Arial;max-width:620px;margin:80px auto;padding:20px;line-height:1.7}button{padding:14px;margin:6px;border-radius:8px}</style><h1>Simulator pengujian lokal</h1><p><strong>Bukan transaksi Midtrans. Tidak ada uang nyata.</strong></p><p>${id}</p><form method="POST" action="/__test/simulate"><input type="hidden" name="orderId" value="${id}"><button name="status" value="settlement">Simulasikan lunas</button><button name="status" value="expire">Simulasikan kedaluwarsa</button><button name="status" value="deny">Simulasikan ditolak</button></form></html>`);
    }
    if(fixtures&&url.pathname==='/__test/simulate'&&req.method==='POST'){
      let source='';for await(const part of req){source+=part;if(source.length>2000)throw new Error('Too large');}
      const form=new URLSearchParams(source),id=form.get('orderId'),status=form.get('status');
      if(!/^TIGO-SBX-[a-f0-9]{24}$/.test(id??'')||!['settlement','expire','deny'].includes(status))throw new Error('Invalid local scenario');
      await local.notification(await gateway.setStatus(id,status));res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<h1>Pengujian lokal selesai</h1><p>Kembali ke tab TIGO LAB dan klik Cek status pembayaran.</p>');
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
    const file=resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(dist+sep)){res.writeHead(403);return res.end();}
    const info=await stat(file);if(!info.isFile()){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){const start=Number(range[1]),end=Math.min(Number(range[2]||info.size-1),info.size-1);if(start>end||start>=info.size){res.writeHead(416);return res.end();}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1});return req.method==='HEAD'?res.end():createReadStream(file,{start,end}).pipe(res);}
    res.setHeader('Content-Length',info.size);res.setHeader('Cache-Control','no-store');
    return req.method==='HEAD'?res.end():createReadStream(file).pipe(res);
  }catch(error){res.statusCode=error.code==='ENOENT'?404:500;res.end('Local request failed.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/ (${fixtures?'LOCAL TEST DOUBLE, NOT MIDTRANS':'sandbox configuration required'})`));
