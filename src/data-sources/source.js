import { reactive, computed } from 'vue'
import { demoEnabled } from '@/lib/demo'
import { localRequest, stopLocal, localState } from './local-client'

let saved='http'
try { saved=localStorage.getItem('chatlog-data-source')==='local'?'local':'http' } catch (_) { /* Storage may be unavailable. */ }
export const sourceState=reactive({kind:saved,revision:0})
export const isLocal=computed(()=>!demoEnabled && sourceState.kind==='local')
export async function selectSource(kind) {
  if (!['local','http'].includes(kind)) throw new Error('未知数据来源。')
  if (demoEnabled) throw new Error('请先退出演示模式再切换真实数据。')
  if (localState.importing) throw new Error('请先完成或取消当前导入。')
  if (kind==='local') {
    const status=await localRequest('status')
    if (!status.ready) throw new Error('请先导入一个本地档案。')
  }
  sourceState.kind=kind;sourceState.revision++
  try {localStorage.setItem('chatlog-data-source',kind)} catch (_) { /* Session-only choice still works. */ }
  if (kind==='http') stopLocal()
}
