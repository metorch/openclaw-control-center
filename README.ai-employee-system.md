# AI Employee System README

更新日期：2026-03-24

这份 README 是给下一个接手本仓库的 AI/工程代理看的。
如果你只看一份文档，先看这份；如果要继续开发，再配合 `docs/ai-employee-system-handoff-2026-03-24.md` 一起看。

## 1. 这套系统是什么

这是一个运行在 OpenClaw 之上的本地 AI 员工系统/控制中心，核心目标不是“做一个普通聊天页”，而是：

- 让 Jarvis 作为主控协调多个员工。
- 让右下角协作群聊成为当前 room 的共享时间线。
- 让派工、协作、产物、项目记忆、恢复机制都落在同一套本地状态里。
- 在不放开全历史/全仓库自由扫描的前提下，给员工注入足够的当前项目上下文。

它已经不是纯展示层项目，实际包含：

- UI 服务器
- 协作 room 持久层
- 派工 prompt 生成器
- OpenClaw 流式客户端
- 模型/fallback 模型管理
- 项目记忆与任务收据
- 心跳/恢复机制

## 2. 先记住这些硬约束

这些不是建议，是当前项目已经反复验证过的“别改错”规则。

- 不要删除、隐藏、弱化右下角协作群聊。
- 不要把协作群聊退化成“只有 Jarvis/main 的单人主聊天镜像”。
- 新建对话在这里应被视为一个新的共享协作 room/频道，而不是 main 私聊容器。
- 不要放开员工无边界扫描全历史、全房间、全仓库。
- 员工上下文必须走受控注入，不是让员工自己乱搜。
- Jarvis 等用户确认时是受控等待态，不是 stalled，不是 completed。
- 不要把 `waitingFor:user_confirmation` 自动记成 approved deliverable。
- 不要为了 UI 清爽删掉状态、小字、协作线索，先保协作稳定性。
- 不要把 `C:\Users\45441\.openclaw` 整个家目录当作普通源码仓库去 reset/clean。

## 3. 当前真实运行语义

### 3.1 Jarvis 是主控

- `main` 就是 Jarvis。
- 默认没有显式 `@员工` 时，当前 room 的首个调度目标应该是 Jarvis。
- 只有在明确多播/改派/fanout 场景下，其他员工才会收到后续独立任务。

### 3.2 协作群聊是共享时间线

当前 room 的群聊时间线应该同时容纳：

- 用户消息
- Jarvis 回复
- worker 回复
- 当前 room 的系统说明
- 当前 room 的附件事件

不是：

- 只显示 Jarvis
- 只显示本地事件，不认 transcript 回填
- 只要本地有一条 `agent_reply` 就把其他 transcript reply 全压掉

### 3.3 员工上下文是“受控自动注入”

当前正确方向是：

- 根据 `roomId + projectId + sourceEvent.sequence` 收集当前项目内的必要上下文
- 自动拼入协调 prompt
- 过滤内部控制噪音

当前错误方向是：

- 让员工自己扫描全部房间
- 让员工自己扫描整个仓库
- 让员工自由继承无限聊天历史

### 3.4 流式是“共享房间快照 + live draft”链路

当前前端协作群聊不是直接订阅原始 token callback UI，而是：

1. 上游 OpenClaw 通过 gateway stream 或 `/v1/responses` 产生增量。
2. 服务端把可见草稿写入 live draft。
3. 群聊 widget 通过 `EventSource` 订阅 `/api/collaboration/room/stream`。
4. SSE 推送 `ready/snapshot`，前端按共享 room 快照刷新可见时间线。

这已经足够支持“接近流式”的共享房间体验，但它仍不是最理想的“原生 token 级直通 UI”。

如果以后要继续推进真流式，正确方向是：

- 让上游 OpenClaw 暴露稳定的 session/event stream 或 token callback
- 再把 widget 接到那条明确的事件流

不要用高频轮询硬伪装成真流式。

## 4. 核心模块地图

### 4.1 UI 与 HTTP 入口

- `src/ui/server.ts`

职责：

- 启动本地 UI 服务器
- 暴露协作群聊 API
- 暴露群聊 SSE
- 暴露员工模型更新接口
- 暴露安全设置、项目、任务、文档等页面与接口

关键路由：

- `GET /api/collaboration/room`
- `GET /api/collaboration/room/stream`
- `POST /api/collaboration/room/messages`
- `POST /api/collaboration/room/terminate`
- `GET /healthz`

### 4.2 协作派工与回复处理

- `src/ui/server-collaboration-chat.ts`

这是最重要的协作核心文件之一。

重点函数：

- `createCollaborationChatHelpers(...)`
- `dispatchCollaborationRoomMessage(...)`
- `buildCollaborationAgentPromptV2(...)`
- `persistCollaborationStageResult(...)`
- `terminateCollaborationRoomWork(...)`
- `buildRecentCollaborationSummaryCandidate(...)`
- `buildRecentCollaborationSummaryLines(...)`

