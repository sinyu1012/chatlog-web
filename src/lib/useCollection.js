import { ref, computed, watch, onMounted } from 'vue'
import { workspace, loadWorkspace } from './workspace'
export function useCollection(kind){
  const query=ref(''),page=ref(1),size=ref(12)
  const items=computed(()=>workspace[kind])
  const filtered=computed(()=>{const q=query.value.trim().toLowerCase();return !q?items.value:items.value.filter(item=>[item.name,item.id,item.nickname,item.alias,item.remark,item.owner].some(value=>String(value||'').toLowerCase().includes(q)))})
  const paged=computed(()=>filtered.value.slice((page.value-1)*size.value,page.value*size.value))
  watch([query,size,()=>items.value.length],()=>{page.value=1})
  const refresh=()=>loadWorkspace(true)
  onMounted(()=>loadWorkspace())
  return {workspace,query,page,size,items,filtered,paged,refresh}
}
