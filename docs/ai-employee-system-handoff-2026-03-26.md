# AI 员工系统交接文档

更新时间：2026-03-26

仓库路径：
- `C:\Users\45441\.openclaw\workspace\external\openclaw-control-center`

运行家目录：
- `C:\Users\45441\.openclaw`

建议配套阅读：
- `README.md` 里的“AI 员工系统扩展与接手入口”
- `docs/ai-employee-system-handoff-2026-03-24.md`
- `docs/ai-employee-system-handoff-2026-03-21.md`

## 1. 这份文档是给谁看的
这份文档不是产品介绍，也不是 changelog，而是给下一位继续接手这个 AI 员工系统的开发者看的真实交接材料。

它主要回答这些问题：
- 这个项目现在到底应该按什么语义来理解
- 当前已经稳定下来的关键能力是什么
- 最近这几轮改动主要落在哪些区域
- 哪些约束绝对不能被“顺手优化”掉
- 现在已经验证过什么，还剩哪些已知边界
- 下一位最应该先看哪些文件、先做什么

## 2. 当前总状态
截至 2026-03-26，这个项目已经不能再按“普通 OpenClaw 控制中心”来理解，而应按“运行在 OpenClaw 之上的本地 AI 员工系统”来理解。

当前已经固定下来的核心语义是：
- `main` 就是 Jarvis，不是普通主线程标签
- 新建对话 = 新建一个协作 room，不是开一个 Jarvis 私聊壳
- 右下角协作群聊 = 当前 room 的共享时间线，不是 Jarvis 单聊镜像
- 员工上下文必须走受控注入，不能自由扫描全历史、全房间、全仓库
- Jarvis 等用户确认时必须记为 `waitingFor:user_confirmation`，不是 `stalled`，也不是 `completed`

最近几次关键提交基线是：
- `bed6f3e fix: harden room-scoped collaboration recovery`
- `c893713 feat: add geo suite feature workspace`
- `0b28d2a Stabilize collaboration rooms and task workflows`
- `f296988 Merge AI employee notes into main readme`
- `5e7c3f4 Add AI handoff and system readme`

本次交接前的工作树里，除了上面这些已提交基线，还包含一批继续收口中的改动，重点集中在：
- 协作房间删除后的会话清理与读模型过滤
- 房间型会话入口统一弹右下角协作群聊，而不是再跳旧 session detail 页
- 任务页、队列页、卡片页的 UI 收口与房间打开动作统一
- GEO 套件页面和受控 standalone runner

## 3. 用户硬约束

### 3.1 群聊功能是核心功能
右下角协作群聊不是装饰，也不是未来可以删掉的实验 UI。

不要做这些事：
- 不要删除、隐藏或弱化右下角协作群聊
- 不要把它降级成辅助小窗
- 不要把它改回“只看 Jarvis 回复”的私聊镜像
- 不要让“查看详情”默认跳走页面，而不是优先打开对应 room

### 3.2 协作可靠性优先于纯 UI 美化
当前系统的第一优先级始终是协作链路稳定，而不是先做视觉重构。

继续遵守的顺序是：
1. 先保 room 语义、共享时间线、流式回复、终止、恢复
2. 再保任务和协作入口的一致性
3. 最后才做 UI 收口和视觉整理

### 3.3 员工不能无边界自动读全仓库
这个系统允许自动上下文注入，但不允许无边界扫描。

不要做这些事：
- 不要让员工自动扫描全历史消息
- 不要让员工自动扫描所有 room
- 不要让员工自动扫描整个仓库
- 不要为了“更聪明”把受控注入退回成开放检索

### 3.4 `waitingFor:user_confirmation` 语义不能被改坏
当前代码里，这条语义已经贯穿协作调度与心跳恢复链路：
- `src/ui/server-collaboration-chat.ts`
- `src/runtime/heart-rate-monitor.ts`
- `src/runtime/collaboration-room.ts`

这意味着：
- Jarvis 明确在等用户确认时，任务仍可能保持 `in_progress`
- 心跳恢复不应把这类状态当成 stalled 候选
- 不要把它误清成 done、approved、completed

