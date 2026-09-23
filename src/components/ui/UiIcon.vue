<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="ui-icon"><path v-for="(path, index) in paths" :key="index" :d="path" /></svg></template>
<script>
import icons from '@/lib/icons'
export default { name: 'UiIcon', props: { name: {type:String,default:'chat'}, size: {type:[String,Number],default:20} }, computed: { paths() { return icons[this.name] || icons.chat } } }
</script>
