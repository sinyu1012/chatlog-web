import { KIND_LABELS, fail } from './common.mjs'
import { each, getInfo } from './sql.mjs'
import { createWordCounter } from './word-count.mjs'

const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
export async function statistics(db,options={},check=()=>{}) {
  const days=Number(options.days || 30), report=getInfo(db,'report')
  if (!Number.isInteger(days) || days<1 || days>366) fail('RANGE','统计范围应为 1–366 天。')
  const anchor=new Date(options.end || report.lastMessageAt || Date.now())
  if (Number.isNaN(anchor.getTime())) fail('DATE','统计截止日期无效。')
  const end=new Date(anchor); end.setHours(0,0,0,0); end.setDate(end.getDate()+1)
  const start=new Date(end); start.setDate(start.getDate()-days)
  const daily=Array.from({length:days},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);const key=dayKey(d);return {date:key,label:key.slice(5).replace('-','/'),value:0}})
  const dailyMap=new Map(daily.map(row=>[row.date,row]))
  const hourly=Array(24).fill(0), heat=Array.from({length:7},()=>Array(24).fill(0))
  const types=Object.fromEntries(Object.keys(KIND_LABELS).map(k=>[k,0])), groups=new Map(), people=new Set(), words=createWordCounter()
  let total=0,unparsed=0
  await each(db,'SELECT m.*,s.name AS talkerName FROM messages m LEFT JOIN sessions s ON m.talkerId=s.id WHERE m.timeMs>=? AND m.timeMs<?',[start.getTime(),end.getTime()],row=>{
    const date=new Date(row.timeMs), key=dayKey(date)
    if (!dailyMap.has(key)) return
    total++; dailyMap.get(key).value++; hourly[date.getHours()]++; heat[(date.getDay()+6)%7][date.getHours()]++
    types[row.kind in types?row.kind:'other']++
    if (row.senderId) people.add(row.senderId)
    if (row.decodeStatus!=='ok') unparsed++
    if (row.talkerId.endsWith('@chatroom')) {
      const group=groups.get(row.talkerId) || {id:row.talkerId,name:row.talkerName || row.talkerId,value:0}
      group.value++; groups.set(row.talkerId,group)
    }
    if (row.kind==='text' && row.decodeStatus==='ok') words.add(row.content)
  },check)
  const stats={logs:[],total,users:people.size,average:Math.round(total/days),activeDays:daily.filter(d=>d.value).length,daily,hourly,heat,unparsed,types:Object.keys(types).map(type=>({type,label:KIND_LABELS[type],value:types[type]})),groups:[...groups.values()].sort((a,b)=>b.value-a.value).slice(0,10),...words.finish()}
  return {local:true,days,end:anchor.toISOString(),endDate:dayKey(anchor),sessions:report.sessions,totalSessions:report.sessions,failures:[],capped:[],logs:[],report,stats}
}