### 3.5 这是 Windows / PowerShell 下真实运行的系统
这个项目不是只在类 Unix 环境里跑的理想化仓库。

要继续尊重这些现实约束：
- Windows PowerShell 是第一现场
- OpenClaw 本体在用户家目录运行
- 很多路径是绝对 Windows 路径，不能随意“跨平台重写”
- `C:\Users\45441\.openclaw` 是运行家目录，不是源码仓库

## 4. 你现在面对的真实项目结构

### 4.1 UI 层
最重要的入口文件：
- `src/ui/server.ts`
  - HTTP 入口、页面总装配、API 分发、dashboard section 路由
- `src/ui/server-navigation.ts`
  - section / feature 路由、详情页链接构造
- `src/ui/server-collaboration-chat.ts`
  - 派工、prompt 注入、Jarvis/员工回复、流式 turn、终止、回填
- `src/ui/server-collaboration-room.ts`
  - room 视图、共享时间线合并、协作事件与 transcript 归一
- `src/ui/server-task-pages.ts`
  - 任务工作台、卡片/列表视图、分页、房间打开按钮
- `src/ui/server-insight-panels.ts`
  - 用量页与“上下文压力”等洞察卡片
- `src/ui/server-features.ts`
  - 左侧“功能”页、GEO 套件页
- `src/ui/server-inline-scripts-collaboration-room-open.ts`
  - 全局 `openclaw:collaboration-room-open` 事件桥
- `src/ui/server-session-room-links.ts`
  - 新增的 room-scoped session 链接 helper，负责把普通入口统一改成弹房间

### 4.2 协作调度与 room 层
这些文件是 AI 员工系统的核心，不是一般页面脚本：
- `src/runtime/collaboration-room.ts`
  - room canonical store、task receipt、manual outcome、room 事件
- `src/runtime/collaboration-project-memory.ts`
  - 项目记忆 scaffold、项目级上下文组织
- `src/runtime/openclaw-chat-rooms.ts`
  - OpenClaw transcript room、active room、room 删除与房间级 session 清理
- `src/ui/server-read-model.ts`
  - UI 读模型聚合、live merge、deleted room 过滤
- `src/runtime/heart-rate-monitor.ts`
  - 恢复候选判断、等待确认态保护、协作状态归类

### 4.3 OpenClaw 客户端与流式链路
- `src/clients/openclaw-live-client.ts`
  - gateway stream / `/v1/responses` / CLI fallback 编排
  - 已包含 gateway final timeout 后的延迟恢复逻辑
  - 已包含从 session history 追回最终 assistant reply 的逻辑
- `src/clients/openclaw-gateway-stream.ts`
  - `connect.challenge`、`chat.send`、`chat.abort`
  - gateway final grace 与终止链路在这里

### 4.4 GEO 功能层
- `src/runtime/geo-audit.ts`
  - 受控 standalone GEO runner
  - 固定仓库根目录
  - 固定 artifact 白名单
  - 当前 v1 为单活并发模型
- `src/runtime/geo-suite.ts`
  - GEO 摘要与模块视图组织
- `src/ui/server-features.ts`
  - `/?section=features&feature=geo`
  - 首屏极简 GEO 套件页

## 5. 本轮已经确认落地的关键能力

### 5.1 room-scoped 协作恢复更稳了
最近一轮协作稳定性改动，重点不是“多加几条 if”，而是把 room 级语义重新拉齐。

已经明确落地的点：
- 删除协作房间时，会同步清理 `thread:collab-*` 的 room-scoped session store 项
- UI 读模型在 snapshot/live merge 时会过滤已删除 room 对应的协作 session
- 读模型 cache invalidation 已纳入 collaboration room stamp

直接相关文件：
- `src/runtime/openclaw-chat-rooms.ts`
- `src/ui/server-read-model.ts`
- `src/ui/server.ts`
- `test/openclaw-chat-rooms.test.ts`
- `test/server-read-model.test.ts`

### 5.2 旧的“原始 session detail 跳转”已开始统一收口
这是一类非常高频、也非常破坏当前产品语义的旧行为：很多面板把 `agent:*:thread:collab-*` 仍当普通 session 链接处理，点击后直接跳旧详情页。

