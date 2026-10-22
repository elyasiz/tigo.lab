import { mkdir,writeFile } from 'node:fs/promises';
import { offers } from '../dist/products.js';
import { createReceipt } from '../server/receipt.mjs';
import { PDFDocument } from 'pdf-lib';

const items=offers.map((p,i)=>({id:p.id,code:p.code,name:p.name,price:p.price,qty:i%3+1}));
const total=items.reduce((sum,i)=>sum+i.price*i.qty,0);
const order={id:'TIGO-SBX-0123456789abcdef01234567',receiptId:'SBX-89ABCDEF0123',items,total,subtotal:total,shipping:0,
  customer:{name:'Sekolah Ceria Indonesia',email:'uji@example.com',phone:'081234567890',city:'Jakarta'},
  paidAt:'2026-10-22T03:15:00.000Z',provider:{transactionId:'6f8439c2-16d6-487a-9ee0-d6c7edf4d524'},localTest:true};
if(process.argv.includes('--stress'))order.customer={...order.customer,name:'W'.repeat(80),email:'w'.repeat(140)+'@example.com',city:'Jakarta '.repeat(10).trim()};
const bytes=await createReceipt(order);const pdf=await PDFDocument.load(bytes);
if(pdf.getPageCount()>(process.argv.includes('--stress')?2:1))throw new Error('Unexpected complete-set receipt pagination');
await mkdir(new URL('../tmp/pdfs/',import.meta.url),{recursive:true});
await writeFile(new URL('../tmp/pdfs/tigo-sandbox-receipt-qa.pdf',import.meta.url),bytes);
console.log(`Receipt QA: ${items.length} products, ${total} IDR, ${bytes.length} bytes, ${pdf.getPageCount()} page.`);
