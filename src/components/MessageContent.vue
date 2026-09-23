<template>
  <div v-if="message?.source==='local-wcdb'" class="message-rich">
    <span style="white-space:pre-wrap"><template v-for="(piece,index) in pieces" :key="index"><mark v-if="piece.match">{{ piece.value }}</mark><template v-else>{{ piece.value }}</template></template></span>
    <LocalAttachment v-for="attachment in message.attachments || []" :key="attachment.id" :attachment="attachment"/>
    <small v-if="message.decodeStatus!=='ok'" class="muted">该记录已保留；正文暂不参与关键词搜索。</small>
  </div>
  <HttpMessageContent v-else :content="content" :keywords="keywords"/>
</template>
<script>
import { computed } from 'vue'
import { highlightParts } from '@/lib/data'
import HttpMessageContent from './HttpMessageContent.vue'
import LocalAttachment from './LocalAttachment.vue'
export default {name:'MessageContent',components:{HttpMessageContent,LocalAttachment},props:{message:Object,content:String,keywords:{type:Array,default:()=>[]}},setup(props){return {pieces:computed(()=>highlightParts(props.content || '',props.keywords))}}}
</script>
