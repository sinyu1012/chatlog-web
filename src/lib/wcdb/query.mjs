import { fail } from './common.mjs'
import { rows, getInfo } from './sql.mjs'
import { conditions, pageBounds } from './filters.mjs'

export function mapMessage(row,selfId) {
  const isSelf=selfId?row.senderId===selfId:row.outgoing===1
  return {...row,time:row.timeMs?new Date(row.timeMs).toISOString():null,isSelf,senderName:isSelf?'我':row.senderName,attachments:row.attachment?[JSON.parse(row.attachment)]:[],source:'local-wcdb',type:row.kind}
}
export function queryMessages(db,params={}) {
  const where=conditions(params), {limit,offset}=pageBounds(params), selfId=getInfo(db,'selfId')
  const total=rows(db,'SELECT COUNT(*) n FROM messages WHERE '+where.sql,where.bind)[0].n
  const data=rows(db,'SELECT messages.*,COALESCE((SELECT name FROM sessions WHERE id=messages.talkerId),talkerId) AS talkerName FROM messages WHERE '+where.sql+' ORDER BY timeMs,sortSeq,id LIMIT ? OFFSET ?',[...where.bind,limit,offset]).map(row=>mapMessage(row,selfId))
  return {data,total,headers:{'x-total-count':String(total)},status:200}
}
export function queryList(db,kind) {
  let data
  if (kind==='contacts') data=rows(db,"SELECT *,'contact' AS kind FROM contacts WHERE id NOT LIKE '%@chatroom' ORDER BY name,id")
  else if (kind==='sessions') data=rows(db,'SELECT * FROM sessions ORDER BY lastMs DESC,id').map(row=>({...row,lastMessageTime:row.lastMs?new Date(row.lastMs).toISOString():null}))
  else if (kind==='chatrooms') data=rows(db,"WITH ids AS (SELECT id FROM contacts WHERE id LIKE '%@chatroom' UNION SELECT id FROM sessions WHERE kind='room') SELECT ids.id,COALESCE(c.name,s.name,ids.id) AS name,'room' AS kind,NULL AS members,'' AS owner FROM ids LEFT JOIN contacts c ON c.id=ids.id LEFT JOIN sessions s ON s.id=ids.id ORDER BY name,ids.id")
  else fail('METHOD','未知列表。')
  return {data,headers:{},status:200}
}
