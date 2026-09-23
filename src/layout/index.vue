<template>
  <div class="app-shell">
    <button class="nav-backdrop" :class="{open:mobileOpen}" aria-label="关闭导航" @click="mobileOpen=false"/>
    <aside class="sidebar" :class="{open:mobileOpen}" :inert="isMobile&&!mobileOpen" aria-label="主导航">
      <button class="btn btn-ghost btn-square mobile-close" aria-label="关闭导航" @click="mobileOpen=false"><UiIcon name="close"/></button>
      <div class="brand"><BrandMark/><div><div class="brand-text">Chatlog<span style="font-weight:400">.</span></div><small>CONVERSATIONS, KEPT.</small></div></div>
      <button class="workspace-badge" @click="openSettings"><span class="small-square"><UiIcon name="folder" :size="16"/></span><span>我的聊天档案</span><UiIcon name="down" :size="13"/></button>
      <template v-for="group in navigation" :key="group.label"><div class="nav-label">{{ group.label }}</div><nav class="nav-group"><button v-for="item in group.items" :key="item.path" class="nav-item" :class="{active:route.path===item.path}" :aria-current="route.path===item.path?'page':undefined" @click="go(item.path)"><UiIcon :name="item.icon" :size="17"/><span>{{ item.label }}</span></button></nav></template>
      <div class="sidebar-footer"><button class="nav-item" @click="openSettings"><UiIcon name="settings" :size="17"/>连接设置</button><p class="privacy-note"><UiIcon name="shield" :size="12"/> 由你掌控的聊天档案<br>本地读取或连接你的服务</p><div class="profile"><UiAvatar name="我" small/><div><strong>我的工作空间</strong><small>Personal workspace</small></div><button class="btn btn-ghost btn-square" :aria-label="theme==='dark'?'切换浅色模式':'切换深色模式'" @click="toggleTheme"><UiIcon :name="theme==='dark'?'sun':'moon'" :size="16"/></button></div></div>
    </aside>
    <div class="main-shell" :inert="isMobile&&mobileOpen"><header class="topbar"><button class="btn btn-ghost btn-square mobile-menu-btn" aria-label="打开导航" :aria-expanded="mobileOpen" @click="mobileOpen=true"><UiIcon name="menu"/></button><div class="breadcrumb"><span class="breadcrumb-root">工作空间</span><UiIcon name="chevron" :size="11"/><strong>{{ currentTitle }}</strong></div><div class="topbar-actions"><button class="global-search" @click="openSearch"><UiIcon name="search" :size="16"/><span>搜索聊天内容</span><kbd>⌘ K</kbd></button><button class="btn btn-ghost connection-state" @click="openSettings"><i class="dot" :class="{offline:connectionLabel!=='已连接' && connectionLabel!=='本地档案' && !demoEnabled}"/>{{ connectionLabel }}</button><button class="btn btn-ghost btn-square" :aria-label="theme==='dark'?'切换浅色模式':'切换深色模式'" @click="toggleTheme"><UiIcon :name="theme==='dark'?'sun':'moon'" :size="17"/></button></div></header>
      <div v-if="demoEnabled" class="demo-banner"><UiIcon name="info" :size="12"/>演示模式 · 所有人物、对话和图表均为虚构样本，未连接你的聊天数据。<button @click="exitDemo">退出演示</button></div>
      <main id="main-content" class="page-content"><router-view :key="workspace.revision"/><footer class="page-footer"><span><UiIcon name="shield" :size="11"/>只读档案 · 不会发送消息</span><span>Chatlog Web · A quieter place for conversations</span></footer></main>
    </div>
    <UiDialog v-model="settingsOpen" title="连接你的聊天档案" eyebrow="YOUR DATA, YOUR CONTROL"><p class="scope-note">已有明文数据库？<router-link to="/sources" @click="settingsOpen=false">前往数据来源导入</router-link></p><form id="connection-form" @submit.prevent="saveConnection"><label class="field"><span>chatlog 服务地址</span><input v-model="endpoint" placeholder="http://127.0.0.1:5030" autocomplete="off" spellcheck="false"/><p>留空使用同源代理。连接远程服务时，请仅填写你信任的地址。</p></label><div class="notice"><UiIcon name="shield" :size="17"/><p>HTTP 模式只保存服务地址和外观设置，不缓存聊天正文。本地数据库模式由你确认后单独保存档案。HTTPS 网页连接 HTTP 服务可能被浏览器拦截。</p></div><p v-if="settingsError" class="error-text" role="alert">{{ settingsError }}</p><p v-if="demoEnabled" class="error-text">演示模式不会发送连接测试请求。退出演示后再连接真实数据。</p></form><template #footer><button class="btn" @click="settingsOpen=false">取消</button><button class="btn btn-primary" type="submit" form="connection-form" :disabled="demoEnabled">保存并重新连接</button></template></UiDialog>
    <UiDialog v-model="searchOpen" title="找回一段对话" eyebrow="SEARCH YOUR ARCHIVE"><form id="global-search-form" @submit.prevent="submitSearch"><label class="field"><span>搜索聊天内容</span><input ref="globalInput" v-model="globalKeyword" placeholder="输入你记得的一句话、一个关键词…" autofocus/><p>将跳转到聊天记录，搜索当前数据来源中的聊天内容。</p></label></form><template #footer><button class="btn" @click="searchOpen=false">取消</button><button class="btn btn-primary" type="submit" form="global-search-form" :disabled="!globalKeyword.trim()"><UiIcon name="search" :size="15"/>搜索</button></template></UiDialog>
    <div v-if="workspace.toast" class="toast" role="status" aria-live="polite">{{ workspace.toast }}</div>
  </div>
