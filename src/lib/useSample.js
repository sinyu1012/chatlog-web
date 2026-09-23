import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { loadSample } from './workspace'
import { analyze } from './data'
import { clock } from './demo'
export default function useSample(initial=30){
 const days=ref(initial),sample=ref(null),loading=ref(true),error=ref('');let sequence=0,alive=true
 const refresh=async(force=false)=>{const current=++sequence;loading.value=true;error.value='';try{const result=await loadSample(days.value,force);if(alive&&current===sequence)sample.value=result}catch(e){if(alive&&current===sequence){error.value=e.message;sample.value=null}}finally{if(alive&&current===sequence)loading.value=false}}
 const stats=computed(()=>sample.value?.stats || analyze(sample.value?.logs||[],days.value,clock()))
 watch(days,()=>refresh());onMounted(()=>refresh());onUnmounted(()=>{alive=false;sequence++})
 return {days,sample,loading,error,stats,refresh}
}
