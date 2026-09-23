<template>
  <section class="local-attachment">
    <div class="local-attachment-title"><UiIcon :name="attachment.type==='voice'?'voice':attachment.type==='file'?'file':attachment.type"/><strong>{{ stored?.name || attachment.name }}</strong><small>{{ stored?.file ? '已关联本地文件' : stored?.ambiguous ? '同名文件有多个，请手动选择' : '未导入对应附件' }}</small></div>
    <div class="local-attachment-actions">
      <button v-if="stored?.file" class="btn btn-small" @click="loadPreview">{{ url ? '重新预览' : '预览 / 打开' }}</button>
      <button v-if="stored?.file" class="btn btn-small" @click="saveFile">保存文件</button>
      <label class="btn btn-small file-pick">关联文件<input type="file" aria-label="关联本地附件" @change="choose"/></label>
    </div>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <img v-if="url && mime.startsWith('image/')" :src="url" alt="本地附件预览" class="local-attachment-preview" @error="error='图片编码不受浏览器支持。'"/>
    <video v-else-if="url && mime.startsWith('video/')" :src="url" controls preload="metadata" class="local-attachment-preview" @error="error='视频编码不受浏览器支持，可保存后在本机打开。'"/>
    <audio v-else-if="url && mime.startsWith('audio/')" :src="url" controls @error="error='音频编码不受浏览器支持，可保存后在本机打开。'"/>
    <p v-if="unsupported" class="muted">暂不支持此格式的浏览器预览；可保存文件后在本机打开。不会尝试解密附件。</p>
  </section>
</template>
<script>
import { ref, watch, onUnmounted } from 'vue'
import UiIcon from './ui/UiIcon.vue'
import { findAttachment,associateFile,previewMime,attachmentRevision } from '@/data-sources/attachments'
export default {
  name:'LocalAttachment',components:{UiIcon},props:{attachment:{type:Object,required:true}},
  setup(props) {
    const stored=ref(null),url=ref(''),mime=ref(''),error=ref(''),unsupported=ref(false)
    let generation=0
    const release=()=>{if(url.value)URL.revokeObjectURL(url.value);url.value='';unsupported.value=false}
    watch([()=>props.attachment.id,attachmentRevision],async()=>{const current=++generation;release();try{const result=await findAttachment(props.attachment);if(current===generation)stored.value=result}catch(e){error.value=e.message}},{immediate:true})
    const choose=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{error.value='';await associateFile(props.attachment,file)}catch(e){error.value=e.message}}
    const loadPreview=async()=>{try{error.value='';release();const current=generation;const type=await previewMime(stored.value.file);if(current!==generation)return;mime.value=type;if(!type){unsupported.value=true;return}url.value=URL.createObjectURL(stored.value.file.slice(0,stored.value.file.size,type))}catch(e){error.value=e.message}}
    const saveFile=()=>{const file=stored.value?.file;if(!file)return;const blobUrl=URL.createObjectURL(file.slice(0,file.size,'application/octet-stream'));const link=document.createElement('a');link.href=blobUrl;link.download=stored.value.name || 'attachment';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(blobUrl),1000)}
    onUnmounted(()=>{generation++;release()})
    return {stored,url,mime,error,unsupported,choose,loadPreview,saveFile}
  }
}
</script>
