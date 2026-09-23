import test from 'node:test'
import assert from 'node:assert/strict'
import { each } from '../src/lib/wcdb/sql.mjs'

test('zero-parameter metadata queries never call bind([])',async()=>{
  let final=false,steps=0,seen=[]
  const statement={parameterCount:0,bind(){throw new Error('This statement has no bindable parameters.')},step(){return ++steps===1},get(){return {id:'fixture'}},finalize(){final=true}}
  await each({prepare:()=>statement},'SELECT id FROM contact',[],row=>seen.push(row.id))
  assert.deepEqual(seen,['fixture']);assert.equal(final,true)
})
test('queries with parameters bind exactly once and always finalize',async()=>{
  let final=false,values
  const statement={parameterCount:1,bind(value){values=value},step(){throw new Error('fixture failure')},finalize(){final=true}}
  await assert.rejects(each({prepare:()=>statement},'SELECT ?',['fixture'],()=>{}),/fixture failure/)
  assert.deepEqual(values,['fixture']);assert.equal(final,true)
})
