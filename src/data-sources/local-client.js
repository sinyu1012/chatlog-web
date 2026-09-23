import { reactive, toRaw } from 'vue'

export const localState=reactive({ready:false,archiveId:null,report:null,selfId:'',storage:'opfs',importing:false,progress:null,error:''})
let worker,sequence=0,importId=null,cancelTimer
const pending=new Map()

// Vue proxies cannot be structured-cloned. Unwrap nested query arrays while
// preserving native File/Blob objects instead of serializing file bytes as JSON.
export function toWorkerData(value,seen=new WeakMap()) {
  const raw=toRaw(value)
  if (!raw || typeof raw!=='object') return raw
  const prototype=Object.getPrototypeOf(raw)
  if (!Array.isArray(raw) && prototype!==Object.prototype && prototype!==null) return raw
  if (seen.has(raw)) return seen.get(raw)
  const result=Array.isArray(raw)?[]:Object.create(null)
  seen.set(raw,result)
  for (const [key,item] of Object.entries(raw)) result[key]=toWorkerData(item,seen)
  return result
}
export function stopLocal(reason='本地数据源已关闭。') {
  worker?.terminate();worker=null
  clearTimeout(cancelTimer)
  for (const request of pending.values()) {clearTimeout(request.timer);request.reject(new Error(reason))}
  pending.clear();importId=null;localState.importing=false
}
function arm(request) {
  clearTimeout(request.timer)
  request.timer=setTimeout(()=>stopLocal('本地读取长时间无响应，已停止。可重试，原文件不会修改。'),45000)
}
function ensureWorker() {
  if (worker) return worker
  if (!globalThis.isSecureContext || !navigator.storage?.getDirectory) throw new Error('本地导入需要 HTTPS 或 localhost 和支持 OPFS 的浏览器。')
  worker=new Worker(new URL('../workers/wcdb.worker.js',import.meta.url),{type:'module',name:'chatlog-local-archive'})
  worker.onmessage=event=>{
    const message=event.data, request=pending.get(message.id)
    if (!request) return
    for (const queued of pending.values()) arm(queued)
    if (message.event==='heartbeat') return
    if (message.event==='progress') {localState.progress=message.progress;return}
    pending.delete(message.id);clearTimeout(request.timer)
    if (message.error) {
      const error=new Error(message.error.message);error.code=message.error.code
      localState.error=error.message;request.reject(error)
    } else {
      if (typeof message.result?.ready==='boolean') Object.assign(localState,message.result)
      request.resolve(message.result)
    }
  }
  worker.onerror=event=>{event.preventDefault();stopLocal('本地解析模块加载失败，请刷新或检查站点的 WASM 资源。')}
  worker.onmessageerror=()=>stopLocal('无法传递所选文件，请重新选择。')
  return worker
}
export function localRequest(method,args={}) {
  return new Promise((resolve,reject)=>{
    try {
      const target=ensureWorker(),id=++sequence,request={resolve,reject,method,timer:null}
      pending.set(id,request);arm(request)
      if (method==='import') importId=id
      try {target.postMessage({id,method,args:toWorkerData(args)})} catch (error) {pending.delete(id);clearTimeout(request.timer);reject(error)}
    } catch (error) {reject(error)}
  })
}
export async function importLocal(files,options) {
  if (localState.importing) throw new Error('已有导入任务正在进行。')
  localState.importing=true;localState.error='';localState.progress=null
  try {
    return await localRequest('import',{...options,files:Array.from(files).map(file=>({file,path:file.webkitRelativePath || file.name}))})
  } finally {clearTimeout(cancelTimer);importId=null;localState.importing=false}
}
export function cancelImport() {
  if (!importId) return
  worker?.postMessage({method:'cancel',args:{id:importId}})
  cancelTimer=setTimeout(()=>{if(importId)stopLocal('导入已停止；下次打开时会清理未完成的临时索引。')},8000)
}
