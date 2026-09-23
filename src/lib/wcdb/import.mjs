import { fail, yieldTask } from './common.mjs'
import { inputPlan } from './input.mjs'
import { schema, has, createIndex, exec, rows, setInfo } from './sql.mjs'
import { readMetadata } from './metadata.mjs'
import { readMessages } from './read-messages.mjs'

export async function importArchive(storage,options,notify,check) {
  if (!options.consent || !options.snapshotConfirmed) fail('CONSENT','请确认数据属于已准备好的明文快照，并同意在当前浏览器保存解析后的档案。')
  const plan=inputPlan(options.files)
  const estimate=await navigator.storage.estimate()
  const needed=plan.bytes*2+Math.max(...plan.databases.map(item=>item.file.size))
  if (estimate.quota && needed>estimate.quota-(estimate.usage || 0)) fail('QUOTA','浏览器剩余配额不足。请清理空间或缩小快照；现有档案不会被覆盖。')
  const archive=crypto.randomUUID(), path='/archive-'+archive+'.db', index=storage.open(path)
  const report={version:1,archiveId:archive,name:String(options.name || '本地微信档案').slice(0,80),importedAt:new Date().toISOString(),snapshotCompleteness:'unknown',sourceBytes:plan.bytes,files:[],ignoredCount:plan.ignoredCount,ignored:plan.ignored,messages:0,unparsed:0,unknownDates:0,unmappedTables:0,skippedTables:[],partial:false}
  let published=false, phase='识别数据库', currentFile='', done=0, lastProgress=0
  const tick=()=>{
    check()
    if (Date.now()-lastProgress>200) {
      lastProgress=Date.now(); notify({phase,file:currentFile,done,total:plan.databases.length*2,messages:report.messages})
    }
  }
  const fatal=error=>error.code==='CANCELLED' || /LIMIT|QUOTA/.test(error.code || '') || /full|quota|memory|disk I\/O/i.test(error.message)
  try {
    createIndex(index)
    for (const item of plan.databases) {
      currentFile=item.file.name; tick(); await yieldTask()
      const detail={path:item.path,bytes:item.file.size,roles:[],state:'pending'}
      report.files.push(detail)
      exec(index,'SAVEPOINT metadata_file')
      try {
        await storage.withInput(item.file,async source=>{
          const tables=schema(source)
          if (has(tables.get('contact'),['username']) || has(tables.get('stranger'),['username'])) detail.roles.push('contacts')
          if (has(tables.get('sessiontable'),['username'])) detail.roles.push('sessions')
          if ([...tables.values()].some(t=>/^Msg_[a-f0-9]{32}$/i.test(t.name) && has(t,['local_id','create_time','message_content']))) detail.roles.push('messages')
          await readMetadata(source,index,tables,tick)
          detail.state=detail.roles.length?'readable':'unsupported'
        },tick)
        exec(index,'RELEASE metadata_file')
      } catch (error) {
        exec(index,'ROLLBACK TO metadata_file'); exec(index,'RELEASE metadata_file')
        if (fatal(error)) throw error
        detail.state='error'; detail.reason=error.message.slice(0,240)
      }
      done++
    }
    if (!report.files.some(file=>file.state==='readable')) fail('UNSUPPORTED_SCHEMA','未找到可读取的微信 4.x 表结构。现有档案未改变。')
    phase='解码并建立消息索引'
    for (let i=0;i<plan.databases.length;i++) {
      const item=plan.databases[i], detail=report.files[i]
      currentFile=item.file.name; tick(); await yieldTask()
      if (detail.state==='readable' && detail.roles.includes('messages')) {
        await storage.withInput(item.file,source=>readMessages(source,index,schema(source),item.path,archive,report,tick),tick)
      }
      done++
    }
    phase='整理会话与覆盖报告'; tick()
    exec(index,"UPDATE sessions SET name=COALESCE((SELECT name FROM contacts WHERE contacts.id=sessions.id),name)")
    exec(index,"UPDATE sessions SET lastMs=COALESCE((SELECT MAX(timeMs) FROM messages WHERE talkerId=sessions.id),lastMs),preview=COALESCE((SELECT content FROM messages WHERE talkerId=sessions.id ORDER BY timeMs DESC,sortSeq DESC,id DESC LIMIT 1),'')")
    const extent=rows(index,'SELECT MIN(timeMs) first,MAX(timeMs) last FROM messages')[0]
    report.firstMessageAt=extent.first?new Date(extent.first).toISOString():null
    report.lastMessageAt=extent.last?new Date(extent.last).toISOString():null
    report.contacts=rows(index,"SELECT COUNT(*) n FROM contacts WHERE id NOT LIKE '%@chatroom'")[0].n
    report.sessions=rows(index,'SELECT COUNT(*) n FROM sessions')[0].n
    report.partial=!!(report.unparsed || report.skippedTables.length || report.unmappedTables || report.files.some(file=>file.state==='error' || file.state==='unsupported'))
    for (const [key,value] of Object.entries({archiveId:archive,report,selfId:String(options.selfId || '').trim().slice(0,512),schemaVersion:1})) setInfo(index,key,value)
    tick(); await yieldTask(); check()
    const result=storage.publish(path,index); published=true
    notify({phase:'导入完成',done:plan.databases.length*2,total:plan.databases.length*2,messages:report.messages})
    return result
  } finally {
    if (!published) { index.close(); storage.pool.unlink(path) }
  }
}
