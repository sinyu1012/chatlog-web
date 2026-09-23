<template>
  <div class="local-media-page"><PageHeading eyebrow="BEYOND THE WORDS" title="媒体库" subtitle="本地档案中的媒体消息与已关联附件。"/>
    <div class="notice"><UiIcon name="info" :size="17"/><p>这里统计整个已导入索引中的媒体消息，不代表已找回原始文件。缺失、重名或不支持的附件可逐条处理。</p></div>
    <section class="panel local-media-panel"><div class="local-media-toolbar"><div class="segmented"><button v-for="option in options" :key="option.value" :class="{active:type===option.value}" @click="type=option.value">{{ option.label }} <small>{{ counts[option.value] || 0 }}</small></button></div><label class="search-field"><UiIcon name="search" :size="16"/><input v-model="query" placeholder="搜索附件或发送者" aria-label="搜索本地媒体"/></label></div>
      <div v-if="loading" class="source-progress" role="status">正在查询本地媒体…</div><p v-else-if="error" class="error-text" role="alert">{{ error }} <button class="text-button" @click="refresh">重试</button></p><p v-else-if="!items.length" class="source-empty">没有匹配的媒体记录。</p>
      <div v-else class="local-media-grid"><article v-for="item in items" :key="item.id" class="local-media-card"><LocalAttachment :attachment="item"/><div class="local-media-caption"><span>{{ item.sender }}</span><time>{{ formatTime(item.time) }}</time></div></article></div>
      <div class="local-media-pager"><span>共 {{ number(total) }} 条媒体消息 · 第 {{ page }} 页</span><button class="btn" :disabled="loading || page<=1" @click="page--">上一页</button><button class="btn" :disabled="loading || page*12>=total" @click="page++">下一页</button></div>
    </section>
  </div>
</template>
<script>
import { ref,watch,onMounted,onUnmounted } from 'vue'
import PageHeading from '@/components/ui/PageHeading.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import LocalAttachment from '@/components/LocalAttachment.vue'
import api from '@/api'
import { number,formatTime } from '@/lib/data'
export default {name:'LocalMedia',components:{PageHeading,UiIcon,LocalAttachment},setup(){
  const type=ref('all'),query=ref(''),page=ref(1),items=ref([]),counts=ref({}),total=ref(0),loading=ref(false),error=ref('')
  const options=[{value:'all',label:'全部'},{value:'image',label:'图片'},{value:'video',label:'视频'},{value:'voice',label:'语音'},{value:'file',label:'文件'}]
  let generation=0,alive=true,timer
  const refresh=async()=>{const current=++generation;loading.value=true;error.value='';try{const result=await api.getLocalMedia({type:type.value,query:query.value,limit:12,offset:(page.value-1)*12});if(alive && current===generation){items.value=result.data;counts.value=result.counts;total.value=result.total}}catch(e){if(alive && current===generation)error.value=e.message}finally{if(alive && current===generation)loading.value=false}}
  watch([type,query],()=>{clearTimeout(timer);page.value=1;timer=setTimeout(refresh,250)});watch(page,refresh)
  onMounted(refresh);onUnmounted(()=>{alive=false;generation++;clearTimeout(timer)})
  return {type,query,page,items,counts,total,loading,error,options,number,formatTime,refresh}
}}
</script>
