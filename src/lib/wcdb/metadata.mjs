import { quote, string, timestamp, fail } from './common.mjs'
import { md5 } from './identity.mjs'
import { decodeColumn } from './decode.mjs'
import { column, field, has, each, exec } from './sql.mjs'

export async function readMetadata(source,index,tables,check) {
  let count=0
  const identity=id=>{
    if (!id || id.length>512) return
    if (++count>300000) fail('METADATA_LIMIT','单库身份目录超过 300,000 行的保护上限。')
    exec(index,'INSERT OR IGNORE INTO identities VALUES (?,?)',[id,md5(id)])
  }
  const label=value=>decodeColumn(value).text.slice(0,2048)
  for (const tableName of ['contact','stranger']) {
    const table=tables.get(tableName)
    if (!table || !has(table,['username'])) continue
    const sql=`SELECT CAST(${field(table,'username')} AS TEXT) AS id, ${column(table,['nick_name','nickname'])} AS nickname, ${field(table,'remark')} AS remark, ${field(table,'alias')} AS alias FROM ${quote(table.name)}`
    await each(source,sql,[],row=>{
      const id=string(row.id); if (!id || id.length>512) return
      identity(id)
      const nickname=label(row.nickname), remark=label(row.remark), alias=label(row.alias)
      exec(index,'INSERT OR IGNORE INTO contacts VALUES (?,?,?,?,?)',[id,remark || nickname || id,nickname,remark,alias])
    },check)
  }
  const table=tables.get('sessiontable')
  if (has(table,['username'])) {
    const sql=`SELECT CAST(${field(table,'username')} AS TEXT) AS id, ${column(table,['last_timestamp','sort_timestamp'],'NULL')} AS time, ${column(table,['session_title','display_name'])} AS name FROM ${quote(table.name)}`
    await each(source,sql,[],row=>{
      const id=string(row.id); if (!id || id.length>512) return
      identity(id)
      exec(index,'INSERT OR REPLACE INTO sessions(id,name,lastMs,kind) VALUES (?,?,?,?)',[id,label(row.name) || id,timestamp(row.time),id.endsWith('@chatroom')?'room':'contact'])
    },check)
  }
  const fallback=tables.get('sessionnocontactinfotable')
  if (has(fallback,['username','session_title'])) {
    await each(source,`SELECT ${field(fallback,'username')} AS id,${field(fallback,'session_title')} AS name FROM ${quote(fallback.name)}`,[],row=>{
      const id=string(row.id); identity(id)
      if (id && label(row.name)) exec(index,'UPDATE sessions SET name=? WHERE id=?',[label(row.name),id])
    },check)
  }
  const names=tables.get('name2id')
  if (has(names,['user_name'])) await each(source,`SELECT ${field(names,'user_name')} AS id FROM ${quote(names.name)}`,[],row=>identity(string(row.id)),check)
  return count
}
