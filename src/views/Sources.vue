<template>
  <div class="sources-page">
    <PageHeading eyebrow="YOUR DATA, YOUR CONTROL" title="数据来源" description="连接自己的服务，或把已经准备好的数据库留在本机。"/>
    <div class="source-options">
      <section class="panel source-option" :class="{selected:!isLocal}"><UiIcon name="link" :size="24"/><h2>chatlog HTTP 服务</h2><p>保留原来的连接方式，读取你配置的数据服务。</p><label class="field"><span>服务地址</span><input v-model="endpoint" placeholder="留空使用同源代理"/></label><button class="btn" :disabled="busy || demoEnabled" @click="useHttp">保存并使用 HTTP</button></section>
      <section class="panel source-option" :class="{selected:isLocal}"><UiIcon name="folder" :size="24"/><h2>本地微信 4.x 数据库</h2><p>只读明文 SQLite，不提取密钥、不启动外部工具、不上传聊天数据。</p><p class="source-status">{{ localState.ready ? localState.report?.name : '还没有本地档案' }}</p><button v-if="localState.ready" class="btn" :disabled="busy || demoEnabled" @click="activateLocal">{{ isLocal ? '重新读取本地档案' : '使用本地档案' }}</button><button v-else class="btn" :disabled="busy || demoEnabled" @click="refreshStatus">检查已保存的档案</button></section>
    </div>
    <section class="panel source-import">
      <div class="source-section-heading"><div><h2>导入一份聊天快照</h2><p>选择同一个账号的 contact、session、message 数据库目录，也可以选择多个 .db 文件。</p></div><span class="pill">本机处理</span></div>
      <p v-if="demoEnabled" class="notice">当前是演示模式。退出演示后才能选择真实文件；演示不会触发本地导入。</p>
      <div class="source-form-grid"><label class="field"><span>档案名称</span><input v-model="name" maxlength="80" placeholder="我的聊天档案"/></label><label class="field"><span>我的微信 ID（可选）</span><input v-model="selfId" maxlength="512" placeholder="不确定可留空，不猜测本人身份"/></label></div>
      <div class="source-file-actions"><label class="btn file-pick" :class="{disabled:busy || demoEnabled}"><UiIcon name="folder" :size="16"/>选择数据库文件夹<input type="file" webkitdirectory multiple :disabled="busy || demoEnabled" aria-label="选择数据库文件夹" @change="pick"/></label><label class="btn file-pick" :class="{disabled:busy || demoEnabled}">选择多个数据库<input type="file" multiple accept=".db" :disabled="busy || demoEnabled" aria-label="选择多个数据库" @change="pick"/></label><span class="muted">{{ files.length ? '已选择 '+files.length+' 个文件' : '尚未选择文件' }}</span></div>
      <label class="source-consent"><input v-model="snapshotConfirmed" type="checkbox" :disabled="busy"/>这些是我有权访问的、已解密且已合并 WAL 的同一账号快照。</label>
      <label class="source-consent"><input v-model="consent" type="checkbox" :disabled="busy"/>同意在当前浏览器保存解析后的聊天档案。原文件不会修改，浏览器副本并未额外加密，可随时清除。</label>
      <div class="notice"><UiIcon name="info" :size="17"/><p>支持范围由表结构探测决定，不保证包含全部历史。导入保护上限：128 个库、单库 2 GiB、合计 8 GiB、500 万条消息；这不是所有设备的性能承诺。密钥与口令 JSON 不会读取。</p></div>
      <div v-if="localState.importing" class="source-progress" role="status"><strong>{{ localState.progress?.phase || '正在打开本地存储' }}</strong><progress :value="localState.progress?.done || 0" :max="localState.progress?.total || 1"/><small>{{ localState.progress?.file }} · 已索引 {{ number(localState.progress?.messages || 0) }} 条消息</small></div>
      <div class="source-file-actions"><button class="btn btn-primary" :disabled="busy || demoEnabled || !files.length || !consent || !snapshotConfirmed" @click="startImport">{{ localState.ready ? '导入并替换当前档案' : '导入本地档案' }}</button><button v-if="localState.importing" class="btn" @click="cancelImport">取消导入</button></div>
      <p class="muted">新索引建立成功后才替换旧档案。解析不完整会显示报告，失败或取消会保留原档案。</p>
    </section>
    <p v-if="error" class="error-text source-error" role="alert">{{ error }}</p><p v-if="success" class="notice" role="status">{{ success }}</p>
    <section v-if="localState.ready" class="panel source-report">
      <div class="source-section-heading"><div><h2>导入报告</h2><p>{{ localState.report?.name }} · {{ localState.report?.importedAt }}</p></div><button class="btn" @click="saveReport">保存报告</button></div>
      <div class="source-metrics"><div><strong>{{ number(localState.report?.messages) }}</strong><span>已索引消息</span></div><div><strong>{{ number(localState.report?.sessions) }}</strong><span>会话</span></div><div><strong>{{ number(localState.report?.unparsed) }}</strong><span>正文未解析</span></div><div><strong>未知</strong><span>原始历史完整性</span></div></div>
      <p class="muted">可读消息范围：{{ localState.report?.firstMessageAt || '未知' }} ～ {{ localState.report?.lastMessageAt || '未知' }}。统计默认截止到档案中最新消息日期。</p>
      <p v-if="localState.report?.partial" class="notice">部分内容或数据库未能解析。现有记录已保留；缺失发送者、群主、成员数量不做猜测。</p>
      <details><summary>数据库与解析详情</summary><div class="source-report-files"><div v-for="file in localState.report?.files || []" :key="file.path"><strong>{{ file.path }}</strong><span>{{ file.state }} · {{ file.roles.join(' / ') }}</span><small v-if="file.reason">{{ file.reason }}</small></div></div><p>无法映射的消息表：{{ localState.report?.unmappedTables }}；跳过的表：{{ localState.report?.skippedTables.length }}；忽略的非数据库文件：{{ localState.report?.ignoredCount }}。详情见下载报告。</p></details>
      <div class="source-form-grid"><label class="field"><span>更新我的微信 ID</span><input v-model="selfId" maxlength="512" placeholder="留空使用可验证的发送状态"/></label><button class="btn" :disabled="busy" @click="saveIdentity">保存身份</button></div>
      <h3>可选：关联已经准备好的附件</h3><p>按唯一文件名或 32 位摘要文件名匹配；重名或缺失时可在消息中手动选择。不会解密 .dat，不会转换 SILK，不会自动访问远程资源。</p><label class="btn file-pick">选择附件目录<input type="file" webkitdirectory multiple :disabled="busy" aria-label="选择附件目录" @change="pickAttachments"/></label><p class="muted">附件副本保存在本机浏览器；一次最多 200 个 / 512 MiB，单文件不超过 128 MiB。</p>
      <div class="source-danger"><label class="source-consent"><input v-model="confirmClear" type="checkbox"/>确认清除当前浏览器中的档案索引和关联附件（不删除原文件）。</label><button class="btn" :disabled="busy || !confirmClear" @click="clearLocal">清除本地档案</button></div>
    </section>
  </div>