它负责：

- 把用户消息变成协作 room 事件
- 决定默认派给谁
- 生成 V2 派工 prompt
- 注入 project summary / recent collaboration summary / context refs / attachments
- 解析 `stage_result`
- fanout `@worker`
- 终止正在进行的协作 turn

### 4.3 协作房间时间线

- `src/ui/server-collaboration-room.ts`
- `src/runtime/collaboration-room.ts`

`src/runtime/collaboration-room.ts` 是 canonical room store。

它负责：

- room 文件持久化
- attachments
- dispatchRecords
- taskReceipts
- room summaries/index

`src/ui/server-collaboration-room.ts` 是房间视图层。

重点函数：

- `createCollaborationRoomHelpers(...)`
- `mergeCollaborationRoomApiEvents(...)`
- `buildCollaborationRoomApiView(...)`
- `buildCollaborationRoomStreamSignature(...)`
- `buildCollaborationTranscriptBackfillEvents(...)`

当前采用 transcript-first 合并规则：

- transcript 中当前 room 的可见 reply 可以先显示
- 本地 canonical event 稍后补上时再做精确去重
- 不同员工之间不能互相覆盖

### 4.4 项目记忆与任务闭环

- `src/runtime/collaboration-project-memory.ts`
- `src/runtime/collaboration-stage-results.ts`

重点能力：

- 为每个项目创建 memory scaffold
- 写 `PROJECT.md`
- 写 `memory/open-tasks.json`
- 写 `memory/stage-log.jsonl`
- 写 `memory/decisions.md`
- 解析 `<stage_result>`

关键导出：

- `ensureCollaborationProjectMemory(...)`
- `loadCollaborationProjectMemory(...)`
- `appendCollaborationProjectStageLog(...)`
- `updateCollaborationProjectSummary(...)`
- `syncCollaborationProjectOpenTasks(...)`
- `parseStageResultEnvelopeFromReply(...)`

### 4.5 OpenClaw 流式客户端与上游中止

- `src/clients/openclaw-live-client.ts`
- `src/clients/openclaw-gateway-stream.ts`
- `src/clients/openclaw-http-responses-stream.ts`

当前策略：

- 优先 gateway stream，尤其是协作 turn 需要 `chat.abort` 时
- 启动失败时回退到 `/v1/responses`
- 上游模型异常时自动切到 fallback 模型并重试

关键点：

- `OpenClawLiveClient.agentTurn(...)`
- `runGatewayAgentTurnAttempt(...)`
- `runHttpResponsesAgentTurnAttempt(...)`
- `abortOpenClawGatewayChatRun(...)`

### 4.6 模型与 fallback 模型

- `src/runtime/openclaw-agent-models.ts`
- `src/ui/server-staff-models.ts`
- `src/ui/server-inline-scripts-staff-model.ts`

当前已经支持：

- 每个员工卡片配置主模型
- 每个员工卡片配置 fallback 模型
- 上游 provider/model 挂掉时自动切到 fallback 模型
- 切换后把主/备模型对调，便于下一次再切回

### 4.7 心跳/恢复机制

- `src/runtime/heart-rate-monitor.ts`
- `scripts/heart-rate-monitor.ts`

现在它是机制，不应该再作为“一个会发话污染上下文的员工”存在。

关键导出：

- `runHeartRateMonitor(...)`
- `buildHeartRateMonitorAgentStatuses(...)`
- `selectHeartRateMonitorRecoveryCandidates(...)`

它的职责：

- 发现 stale/failed collaboration turn
- 生成恢复候选
- 做恢复/唤醒
- 写恢复报告/审计

注意：

- `waitingFor:user_confirmation` 的 Jarvis receipt 不应进入 recovery candidates
- 兼容旧数据时，也不能把“明确在等用户确认”的 Jarvis 回复误判成 stale

## 5. 当前最重要的数据语义

### 5.1 Collaboration room 是 canonical

房间文件路径在 `runtime/collaboration-room/` 下。

核心结构见：

- `CollaborationRoomState`
- `CollaborationRoomEvent`
- `CollaborationTaskReceipt`

`CollaborationTaskReceipt` 当前很重要的字段：

- `reviewState?: "awaiting_review" | "approved" | "rejected"`
- `lastResultState?: "in_progress" | "awaiting_review" | "blocked" | "failed"`
- `waitingFor?: "jarvis_review" | "user_confirmation"`

### 5.2 Jarvis 等确认的正确语义

当 Jarvis 明确在等用户确认/拍板/选项时：

- `reviewState = "awaiting_review"`
- `lastResultState = "awaiting_review"`
- `waitingFor = "user_confirmation"`
- 任务仍保持 `in_progress`

不能做的事：

- 不要 auto-approve
- 不要写 approved deliverable
- 不要更新 approved project summary
- 不要被心跳机制拉起误催

### 5.3 recent collaboration summary 的边界

当前已落地的是“当前项目内最近关键协作摘要自动注入”。

