import { KIND_LABELS, string } from './common.mjs'
import { decodeColumn } from './decode.mjs'

const unescape=value=>string(value).replace(/&(amp|lt|gt|quot|apos);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[key])
export function xmlField(xml,field) {
  if (!['title','des','type'].includes(field)) return ''
  const match=xml.match(new RegExp('<'+field+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+field+'>','i'))
  return match?unescape(match[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1').replace(/<[^>]*>/g,'')).trim().slice(0,4096):''
}
export function classify(row) {
  let decoded=decodeColumn(row.message_content,row.WCDB_CT_message_content)
  if (!decoded.text && row.compress_content!=null) {
    const fallback=decodeColumn(row.compress_content,row.WCDB_CT_compress_content)
    if (fallback.text) decoded=fallback
  }
  if (row.oversized) decoded={text:'',status:'CONTENT_LIMIT',reason:'正文字段超过读取上限'}
  const rawType=string(row.local_type || '0')
  let base=0, subtype=0
  try { base=Number(BigInt(rawType)&0xffffffffn); subtype=Number(BigInt(rawType)>>32n) } catch (_) { /* Unknown type stays explicit. */ }
  const xml=decoded.text, xmlAllowed=!/<!DOCTYPE|<!ENTITY/i.test(xml)
  if (!xmlAllowed) decoded={text:'',status:'UNSAFE_XML',reason:'XML 含不支持的文档类型或实体定义'}
  let kind=({1:'text',3:'image',34:'voice',43:'video',10000:'system'})[base] || 'other'
  let content=decoded.text
  if (base===49 && xmlAllowed) {
    subtype=Number(xmlField(xml,'type')) || subtype
    kind=({5:'link',6:'file',19:'other',33:'other',36:'other',57:'quote'})[subtype] || 'other'
    content='['+KIND_LABELS[kind]+'] '+(xmlField(xml,'title') || xmlField(xml,'des'))
  } else if (base===10000 && xmlAllowed) content=unescape(content.replace(/<[^>]*>/g,''))
  else if (kind!=='text' && kind!=='system') content='['+KIND_LABELS[kind]+']'
  if (decoded.status!=='ok') content='[正文暂未解析：'+decoded.reason+']'
  if (!content && kind==='text') content='（空文本）'
  const attachments=[]
  if (['image','video','voice','file'].includes(kind)) {
    const name=xmlAllowed?xmlField(xml,'title'):''
    const match=xmlAllowed && (xml.match(/\b(?:md5|filemd5)\s*=\s*["']([a-f0-9]{32})["']/i) || xml.match(/<(?:md5|filemd5)>([a-f0-9]{32})<\//i))
    attachments.push({type:kind,name:name || KIND_LABELS[kind],reference:match?match[1].toLowerCase():name.split(/[\\/]/).pop(),state:'missing'})
  }
  return {kind,content,rawType,subtype,decodeStatus:decoded.status,attachments}
}