</template>
<script>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import PageHeading from '@/components/ui/PageHeading.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { isLocal, selectSource } from '@/data-sources/source'
import { localState,localRequest,importLocal,cancelImport } from '@/data-sources/local-client'
import { clearAttachments,importAttachmentFolder } from '@/data-sources/attachments'
import { getApiBase,setApiBase } from '@/api'
import { resetWorkspace,loadWorkspace } from '@/lib/workspace'
import { demoEnabled } from '@/lib/demo'
import { number,download } from '@/lib/data'
export default {
  name:'Sources',components:{PageHeading,UiIcon},setup(){
    const files=ref([]),name=ref('我的聊天档案'),selfId=ref(''),consent=ref(false),snapshotConfirmed=ref(false),confirmClear=ref(false),endpoint=ref(getApiBase()),error=ref(''),success=ref(''),working=ref(false)
    const busy=computed(()=>working.value || localState.importing)
    const run=async fn=>{error.value='';success.value='';working.value=true;try{await fn()}catch(e){error.value=e.message}finally{working.value=false}}
    const reload=async()=>{resetWorkspace();await loadWorkspace(true)}
    const refreshStatus=()=>run(async()=>{const result=await localRequest('status');selfId.value=result.selfId || ''})
    const activateLocal=()=>run(async()=>{await selectSource('local');await reload();success.value='已切换到本地档案。'})
    const useHttp=()=>run(async()=>{setApiBase(endpoint.value);await selectSource('http');await reload();success.value='已切换到 HTTP 数据服务。'})
    const pick=event=>{files.value=Array.from(event.target.files || []);event.target.value=''}
    const startImport=async()=>{
      error.value='';success.value='';const previous=localState.archiveId
      try {
        await importLocal(files.value,{name:name.value,selfId:selfId.value,consent:consent.value,snapshotConfirmed:snapshotConfirmed.value})
        await selectSource('local');await reload();files.value=[];success.value='本地档案已建立，请查看导入报告。'
        if(previous && previous!==localState.archiveId)try{await clearAttachments(previous)}catch(_){success.value+='旧附件缓存清理失败，请检查浏览器站点存储。'}
      }catch(e){error.value=e.message}
    }
    const saveIdentity=()=>run(async()=>{await localRequest('self',{id:selfId.value});if(isLocal.value)await reload();success.value='身份设置已保存。'})
    const pickAttachments=event=>{const selected=Array.from(event.target.files || []);event.target.value='';if(!selected.length)return;run(async()=>{const count=await importAttachmentFolder(localState.archiveId,selected);success.value='已保存 '+count+' 个本地附件。'})}
    const clearLocal=()=>run(async()=>{const archive=localState.archiveId;await clearAttachments(archive);await localRequest('clear');confirmClear.value=false;selfId.value='';resetWorkspace();success.value='浏览器中的本地档案已清除，原文件未修改。'})
    const saveReport=()=>download(JSON.stringify(localState.report,null,2),'chatlog-import-report.json','application/json')
    const preventLeave=event=>{if(localState.importing){event.preventDefault();event.returnValue=''}}
    onMounted(()=>{window.addEventListener('beforeunload',preventLeave);if(!demoEnabled)refreshStatus()})
    onBeforeUnmount(()=>window.removeEventListener('beforeunload',preventLeave))
    return {files,name,selfId,consent,snapshotConfirmed,confirmClear,endpoint,error,success,busy,isLocal,localState,demoEnabled,number,pick,startImport,cancelImport,refreshStatus,activateLocal,useHttp,saveIdentity,pickAttachments,clearLocal,saveReport}
  }
}
</script>
