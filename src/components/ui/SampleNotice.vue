<template><div v-if="sample" class="notice" :class="{warning:sample.failures.length||sample.capped.length}"><UiIcon name="info" :size="15"/><p>样本范围：近 {{ sample.days }} 天 · 最近 {{ sample.sessions }} / {{ sample.totalSessions }} 个会话 · 每会话最多 1,000 条。{{ sample.failures.length?`${sample.failures.length} 个会话读取失败。`:'' }}{{ sample.capped.length?`${sample.capped.length} 个会话达到读取上限。`:'' }}不代表全量聊天记录。</p></div></template>
<script>
import UiIcon from './UiIcon.vue'
export default {name:'SampleNotice',components:{UiIcon},props:{sample:Object}}
</script>
