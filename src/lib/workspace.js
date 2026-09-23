import { reactive, readonly } from 'vue'
import api from '@/api'
import { rangeDays, toDate } from './data'
import { clock } from './demo'
const state=reactive({contacts:[],chatrooms:[],sessions:[],ready:false,loading:false,errors:{},updatedAt:null,revision:0,toast:''})
let inflight=null, generation=0, toastTimer=null
export const workspace=readonly(state)
export async function loadWorkspace(force=false){
  if(inflight&&!force)return inflight
  if(state.ready&&!force)return state
  if(force)sampleCache.clear()
  const current=++generation;state.loading=true
  inflight=(async()=>{
    const names=['contacts','chatrooms','sessions']
    const results=await Promise.allSettled([api.getContacts(),api.getChatrooms(),api.getSessions()])
    if(current!==generation)return state
    const errors={}
    results.forEach((result,i)=>{const name=names[i];if(result.status==='fulfilled')state[name]=result.value.data||[];else{errors[name]=result.reason?.message||'读取失败';state[name]=[]}})
    state.sessions.sort((a,b)=>(toDate(b.lastMessageTime)?.getTime()||0)-(toDate(a.lastMessageTime)?.getTime()||0))
    state.errors=errors;state.ready=true;state.updatedAt=clock().toISOString();return state
  })().finally(()=>{if(current===generation){state.loading=false;inflight=null}})
  return inflight
}
export function resetWorkspace(){generation++;inflight=null;Object.assign(state,{contacts:[],chatrooms:[],sessions:[],ready:false,loading:false,errors:{},updatedAt:null,revision:state.revision+1});sampleCache.clear()}
const sampleCache=new Map()
export async function loadSample(days=30,force=false){
  await loadWorkspace()
  const epoch=generation
  if(state.errors.sessions)throw new Error(state.errors.sessions)
  if(!force && sampleCache.has(days))return sampleCache.get(days)
  const sessions=state.sessions.slice(0,10), logs=[], failures=[],capped=[]
  // Bound concurrency to avoid flooding a local chatlog server.
  for(let start=0;start<sessions.length;start+=3){
    const batch=sessions.slice(start,start+3)
    const results=await Promise.allSettled(batch.map(s=>api.getChatLogs({talker:s.id||s.name,time:rangeDays(days,clock()),limit:1000})))
    results.forEach((result,i)=>{const s=batch[i];if(result.status==='fulfilled'){const items=result.value.data;logs.push(...items.map(log=>({...log,talkerId:log.talkerId||s.id,talkerName:log.talkerName||s.name,isChatRoom:s.kind==='room'})));if(items.length>=1000)capped.push(s.id)}else failures.push(s.name)})
  }
  if(sessions.length && failures.length===sessions.length)throw new Error('所选会话的消息均读取失败，请检查服务后重试。')
  const result={logs,days,sessions:sessions.length,successful:sessions.length-failures.length,failures,capped,totalSessions:state.sessions.length}
  if(epoch!==generation)throw new Error('数据连接已变更，请重新读取。')
  sampleCache.set(days,result)
  return result
}
export function notify(message){state.toast=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{state.toast=''},3000)}
export async function copyText(value){if(!value){notify('没有可复制的内容');return}try{await navigator.clipboard.writeText(String(value));notify('已复制到剪贴板')}catch(_){notify('浏览器未允许剪贴板访问，请在详情中手动复制。')}}