这轮已经新增共享 helper：
- `src/ui/server-session-room-links.ts`

它做的事情是：
- 识别 room-scoped collaboration session key
- 普通入口优先挂 `data-collaboration-room-open`
- 默认点击直接弹右下角协作群聊对应 room
- 原始 session detail 页仍保留给明确标记为 `Session page / 会话详情页` 的调试入口

这轮已接入的高频入口包括：
- 用量页“上下文压力”
- 任务详情里的 session list 与 session evidence
- 执行链卡片
- 协作线程折叠 runs 列表
- 概览页最近会话
- 用量页工具调用 session 列表

直接相关文件：
- `src/ui/server-insight-panels.ts`
- `src/ui/server-task-pages.ts`
- `src/ui/server-detail-pages.ts`
- `src/ui/server-team-panels.ts`
- `src/ui/server.ts`
- `test/session-room-links.test.ts`

### 5.3 `waitingFor:user_confirmation` 保护链路已经固定
这条语义现在不是“文案约定”，而是代码层真实生效：
- `src/ui/server-collaboration-chat.ts` 里会把 Jarvis 等用户确认的回复记成 `waitingFor: "user_confirmation"`
- `src/runtime/heart-rate-monitor.ts` 会识别并豁免这类 receipt
- `src/runtime/collaboration-room.ts` 的 receipt schema 也已经固定支持这条语义

实际效果：
- Jarvis 等用户时不会再被误报成 stalled / blocked / completed
- 后续恢复逻辑不会把这类 room 当成自动接管目标

### 5.4 任务页已经不再是原先那种多块重复堆叠
任务工作台这块已经发生过比较大的一轮收口，当前方向是“先服务处理动作，再服务诊断”。

当前应该按这个理解：
- 任务与排程是主工作区
- 待处理队列是任务操作流的一部分，不再是另一个平级大页面
- 卡片/列表视图、本地分页、批量删除、房间打开动作都在往统一交互收口
- 任务与协作 room 的跳转要尽量统一到右下角房间弹层

直接相关文件：
- `src/ui/server-task-pages.ts`
- `src/ui/server-inline-scripts-task-board.ts`
- `src/ui/server.ts`

### 5.5 GEO 功能页不是空壳，而是受控接入 standalone 工具
GEO 这一块已经不是“预留菜单入口”，而是有真实 runtime 的功能页。

当前已固定下来的实现边界：
- 左侧栏存在 `功能`
- `GEO` 是第一张功能卡
- `/?section=features&feature=geo` 是 GEO 套件页
- UI 不重写 GEO 仓库逻辑，而是受控调用固定 repo 下的 `run-standalone-audit.ps1`
- artifact 读取是白名单，不允许任意路径越界
- v1 并发策略是单活，一次只跑一个 audit

直接相关文件：
- `src/runtime/geo-audit.ts`
- `src/runtime/geo-suite.ts`
- `src/ui/server-features.ts`
- `src/ui/server.ts`

### 5.6 OpenClaw 3.23 之后，流式“超时但后台仍在产出”这类问题已有专门补强
这轮和 OpenClaw 升级相关、且最值得记住的一点是：不能再把“gateway final 没来”简单等价成“没有最终结果”。

当前代码层已经存在这些补强：
- `openclaw-live-client.ts` 中把 gateway final timeout 的历史恢复窗口扩到 30 秒
- 对“Gateway chat stream timed out before a final event arrived”有单独识别逻辑
- agent turn 完成后，会回看 session history 去找最终 assistant reply
- 如果 session history 里追回了最终回复，就以追回结果纠正 UI 层看到的“失败”

这部分不是纯描述，代码里已经能看到：
- `GATEWAY_FINAL_TIMEOUT_SESSION_HISTORY_RECOVERY_TIMEOUT_MS = 30_000`
- `maybeRecoverFinalAssistantReplyFromSessionHistory(...)`
- `buildSessionHistoryRecoveryPlan(...)`

