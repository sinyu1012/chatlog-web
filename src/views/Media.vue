<template><LocalMedia v-if="isLocal"/><HttpMedia v-else/></template>
<script>
import { isLocal } from '@/data-sources/source'
import LocalMedia from './LocalMedia.vue'
import HttpMedia from './HttpMedia.vue'
export default {name:'Media',components:{LocalMedia,HttpMedia},setup(){return {isLocal}}}
</script>
