// Local-only worker RPC. Files come from an explicit user file picker.
// This worker never uploads data or requests attachment URLs.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import { createStorage } from '../lib/wcdb/storage.mjs'
import { importArchive } from '../lib/wcdb/import.mjs'
import { queryList, queryMessages } from '../lib/wcdb/query.mjs'
import { queryMedia } from '../lib/wcdb/media-query.mjs'
import { statistics } from '../lib/wcdb/statistics.mjs'
import { setInfo } from '../lib/wcdb/sql.mjs'
import { fail } from '../lib/wcdb/common.mjs'

const wasmUrl=new URL('@sqlite.org/sqlite-wasm/sqlite3.wasm',import.meta.url).href
let initialization, queue=Promise.resolve()
const cancellations=new Set()
const storage=()=>initialization || (initialization=sqlite3InitModule({locateFile:()=>wasmUrl,print:()=>{},printErr:()=>{}}).then(createStorage))

self.onmessage=event=>{
  const {id,method,args={}}=event.data || {}
  if (method==='cancel') {cancellations.add(args.id);return}
  queue=queue.catch(()=>{}).then(async()=>{
    let heartbeat=0
    const check=()=>{
      if (cancellations.has(id)) fail('CANCELLED','操作已取消，已有档案未被覆盖。')
      if (Date.now()-heartbeat>1000) {heartbeat=Date.now();self.postMessage({id,event:'heartbeat'})}
    }
    try {
      check()
      const store=await storage(); check()
      let result
      switch (method) {
        case 'status': result=store.status(); break
        case 'import': result=await importArchive(store,args,progress=>self.postMessage({id,event:'progress',progress}),check); break
        case 'contacts': case 'sessions': case 'chatrooms': result=queryList(store.db,method); break
        case 'chatlog': result=queryMessages(store.db,args); break
        case 'media': result=queryMedia(store.db,args); break
        case 'statistics': result=await statistics(store.db,args,check); break
        case 'self': setInfo(store.db,'selfId',String(args.id || '').trim().slice(0,512)); result=store.status(); break
        case 'clear': result=store.clear(); break
        default: fail('METHOD','不支持的数据操作。')
      }
      self.postMessage({id,result})
    } catch (error) {
      self.postMessage({id,error:{code:error.code || 'LOCAL_DATABASE_ERROR',message:String(error.message || '本地数据库读取失败。').slice(0,400)}})
    } finally {cancellations.delete(id)}
  })
}
