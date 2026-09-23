<template><span class="ui-avatar" :class="[tone, {large, small}]" aria-hidden="true"><UiIcon v-if="group" name="users" :size="large ? 25 : 19"/><template v-else>{{ initial }}</template></span></template>
<script>
import UiIcon from './UiIcon.vue'
export default { name:'UiAvatar', components:{UiIcon}, props:{name:{type:String,default:''},group:Boolean,large:Boolean,small:Boolean}, computed:{initial(){return Array.from(this.name)[0]||'?'},tone(){let h=0;for(const c of this.name) h=(h+c.codePointAt(0))%5;return 'tone-'+h}} }
</script>
