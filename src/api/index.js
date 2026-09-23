import http from './http'
import { isLocal } from '@/data-sources/source'
import { localRequest } from '@/data-sources/local-client'
import { csvString } from '@/lib/data'
export * from './http'

const fields=[{key:'senderName',label:'发送者'},{key:'time',label:'时间'},{key:'content',label:'内容'},{key:'talkerId',label:'会话 ID'},{key:'id',label:'消息 ID'},{key:'decodeStatus',label:'解析状态'}]
async function localRaw(params={}) {
  const result=await localRequest('chatlog',params)
  if (params.format==='csv') return {...result,data:csvString(result.data,fields)}
  if (params.format==='text') return {...result,data:result.data.map(row=>`${row.senderName}(${row.senderId}) ${row.time || '时间未知'}\n${row.content}`).join('\n\n')}
  return result
}
export default {
  ...http,
  getContacts:()=>isLocal.value?localRequest('contacts'):http.getContacts(),
  getChatrooms:()=>isLocal.value?localRequest('chatrooms'):http.getChatrooms(),
  getSessions:()=>isLocal.value?localRequest('sessions'):http.getSessions(),
  getChatLogs:(params={})=>isLocal.value?localRequest('chatlog',params):http.getChatLogs(params),
  getChatLogsRaw:(params={})=>isLocal.value?localRaw(params):http.getChatLogsRaw(params),
  exportChatLogs:(params={})=>isLocal.value?localRaw({...params,format:'csv'}):http.exportChatLogs(params),
  getLocalAnalysis:(params={})=>localRequest('statistics',params),
  getLocalMedia:(params={})=>localRequest('media',params)
}
