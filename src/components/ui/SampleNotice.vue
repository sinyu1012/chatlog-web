<template>
  <div v-if="sample?.local" class="notice" :class="{warning:sample.report?.partial}"><UiIcon name="info" :size="15"/><p>本地索引：截至 {{ sample.end?.slice(0,10) }} 的 {{ sample.days }} 天，覆盖已导入的 {{ sample.totalSessions }} 个会话。{{ sample.stats?.unparsed || 0 }} 条正文未解析，仍计入消息数但不参与词频和正文搜索。原始历史完整性未知，不代表恢复了全部聊天。{{ sample.stats?.wordLimit ? '词频达到 20,000 个不同词的内存上限，话题列表为受限统计。' : '' }}</p></div>
  <div v-else-if="sample" class="notice" :class="{warning:sample.failures.length||sample.capped.length}"><UiIcon name="info" :size="15"/><p>样本范围：近 {{ sample.days }} 天 · 最近 {{ sample.sessions }} / {{ sample.totalSessions }} 个会话 · 每会话最多 1,000 条。{{ sample.failures.length?`${sample.failures.length} 个会话读取失败。`:'' }}{{ sample.capped.length?`${sample.capped.length} 个会话达到读取上限。`:'' }}不代表全量聊天记录。</p></div>
</template>
<script>
import UiIcon from './UiIcon.vue'
export default {name:'SampleNotice',components:{UiIcon},props:{sample:Object}}
</script>
