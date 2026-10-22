import { readFile } from 'node:fs/promises';
import { PDFDocument,rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const currency=n=>'Rp'+new Intl.NumberFormat('id-ID').format(n);
const time=value=>new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'long',timeStyle:'short'}).format(new Date(value))+' WIB';
const color=hex=>rgb(...hex.match(/\w\w/g).map(v=>parseInt(v,16)/255));
const INK=color('11172b'),MUTED=color('526079'),BLUE=color('0088ff'),ORANGE=color('ff5a2b'),YELLOW=color('f8cd1a'),CREAM=color('fff3e0'),LINE=color('dce6f2');
let files;
function assets(){return files??=Promise.all(['fredoka-600.ttf','nunito-400.ttf','nunito-700.ttf','tigo-logo.png'].map(name=>readFile(new URL('./assets/'+name,import.meta.url))));}

export async function createReceipt(order){
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const [headingBytes,bodyBytes,boldBytes,logoBytes]=await assets();
  const [heading,body,bold,logo]=await Promise.all([pdf.embedFont(headingBytes,{subset:true}),pdf.embedFont(bodyBytes,{subset:true}),pdf.embedFont(boldBytes,{subset:true}),pdf.embedPng(logoBytes)]);
  pdf.setTitle(`Bukti pembayaran sandbox ${order.receiptId}`);
  pdf.setAuthor('TIGO LAB');pdf.setSubject('Pengujian QRIS sandbox - tidak ada uang nyata');
  pdf.setCreationDate(new Date(order.paidAt));pdf.setModificationDate(new Date(order.paidAt));
  let page=pdf.addPage([595.28,841.89]);const right=551;
  const charsets=new Map();
  const plain=(font,value)=>{if(!charsets.has(font))charsets.set(font,new Set(font.getCharacterSet()));return [...String(value)].map(c=>charsets.get(font).has(c.codePointAt(0))?c:'?').join('');};
  const text=(value,x,y,size=10,font=body,fill=INK)=>{
    page.drawText(plain(font,value),{x,y,size,font,color:fill});
  };
  function wrap(value,width,size,font){
    const lines=[];let current='';
    for(const char of plain(font,value)){
      if(current&&font.widthOfTextAtSize(current+char,size)>width){
        const space=current.lastIndexOf(' ');
        if(space>current.length/2){lines.push(current.slice(0,space));current=current.slice(space+1)+char;}
        else {lines.push(current);current=char;}
      }else current+=char;
    }
    if(current)lines.push(current);return lines;
  }
  function paragraph(value,x,y,width,size,font=body,fill=INK){for(const row of wrap(value,width,size,font)){text(row,x,y,size,font,fill);y-=size+3;}return y;}
  const alignRight=(value,x,y,size=10,font=body,fill=INK)=>text(value,x-font.widthOfTextAtSize(value,size),y,size,font,fill);
  const line=(y)=>page.drawLine({start:{x:44,y},end:{x:right,y},thickness:.7,color:LINE});
  page.drawImage(logo,{x:44,y:754,width:174,height:53.2});
  page.drawRectangle({x:418,y:780,width:133,height:22,color:CREAM});
  text(order.localTest?'UJI LOKAL':'MIDTRANS SANDBOX',428,787,9,bold);
  text('Bukti pembayaran uji',44,718,25,heading);
  page.drawRectangle({x:44,y:681,width:158,height:25,color:color('eafaf0')});
  text('LUNAS - SANDBOX',55,690,11,bold,color('14783b'));
  text('Nomor bukti',44,655,9,body,MUTED);text(order.receiptId,44,639,11,bold);
  text('Nomor pesanan',302,655,9,body,MUTED);text(order.id,302,639,9,bold);
  text('Penerima / data pengujian',44,610,9,body,MUTED);
  let leftY=paragraph(order.customer.name,44,593,270,11,bold);
  leftY=paragraph(order.customer.email,44,leftY-2,270,9,body,MUTED);
  text('Kota',338,610,9,body,MUTED);
  let rightY=paragraph(order.customer.city,338,593,213,11,bold);
  if(order.customer.phone)rightY=paragraph(order.customer.phone,338,rightY-2,213,9,body,MUTED);
  function tableHeader(y){
    page.drawRectangle({x:44,y,width:507,height:25,color:color('edf6ff')});
    text('PRODUK',53,y+9,9,bold);text('QTY',328,y+9,9,bold);
    alignRight('HARGA SATUAN',445,y+9,9,bold);alignRight('JUMLAH',right-8,y+9,9,bold);
    return y-20;
  }
  function nextPage(label,table=true){
    page=pdf.addPage([595.28,841.89]);page.drawImage(logo,{x:44,y:760,width:130,height:39.7});
    text(label,44,726,20,heading);text(order.id,44,705,9,body,MUTED);
    return table?tableHeader(663):665;
  }
  let y=tableHeader(Math.min(leftY,rightY)-22);
  for(const item of order.items){
    if(y<240)y=nextPage('Rincian pesanan uji (lanjutan)');
    text(item.name,53,y,10,bold);text(item.code??item.id,53,y-12,8,body,MUTED);
    text(String(item.qty),335,y,10,body);
    alignRight(currency(item.price),445,y,10);alignRight(currency(item.price*item.qty),right-8,y,10,bold);
    line(y-18);y-=30;
  }
  y-=14;
  if(y<205)y=nextPage('Ringkasan pembayaran uji',false);
  text('Dibayar melalui QRIS sandbox',44,y,10,bold);
  text(time(order.paidAt),44,y-17,9,body,MUTED);
  text('Referensi transaksi',44,y-39,8,body,MUTED);
  text(order.provider.transactionId,44,y-53,8,body,MUTED);
  text('Subtotal',361,y,10);alignRight(currency(order.subtotal),right,y,10,bold);
  text('Ongkir simulasi',361,y-22,10);alignRight(currency(order.shipping),right,y-22,10);
  page.drawRectangle({x:350,y:y-67,width:201,height:30,color:CREAM});
  text('TOTAL',360,y-56,11,bold);alignRight(currency(order.total),right-10,y-56,14,bold);
  for(const [index,receiptPage]of pdf.getPages().entries()){
    page=receiptPage;
    page.drawRectangle({x:44,y:68,width:507,height:60,color:CREAM});
    text(order.localTest?'HASIL PENGUJIAN LOKAL - BUKAN TRANSAKSI MIDTRANS':'PENGUJIAN SANDBOX - TIDAK ADA UANG NYATA',55,109,10,bold);
    text('Tidak ada pengiriman barang. Dokumen ini bukan bukti penerimaan uang',55,91,9,body,MUTED);
    text('sungguhan dan bukan faktur pajak.',55,77,9,body,MUTED);
    text('TIGO LAB  |  Bermain. Mencoba. Menemukan.',44,43,9,body,MUTED);
    alignRight(`${index+1} / ${pdf.getPageCount()}`,right,43,9,body,MUTED);
    for(const [i,c]of [BLUE,ORANGE,YELLOW].entries())page.drawRectangle({x:i*595.28/3,y:0,width:595.28/3,height:6,color:c});
  }
  return Buffer.from(await pdf.save());
}
