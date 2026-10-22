import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { products,offers,restoreCart,legacyProductId } from '../dist/products.js';
import { validateCheckout,PaymentService } from '../server/payments.mjs';
import { MemoryStore,LocalGateway,TEST_KEY } from './support.mjs';

// Revised PDF: all types belonging to a product form one complete set.
const approved=[
  ['M10','P01',24218],['M07','P02',78240],['M02','P03',73040],
  ['M09','P04',387690],['M01','P05',570218],['M04','P06',164962],
  ['M03','P07',316138],['M06','P08',352054],['M05','P09',78240],['M08','P10',490100],
];
const input=(items,total)=>({idempotencyKey:randomUUID(),items,expectedTotal:total,customer:{name:'Uji Harga',email:'harga@example.com',city:'Jakarta'}});

test('all 10 complete sets match the revised sale prices and product codes exactly',()=>{
  assert.equal(products.length,10);assert.equal(offers.length,10);
  assert.deepEqual(offers.map(p=>[p.id,p.code,p.price]).sort(),[...approved].sort());
  assert.ok(products.every(p=>!p.variants));
});

test('one of each complete set totals the revised listed prices with packaging included once',()=>{
  const order=validateCheckout(input(approved.map(([id])=>({id,qty:1})),2534900));
  assert.equal(order.total,2534900);assert.equal(order.subtotal,2534900);assert.equal(order.shipping,0);
  assert.equal(order.items.length,10);
});

test('server ignores client prices and merges duplicate quantities for the same complete set',()=>{
  const order=validateCheckout(input([{id:'M01',qty:1,price:1},{id:'M01',qty:1},{id:'M10',qty:1}],1164654));
  assert.deepEqual(order.items.map(i=>[i.id,i.qty,i.price]),[['M01',2,570218],['M10',1,24218]]);
});

test('obsolete separate-type IDs and superseded totals cannot be charged',()=>{
  for(const id of ['M01-T01','M01-T02','M01-T03','M06-T01','M06-T02','M08-T01','M08-T02','M09-T01','M09-T02']){
    assert.throws(()=>validateCheckout(input([{id,qty:1}],1)),error=>error.status===400);
  }
  assert.throws(()=>validateCheckout(input([{id:'M09',qty:1}],152244)),error=>error.status===409);
});

test('old cart types are preserved for review without converting their quantities to full sets',()=>{
  const previous=[{id:'M01-T02',qty:2},{id:'M01-T03',qty:1},{id:'M10',qty:1}];
  assert.deepEqual(restoreCart(previous),previous);
  assert.equal(legacyProductId('M01-T02'),'M01');
  assert.equal(legacyProductId('M01-T99'),null);
  assert.deepEqual(restoreCart([{id:'M01-T99',qty:1},{id:'M09',qty:2},{id:'M10',qty:0}]),[{id:'M09',qty:2}]);
  assert.throws(()=>validateCheckout(input(restoreCart(previous),1)),error=>error.status===400);
});

test('paid order and automatic receipt retain the revised complete-set price and code',async()=>{
  const store=new MemoryStore(),gateway=new LocalGateway(store);let receiptOrder;
  const service=new PaymentService({store,gateway,key:TEST_KEY,createPdf:async order=>{receiptOrder=structuredClone(order);return Buffer.from('receipt');}});
  const created=await service.create(input([{id:'M08',qty:2}],980200));
  await service.notification(await gateway.setStatus(created.id,'settlement'));
  const paid=await service.status(created.id,created.accessToken);
  assert.equal(paid.status,'paid');assert.equal(paid.receiptReady,true);
  assert.equal(receiptOrder.total,980200);
  assert.deepEqual(receiptOrder.items.map(i=>[i.code,i.qty,i.price]),[['P10',2,490100]]);
  assert.doesNotMatch(receiptOrder.items[0].name,/Type/);
});
