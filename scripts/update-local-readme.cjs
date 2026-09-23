const fs=require('fs')
for (const [path,heading,section] of [
  ['README.md','## 功能',`## 两种数据来源\n\n**连接 chatlog HTTP 服务**，或在「数据来源」中**导入已经解密的本地微信 4.x SQLite 数据库**。本地解析在浏览器 Worker 中运行，不调用密钥提取工具，不上传聊天数据。联系人、会话、多分片消息、搜索、统计与媒体引用使用同一套页面。\n\n![本地数据库导入与覆盖报告，虚构数据运行截图](images/wcdb/sources.png)\n\n<details><summary>本地聊天、媒体与移动端</summary>\n\n![本地分片聊天记录](images/wcdb/chatlog.png)\n![本地媒体引用与附件关联](images/wcdb/media.png)\n<img src="images/wcdb/mobile-sources.png" width="320" alt="手机数据来源页面"/>\n\n</details>\n\n需要 HTTPS 或 localhost、OPFS 支持和存储权限；浏览器副本没有额外加密。选择目录时需确认是同一账号的明文一致快照。未知结构、缺失附件、字典压缩正文会明确提示，不承诺全部版本或完整历史恢复。截图仅使用合成 SQLite fixtures。\n\n导入方法、隐私边界、大小限制、兼容性与验证：[本地档案说明](docs/LOCAL-ARCHIVE.md)。\n\n`],
  ['README_EN.md','##',`## HTTP and local plaintext archives\n\nUse an existing chatlog HTTP service, or import already-decrypted WeChat 4.x SQLite files in **Data sources**. SQLite WASM runs inside a browser worker; this feature neither invokes key-extraction tools nor uploads chat data. All seven archive views share the selected source.\n\n![Local import report using fictional SQLite fixtures](images/wcdb/sources.png)\n\nLocal archives require HTTPS/localhost, OPFS support and storage permission. The browser copy is not additionally encrypted. Unknown schemas, unsupported dictionary compression and missing attachments are explicit states, not empty history. Only synthetic fixtures have been automatically validated; compatibility with every WeChat build and complete history recovery are not claimed.\n\nSee [local archive documentation](docs/LOCAL-ARCHIVE.md) for consent, storage, resource limits, media support and tests.\n\n`]
]) {
  let text=fs.readFileSync(path,'utf8')
  if (text.includes('docs/LOCAL-ARCHIVE.md')) continue
  const position=text.indexOf(heading)
  if(position<0)throw new Error('README section missing: '+path)
  text=text.slice(0,position)+section+text.slice(position)
  fs.writeFileSync(path,text)
}
