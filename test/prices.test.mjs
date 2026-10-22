import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { products,offers } from '../dist/products.js';
import { validateCheckout,PaymentService } from '../server/payments.mjs';
import { MemoryStore,LocalGateway,TEST_KEY } from './support.mjs';

// Independent transcription of the approved 22 October 2026 sale-price column.
const approved=[
  ['M10','01',24218],['M07','02',78240],['M02','03',73040],
  ['M09-T01','04-T01',250446],['M09-T02','04-T02',152244],
  ['M01-T01','05-T01',398430],['M01-T02','05-T02',70538],['M01-T03','05-T03',131250],
  ['M04','06',164962],['M03','07',316138],
  ['M06-T01','08-T01',219874],['M06-T02','08-T02',147178],
  ['M05','09',78240],['M08-T01','10-T01',228010],['M08-T02','10-T02',277088],
];
const input=(items,total)=>({idempotencyKey:randomUUID(),items,expectedTotal:total,customer:{name:'Uji Harga',email:'harga@example.com',city:'Jakarta'}});

test('all 15 purchasable choices match the approved sale prices and codes exactly',()=>{
  assert.equal(products.length,10);assert.equal(offers.length,15);
  assert.deepEqual(offers.map(p=>[p.id,p.code,p.price]).sort(),[...approved].sort());
  for(const p of products)if(p.variants)assert.equal(p.price,Math.min(...p.variants.map(v=>v.price)));
});

test('checkout accepts all 15 choices and includes packaging once in their listed prices',()=>{
  const order=validateCheckout(input(approved.map(([id])=>({id,qty:1})),2609896));
  assert.equal(order.total,2609896);assert.equal(order.subtotal,2609896);assert.equal(order.shipping,0);
  assert.equal(order.items.length,15);
});

test('different types stay separate while duplicate entries for the same type merge',()=>{
  const order=validateCheckout(input([{id:'M01-T01',qty:1,price:1},{id:'M01-T02',qty:1},{id:'M01-T02',qty:1}],539506));
  assert.deepEqual(order.items.map(i=>[i.id,i.qty,i.price]),[['M01-T01',1,398430],['M01-T02',2,70538]]);
});

test('unselected, nonexistent and mismatched product types cannot be charged',()=>{
  for(const id of ['M01','M06','M08','M09','M01-T04','M02-T01']){
    assert.throws(()=>validateCheckout(input([{id,qty:1}],1)),error=>error.status===400);
  }
  assert.throws(()=>validateCheckout(input([{id:'M08-T02',qty:1}],228010)),error=>error.status===409);
});

test('the paid order and automatic receipt retain the selected type and exact approved amount',async()=>{
  const store=new MemoryStore(),gateway=new LocalGateway(store);let receiptOrder;
  const service=new PaymentService({store,gateway,key:TEST_KEY,createPdf:async order=>{receiptOrder=structuredClone(order);return Buffer.from('receipt');}});
  const created=await service.create(input([{id:'M08-T01',qty:1},{id:'M08-T02',qty:2}],782186));
  await service.notification(await gateway.setStatus(created.id,'settlement'));
  const paid=await service.status(created.id,created.accessToken);
  assert.equal(paid.status,'paid');assert.equal(paid.receiptReady,true);
  assert.equal(receiptOrder.total,782186);
  assert.deepEqual(receiptOrder.items.map(i=>[i.code,i.qty,i.price]),[['10-T01',1,228010],['10-T02',2,277088]]);
  assert.match(receiptOrder.items[1].name,/Type 02/);
});
