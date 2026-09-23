import { parseList, parseChatLogs, normalizeContact, normalizeRoom, normalizeSession, safeUrl } from '@/lib/data'
import { demoEnabled, demoQuery } from '@/lib/demo'
const key='chatlog-ui-api-base'
export function getApiBase(){
  let saved=null;try{saved=localStorage.getItem(key)}catch(_){/* Storage may be blocked. */}
  const base=saved!==null?saved:(process.env.VUE_APP_API_BASE_URL || (process.env.NODE_ENV==='production'?'http://127.0.0.1:5030':''))
  return base.replace(/\/+$/,'')
}
export function setApiBase(value){
  const base=String(value||'').trim().replace(/\/+$/,'')
  if(base){if(!/^https?:\/\//i.test(base))throw new Error('服务地址必须以 http:// 或 https:// 开头。');const safe=safeUrl(base);if(!safe)throw new Error('请输入有效的 HTTP 或 HTTPS 服务地址。');const parsed=new URL(safe);if(parsed.search||parsed.hash)throw new Error('服务地址不能包含查询参数或锚点。')}
  localStorage.setItem(key,base)
}
export function resolvedApiBase(){return getApiBase() || (typeof location!=='undefined' && location.origin!=='null'?location.origin:'http://localhost')}
async function request(path,params={}){
  const query=new URLSearchParams()
  for(const [k,v] of Object.entries(params))if(v!==''&&v!=null)query.set(k,String(v))
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),12000)
  try{
    const response=await fetch(`${getApiBase()}${path}${query.size?'?'+query:''}`,{signal:controller.signal,credentials:'omit',cache:'no-store',headers:{Accept:'application/json, text/csv, text/plain'}})
    if(!response.ok)throw new Error(`服务返回 HTTP ${response.status}，请检查服务地址和访问权限。`)
    const raw=await response.text()
    if(response.headers.get('content-type')?.includes('text/html') || /^\s*<!doctype html/i.test(raw))throw new Error('收到网页而不是数据，请检查 API 代理与服务地址。')
    let data=raw;try{data=JSON.parse(raw)}catch(_){/* Text and CSV are valid legacy formats. */}
    return {data,headers:Object.fromEntries(response.headers.entries()),status:response.status}
  }catch(error){if(error.name==='AbortError')throw new Error('连接超时，请确认 chatlog 服务已启动。');throw error}finally{clearTimeout(timeout)}
}
const list=async(kind,path,normalize)=>{const result=demoEnabled?await demoQuery(kind):await request(path,{format:'json'});return {...result,data:parseList(result.data,kind).map(normalize)}}
export default {
  getContacts:()=>list('contacts','/api/v1/contact',normalizeContact),
  getChatrooms:()=>list('chatrooms','/api/v1/chatroom',normalizeRoom),
  getSessions:()=>list('sessions','/api/v1/session',normalizeSession),
  async getChatLogs(params={}){const result=demoEnabled?await demoQuery('chatlog',params):await request('/api/v1/chatlog',{...params,format:'json'});const total=result.headers['x-total-count'] ?? result.data?.total ?? result.data?.count;return {...result,data:parseChatLogs(result.data),total:total!=null&&total!==''&&Number.isInteger(Number(total))&&Number(total)>=0?Number(total):null}},
  getChatLogsRaw:(params={})=>demoEnabled?demoQuery('chatlog',params):request('/api/v1/chatlog',params),
  exportChatLogs:(params={})=>demoEnabled?demoQuery('chatlog',params):request('/api/v1/chatlog',{...params,format:'csv'}),
  getImageUrl:id=>`${getApiBase()}/image/${encodeURIComponent(id)}`,
  getVideoUrl:id=>`${getApiBase()}/video/${encodeURIComponent(id)}`,
  getVoiceUrl:id=>`${getApiBase()}/voice/${encodeURIComponent(id)}`,
  getFileUrl:id=>`${getApiBase()}/file/${encodeURIComponent(id)}`,
  getDataUrl:path=>`${getApiBase()}/data/${String(path).split('/').map(encodeURIComponent).join('/')}`
}