## 6. GEO 套件当前真实工作原理
这一块非常容易被下一个接手者误解成“我们自己重写了一套 GEO 审计引擎”，但事实不是这样。

当前 GEO 套件的真实工作方式是：
1. AI 员工系统提供功能页和受控 API
2. runtime 固定指向 GEO 仓库
3. 通过 Windows PowerShell 调现成的 `run-standalone-audit.ps1`
4. 把运行态、stdout/stderr 尾部、退出码、白名单产物登记到员工系统自己的 `runtime/geo-audits/`
5. 前端只负责表单、状态、摘要、预览和下载，不改写实际审计逻辑

这块的硬边界是：
- 只允许固定仓库根目录
- 只允许固定脚本入口
- 只允许白名单产物名
- 不自动创建任务卡
- 不自动创建 room
- 不自动放开扫描边界

## 7. 当前 UI / 交互语义最容易再被改坏的点

### 7.1 “查看详情”不等于“去一个独立详情页”
对房间型协作对象来说，默认动作应该是：
- 打开右下角协作群聊对应 room

不是：
- 整页跳转到一个老式 session detail 页面

因此后续如果再做新卡片、新表格、新摘要行，优先复用：
- `src/ui/server-session-room-links.ts`
- `src/ui/server-inline-scripts-collaboration-room-open.ts`

### 7.2 共享群聊不是主聊天页的镜像
当前系统里，右下角协作群聊应该继续保持：
- room 级共享时间线
- transcript-first
- 多员工可见
- 与 Jarvis 单聊视角分离

不要为了“简单复用现有聊天组件”把它退化掉。

### 7.3 明确区分“普通入口”和“调试入口”
当前保留原始 session detail 页是有意为之。

应该继续这样分层：
- 普通操作入口：优先弹协作 room
- 显式标为 `Session page / 会话详情页` 的入口：保留原始调试页

## 8. 当前已验证状态

### 8.1 本轮实跑通过的命令
本轮已经实际跑过并通过：

```powershell
node --import tsx --test test/session-room-links.test.ts test/server-read-model.test.ts test/openclaw-chat-rooms.test.ts test/office-roster.test.ts
npm run build
```

结果：
- 关键 room 清理 / 读模型过滤 / session-room-links 回归测试通过
- TypeScript 构建通过

### 8.2 这轮新增或更新的关键测试
- `test/session-room-links.test.ts`
  - 校验 room-scoped session key 到 roomId 的提取
  - 校验 context pressure / task detail / execution chain 会挂 room open 钩子
- `test/server-read-model.test.ts`
  - 校验 deleted room 的 collab session 会被读模型过滤
- `test/openclaw-chat-rooms.test.ts`
  - 校验删除 room 会清理 room-scoped session store 项

## 9. 当前工作树与提交状态
如果你是在这份交接文档刚写完、但还没提交前接手，先做这两步：
1. `git status --short`
2. `git log --oneline -8`

你应该重点关注这些新增或最近变更的文件：
- `src/ui/server-session-room-links.ts`
- `src/ui/server-inline-scripts-collaboration-room-open.ts`
- `src/runtime/openclaw-chat-rooms.ts`
- `src/ui/server-read-model.ts`
- `src/ui/server-insight-panels.ts`
- `src/ui/server-task-pages.ts`
- `src/ui/server-team-panels.ts`
- `src/ui/server.ts`
- `test/session-room-links.test.ts`
- `test/server-read-model.test.ts`

如果你是在本文写完之后、且工作树已经被整理提交后接手，那么以最新提交为准；如果又重新变脏，优先视为“新的在途改动”，不要拿旧文档反向覆盖。

## 10. 已知边界与坑

### 10.1 仍然保留原始 session detail 页是刻意的
不要把“还存在 session detail 页”误解成“系统还没改完”。

当前保留它的原因是：
- 调试链路仍需要原始页
- 某些内部证据页仍需要直接看 raw history
- 但普通用户入口不该默认走它

### 10.2 还不是真正原生 token 级 UI 流
当前协作流式体验已经比最早稳定很多，但本质上仍是：
- upstream stream
- server live draft
- room SSE 快照流

