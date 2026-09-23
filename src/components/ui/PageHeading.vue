<template><header class="page-heading"><div><div class="eyebrow">{{ eyebrow }}</div><h1>{{ title }}<span v-if="count !== null" class="title-count">{{ count }}</span></h1><p v-if="description">{{ description }}</p></div><div class="heading-actions"><slot/></div></header></template>
<script>
export default {name:'PageHeading',props:{eyebrow:{type:String,default:'YOUR CONVERSATION ARCHIVE'},title:String,description:String,count:{type:[String,Number],default:null}}}
</script>
