import { LIMITS, fail, string } from './common.mjs'

export function inputPlan(files) {
  const databases=[], ignored=[], seen=new Set(), roots=new Set()
  let bytes=0, ignoredCount=0
  for (const file of Array.from(files || [])) {
    const path=string(file.webkitRelativePath || file.name).replace(/\\/g,'/')
    if (!path || path.split('/').includes('..') || path.includes('\0')) fail('PATH','文件路径无效。')
    if (/-wal$/i.test(path) && file.size) fail('WAL','发现非空 WAL。请先准备已合并 WAL 的一致明文快照，不要混用原始 WAL 与明文数据库。')
    if (!/\.db$/i.test(path)) {
      ignoredCount++
      if (ignored.length<200) ignored.push({name:file.name,reason:'非数据库文件，不读取其内容'})
      continue
    }
    if (seen.has(path)) fail('DUPLICATE_FILE','重复的数据库路径，请分开导入不同账号。')
    seen.add(path)
    const role=path.match(/^(.*)\/(?:contact|session|message)\/[^/]+\.db$/i)
    if (role) roots.add(role[1])
    if (!file.size || file.size>LIMITS.fileBytes) fail('FILE_SIZE','数据库为空或超过单文件 2 GiB 的保护上限。')
    bytes+=file.size; databases.push({file,path})
  }
  if (!databases.length) fail('NO_DATABASE','未选择 .db 数据库。请选择已经解密的聊天数据库文件。')
  if (roots.size>1) fail('MULTIPLE_ACCOUNTS','发现多个账号目录。一次只导入一个账号。')
  if (databases.length>LIMITS.files || bytes>LIMITS.totalBytes) fail('ARCHIVE_SIZE','超过 128 个数据库或 8 GiB 的导入保护上限。')
  return {databases,ignored,ignoredCount,bytes}
}
export function inspectHeader(bytes) {
  if (bytes.length<100 || new TextDecoder().decode(bytes.subarray(0,16))!=='SQLite format 3\0') fail('ENCRYPTED_OR_INVALID','不是明文 SQLite；文件可能仍已加密或已损坏。')
  return {walHeader:bytes[18]===2 || bytes[19]===2}
}
