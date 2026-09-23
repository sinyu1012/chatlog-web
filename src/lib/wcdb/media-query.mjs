// Query only the normalized local archive. Never request remote attachments.
import { rows } from './sql.mjs'
import { dateBounds } from './common.mjs'
import { pageBounds } from './filters.mjs'

export function queryMedia(db,params={}) {
  const {limit,offset}=pageBounds(params)
  const [start,end]=dateBounds(params.time)
  const keyword=String(params.query || '').slice(0,500)
  const type=params.type || 'all'
  const predicate=`attachment IS NOT NULL
    AND (? IS NULL OR timeMs>=?) AND (? IS NULL OR timeMs<?)
    AND (?='' OR instr(lower(attachment),lower(?))>0 OR instr(lower(senderName),lower(?))>0)`
  const parameters=[start,start,end,end,keyword,keyword,keyword]
  const counts=Object.fromEntries(rows(db,'SELECT kind,COUNT(*) n FROM messages WHERE '+predicate+' GROUP BY kind',parameters).map(row=>[row.kind,row.n]))
  counts.all=Object.values(counts).reduce((sum,value)=>sum+value,0)
  const filtered=predicate+" AND (?='all' OR kind=?)"
  const bind=[...parameters,type,type]
  const total=rows(db,'SELECT COUNT(*) n FROM messages WHERE '+filtered,bind)[0].n
  const result=rows(db,'SELECT attachment,senderName,timeMs,talkerId FROM messages WHERE '+filtered+' ORDER BY timeMs DESC,id LIMIT ? OFFSET ?',[...bind,limit,offset])
  const data=result.map(row=>({...JSON.parse(row.attachment),sender:row.senderName,time:row.timeMs?new Date(row.timeMs).toISOString():null,talkerId:row.talkerId,source:'local-wcdb'}))
  return {data,total,counts}
}
