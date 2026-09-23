// Pure, dependency-free adapters. Never interpolate chat content into HTML.
export const typeLabels = { text: '文本', image: '图片', video: '视频', voice: '语音', file: '文件' }
export const text = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
export const number = value => new Intl.NumberFormat('zh-CN').format(Number(value) || 0)
export const dateKey = value => {
  const d = toDate(value)
  return d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : ''
}
export function toDate(value) {
  if (value === '' || value == null) return null
  const n = typeof value === 'number' || /^\d{10,13}$/.test(String(value)) ? Number(value) : null
  const d = new Date(n == null ? value : n < 1e12 ? n * 1000 : n)
  return Number.isNaN(d.getTime()) ? null : d
}
export function formatTime(value, short = false) {
  const d = toDate(value)
  if (!d) return '时间未知'
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return short ? time : `${dateKey(d)} ${time}`
}
export function rangeDays(days, end = new Date()) {
  const start = new Date(end); start.setDate(start.getDate() - days + 1)
  return `${dateKey(start)}~${dateKey(end)}`
}
export function parseCSV(input) {
  const src = text(input).replace(/^\uFEFF/, '')
  const rows = []; let row = [], field = '', quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '"') {
      if (quoted && src[i+1] === '"') { field += '"'; i++ } else quoted = !quoted
    } else if (c === ',' && !quoted) { row.push(field); field = '' }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && src[i+1] === '\n') i++
      row.push(field); if (row.some(v => v !== '')) rows.push(row)
      row = []; field = ''
    } else field += c
  }
  row.push(field); if (row.some(v => v !== '')) rows.push(row)
  if (rows.length < 2) return []
  const headers = rows.shift().map(h => h.trim())
  return rows.map(values => Object.fromEntries(headers.map((h,i) => [h, values[i] || ''])))
}
export function unwrap(input) {
  if (Array.isArray(input)) return input
  if (input && typeof input === 'object') {
    for (const key of ['data','items','list','records','messages','contacts','chatrooms','sessions']) {
      if (Array.isArray(input[key])) return input[key]
      if (input[key] && typeof input[key] === 'object') { const result = unwrap(input[key]); if (result.length) return result }
    }
    return []
  }
  if (typeof input === 'string') { try { return unwrap(JSON.parse(input)) } catch (_) { return [] } }
  return []
}
export function parseList(input, kind) {
  if (typeof input !== 'string' || /^\s*[[{]/.test(input)) return unwrap(input)
  if (kind !== 'sessions') return parseCSV(input)
  return input.split(/\r?\n/).map(line => {
    const m = line.match(/^(.+)\(([^)]+)\)\s+(\d{4}-\d{2}-\d{2}.*)$/)
    return m ? { name: m[1], id: m[2], lastMessageTime: m[3] } : null
  }).filter(Boolean)
}
export function normalizeContact(item) {
  const id = text(item.UserName || item.userName || item.username || item.id || item.wxid || item.Alias)
  return { ...item, id, name: text(item.Remark || item.remark || item.NickName || item.nickName || item.nickname || item.name || id || '未命名联系人'), nickname: text(item.NickName || item.nickName || item.nickname), remark: text(item.Remark || item.remark), alias: text(item.Alias || item.alias), kind: 'contact' }
}
export function normalizeRoom(item) {
  const id = text(item.UserName || item.userName || item.username || item.id || item.Name || item.name)
  const rawCount = item.UserCount ?? item.userCount ?? item.memberCount
  const members = rawCount == null || rawCount === '' ? null : Number(rawCount)
  return { ...item, id, name: text(item.Remark || item.remark || item.NickName || item.nickName || item.nickname || item.displayName || item.Name || item.name || id || '未命名群聊'), owner: text(item.Owner || item.owner), members: Number.isFinite(members) ? members : null, kind: 'room' }
}
export function normalizeSession(item) {
  const id = text(item.id || item.UserName || item.userName || item.username || item.talker)
  return { ...item, id, name: text(item.name || item.displayName || item.nickName || item.NickName || item.nickname || item.talkerName || id || '未命名会话'), lastMessageTime: item.lastMessageTime || item.lastTime || item.time || item.timestamp, preview: text(item.content || item.lastMessage || item.summary), kind: id.includes('@chatroom') || item.isChatRoom ? 'room' : 'contact' }
}
export function parseChatLogs(input) {
  if (typeof input !== 'string' || /^\s*[[{]/.test(input)) return unwrap(input).map(normalizeMessage)
  if (/^(sender|发送者|seq|time)[^\n]*,/i.test(input.trim())) return parseCSV(input).map(normalizeMessage)
  const logs = []; let current = null
  for (const line of input.split(/\r?\n/)) {
    const m = line.match(/^(.+)\(([^)]+)\)\s+(\d{4}-\d{2}-\d{2}.*)$/)
    if (m) { if (current) logs.push(normalizeMessage(current)); current = { senderName: m[1], senderId: m[2], time: m[3], content: '' } }
    else if (current) current.content += (current.content ? '\n' : '') + line
  }
  if (current) logs.push(normalizeMessage(current))
  return logs
}
export function normalizeMessage(item) {
  return { ...item, id: text(item.id || item.seq || item.localId), senderName: text(item.senderName || item.SenderName || item.sender || item['发送者'] || '未知发送者'), senderId: text(item.senderId || item.sender || item.Sender), time: item.time || item.timestamp || item.createTime || item['时间'], content: text(item.content ?? item.Content ?? item['内容']), isSelf: item.isSelf === true || item.isSelf === 1, talkerId: text(item.talkerId || item.talker), talkerName: text(item.talkerName) }
}
export function safeUrl(value, base = 'http://localhost') {
  if (typeof value !== 'string' || Array.from(value).some(c => c.charCodeAt(0) < 32)) return ''
  try { const url = new URL(value, base); return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '' } catch (_) { return '' }
}
export function mediaParts(content, base = 'http://localhost') {
  const result = []; const src = text(content); const re = /!\[(图片|视频|语音|文件)\]\(([^\s)]+)\)/g
  let pos = 0, match
  const kinds = { 图片: 'image', 视频: 'video', 语音: 'voice', 文件: 'file' }
  while ((match = re.exec(src))) {
    if (match.index > pos) result.push({ type: 'text', value: src.slice(pos, match.index) })
    const url = safeUrl(match[2], base)
    result.push(url ? { type: kinds[match[1]], url, name: decodeName(url), value: match[0] } : { type: 'text', value: match[0] })
    pos = re.lastIndex
  }
  if (pos < src.length) result.push({ type: 'text', value: src.slice(pos) })
  return result.length ? result : [{ type: 'text', value: src || '（空消息）' }]
}
export function decodeName(url) { try { return decodeURIComponent(new URL(url).pathname.split('/').pop()) || '未命名文件' } catch (_) { return '未命名文件' } }
export function extractMedia(logs, base) {
  const found = new Map()
  for (const log of logs) for (const part of mediaParts(log.content, base)) {
    if (part.type === 'text') continue
    const key = `${part.type}:${part.url}`
    if (!found.has(key) || (toDate(log.time)?.getTime() || 0) > (toDate(found.get(key).time)?.getTime() || 0)) found.set(key, { ...part, id: key, sender: log.senderName, time: log.time, talkerId: log.talkerId, size: null })
  }
  return [...found.values()].sort((a,b) => (toDate(b.time)?.getTime() || 0) - (toDate(a.time)?.getTime() || 0))
}
export function highlightParts(content, keywords = []) {
  const source = text(content); const words = keywords.map(k => text(k).trim()).filter(Boolean).sort((a,b) => b.length-a.length)
  if (!words.length) return [{ value: source, match: false }]
  const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const re = new RegExp(pattern, 'gi'); const result = []; let pos = 0, m
  while ((m = re.exec(source))) { if (m.index > pos) result.push({ value: source.slice(pos,m.index), match: false }); result.push({ value:m[0], match:true }); pos=re.lastIndex }
  if (pos < source.length) result.push({ value:source.slice(pos), match:false })
  return result
}
export function messageType(log) {
  const explicit = ({ 1:'text', 3:'image', 34:'voice', 43:'video', 49:'file' })[log.type]
  if (explicit) return explicit
  return mediaParts(log.content).find(p => p.type !== 'text')?.type || 'text'
}
export function analyze(logs, days = 30, end = new Date()) {
  const keys = Array.from({length:days},(_,i) => { const d=new Date(end); d.setDate(d.getDate()-days+1+i); return dateKey(d) })
  const allowed = new Set(keys), filtered = logs.filter(l => allowed.has(dateKey(l.time)))
  const daily = Object.fromEntries(keys.map(d => [d,0])); const types = Object.fromEntries(Object.keys(typeLabels).map(k => [k,0]))
  const hourly = Array(24).fill(0), heat = Array.from({length:7},() => Array(24).fill(0)), groups = new Map(), senders = new Set()
  filtered.forEach(log => { const d=toDate(log.time); daily[dateKey(d)]++; types[messageType(log)]++; hourly[d.getHours()]++; heat[(d.getDay()+6)%7][d.getHours()]++; if (log.senderId || log.senderName) senders.add(log.senderId || log.senderName); if (log.talkerId?.includes('@chatroom') || log.isChatRoom) { const id = log.talkerId || log.talkerName; const row = groups.get(id) || { id, name:log.talkerName || id, value:0 }; row.value++; groups.set(id,row) } })
  return { logs:filtered, total:filtered.length, users:senders.size, average:Math.round(filtered.length/days), activeDays:Object.values(daily).filter(Boolean).length, daily:keys.map(date => ({date,label:date.slice(5).replace('-','/'),value:daily[date]})), types:Object.keys(types).map(type => ({type,label:typeLabels[type],value:types[type]})), hourly, heat, groups:[...groups.values()].sort((a,b)=>b.value-a.value).slice(0,10), words:wordFrequency(filtered) }
}
export function wordFrequency(logs) {
  const stops = new Set(['我们','你们','他们','这个','那个','就是','可以','已经','没有','不是','一个','还是','什么','好的','哈哈','一下','今天','明天','然后','现在','谢谢','the','and','that','with','this'])
  const counts = new Map(); const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN',{granularity:'word'}) : null
  for (const log of logs) {
    if (messageType(log) !== 'text') continue
    const source=text(log.content).replace(/https?:\/\/\S+/g,' ')
    const words=segmenter ? [...segmenter.segment(source)].filter(s=>s.isWordLike).map(s=>s.segment) : source.match(/[\p{L}]{2,12}/gu) || []
    for (const word of words) { const key=word.toLowerCase(); if (key.length < 2 || key.length > 16 || stops.has(key) || !/\p{L}/u.test(key)) continue; counts.set(key,(counts.get(key)||0)+1) }
  }
  return [...counts].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,15)
}
export function csvString(rows, fields) {
  const quote = value => { let valueText=text(value); if (/^[\s]*[=+@-]/.test(valueText)) valueText="'"+valueText; return '"'+valueText.replace(/"/g,'""')+'"' }
  return '\uFEFF'+[fields.map(f=>quote(f.label)).join(','),...rows.map(row=>fields.map(f=>quote(row[f.key])).join(','))].join('\r\n')
}
export function download(content, filename, mime = 'text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([content],{type:mime})); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}
