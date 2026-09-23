import { dateBounds, fail, string } from './common.mjs'

export function conditions(params={}) {
  const clauses=[], bind=[]
  const talkers=Array.isArray(params.talker)?params.talker:string(params.talker).split(/[,，\n]/)
  const ids=talkers.map(s=>string(s).trim()).filter(Boolean)
  if (ids.length>50) fail('FILTER_LIMIT','最多同时查询 50 个会话。')
  if (ids.length) {
    const placeholders=ids.map(()=>'?').join(',')
    clauses.push(`talkerId IN (SELECT id FROM sessions WHERE id IN (${placeholders}) OR name IN (${placeholders}))`)
    bind.push(...ids,...ids)
  }
  const [start,end]=dateBounds(params.time)
  if (start!=null) { clauses.push('timeMs>=? AND timeMs<?'); bind.push(start,end) }
  const primary=string(params.keyword).trim()
  const extra=Array.isArray(params.keywords)?params.keywords.map(string).map(s=>s.trim()).filter(Boolean):[]
  if (extra.length>20 || [primary,...extra].some(s=>s.length>500)) fail('FILTER_LIMIT','关键词数量或长度超过保护上限。')
  if (primary || extra.length) clauses.push("decodeStatus='ok'")
  if (primary) { clauses.push('instr(lower(content),lower(?))>0'); bind.push(primary) }
  if (extra.length) {
    clauses.push('('+extra.map(()=> 'instr(lower(content),lower(?))>0').join(params.match==='any'?' OR ':' AND ')+')')
    bind.push(...extra)
  }
  return {sql:clauses.length?clauses.join(' AND '):'1',bind}
}
export function pageBounds(params) {
  const limit=Number(params.limit ?? 20), offset=Number(params.offset ?? 0)
  if (!Number.isInteger(limit) || limit<1 || limit>5000 || !Number.isInteger(offset) || offset<0 || offset>5000000) fail('PAGE','分页参数无效；单次最多读取 5,000 条。')
  return {limit,offset}
}
