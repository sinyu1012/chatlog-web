# UI 重构验证说明

此文档描述可复现的验收范围。每个提交是否通过，以仓库 **UI validation** 工作流的实际运行结果为准，不把设计稿或离线原型结果当作生产构建通过。

## 核心逻辑

`node --test tests/core.test.mjs`：18 项无第三方依赖测试，覆盖 CSV 引号与多行、BOM、公式转义、URL 协议与凭据过滤、正则特殊字符字面高亮、多行消息、JSON 包装、稳定 ID、未知字段、日期范围、统计一致性、周一热力图和媒体去重。

## 构建与浏览器

```bash
npm install
npm run lint -- --no-fix src
npm run build
python -m pip install playwright==1.52.0
python -m playwright install --with-deps chromium
python tests/browser-smoke.py
```

浏览器脚本启动仅监听 127.0.0.1 的临时静态服务器，提供 SPA fallback，并运行真实 `dist/` 产物。使用明确虚构的 demo 数据，不访问用户后端。检查七页桌面与 390px 手机布局、直接路由加载、图片完整性、主题与持久化、分页、搜索、详情、导出、全局快捷搜索、媒体预览、移动导航、无后端请求和无未捕获异常。另以拦截 HTTP 响应分别验证真实模式连接失败与成功空数据。

成功后截图写入 `images/ui/`：七页桌面、媒体深色、三张手机。`manifest.json` 记录生产代码提交 SHA、固定演示时钟、已通过检查及浏览器错误。README 使用相对地址引用这些图，不依赖临时下载链接。

重构分支 push 的工作流仅在验证全部成功后提交截图，并检查分支 HEAD 未移动；不会 force-push。PR 和主分支验证是只读的。截图修改会使 PR 的最终提交再触发验证。

## 未覆盖与上线前检查

- 实际 chatlog 服务与不同版本返回字段、CORS、访问权限和媒体格式。
- 真实大数据量下的响应速度、分页总数头与服务端查询语义。
- Safari / iOS / Android 物理设备的浏览器与音视频兼容性。
- 生产反向代理鉴权、HTTPS，以及特定子目录部署的服务器配置。

图表及媒体是明确有限的样本；追加多关键词是当前页过滤。不要把测试通过表述为全量统计能力、真实后端验收或所有浏览器兼容性已完成。
