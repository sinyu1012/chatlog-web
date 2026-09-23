import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { md5 } from '../src/lib/wcdb/identity.mjs'
import { inputPlan,inspectHeader } from '../src/lib/wcdb/input.mjs'
import { decodeColumn } from '../src/lib/wcdb/decode.mjs'
import { classify } from '../src/lib/wcdb/messages.mjs'
import { dateBounds,rowId,timestamp } from '../src/lib/wcdb/common.mjs'
import { conditions,pageBounds } from '../src/lib/wcdb/filters.mjs'
import { validateZstd } from '../src/lib/wcdb/zstd-frame.mjs'

const file=(name,size=4096)=>({name,size})
const rawFrame=text=>{const data=new TextEncoder().encode(text),block=(data.length<<3)|1;return new Uint8Array([0x28,0xb5,0x2f,0xfd,0x20,data.length,block&255,(block>>8)&255,block>>16,...data])}
test('table hashes match MD5 vectors including UTF-8',()=>{for(const value of ['', 'a','abc','wxid_local','宝宝@chatroom','a'.repeat(200)])assert.equal(md5(value),createHash('md5').update(value).digest('hex'))})
test('composite IDs preserve shard and large integer identity',()=>{const a=rowId('a','message_0.db','Msg_1','9007199254740993','1');assert.notEqual(a,rowId('a','message_1.db','Msg_1','9007199254740993','1'));assert.ok(a.includes('9007199254740993'))})
test('folder path survives structured File message wrapper',()=>{const result=inputPlan([{file:file('contact.db'),path:'account/contact/contact.db'},{file:file('message_0.db'),path:'account/message/message_0.db'}]);assert.equal(result.databases[0].path,'account/contact/contact.db')})
test('secret JSON is ignored without reading its contents',()=>{const secret={name:'all_keys.json',size:128,arrayBuffer(){throw new Error('must not read')}};assert.equal(inputPlan([file('contact.db'),secret]).ignoredCount,1)})
test('reject multiple account roots and duplicate paths',()=>{assert.throws(()=>inputPlan([{file:file('a.db'),path:'one/contact/a.db'},{file:file('b.db'),path:'two/message/b.db'}]),/多个账号/);assert.throws(()=>inputPlan([file('a.db'),file('a.db')]),/重复/)})
test('reject nonempty WAL instead of silently discarding it',()=>{assert.throws(()=>inputPlan([file('a.db'),file('a.db-wal',32)]),/WAL/)})
test('reject encrypted or malformed header',()=>{assert.throws(()=>inspectHeader(new Uint8Array(100)),/明文/);const header=new Uint8Array(100);header.set(new TextEncoder().encode('SQLite format 3\0'));assert.equal(inspectHeader(header).walHeader,false)})
test('reject invalid archive paths and resource limits',()=>{assert.throws(()=>inputPlan([{file:file('a.db'),path:'../a.db'}]),/路径/);assert.throws(()=>inputPlan([file('large.db',3*1024**3)]),/2 GiB/);assert.throws(()=>inputPlan([file('zero.db',0)]),/为空/)})
test('plain UTF-8 and null bodies decode without fabrication',()=>{assert.equal(decodeColumn(new TextEncoder().encode('你好')).text,'你好');assert.equal(decodeColumn(null).text,'')})
test('bounded ordinary Zstd TEXT and BLOB markers decode',()=>{for(const marker of [4,5,null])assert.equal(decodeColumn(rawFrame('今天讨论设计'),marker).text,'今天讨论设计')})
test('dictionary markers stay explicitly unparsed',()=>{assert.equal(decodeColumn(rawFrame('你好'),2).status,'DICTIONARY_REQUIRED');assert.equal(decodeColumn(rawFrame('你好'),3).status,'DICTIONARY_REQUIRED')})
test('unknown compression and invalid UTF-8 stay unparsed',()=>{assert.equal(decodeColumn(new Uint8Array([255]),0).status,'DECODE_FAILED');assert.equal(decodeColumn('text',99).status,'COMPRESSION_UNKNOWN')})
test('reject truncated and concatenated compressed frames',()=>{const good=rawFrame('data');assert.throws(()=>validateZstd(good.slice(0,-1)));assert.throws(()=>validateZstd(new Uint8Array([...good,...good])));assert.notEqual(decodeColumn(good.slice(0,-1),4).status,'ok')})
test('one MiB decoded content budget is enforced',()=>{assert.equal(decodeColumn('x'.repeat(1024**2+1)).status,'CONTENT_LIMIT')})
test('file, quote and link are not collapsed to one message kind',()=>{for(const [subtype,kind] of [[6,'file'],[57,'quote'],[5,'link']]){const message=classify({local_type:String((BigInt(subtype)<<32n)|49n),message_content:`<msg><appmsg><type>${subtype}</type><title>测试</title></appmsg></msg>`});assert.equal(message.kind,kind);assert.ok(message.content.includes('测试'))}})
test('missing media remains a typed reference',()=>{const result=classify({local_type:3,message_content:'<msg><img md5="0123456789abcdef0123456789abcdef"/></msg>'});assert.equal(result.attachments[0].state,'missing');assert.equal(result.attachments[0].reference,'0123456789abcdef0123456789abcdef')})
test('unsafe XML is never interpreted or requested',()=>{const result=classify({local_type:49,message_content:'<!DOCTYPE msg><msg><title>bad</title></msg>'});assert.equal(result.decodeStatus,'UNSAFE_XML')})
test('failed decompression keeps a visible message placeholder',()=>{const result=classify({local_type:1,message_content:new Uint8Array([255]),WCDB_CT_message_content:0});assert.equal(result.decodeStatus,'DECODE_FAILED');assert.match(result.content,/暂未解析/)})
test('date bounds use inclusive calendar end and reject impossible dates',()=>{const [start,end]=dateBounds('2026-06-01~2026-06-01');assert.equal(end-start,86400000);assert.throws(()=>dateBounds('2026-02-30'));assert.throws(()=>dateBounds('2026-06-02~2026-06-01'))})
test('unknown date does not become current date',()=>{assert.equal(timestamp(''),null);assert.equal(timestamp(0),null);assert.equal(timestamp('not a date'),null);assert.equal(timestamp(1710000000),1710000000000)})
test('Chinese short words and SQL wildcard characters remain literal binds',()=>{const result=conditions({keyword:'设计%_',keywords:['中文','交互'],match:'any'});assert.ok(result.sql.includes('instr('));assert.ok(result.sql.includes(' OR '));assert.ok(!result.sql.includes('设计'));assert.deepEqual(result.bind,['设计%_','中文','交互'])})
test('all keyword filters apply before pagination in normalized index',()=>{const result=conditions({talker:['a','b'],keywords:['alpha','beta'],match:'all'});assert.ok(result.sql.includes('AND'));assert.ok(result.sql.includes("decodeStatus='ok'"));assert.deepEqual(result.bind,['a','b','a','b','alpha','beta'])})
test('pagination limits cannot inject SQL',()=>{assert.throws(()=>pageBounds({limit:'1; DROP TABLE messages'}));assert.throws(()=>pageBounds({offset:-1}));assert.deepEqual(pageBounds({limit:20,offset:40}),{limit:20,offset:40})})
