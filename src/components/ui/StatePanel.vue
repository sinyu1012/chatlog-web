<template><div class="state-panel" :class="kind" :role="kind === 'error' ? 'alert' : 'status'"><div v-if="kind==='loading'" class="skeleton-stack"><i/><i/><i/></div><template v-else><span class="state-art"><UiIcon :name="kind === 'error' ? 'server' : 'inbox'" :size="32"/></span><h3>{{ title || (kind==='error' ? '暂时无法读取数据' : '这里还没有内容') }}</h3><p>{{ description || (kind==='error' ? '检查 chatlog 服务是否已启动，然后重试。' : '试着调整筛选条件，或选择其他聊天对象。') }}</p><button v-if="kind==='error'" class="btn" @click="$emit('retry')"><UiIcon name="refresh" :size="16"/>重新加载</button><slot/></template></div></template>
<script>
import UiIcon from './UiIcon.vue'
export default {name:'StatePanel',components:{UiIcon},emits:['retry'],props:{kind:{type:String,default:'empty'},title:String,description:String}}
</script>
