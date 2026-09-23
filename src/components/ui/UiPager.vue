<template><nav class="ui-pager" aria-label="分页"><span>{{ total === null ? '未提供全量总数' : '共 '+total+' 条' }}<template v-if="total !== null"> · {{ size }} 条/页</template></span><div><button class="btn btn-square" aria-label="上一页" :disabled="page<=1 || busy" @click="$emit('change',page-1)"><UiIcon class="rotate-180" name="chevron" :size="17"/></button><span class="page-indicator">{{ page }}<template v-if="total !== null"> / {{ Math.max(1,Math.ceil(total/size)) }}</template></span><button class="btn btn-square" aria-label="下一页" :disabled="busy || (total === null ? !hasNext : page*size>=total)" @click="$emit('change',page+1)"><UiIcon name="chevron" :size="17"/></button></div></nav></template>
<script>
import UiIcon from './UiIcon.vue'
export default {name:'UiPager',components:{UiIcon},emits:['change'],props:{page:{type:Number,default:1},size:{type:Number,default:20},total:{type:Number,default:null},hasNext:Boolean,busy:Boolean}}
</script>