边界必须维持：

- 只看当前 `roomId`
- 只看当前项目
- 只看早于当前 `sourceEvent.sequence` 的事件
- 只保留最近关键项
- 过滤内部控制块、`stage_result`、reply token、session 信息、路径回显噪音

不能扩成：

- 全局摘要任务
- 跨房间记忆扫描
- 持久化项目级自动摘要机器人

## 6. 右下角协作群聊链路

前端入口：

- `src/ui/collaboration-chat-widget-script-prelude.ts`
- `src/ui/collaboration-chat-widget-script-actions.ts`

关键 endpoint 常量：

- `room: /api/collaboration/room`
- `roomStream: /api/collaboration/room/stream`
- `messages: /api/collaboration/room/messages`
- `terminate: /api/collaboration/room/terminate`

群聊前端要点：

- `EventSource` 订阅 room stream
- 有 terminate 按钮
- 按 room 维护 unread/read cursor
- 需要显示 shared timeline，不是 main 单聊

如果你改这块，要特别小心：

- 不要把 worker reply 从 feed 里压掉
- 不要让 transcript/local reply 相互误去重
- 不要把不同员工错误归因到 Jarvis
- 不要让 terminate 只改本地 UI，不真正向上游 abort

## 7. 启动、运行与验证

仓库路径：

- `C:\Users\45441\.openclaw\workspace\external\openclaw-control-center`

OpenClaw 家目录：

- `C:\Users\45441\.openclaw`

当前常用端口：

- OpenClaw gateway: `18789`
- Control Center UI: `4310`
- 另一个预览/UI 实例有时也在 `4311`

常用命令：

```powershell
npm run build
npm test
npm run dev:ui
node --import tsx --test test/openclaw-gateway-stream.test.ts test/openclaw-live-client-agent-turn.test.ts test/server-collaboration-chat.test.ts test/collaboration-room.test.ts
```

补充说明：

- `npm run dev:ui` 会启动 UI 模式
- `GET /healthz` 在 snapshot stale 时会回 `503`，这不一定代表 UI 挂了
- UI smoke 可能因 `healthz` stale 误判失败，要结合首页/协作接口一起看

## 8. 当前已验证基线

截至 2026-03-24，当前仓库的已验证状态：

- OpenClaw 已升级到 `v2026.3.23`
- gateway 运行时已切到新版本
- 协作房间 SSE 正常
- 共享时间线仍能同时显示 Jarvis 与 worker 回复
- 上游 abort 已接入 `chat.abort`
- fallback 模型自动切换链路已验证

最近一次整理后的代码提交：

- `0378272` `Stabilize collaboration streaming and abort flow`

## 9. 工作树与仓库边界

真正的源码仓库是：

- `workspace/external/openclaw-control-center`

它应该尽量保持 clean。

`C:\Users\45441\.openclaw` 根目录不是普通源码仓库，而是 OpenClaw 家目录，里面有：

- 配置
- 会话
- runtime 数据
- 日志
- 备份

不要为了“清理工作树”去清它。

## 10. 如果你要继续改，推荐顺序

### 第一优先级

继续做协作稳定性，不要先大改 UI：

- 共享时间线正确性
- worker 可见性
- terminate 真中止
- waiting/heartbeat 语义一致

### 第二优先级

继续做受控上下文增强：

- current room 内 recent collaboration summary
- 项目内 open tasks / decisions / stage log 注入质量

### 第三优先级

如果上游暴露稳定事件流，再推进真流式：

- session/event stream
- token callback
- 前端更细粒度增量渲染

### 最后再做

- 大的 UI 结构重排
- 可见交互改版
- 群聊壳层重写

## 11. 最容易改坏的地方

- `src/ui/server-collaboration-chat.ts`
- `src/ui/server-collaboration-room.ts`
- `src/runtime/collaboration-room.ts`
- `src/runtime/heart-rate-monitor.ts`
- `src/clients/openclaw-live-client.ts`
- `src/clients/openclaw-gateway-stream.ts`
- `src/ui/collaboration-chat-widget-script-prelude.ts`

改这些文件前，请先确认：

- 你改的是当前 room，而不是全局
- 你没有把 Jarvis 等确认误记成完成
- 你没有让 worker 回复消失
- 你没有让终止只停 UI 不停上游
- 你没有放开员工自由扫描历史/仓库

## 12. 建议的接手顺序

如果你是下一个 AI，推荐这样读代码：

1. 先读 `src/ui/server-collaboration-chat.ts`
2. 再读 `src/ui/server-collaboration-room.ts`
3. 再读 `src/runtime/collaboration-room.ts`
4. 再读 `src/runtime/collaboration-project-memory.ts`
5. 再读 `src/runtime/heart-rate-monitor.ts`
6. 最后读 `src/clients/openclaw-live-client.ts` 和 `src/clients/openclaw-gateway-stream.ts`

读完这些，再决定是否需要动 UI 壳层。

