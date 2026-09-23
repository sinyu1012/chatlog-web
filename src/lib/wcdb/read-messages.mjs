import { LIMITS, quote, string, timestamp, rowId, fail } from './common.mjs'
import { classify } from './messages.mjs'
import { rows, exec, each, has } from './sql.mjs'

export async function readMessages(source,index,tables,path,archive,report,check) {
  const names=tables.get('name2id'), send=tables.get('sendinfo')
  for (const table of tables.values()) {
    if (!/^Msg_[a-f0-9]{32}$/i.test(table.name)) continue
    if (!has(table,['local_id','create_time','message_content']) || /WITHOUT\s+ROWID/i.test(table.sql)) {
      report.skippedTables.push({file:path,table:table.name,reason:'不支持的消息表字段或 WITHOUT ROWID 布局'})
      continue
    }
    const hash=table.name.slice(4).toLowerCase()
    const identity=rows(index,'SELECT id FROM identities WHERE hash=? LIMIT 2',[hash])
    const talker=identity.length===1?identity[0].id:'unknown:'+hash
    if (identity.length!==1) report.unmappedTables++
    const display=rows(index,'SELECT name FROM contacts WHERE id=?',[talker])[0]?.name || rows(index,'SELECT name FROM sessions WHERE id=?',[talker])[0]?.name || (talker.startsWith('unknown:')?'未识别会话 '+hash.slice(0,8):talker)
    exec(index,'INSERT OR IGNORE INTO sessions(id,name,lastMs,kind) VALUES (?,?,NULL,?)',[talker,display,talker.endsWith('@chatroom')?'room':'contact'])
    const col=(name,fallback='NULL')=>table.columns.has(name.toLowerCase())?'m.'+quote(table.columns.get(name.toLowerCase())):fallback
    const bounded=name=>`CASE WHEN length(${col(name)})<=${LIMITS.textBytes} THEN ${col(name)} ELSE NULL END AS ${quote(name)}`
    const senderJoin=has(names,['user_name']) && has(table,['real_sender_id'])
    const outgoing=senderJoin && has(send,['chat_name_id','msg_local_id'])
    const sent=outgoing?`EXISTS(SELECT 1 FROM ${quote(send.name)} si JOIN ${quote(names.name)} sn ON sn.rowid=si.${quote(send.columns.get('chat_name_id'))} WHERE sn.${quote(names.columns.get('user_name'))}=? AND si.${quote(send.columns.get('msg_local_id'))}=${col('local_id')})`:'0'
    const sql=`SELECT CAST(m.rowid AS TEXT) AS row_id,CAST(${col('local_id')} AS TEXT) AS local_id,CAST(${col('server_id')} AS TEXT) AS server_id,CAST(${col('sort_seq','0')} AS TEXT) AS sort_seq,CAST(${col('local_type','0')} AS TEXT) AS local_type,${col('create_time')} AS create_time,${bounded('message_content')},${bounded('compress_content')},${col('WCDB_CT_message_content')} AS WCDB_CT_message_content,${col('WCDB_CT_compress_content')} AS WCDB_CT_compress_content,(length(${col('message_content')})>${LIMITS.textBytes} OR length(${col('compress_content')})>${LIMITS.textBytes}) AS oversized,${senderJoin?'CAST(n.'+quote(names.columns.get('user_name'))+' AS TEXT)':"''"} AS sender,${sent} AS outgoing FROM ${quote(table.name)} m ${senderJoin?'LEFT JOIN '+quote(names.name)+' n ON n.rowid='+col('real_sender_id'):''} ORDER BY m.rowid`
    const before={messages:report.messages,unparsed:report.unparsed,unknownDates:report.unknownDates}
    exec(index,'SAVEPOINT message_table')
    try {
      await each(source,sql,outgoing?[talker]:[],row=>{
        const parsed=classify(row), id=rowId(archive,path,table.name,row.local_id,row.row_id), time=timestamp(row.create_time), sender=string(row.sender)
        const name=rows(index,'SELECT name FROM contacts WHERE id=?',[sender])[0]?.name || sender || (row.outgoing?'我（发送状态）':'未知发送者')
        const attachment=parsed.attachments[0]?{...parsed.attachments[0],id:id+':0',archiveId:archive}:null
        exec(index,'INSERT INTO messages VALUES (?,?,?,?,?,CAST(? AS INTEGER),?,?,?,?,?,?,?,?,?,?)',[id,talker,sender,name,time,string(row.sort_seq || '0'),string(row.local_id),string(row.server_id),parsed.kind,parsed.content,parsed.decodeStatus,parsed.rawType,parsed.subtype,Number(row.outgoing || 0),attachment?JSON.stringify(attachment):null,path])
        report.messages++
        if (parsed.decodeStatus!=='ok') report.unparsed++
        if (!time) report.unknownDates++
        if (report.messages>LIMITS.messages) fail('MESSAGE_LIMIT','超过 500 万条消息的导入保护上限。')
      },check)
      exec(index,'RELEASE message_table')
    } catch (error) {
      exec(index,'ROLLBACK TO message_table'); exec(index,'RELEASE message_table')
      Object.assign(report,before)
      if (error.code==='CANCELLED' || error.code==='MESSAGE_LIMIT' || /full|quota|memory/i.test(error.message)) throw error
      report.skippedTables.push({file:path,table:table.name,reason:'读取失败：'+error.message.slice(0,200)})
    }
    check()
  }
}
