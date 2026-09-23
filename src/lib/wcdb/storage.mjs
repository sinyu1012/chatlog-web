import { fail } from './common.mjs'
import { configure, rows, exec, getInfo } from './sql.mjs'
import { inspectHeader } from './input.mjs'

export async function createStorage(sqlite) {
  if (!globalThis.isSecureContext || !navigator.storage?.getDirectory) fail('OPFS_UNAVAILABLE','本地档案需要 HTTPS 或 localhost，以及支持 OPFS 的浏览器。不会退回到上传数据。')
  let pool
  try { pool=await sqlite.installOpfsSAHPoolVfs({name:'chatlog-local-v1',directory:'.chatlog-local-v1',initialCapacity:12}) }
  catch (_) { fail('OPFS_LOCKED','无法打开本地存储。请关闭其他正在使用本地档案的标签页，并检查浏览器存储权限。') }
  await pool.reserveMinimumCapacity(12)
  const open=(path,readOnly=false)=>{const db=new pool.OpfsSAHPoolDb(path,readOnly?'r':'c');configure(sqlite,db,readOnly);return db}
  const catalog=open('/catalog.db')
  exec(catalog,'CREATE TABLE IF NOT EXISTS catalog(key TEXT PRIMARY KEY,value TEXT)')
  let active=rows(catalog,"SELECT value FROM catalog WHERE key='active'")[0]?.value || ''
  for (const path of pool.getFileNames()) {
    if (path!=='/catalog.db' && path!==active && !path.endsWith('-journal')) pool.unlink(path)
  }
  let current=active?open(active):null
  const status=()=>({ready:!!current,archiveId:current?getInfo(current,'archiveId'):null,report:current?getInfo(current,'report'):null,selfId:current?getInfo(current,'selfId') || '':'',storage:'opfs'})
  return {
    pool,open,status,
    get db() { if (!current) fail('NO_ARCHIVE','尚未导入本地数据库。请在数据来源中导入。'); return current },
    async withInput(file,callback,check) {
      inspectHeader(new Uint8Array(await file.slice(0,100).arrayBuffer())); check()
      const reader=file.stream().getReader(); let input=null
      try {
        await pool.importDb('/incoming.db',async()=>{check();const {value,done}=await reader.read();return done?undefined:value})
        input=open('/incoming.db',true)
        const validation=rows(input,'PRAGMA quick_check(1)')
        if (!validation.length || Object.values(validation[0])[0]!=='ok') fail('CORRUPT_DATABASE','SQLite 完整性检查未通过。')
        return await callback(input)
      } finally {
        try { await reader.cancel() } catch (_) { /* Reader may already be closed. */ }
        reader.releaseLock(); input?.close(); pool.unlink('/incoming.db')
      }
    },
    publish(path,db) {
      exec(catalog,"INSERT OR REPLACE INTO catalog VALUES ('active',?)",[path])
      const previous=active
      current?.close(); current=db; active=path
      if (previous && previous!==path) pool.unlink(previous)
      return status()
    },
    clear() {
      exec(catalog,"DELETE FROM catalog WHERE key='active'")
      current?.close(); current=null; active=''
      for (const path of pool.getFileNames()) if (path!=='/catalog.db') pool.unlink(path)
      return status()
    }
  }
}
