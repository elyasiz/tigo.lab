import { get, put, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';

export class Conflict extends Error {}

// Private records, uncached reads and ETag compare-and-swap prevent lost updates
// across serverless instances. No customer data is ever published as a blob URL.
export class BlobStore {
  async read(path) {
    try {
      const result=await get(`sandbox-v1/${path}`,{access:'private',useCache:false});
      if(!result)return null;
      return { value:JSON.parse(await new Response(result.stream).text()),version:result.blob.etag };
    } catch(error) { if(error instanceof BlobNotFoundError)return null;throw error; }
  }
  async write(path,value,version=null) {
    try {
      const result=await put(`sandbox-v1/${path}`,JSON.stringify(value),{
        access:'private',addRandomSuffix:false,contentType:'application/json',
        allowOverwrite:version!==null,...(version!==null?{ifMatch:version}:{}),
      });
      return {value,version:result.etag};
    } catch(error) {
      // SDK uses a generic BlobError for an existing immutable pathname.
      if(error instanceof BlobPreconditionFailedError || /already exists/i.test(error.message))throw new Conflict();
      throw error;
    }
  }
  async getPdf(id) {
    try {
      const result=await get(`sandbox-v1/receipts/${id}.pdf`,{access:'private',useCache:false});
      return result ? Buffer.from(await new Response(result.stream).arrayBuffer()):null;
    } catch(error) {if(error instanceof BlobNotFoundError)return null;throw error;}
  }
  async putPdf(id,bytes) {
    try {await put(`sandbox-v1/receipts/${id}.pdf`,bytes,{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/pdf'});}
    catch(error){if(!/already exists/i.test(error.message))throw error;}
  }
}

export async function mutate(store,path,change) {
  for(let attempt=0;attempt<8;attempt++) {
    const record=await store.read(path);
    const next=await change(record?.value??null);
    if(next===null)return record?.value??null;
    try {return (await store.write(path,next,record?.version??null)).value;}
    catch(error){if(!(error instanceof Conflict))throw error;}
  }
  throw new Error('Record is busy; please retry.');
}