</template>
<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiIcon from '@/components/ui/UiIcon.vue'
import BrandMark from '@/components/ui/BrandMark.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { workspace, resetWorkspace, loadWorkspace, notify } from '@/lib/workspace'
import { demoEnabled } from '@/lib/demo'
import { getApiBase, setApiBase } from '@/api'
import { isLocal,selectSource } from '@/data-sources/source'
export default {name:'ArchiveLayout',components:{UiIcon,BrandMark,UiAvatar,UiDialog},setup(){
  const route=useRoute(),router=useRouter(),mobileOpen=ref(false),settingsOpen=ref(false),searchOpen=ref(false),globalKeyword=ref(''),globalInput=ref(null),endpoint=ref(''),settingsError=ref(''),theme=ref('light'),isMobile=ref(window.matchMedia('(max-width:760px)').matches)
  const navigation=[{label:'工作空间',items:[{path:'/sources',label:'数据来源',icon:'folder'},{path:'/dashboard',label:'总览',icon:'grid'},{path:'/analytics',label:'数据分析',icon:'chart'}]},{label:'我的档案',items:[{path:'/chatlog',label:'聊天记录',icon:'chat'},{path:'/contacts',label:'联系人',icon:'user'},{path:'/chatrooms',label:'群聊',icon:'users'},{path:'/sessions',label:'会话',icon:'inbox'},{path:'/media',label:'媒体库',icon:'image'}]}]
  const currentTitle=computed(()=>navigation.flatMap(g=>g.items).find(item=>item.path===route.path)?.label || '总览')
  const connectionLabel=computed(()=>demoEnabled?'演示数据':isLocal.value?'本地档案':workspace.loading?'正在连接':!workspace.ready?'尚未连接':Object.keys(workspace.errors).length===0?'已连接':Object.keys(workspace.errors).length===3?'连接失败':'部分可用')
  const go=path=>{router.push(path);mobileOpen.value=false}
  const openSettings=()=>{endpoint.value=getApiBase();settingsError.value='';settingsOpen.value=true;mobileOpen.value=false}
  const saveConnection=async()=>{try{setApiBase(endpoint.value);await selectSource('http');resetWorkspace();settingsOpen.value=false;await loadWorkspace();notify(Object.keys(workspace.errors).length?'部分数据未能读取，请查看页面提示。':'服务已连接')}catch(error){settingsError.value=error.message}}
  const toggleTheme=()=>{theme.value=theme.value==='dark'?'light':'dark';document.documentElement.dataset.theme=theme.value;try{localStorage.setItem('chatlog-ui-theme',theme.value)}catch(_){/* Optional persistence. */}}
  const openSearch=()=>{searchOpen.value=true;nextTick(()=>globalInput.value?.focus())}
  const submitSearch=()=>{const keyword=globalKeyword.value.trim();if(!keyword)return;searchOpen.value=false;go({path:'/chatlog',query:{keyword}})}
  const exitDemo=()=>{if(window.__CHATLOG_PREVIEW__){notify('这是离线演示包。将 src/ 应用到项目后，可连接真实服务。');return}const url=new URL(location.href);url.searchParams.delete('demo');location.assign(url.href)}
  const keyHandler=event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch()}if(event.key==='Escape')mobileOpen.value=false}
  const viewportChanged=()=>{isMobile.value=window.matchMedia('(max-width:760px)').matches;if(!isMobile.value)mobileOpen.value=false}
  onMounted(()=>{window.addEventListener('resize',viewportChanged);try{const stored=localStorage.getItem('chatlog-ui-theme');theme.value=stored==='dark'?'dark':'light'}catch(_){/* Use default. */}document.documentElement.dataset.theme=theme.value;document.addEventListener('keydown',keyHandler);loadWorkspace()})
  onUnmounted(()=>{document.removeEventListener('keydown',keyHandler);window.removeEventListener('resize',viewportChanged)})
  return{workspace,isMobile,route,navigation,currentTitle,mobileOpen,settingsOpen,searchOpen,endpoint,settingsError,globalKeyword,globalInput,theme,demoEnabled,connectionLabel,go,openSettings,saveConnection,toggleTheme,openSearch,submitSearch,exitDemo}
}}
</script>
