import { fail, quote, yieldTask } from './common.mjs'

export function configure(sqlite,db,readonly=false) {
  db.exec('PRAGMA trusted_schema=OFF; PRAGMA temp_store=MEMORY; PRAGMA cache_size=-4096')
  if (readonly) db.exec('PRAGMA query_only=ON')
  if (sqlite.capi.sqlite3_limit) {
    sqlite.capi.sqlite3_limit(db.pointer,sqlite.capi.SQLITE_LIMIT_LENGTH,4*1024*1024)
    sqlite.capi.sqlite3_limit(db.pointer,sqlite.capi.SQLITE_LIMIT_SQL_LENGTH,128*1024)
    sqlite.capi.sqlite3_limit(db.pointer,sqlite.capi.SQLITE_LIMIT_COLUMN,512)
    sqlite.capi.sqlite3_limit(db.pointer,sqlite.capi.SQLITE_LIMIT_ATTACHED,0)
  }
  db.queryDeadline=Infinity
  if (sqlite.capi.sqlite3_progress_handler) sqlite.capi.sqlite3_progress_handler(db.pointer,2000,()=>Date.now()>db.queryDeadline?1:0,0)
}
export function rows(db,sql,bind=[]) {
  db.queryDeadline=Date.now()+15000
  return db.exec({sql,bind,rowMode:'object',returnValue:'resultRows'})
}
export function exec(db,sql,bind=[]) {
  db.queryDeadline=Date.now()+15000
  db.exec({sql,bind})
}
export async function each(db,sql,bind,callback,check=()=>{}) {
  db.queryDeadline=Date.now()+15000
  const statement=db.prepare(sql)
  try {
    // OO1 bind([]) still throws when a statement has no bindable parameters.
    if (statement.parameterCount) statement.bind(bind)
    let count=0
    while (true) {
      db.queryDeadline=Date.now()+15000
      if (!statement.step()) break
      callback(statement.get({}))
      if (++count%128===0) { await yieldTask(); check() }
    }
  } finally { statement.finalize() }
}
export function schema(db) {
  const tables=rows(db,"SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 10001")
  if (tables.length>10000) fail('SCHEMA_LIMIT','数据库表数量超过保护上限。')
  const result=new Map()
  for (const table of tables) {
    if (!table.sql || /^\s*CREATE\s+VIRTUAL\s+TABLE/i.test(table.sql)) continue
    const columns=new Map(rows(db,'PRAGMA table_info('+quote(table.name)+')').map(c=>[c.name.toLowerCase(),c.name]))
    result.set(table.name.toLowerCase(),{name:table.name,sql:table.sql,columns})
  }
  return result
}
export function column(table,candidates,fallback="''") {
  for (const name of candidates) if (table.columns.has(name.toLowerCase())) return quote(table.columns.get(name.toLowerCase()))
  return fallback
}
export const has=(table,names)=>!!table && names.every(name=>table.columns.has(name.toLowerCase()))
export const field=(table,name,fallback='NULL')=>column(table,[name],fallback)
export function createIndex(db) {
  db.exec(`
    CREATE TABLE info(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE identities(id TEXT PRIMARY KEY,hash TEXT NOT NULL);
    CREATE INDEX identity_hash ON identities(hash);
    CREATE TABLE contacts(id TEXT PRIMARY KEY,name TEXT,nickname TEXT,remark TEXT,alias TEXT);
    CREATE TABLE sessions(id TEXT PRIMARY KEY,name TEXT,lastMs INTEGER,preview TEXT DEFAULT '',kind TEXT);
    CREATE TABLE messages(id TEXT PRIMARY KEY,talkerId TEXT,senderId TEXT,senderName TEXT,timeMs INTEGER,sortSeq INTEGER,localId TEXT,serverId TEXT,kind TEXT,content TEXT,decodeStatus TEXT,rawType TEXT,subtype INTEGER,outgoing INTEGER,attachment TEXT,sourcePath TEXT);
    CREATE INDEX message_time ON messages(timeMs,sortSeq,id);
    CREATE INDEX message_talker ON messages(talkerId,timeMs,sortSeq,id);
    CREATE INDEX message_kind ON messages(kind,timeMs);
  `)
}
export function setInfo(db,key,value) { exec(db,'INSERT OR REPLACE INTO info VALUES (?,?)',[key,JSON.stringify(value)]) }
export function getInfo(db,key) { const row=rows(db,'SELECT value FROM info WHERE key=?',[key])[0]; return row?JSON.parse(row.value):null }
