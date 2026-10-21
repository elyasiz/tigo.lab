// Local development/test adapter. Production imports only BlobStore.
import { mkdir,readFile,writeFile,rename,open,unlink } from 'node:fs/promises';
import { resolve,dirname,sep } from 'node:path';
import { Conflict } from '../server/storage.mjs';

export class FileStore {
  constructor(directory){this.directory=resolve(directory);}
  file(path){const target=resolve(this.directory,path);if(!target.startsWith(this.directory+sep))throw new Error('Invalid record path');return target;}
  async read(path){try{return JSON.parse(await readFile(this.file(path),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
  async write(path,value,version=null){
    const file=this.file(path);await mkdir(dirname(file),{recursive:true});
    let lock;
    try{lock=await open(file+'.lock','wx');}catch(error){if(error.code==='EEXIST')throw new Conflict();throw error;}
    try{
      const current=await this.read(path);
      if((current?.version??null)!==version)throw new Conflict();
      const record={value,version:(current?.version??0)+1};
      await writeFile(file+'.tmp',JSON.stringify(record));await rename(file+'.tmp',file);return record;
    }finally{await lock.close();await unlink(file+'.lock');}
  }
  async getPdf(id){try{return await readFile(this.file(`receipts/${id}.pdf`));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
  async putPdf(id,bytes){const file=this.file(`receipts/${id}.pdf`);await mkdir(dirname(file),{recursive:true});try{await writeFile(file,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}}
}