它还不是：
- 上游直接 token callback 到 UI

所以后续如果继续提升流式体验，正确方向是争取上游稳定 session/event stream，而不是继续堆更多本地轮询伪流式。

### 10.3 PowerShell 看中文文档可能出现乱码
旧文档在某些 PowerShell 输出里会出现乱码显示问题，这不是仓库文件本身坏了。

不要因为控制台乱码就误判：
- README 坏了
- docs 编码坏了
- Git 把文件弄坏了

### 10.4 `C:\Users\45441\.openclaw` 不是给你 `git clean` 的
这是运行家目录，不是源码仓库。

真正要维护 Git 干净度的地方是：
- `workspace/external/openclaw-control-center`

### 10.5 GEO v1 仍然是受控单活 runner
当前不要把 GEO 套件理解成一个完整的多任务平台。

现实边界是：
- 一次只允许一个 GEO run
- 不做完整历史管理页
- 不自动创建 room / task / 分发链路

## 11. 下一阶段建议顺序

### 11.1 第一优先：继续守住协作稳定性
下一个阶段最值得继续做的是：
- 新建 room 的长对话、多轮对话稳定性回归
- room 删除 / 切换 / 恢复后的读模型一致性
- 流式超时、掉线、重连、终止链路的长会话验证

### 11.2 第二优先：继续清扫“房间型会话却跳原始详情页”的旧入口
这轮已经清掉一批高频入口，但原则上还应该继续做两件事：
- 新增任何用户入口时，优先复用 `server-session-room-links.ts`
- 继续检查是否还有漏网的 user-facing room-scoped session 直链

### 11.3 第三优先：在不破坏边界的前提下继续增强 GEO
如果继续做 GEO，建议顺序是：
1. 保持受控 runner 边界不变
2. 优先增强结果摘要与交付体验
3. 最后再考虑是否做明确授权下的 AI takeover 深化

### 11.4 最后再做更激进的 UI 精修
任务页、功能页、右栏卡片都已经做过几轮收口，但还不应该为了“更简洁”去牺牲：
- 房间打开能力
- 真实状态辨识
- 诊断入口
- 调试页保留

## 12. 推荐接手阅读顺序
建议下一位按这个顺序开始，不要一上来就通读整个仓库：

1. `README.md` 里的“AI 员工系统扩展与接手入口”
2. `docs/ai-employee-system-handoff-2026-03-24.md`
3. `docs/ai-employee-system-handoff-2026-03-26.md`
4. 这几个核心文件：
   - `src/ui/server-collaboration-chat.ts`
   - `src/ui/server-collaboration-room.ts`
   - `src/runtime/collaboration-room.ts`
   - `src/runtime/collaboration-project-memory.ts`
   - `src/runtime/heart-rate-monitor.ts`
   - `src/clients/openclaw-live-client.ts`
   - `src/clients/openclaw-gateway-stream.ts`
5. 然后再看这几个最近最关键的补强点：
   - `src/runtime/openclaw-chat-rooms.ts`
   - `src/ui/server-read-model.ts`
   - `src/ui/server-session-room-links.ts`
   - `src/ui/server-task-pages.ts`
   - `src/runtime/geo-audit.ts`
   - `src/ui/server-features.ts`

## 13. 常用命令

### 13.1 构建
```powershell
npm run build
```

### 13.2 跑关键回归
```powershell
node --import tsx --test test/session-room-links.test.ts test/server-read-model.test.ts test/openclaw-chat-rooms.test.ts test/office-roster.test.ts
```

### 13.3 启动开发 UI
```powershell
npm run dev:ui
```

### 13.4 查看最近提交
```powershell
git log --oneline -8
```

### 13.5 查看当前工作树
```powershell
git status --short
```

## 14. 现在最值得记住的一句话
这个项目最容易被改坏的地方，不是某个按钮或者某段 CSS，而是“把协作 room 重新退化成普通 session 或 Jarvis 私聊”的那一瞬间；只要继续守住 room 语义、受控注入边界和 `waitingFor:user_confirmation` 这三条，后面的功能扩展还有很大空间。
