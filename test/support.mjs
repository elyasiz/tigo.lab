import { randomUUID,createHash } from 'node:crypto';
import QRCode from 'qrcode';
import { Conflict,mutate } from '../server/storage.mjs';
import { Midtrans } from '../server/midtrans.mjs';

export const TEST_KEY='SB-Mid-server-LOCAL-TEST-ONLY-NOT-A-CREDENTIAL';
export class MemoryStore {
  constructor(){this.records=new Map();this.pdfs=new Map();}
  async read(path){return structuredClone(this.records.get(path)??null);}
  async write(path,value,version=null){const current=this.records.get(path);if((current?.version??null)!==version)throw new Conflict();const next={value:structuredClone(value),version:(current?.version??0)+1};this.records.set(path,next);return structuredClone(next);}
  async getPdf(id){return this.pdfs.get(id)??null;}
  async putPdf(id,bytes){if(!this.pdfs.has(id))this.pdfs.set(id,bytes);}
}

// HTTP contract double: uses the real Midtrans client, signature verifier and
// server state machine. It is imported by tests/local CLI only, never the APIs.
export class LocalGateway extends Midtrans {
  constructor(store){super(TEST_KEY,'http://127.0.0.1:4180');this.store=store;this.fetcher=this.respond.bind(this);this.isTestDouble=true;this.chargeCalls=0;this.created=0;}
  async respond(input,options={}){
    const url=new URL(input);
    if(url.origin!=='https://api.sandbox.midtrans.com')throw new Error('Unexpected gateway host');
    if(url.pathname.includes('/qris/')&&url.pathname.endsWith('/qr-code'))return new Response(await QRCode.toBuffer('LOCAL TEST ONLY - NOT A PAYMENT CODE',{width:360,margin:4}),{headers:{'Content-Type':'image/png'}});
    if(url.pathname==='/v2/charge'){
      this.chargeCalls++;const request=JSON.parse(options.body);const id=request.transaction_details.order_id;
      if(await this.store.read(`provider/${id}.json`))return Response.json({status_code:'406',status_message:'Duplicate order ID'});
      const item={status_code:'201',order_id:id,transaction_id:randomUUID(),gross_amount:request.transaction_details.gross_amount.toFixed(2),currency:'IDR',payment_type:'qris',merchant_id:'LOCAL-TEST-MERCHANT',transaction_status:'pending',fraud_status:'accept',transaction_time:new Date().toISOString(),expiry_time:new Date(Date.now()+900000).toISOString()};
      await this.store.write(`provider/${id}.json`,item);this.created++;return Response.json(item);
    }
    const match=url.pathname.match(/^\/v2\/([^/]+)\/(status|cancel)$/);
    if(match){const id=decodeURIComponent(match[1]);if(match[2]==='cancel')await this.setStatus(id,'cancel');const record=await this.store.read(`provider/${id}.json`);return Response.json(record?.value??{status_code:'404'});}
    return Response.json({status_code:'400'},{status:400});
  }
  async setStatus(id,status){
    const result=await mutate(this.store,`provider/${id}.json`,current=>{
      if(!current)throw new Error('Unknown local transaction');
      return {...current,transaction_status:status,status_code:status==='pending'?'201':'200',...(status==='settlement'?{settlement_time:new Date().toISOString()}:{})};
    });
    return this.sign(result);
  }
  sign(value){const body=structuredClone(value);body.signature_key=createHash('sha512').update(body.order_id+body.status_code+body.gross_amount+TEST_KEY).digest('hex');return body;}
}
export function checkout(overrides={}){return {idempotencyKey:randomUUID(),expectedTotal:525110,items:[{id:'M09-T01',qty:2},{id:'M10',qty:1}],customer:{name:'Sekolah Ceria',email:'uji@example.com',phone:'081234567890',city:'Jakarta'},...overrides};}
