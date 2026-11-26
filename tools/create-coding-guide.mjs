import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Static diagrams share a 4×4 map: start (0,3), facing north; goal (1,1).
// A turn changes heading without moving to another square.
const out = fileURLToPath(new URL('../dist/assets/coding/', import.meta.url));
await mkdir(out, {recursive:true});
const colours = {green:'#177a37',blue:'#086ccb',purple:'#7950b2',yellow:'#f8cd1a',ink:'#11172b',muted:'#526079'};
const px = col => 200 + col * 60;
const py = row => 55 + row * 60;
const marker = (col,row,east=false) => `<g transform="translate(${px(col)},${py(row)})${east?' rotate(90)':''}"><circle r="23" fill="#177a37"/><path d="M0-14 11 10 0 5-11 10Z" fill="white"/></g>`;
const star = `<path d="m260 96 5 11 13 2-9 9 2 13-11-6-11 6 2-13-9-9 13-2Z" fill="#f8cd1a" stroke="#775c04" stroke-width="2"/>`;
const line = (points,colour,dashed=false) => `<path d="${points}" fill="none" stroke="${colour}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" ${dashed?'stroke-dasharray="10 11"':''}/>`;
function board(step) {
  let result = '<rect x="165" y="20" width="250" height="250" rx="20" fill="#e8f1fb"/><rect x="170" y="25" width="240" height="240" rx="12" fill="white"/>';
  for(let i=1;i<4;i++) result += `<path d="M${170+i*60} 25V265M170 ${25+i*60}H410" stroke="#cedce9" stroke-width="2"/>`;
  result += `<rect x="232" y="87" width="56" height="56" rx="8" fill="#fff3c2"/>${star}`;
  if(step===1) result += `<path d="M200 235V115H260" fill="none" stroke="#a4bbd2" stroke-width="3" stroke-dasharray="5 8"/>`;
  if(step===2) result += `<path d="M200 235V115H260" fill="none" stroke="#a4bbd2" stroke-width="4" stroke-dasharray="5 8"/>`;
  if(step===3 || step===4) result += line('M200 235V115H260', '#086ccb');
  if(step===4) result += line('M200 115V55', '#c75234',true) + `<circle cx="200" cy="55" r="20" fill="#fff0e8"/><path d="m192 47 16 16m0-16-16 16" stroke="#b93b17" stroke-width="4" stroke-linecap="round"/>`;
  result += marker(step>=3?1:0,step>=3?1:3,step>=3);
  if(step>=3) result += `<circle cx="200" cy="235" r="9" fill="white" stroke="#177a37" stroke-width="4"/>`;
  result += `<g font-family="Arial,sans-serif" font-size="15" fill="#526079"><text x="128" y="240" text-anchor="end">Mulai</text><text x="435" y="120">Tujuan</text></g>`;
  return result;
}
function tiles(step) {
  if(step===1) return `<g transform="translate(180 324)"><circle cx="16" cy="15" r="15" fill="#177a37"/><path d="m16 5 8 16-8-4-8 4Z" fill="white"/><text x="45" y="21" font-family="Arial,sans-serif" font-size="18" fill="#526079">Tetapkan arah awal</text></g>`;
  const sequence = step===4?['Mulai','Maju','Maju','Maju','Belok','Maju']:['Mulai','Maju','Maju','Belok','Maju'];
  const gap=10, width=80, offset=(640-sequence.length*(width+gap)+gap)/2;
  return sequence.map((label,i)=>{
    const x=offset+i*(width+gap), colour=label==='Mulai'?colours.green:label==='Belok'?colours.purple:colours.blue;
    const icon=label==='Mulai'?'<path d="m31 14 21 12-21 12Z" fill="white"/>':label==='Belok'?'<path d="M28 39V22H53m-8-9 9 9-9 9" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>':'<path d="M40 41V15m-12 12 12-12 12 12" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    const cross=step===4&&i===3?'<path d="m8 6 64 62m0-62L8 68" fill="none" stroke="#b93b17" stroke-width="5" stroke-linecap="round"/><circle cx="71" cy="7" r="11" fill="#fff0e8" stroke="#b93b17" stroke-width="2"/><path d="m67 3 8 8m0-8-8 8" stroke="#b93b17" stroke-width="2"/>':'';
    return `<g transform="translate(${x} 303)"><rect y="5" width="80" height="74" rx="12" fill="${colour}" opacity=".2"/><rect width="80" height="74" rx="12" fill="${colour}"/><rect x="5" y="5" width="70" height="64" rx="9" fill="none" stroke="white" opacity=".5"/>${icon}<text x="40" y="61" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="white">${label}</text>${cross}</g>`;
  }).join('');
}
const files=['play-01-goal.svg','play-02-sequence.svg','play-03-run.svg','play-04-debug.svg'];
const titles=['Tentukan posisi awal dan tujuan','Susun urutan instruksi','Maju dua petak, belok kanan, maju satu petak','Perbaiki satu instruksi maju yang berlebih'];
for (let i=0;i<files.length;i++) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420" role="img" aria-labelledby="title"><title id="title">${titles[i]}</title><rect width="640" height="420" fill="#fff"/><circle cx="66" cy="63" r="19" fill="#edf6ff"/><text x="66" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="#005fba">0${i+1}</text>${board(i+1)}${tiles(i+1)}</svg>`;
  await writeFile(out+files[i],svg);
}
console.log('Created four static Coding guide illustrations.');
