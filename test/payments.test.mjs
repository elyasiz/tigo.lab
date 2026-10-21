import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { PaymentService,validateCheckout } from '../server/payments.mjs';
import { Midtrans,GatewayError } from '../server/midtrans.mjs';
import { paymentHandler,configuration } from '../server/http.mjs';
import { FileStore } from '../tools/local-store.mjs';
import { MemoryStore,LocalGateway,TEST_KEY,checkout } from './support.mjs';

function fixture(store=new MemoryStore(),options={}){
  const gateway=new LocalGateway(store);let clock=Date.now();
  const service=new PaymentService({store,gateway,key:TEST_KEY,now:()=>clock,createPdf:async order=>Buffer.from('verified receipt '+order.receiptId),...options});
  return {store,gateway,service,advance:ms=>{clock+=ms;}};
}
const expectStatus=status=>error=>error.status===status;

test('server recomputes prices, merges duplicate product IDs, and fixes sandbox shipping at zero',()=>{
  const value=validateCheckout(checkout({items:[{id:'M09',qty:1,price:1},{id:'M09',qty:1},{id:'M10',qty:1}]}));
  assert.equal(value.total,445000);assert.equal(value.shipping,0);assert.equal(value.items[0].price,175000);assert.equal(value.items[0].qty,2);
});
test('rejects unknown products, invalid quantities, stale totals and QRIS limit violations',()=>{
  for(const items of [[{id:'M99',qty:1}],[{id:'M01',qty:0}],[{id:'M01',qty:1.5}],[{id:'M01',qty:100}],[{id:'M01',qty:60}]])assert.throws(()=>validateCheckout(checkout({items})));
  assert.throws(()=>validateCheckout(checkout({expectedTotal:1})),expectStatus(409));
  assert.throws(()=>validateCheckout(checkout({customer:{name:'A',email:'bad',city:'X'}})),expectStatus(400));
  for(const patch of [{email:'a@b@example.com'},{phone:'--------'},{phone:'1234567890123456'}])assert.throws(()=>validateCheckout(checkout({customer:{name:'Test Buyer',email:'test@example.com',city:'Jakarta',...patch}})),expectStatus(400));
});
test('Midtrans client rejects production keys and only calls the sandbox host',async()=>{
  assert.throws(()=>new Midtrans('Mid-server-PRODUCTION','https://tigo-lab.vercel.app'));
  let observed;
  const gateway=new Midtrans(TEST_KEY,'https://tigo-lab.vercel.app',async(url,options)=>{observed={url,options};return Response.json({status_code:'201'});});
  await gateway.charge({id:'order',total:175000,items:[{id:'M09',name:'Stacker',price:175000,qty:1}],customer:{name:'Test',email:'test@example.com'}});
  assert.equal(observed.url,'https://api.sandbox.midtrans.com/v2/charge');
  assert.equal(observed.options.headers['X-Override-Notification'],'https://tigo-lab.vercel.app/api/midtrans');
  const payload=JSON.parse(observed.options.body);assert.equal(payload.payment_type,'qris');assert.equal(payload.custom_expiry.expiry_duration,15);
});
test('repeated and simultaneous create requests produce one provider transaction',async()=>{
  const {service,gateway}=fixture(),input=checkout();
  const [a,b]=await Promise.all([service.create(input,'ip'),service.create(input,'ip')]);
  const c=await service.create(input,'ip');assert.equal(a.id,b.id);assert.equal(a.id,c.id);assert.equal(a.accessToken,c.accessToken);assert.equal(gateway.created,1);
});
test('same idempotency key cannot silently change customer or items',async()=>{
  const {service,gateway}=fixture(),input=checkout();await service.create(input);
  await assert.rejects(service.create({...input,customer:{...input.customer,name:'Different'}}),expectStatus(409));assert.equal(gateway.created,1);
});
test('pending order can be recovered after a dropped browser response without storing personal data in the browser',async()=>{
  const {service}=fixture(),input=checkout(),order=await service.create(input);
  const resumed=await service.resume(input.idempotencyKey);assert.equal(resumed.id,order.id);assert.equal(resumed.accessToken,order.accessToken);
});
test('receipt and order access require the unguessable bearer capability',async()=>{
  const {service}=fixture(),order=await service.create(checkout());
  await assert.rejects(service.status(order.id,'wrong'),expectStatus(404));
  await assert.rejects(service.receipt(order.id,order.accessToken),expectStatus(409));
  await assert.rejects(service.receipt(order.id,''),expectStatus(404));
});
test('forged webhook cannot mark an order paid or produce a receipt',async()=>{
  const {service,gateway,store}=fixture(),order=await service.create(checkout());
  const body=await gateway.setStatus(order.id,'settlement');body.signature_key='0'.repeat(128);
  await assert.rejects(service.notification(body),expectStatus(403));assert.equal(store.pdfs.size,0);
  assert.equal((await service.read(order.id,order.accessToken)).status,'pending');
});
test('a valid signature with a mismatched amount, merchant, currency or payment type is rejected',async()=>{
  for(const patch of [{gross_amount:'1.00'},{gross_amount:'445000.01'},{merchant_id:'OTHER'},{currency:'USD'},{payment_type:'credit_card'}]){
    const {service,gateway,store}=fixture(),order=await service.create(checkout());
    const body=gateway.sign({...await gateway.setStatus(order.id,'settlement'),...patch});
    await assert.rejects(service.notification(body),expectStatus(422));assert.equal(store.pdfs.size,0);
  }
});
test('webhook challenges the provider status instead of trusting a success payload alone',async()=>{
  const {service,gateway,store}=fixture(),order=await service.create(checkout());
  const current=await gateway.status(order.id);
  await service.notification(gateway.sign({...current,transaction_status:'settlement',status_code:'200'}));
  assert.equal((await service.read(order.id,order.accessToken)).status,'pending');assert.equal(store.pdfs.size,0);
});
test('confirmed settlement automatically persists exactly one receipt despite repeated notifications',async()=>{
  const {service,gateway,store}=fixture(),order=await service.create(checkout());
  const notification=await gateway.setStatus(order.id,'settlement');
  await Promise.all([service.notification(notification),service.notification(notification)]);
  const paid=await service.status(order.id,order.accessToken);assert.equal(paid.status,'paid');assert.equal(paid.receiptReady,true);assert.equal(store.pdfs.size,1);
  assert.ok((await service.receipt(order.id,order.accessToken)).bytes.toString().includes(paid.receiptId));
});
test('late pending or expiry notifications do not downgrade a verified paid order',async()=>{
  const {service,gateway}=fixture(),order=await service.create(checkout());
  await service.notification(await gateway.setStatus(order.id,'settlement'));
  for(const status of ['pending','expire']){const stale=await gateway.setStatus(order.id,status);await service.apply(order.id,stale);}
  assert.equal((await service.read(order.id,order.accessToken)).status,'paid');
});
test('polling independently recovers a delayed webhook',async()=>{
  const {service,gateway,advance}=fixture(),order=await service.create(checkout());
  await gateway.setStatus(order.id,'settlement');advance(13000);
  const result=await service.status(order.id,order.accessToken);assert.equal(result.status,'paid');assert.equal(result.receiptReady,true);
});
test('expiry is confirmed by provider; the browser countdown alone does not expire or regenerate a QR',async()=>{
  const {service,gateway,advance}=fixture(),input=checkout(),order=await service.create(input);
  advance(16*60000);assert.equal((await service.status(order.id,order.accessToken)).status,'pending');
  await service.notification(await gateway.setStatus(order.id,'expire'));
  await assert.rejects(service.qr(order.id,order.accessToken),expectStatus(409));
  assert.equal((await service.create(input)).status,'expired');assert.equal(gateway.created,1);
});
test('receipt rendering failure preserves payment and retries receipt generation',async()=>{
  let failing=true;
  const {service,gateway}=fixture(new MemoryStore(),{createPdf:async()=>{if(failing)throw new Error('Temporary renderer failure');return Buffer.from('receipt');}});
  const order=await service.create(checkout());
  await assert.rejects(service.notification(await gateway.setStatus(order.id,'settlement')),expectStatus(503));
  assert.equal((await service.status(order.id,order.accessToken)).status,'paid');
  failing=false;assert.equal((await service.status(order.id,order.accessToken)).receiptReady,true);
});
test('charge timeout recovery retains the same order ID and never creates another payable transaction',async()=>{
  const {service,gateway,advance}=fixture();const charge=gateway.charge.bind(gateway);let first=true;
  gateway.charge=async order=>{const data=await charge(order);if(first){first=false;throw new GatewayError('timeout');}return data;};
  const order=await service.create(checkout());assert.equal(order.status,'creating');advance(13000);
  assert.equal((await service.status(order.id,order.accessToken)).status,'pending');assert.equal(gateway.created,1);
});
test('cancellation checks for settlement first and never discards a successful payment',async()=>{
  const {service,gateway}=fixture(),order=await service.create(checkout());
  await gateway.setStatus(order.id,'settlement');const result=await service.cancel(order.id,order.accessToken);assert.equal(result.status,'paid');
});
test('cancelled pending transaction cannot display a payable QR',async()=>{
  const {service}=fixture(),order=await service.create(checkout());
  assert.equal((await service.cancel(order.id,order.accessToken)).status,'failed');await assert.rejects(service.qr(order.id,order.accessToken),expectStatus(409));
});
test('creation is rate limited server-side before another provider charge',async()=>{
  const {service,gateway}=fixture();for(let i=0;i<12;i++)await service.create(checkout(),'same-ip');
  await assert.rejects(service.create(checkout(),'same-ip'),expectStatus(429));assert.equal(gateway.created,12);
});
test('orders and receipts survive a new server/store instance',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'tigo-payment-test-'));
  const first=fixture(new FileStore(directory));const order=await first.service.create(checkout());
  await first.service.notification(await first.gateway.setStatus(order.id,'settlement'));
  const second=fixture(new FileStore(directory));const restored=await second.service.status(order.id,order.accessToken);
  assert.equal(restored.status,'paid');assert.equal(restored.receiptReady,true);assert.ok((await second.service.receipt(order.id,order.accessToken)).bytes.length);
});
test('HTTP API enforces origin, private access, no-store and no receipt before settlement',async t=>{
  const {service}=fixture();const server=createServer(paymentHandler(()=>service,()=>({ready:true,environment:'sandbox'})));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port+'/api/payments';
  const rejected=await fetch(base+'?action=create',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:JSON.stringify(checkout())});assert.equal(rejected.status,403);
  const created=await fetch(base+'?action=create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(checkout())});const order=await created.json();
  assert.equal(created.headers.get('cache-control'),'private, no-store');
  const missing=await fetch(base+'?action=status&orderId='+order.id+'&token='+order.accessToken);assert.equal(missing.status,404);
  const pendingReceipt=await fetch(base+'?action=receipt&orderId='+order.id,{headers:{Authorization:'Bearer '+order.accessToken}});assert.equal(pendingReceipt.status,409);
});
test('public configuration never enables payments with a production key or missing storage',()=>{
  const previous={key:process.env.MIDTRANS_SERVER_KEY,store:process.env.BLOB_READ_WRITE_TOKEN};
  try{process.env.MIDTRANS_SERVER_KEY='Mid-server-real-not-allowed';process.env.BLOB_READ_WRITE_TOKEN='test';assert.equal(configuration().ready,false);
    process.env.MIDTRANS_SERVER_KEY=TEST_KEY;delete process.env.BLOB_READ_WRITE_TOKEN;assert.equal(configuration().ready,false);
  }finally{if(previous.key===undefined)delete process.env.MIDTRANS_SERVER_KEY;else process.env.MIDTRANS_SERVER_KEY=previous.key;if(previous.store===undefined)delete process.env.BLOB_READ_WRITE_TOKEN;else process.env.BLOB_READ_WRITE_TOKEN=previous.store;}
});
