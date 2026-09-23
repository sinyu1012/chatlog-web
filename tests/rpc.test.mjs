import test from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
import { toWorkerData } from '../src/data-sources/local-client.js'

test('nested reactive search parameters can cross the Worker boundary',()=>{
  const params={keywords:reactive(['中文','设计']),filter:reactive({talkers:['a','b']})}
  assert.throws(()=>structuredClone(params))
  const cloned=structuredClone(toWorkerData(params))
  assert.deepEqual(cloned,{keywords:['中文','设计'],filter:{talkers:['a','b']}})
})
test('file bytes are not JSON-serialized when unwrapping reactive containers',async()=>{
  const blob=new Blob(['SQLite fixture bytes'])
  const data=reactive({files:[{file:blob,path:'message/message_0.db'}]})
  const cloned=structuredClone(toWorkerData(data))
  assert.equal(await cloned.files[0].file.text(),'SQLite fixture bytes')
  assert.equal(cloned.files[0].path,'message/message_0.db')
})
