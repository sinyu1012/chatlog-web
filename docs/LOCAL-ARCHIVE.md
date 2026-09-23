# Local plaintext WeChat 4.x archives

This adapter reads data that the user has already prepared. It does not depend on, invoke, install, or reproduce wcdb-key-tool's extraction/decryption functionality. No process access, keys, passwords, account access, or database decryption is implemented.

## 使用方式

1. 在 HTTPS 站点或 `http://localhost:8080` 打开应用，进入「数据来源」。
2. 选择同一账号的已解密数据库目录，或多个 `.db` 文件。典型文件为 `contact/contact.db`、`session/session.db`、`message/message_*.db`。识别以表结构为准。
3. 确认文件来自自己有权访问的数据，是已合并 WAL 的一致明文快照，并同意在浏览器保存解析后的档案。可以设置显示名称和自己的微信 ID。
4. 等待识别、解码、索引完成。成功后自动切换到本地来源，七个页面使用该档案。读取失败或取消不替换现有档案；部分库或表无法读取会明确写入导入报告。
5. 可选关联已经准备好的附件目录，或在媒体消息中逐条关联。清除入口只删除当前浏览器中的本地档案索引和关联附件，不修改源文件。

## 当前读取范围

- `contact` / `stranger` 的 `username`、昵称、备注；`SessionTable` 与 `SessionNoContactInfoTable`。
- 多个消息库的 `Msg_<md5(username)>`，按分片自己的 `Name2Id` 解析发送者。`SendInfo` 存在且结构匹配时读取发送状态；不通过固定 rowid 猜测「我」。
- 普通 UTF-8、受限单帧无字典 Zstd，WCDB `WCDB_CT_` 类型标记。消息 ID 包含档案、源分片、表和行身份，64 位 ID 保留为字符串。
- 消息列表、中文短词和字面量子串搜索、AND/OR 多关键词、分页、CSV/JSON/文本导出。追加筛选发生在本地索引层，而不是当前页。
- 统计遍历选定日期范围内整个已导入索引，默认截止到档案最新消息日期。未解码正文仍计入消息数量，不参与正文搜索、词频。词频最多保存 20,000 个不同词，达到上限会在界面提示。
- 媒体消息引用与手动/唯一文件名关联；图片与部分浏览器支持的音视频可预览，其他文件可保存。重名不会随意匹配。

## 明确不承诺

数据库结构是社区观测到的微信 4.x 结构，不是微信官方稳定接口。不同平台、具体版本和私人数据库需要单独验证。只有合成明文 SQLite fixtures 被用于自动验收。

字典 Zstd、未知压缩标记、超过正文安全限额的内容显示「正文暂未解析」。复杂 XML 只提取少量安全显示字段；不承诺完整引用嵌套、红包、小程序、表情或所有应用消息恢复。群主和成员数量无法可靠取得时为未知，不随机生成。

`.dat` 解密、SILK 转码、密钥提取、加密 SQLite/WAL 解密均不在此功能内。无法解析文件不是「空聊天」。输入不包含非空 WAL 也不能证明历史完整；报告始终保留快照完整性未知的说明。

## 存储、安全与部署

- SQLite 官方 WASM 在专用 Worker 中运行，使用 OPFS SAH pool，不要求为此开启 COOP/COEP。需要安全上下文、OPFS 权限和可用存储配额；不支持时明确报错，不回退上传。
- 每个来源的查询经过统一 API facade；HTTP 模式保持原来行为，本地模式不访问聊天后端。站点仍需加载同源 JavaScript/WASM 静态资源，不能把「不上传数据」等同于已实现离线 PWA。
- 解析后的正文保存在当前 origin 的 OPFS，用户明确关联的附件保存在 IndexedDB，二者没有额外应用层加密。请信任部署来源，不使用不可信公共电脑。浏览器可以回收站点数据；源文件应自行保留备份。
- SAH pool 有单标签访问约束。占用冲突会提示关闭其他档案标签页，不会绕过锁或并发写同一个索引。
- 输入库只读访问；禁用可信 schema 和不必要操作，限制 SQLite 资源、SQL 执行时长、解压窗口和正文长度。所有聊天内容用文本节点显示，CSV 防公式注入；外部媒体不会在本地模式自动请求。
- 导入在临时新索引完成后切换 catalog 指针；中途失败、取消和重启会保留旧档案并清理未发布的临时索引。

保护上限：128 库 / 单库 2 GiB / 总计 8 GiB / 500 万条消息；正文 1 MiB、Zstd 窗口 8 MiB；单次查询/导出 5,000 条；附件单次 200 个 / 512 MiB、单文件 128 MiB。上限用于拒绝明显超预算任务，不代表所有设备都有相应性能。大档案会消耗浏览器存储和处理时间，目前子串查询不是全文倒排索引。

## 代码结构与验证

- `src/api/http.js` / `src/api/index.js`: existing HTTP adapter and source facade.
- `src/data-sources/`: source selection, worker client, consent-based attachment store.
- `src/workers/wcdb.worker.js`: serialized local RPC, cancellation, bounded work.
- `src/lib/wcdb/`: schema probing, source parsing, column decompression, index, queries and statistics.
- `src/views/Sources.vue`, `LocalMedia.vue`, `components/LocalAttachment.vue`: import and local media UI.

Run `node --test tests/*.test.mjs`, `npm run lint -- --no-fix src`, `npm run build`, `python tests/browser-smoke.py`, and `python tests/browser-local.py`. Python browser tests require Playwright Chromium and Pillow. `tests/make-local-fixtures.py` only generates fictional databases. Screenshots in `images/wcdb/` come from production builds with those fixtures; see the generated manifest for the checks actually completed.

## Primary references

- https://sqlite.org/wasm/doc/trunk/persistence.md
- https://sqlite.org/wasm/doc/trunk/api-oo1.md
- https://sqlite.org/security.html
- https://sqlite.org/wal.html
- https://github.com/Tencent/wcdb/blob/master/src/common/core/compression/CompressionConst.hpp
- https://github.com/101arrowz/fzstd
- https://github.com/lopleec/wxchat-export (schema reference only; its extraction/runtime is not included)
