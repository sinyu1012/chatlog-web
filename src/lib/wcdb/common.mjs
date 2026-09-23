// Utilities for reading user-selected, already plaintext SQLite archives.
export const LIMITS = Object.freeze({ files:128, fileBytes:2*1024**3, totalBytes:8*1024**3, textBytes:1024**2, windowBytes:8*1024**2, messages:5000000 })
export const KIND_LABELS = Object.freeze({ text:'文本', image:'图片', video:'视频', voice:'语音', file:'文件', link:'链接', quote:'引用', system:'系统', other:'其他' })
export function fail(code, message) { const error = new Error(message); error.code = code; throw error }
export const string = value => value == null ? '' : String(value)
export const quote = name => '"' + String(name).replace(/"/g, '""') + '"'
export const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0))
export const rowId = (archive, path, table, id, row) => JSON.stringify([archive, path, table, string(id), string(row)])
export function timestamp(value) {
  if (value == null || value === '' || value === 0 || value === '0') return null
  const n = Number(value)
  const ms = Number.isFinite(n) ? (n < 1e12 ? n*1000 : n) : Date.parse(value)
  return Number.isFinite(ms) && ms > 0 && ms <= 8640000000000000 ? ms : null
}
export function dateBounds(time) {
  if (!time) return [null, null]
  const parts = String(time).split('~')
  if (parts.length > 2) fail('DATE', '日期范围无效。')
  const day = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('DATE', '请使用 YYYY-MM-DD 日期。')
    const [y,m,d] = value.split('-').map(Number), date = new Date(y,m-1,d)
    if (date.getFullYear() !== y || date.getMonth() !== m-1 || date.getDate() !== d) fail('DATE', '日期不存在。')
    return date
  }
  const start = day(parts[0]), end = day(parts[1] || parts[0])
  if (start > end) fail('DATE', '开始日期不能晚于结束日期。')
  end.setDate(end.getDate()+1)
  return [start.getTime(), end.getTime()]
}
