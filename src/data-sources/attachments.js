import { ref } from 'vue'
export const attachmentRevision=ref(0)
let connection
function open() {
  return connection || (connection=new Promise((resolve,reject)=>{
    const request=indexedDB.open('chatlog-local-attachments',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'})
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(new Error('浏览器无法打开附件存储。'))
    request.onblocked=()=>reject(new Error('附件存储被其他标签页占用。'))
  }))
}
async function transaction(mode,operation) {
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('files',mode), store=tx.objectStore('files')
    let result
    operation(store,value=>{result=value})
    tx.oncomplete=()=>resolve(result)
    tx.onerror=tx.onabort=()=>reject(new Error('附件保存失败，请检查浏览器剩余空间。'))
  })
}
const allowedFile=file=>{
  if (!(file instanceof Blob) || !file.size || file.size>128*1024**2) throw new Error('附件须非空且不超过 128 MiB。')
  if (/\.db(?:-|$)|(?:passphrase|all_keys)\.json$/i.test(file.name || '')) throw new Error('数据库或密钥文件不能作为媒体附件关联。')
}
export async function associateFile(attachment,file) {
  allowedFile(file)
  await transaction('readwrite',store=>store.put({id:attachment.archiveId+':manual:'+attachment.id,archive:attachment.archiveId,file,name:file.name}))
  attachmentRevision.value++
}
export async function importAttachmentFolder(archive,files) {
  const selected=Array.from(files).filter(f=>!/-wal$|-shm$|\.db$|(?:passphrase|all_keys)\.json$/i.test(f.name))
  if (selected.length>200 || selected.reduce((sum,file)=>sum+file.size,0)>512*1024**2) throw new Error('一次最多关联 200 个附件、合计 512 MiB。')
  selected.forEach(allowedFile)
  const grouped=new Map()
  for (const file of selected) {
    const full=file.name.toLowerCase(), stem=full.replace(/\.[^.]+$/,'')
    for (const key of new Set([full,...(/^[a-f0-9]{32}$/.test(stem)?[stem]:[])])) {
      if (!grouped.has(key)) grouped.set(key,[])
      grouped.get(key).push(file)
    }
  }
  await transaction('readwrite',store=>{
    for (const [key,items] of grouped) store.put({id:archive+':reference:'+key,archive,file:items.length===1?items[0]:null,name:items.length===1?items[0].name:'',ambiguous:items.length>1})
  })
  attachmentRevision.value++
  return selected.length
}
export async function findAttachment(attachment) {
  return transaction('readonly',(store,done)=>{
    const manual=store.get(attachment.archiveId+':manual:'+attachment.id)
    manual.onsuccess=()=>{
      if (manual.result) {done(manual.result);return}
      if (!attachment.reference) {done(null);return}
      const reference=store.get(attachment.archiveId+':reference:'+attachment.reference.toLowerCase())
      reference.onsuccess=()=>done(reference.result || null)
    }
  })
}
export async function clearAttachments(archive) {
  await transaction('readwrite',store=>{
    const cursor=store.openCursor()
    cursor.onsuccess=()=>{const item=cursor.result;if(!item)return;if(item.value.archive===archive)item.delete();item.continue()}
  })
  attachmentRevision.value++
}
export async function previewMime(file) {
  const b=new Uint8Array(await file.slice(0,16).arrayBuffer()), ascii=new TextDecoder().decode(b)
  if (b[0]===0x89 && ascii.slice(1,4)==='PNG') return 'image/png'
  if (b[0]===255 && b[1]===216 && b[2]===255) return 'image/jpeg'
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'image/gif'
  if (ascii.startsWith('RIFF') && ascii.slice(8,12)==='WEBP') return 'image/webp'
  if (ascii.startsWith('RIFF') && ascii.slice(8,12)==='WAVE') return 'audio/wav'
  if (ascii.startsWith('OggS')) return 'audio/ogg'
  if (ascii.startsWith('ID3')) return 'audio/mpeg'
  if (ascii.slice(4,8)==='ftyp') return 'video/mp4'
  return ''
}
