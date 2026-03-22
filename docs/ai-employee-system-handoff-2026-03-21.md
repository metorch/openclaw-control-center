# AI 员工系统交接文档

更新日期：2026-03-21  
仓库路径：`C:\Users\45441\.openclaw\workspace\external\openclaw-control-center`  
OpenClaw Home：`C:\Users\45441\.openclaw`

## 1. 这份文档是给谁看的

这份文档是给下一个接手本项目的 AI / 工程代理看的。

目标只有一个：

让下一个 AI 不需要重新从零理解仓库和上下文，就能知道：

- 当前系统做到哪一步了
- 哪些改动已经落地并验证过
- 用户最在意什么，哪些地方绝对不能动错
- 现在仓库为什么还是 dirty
- 接下来最值得继续推进什么

如果时间有限，建议先看这 5 段：

1. `第 2 节：当前总状态`
2. `第 3 节：用户硬约束`
3. `第 5 节：本轮已经确认落地的关键能力`
4. `第 8 节：当前工作树状态`
5. `第 9 节：下一阶段建议顺序`

---

## 2. 当前总状态

一句话概括：

这个项目现在已经不是“救火期”，而是“稳定性收口 + 协作可靠性增强 + UI 继续精简”的阶段。

当前可以确认的状态：

- UI 可以构建通过
- 协作群聊主链路还在，不能删
- 群聊附件预览和直开逻辑已经做过一轮增强
- Jarvis 协调回复中的 `@员工` 已经可以自动继续派工
- 项目记忆 / 员工长期记忆 / 派工注入链路都在
- Heart rate monitor 员工已经进入代码层，不再只是设想
- 安全设置面板和本地 `.env` 写回链路已经在仓库中
- 当前仓库仍然 dirty，但不是“失控脏”，而是多模块并行改动还没最终收口

当前这轮最重要的结论不是“有没有功能”，而是：

- 协作系统不能再走“员工无边界自动扫全历史”的路线
- 现在采用的是“受控自动注入上下文”
- 这个方向是对的，后续应该继续增强，而不是推翻

---

## 3. 用户硬约束

这些是用户明确强调过的，后续 AI 不要违背。

### 3.1 群聊功能是核心功能

用户明确说过：

- 右下角群聊非常重要
- 绝对不能隐藏
- 绝对不能删除
- 只能优化，不能弱化

所以：

- 不要把协作群聊做成次要入口
- 不要为了“界面更干净”把群聊砍掉
- 不要把群聊换成只能跳页打开的形式

### 3.2 协作可靠性优先于纯 UI 美化

用户最近的优先级明显是：

1. 协作对话不要卡壳
2. 员工不要串旧项目
3. 附件要能被真正处理，不是只回路径
4. 心跳检测和恢复要可靠
5. 然后再继续做 UI 精简

所以后续不要本末倒置，不要优先做“更炫的 UI”而忽略协作稳定性。

### 3.3 员工不能无边界自动读全仓库

用户问过“能不能让员工自动读取上下文”，答案是：

- 可以
- 而且现在已经是半自动了
- 但必须是受控自动读取，不是无限制扫全聊天和全仓库

原因：

- 之前已经出现过串旧项目、误续跑、拿旧产物继续改的问题
- 完全放开只会重新制造这类问题

### 3.4 中文是默认主语言

用户主要使用中文。

系统可双语，但默认应该：

- 可见回复优先中文
- 不要因为工具输出是英文，就把正式用户回复切成英文

### 3.5 后续目标是软件化，不止浏览器页面

用户已经明确说过：

- 现在可以先做网页端优化
- 但长期目标是桌面软件 / 软件化体验

这意味着：

- 后续前端结构要保持组件化和可迁移
- 不要写死过多只适合浏览器临时页面的交互

---

## 4. 你现在面对的项目结构

这是一个本地运行的 OpenClaw 控制中心 / AI 员工系统。

大致可以理解成 4 层：

### 4.1 UI 层

主要文件在 `src/ui/`。

重要文件：

- `src/ui/server.ts`
- `src/ui/server-navigation.ts`
- `src/ui/server-team-panels.ts`
- `src/ui/server-staff-overview.ts`
- `src/ui/server-office-runtime.ts`
- `src/ui/server-insight-panels.ts`
- `src/ui/server-global-visibility.ts`

这里负责：

- 页面骨架
- 左侧导航 / 中间主内容 / 右侧 inspector
- 员工页、总览页、协作页
- 设置面板
- 群聊挂件 UI

### 4.2 协作调度层

主要文件：

- `src/ui/server-collaboration-chat.ts`
- `src/ui/server-collaboration-room.ts`
- `src/runtime/collaboration-room.ts`
- `src/runtime/collaboration-stage-results.ts`
- `src/runtime/collaboration-agent-artifacts.ts`

这里负责：

- 协作房间事件流
- 群聊消息与转发
- 派工记录
- 员工回复回填
- stage result 解析
- 附件产物提取

### 4.3 记忆层

主要文件：

- `src/runtime/collaboration-project-memory.ts`
- `src/ui/server-editable-files.ts`
- `src/runtime/agent-team-embed.ts`
- `src/runtime/openclaw-cli-insights.ts`

这里负责：

- 项目级记忆
- 主控和员工长期记忆文件
- recent memory feed / memory status
- 把记忆作为上下文注入 UI 和派工 prompt

### 4.4 监控与恢复层

主要文件：

- `src/runtime/monitor.ts`
- `src/runtime/heart-rate-monitor.ts`
- `scripts/heart-rate-monitor.ts`
- `src/runtime/task-heartbeat.ts`

这里负责：

- 监控轮询
- 心跳检查
- 发现卡壳任务
- 尝试恢复员工执行

---

## 5. 本轮已经确认落地的关键能力

这部分是最重要的“当前进度”。

### 5.1 项目记忆框架已经落地，不是空概念

当前记忆体系不是单一文件，而是分层的。

#### 全局 / 员工长期记忆

当前代码会读取这些长期记忆候选文件：

- `MEMORY.md`
- `USER.md`
- `SOUL.md`
- `IDENTITY.md`

相关入口：

- `src/ui/server-collaboration-chat.ts`
- `resolveAgentLongTermMemoryPaths(...)`

#### 项目级记忆

每个协作项目都会落到独立目录，结构是：

- `projects/<projectDir>/PROJECT.md`
- `projects/<projectDir>/memory/stage-log.jsonl`
- `projects/<projectDir>/memory/open-tasks.json`
- `projects/<projectDir>/memory/decisions.md`
- `projects/<projectDir>/artifacts/`

相关实现：

- `src/runtime/collaboration-project-memory.ts`

#### 派工自动注入

现在员工不是“自己乱扫”，而是派工时自动收到：

- 当前项目摘要
- open tasks
- decisions
- stage log
- 员工长期记忆文件路径
- 附件预览摘录

相关实现：

- `src/ui/server-collaboration-chat.ts`
- `buildCollaborationAgentPromptV2(...)`

这个方向请继续坚持。

### 5.2 Jarvis 回复里的 @员工 已能自动继续派工

已经落地的新能力：

- 如果 Jarvis 在协作回复里提到某员工
- 系统会自动识别被提到的目标员工
- 把“原始用户请求 + Jarvis 本轮协调指令”打包
- 再继续派给目标员工

这个能力目前是有边界的：

- 默认只让主控 Jarvis 的回复触发后续 fanout
- 不让每个员工都能无限递归互相 fanout

这是刻意设计，不要轻易放开。

核心实现点：

- `appendCollaborationDispatchStartedEvents(...)`
- `resolveCollaborationReplyMentionDispatchTargets(...)`
- `buildCollaborationFollowUpRequestMessage(...)`
- `maybeDispatchCollaborationReplyMentions(...)`

文件：

- `src/ui/server-collaboration-chat.ts`

### 5.3 回复里的 @mention 解析更稳了

已经修过的一个坑：

- `@architect.`
- `@Alice,`

这类带标点的 mention 以前可能识别失败。

现在 `normalizeMentionAlias(...)` 会清掉尾随标点。

文件：

- `src/runtime/collaboration-room.ts`

### 5.4 协作历史回填不再把所有人都显示成 Jarvis

之前出现过的 bug：

- 删对话 / 恢复历史后
- 所有人名、头像、说话身份混成 Jarvis

这一轮已经修过：

- transcript backfill 会优先根据 `author` / `sourceSessionKey` 还原真实员工身份
- 不再默认全部归到主控 Jarvis

文件：

- `src/ui/server-collaboration-room.ts`

### 5.5 附件上下文已经从“只给路径”增强为“先给内容摘录”

这是最近一轮非常关键的改动。

对于这些附件类型：

- HTML
- Markdown
- JSON
- code
- 其他文本附件

现在 prompt 会优先带上摘录，而不是只告诉员工一个本地路径。

并且明确要求：

- 先把摘录当成内容上下文
- 需要时再去打开本地文件
- 如果用户是让你分析 / 修复 / 优化附件，就应该基于内容处理，而不是只回复路径

关键文件：

- `src/ui/server-collaboration-chat.ts`

关键函数：

- `buildCollaborationAttachmentPromptLines(...)`
- `buildCollaborationAgentPromptV2(...)`

### 5.6 Heart rate monitor 员工已经在代码层

Heart rate monitor 不再只是一个 UI 名字，代码里已经有独立实现。

当前它负责的方向：

- 识别 stale in-progress
- 识别 failed turn
- 根据冷却窗口选择恢复候选
- 尝试唤醒或续跑
- 记录恢复动作结果

相关文件：

- `src/runtime/heart-rate-monitor.ts`
- `scripts/heart-rate-monitor.ts`
- `src/runtime/monitor.ts`

注意：

- 单测已经覆盖了很多恢复路径
- 但真实运行环境下是否每次都能成功恢复，还需要继续做 live 验证

### 5.7 安全设置已经不是纯静态 UI

安全设置这块已经有实际读写链路：

- 读取当前 `.env`
- 修改本地安全开关
- 更新 `LOCAL_API_TOKEN`
- 保存后触发 UI 重启

关键文件：

- `src/runtime/local-safety-settings.ts`
- `src/ui/server-inline-scripts-settings-safety.ts`

### 5.8 UI 左侧折叠导航和右栏摘要卡已经做过一轮收口

这部分已经动过，不是原始版本了。

当前方向是：

- 左侧默认折叠
- hover 展开
- pin 固定
- 右侧 inspector 保留但压缩
- 主内容区优先

注意：

- 这块近期变动很多，仍处于持续微调阶段
- 之后如果继续改，尽量保持结构稳定，不要整页推翻重做

---

## 6. 自动注入上下文的真实原理

这个项目后续很可能还会继续做“员工自动读上下文”，所以这里单独说明。

当前真正的原理不是：

- 员工自动扫描整个聊天历史
- 员工自动扫描整个仓库

当前真实原理是：

1. 系统先根据当前房间 `roomId` 绑定当前项目
2. 生成 `dispatchRecord`
3. 提取这次任务需要的上下文文件和附件摘要
4. 拼出 `<openclaw_coordination>` 协调块
5. 再把这整包 prompt 发给目标员工

也就是说：

- 自动读取 = 派工层自动注入
- 不是员工自由乱读

这个设计非常重要，请不要轻易改成“无限自动扫全局”。

更进一步的合理增强方向是：

- 自动注入“最近关键协作摘要”
- 但仍然只限定当前项目、当前房间、最近若干条关键事件

这件事目前还没完全做完，是后续优先项之一。

---

## 7. 当前可验证状态

2026-03-21 已实际执行并通过：

### 7.1 构建

命令：

```powershell
npm run build
```

结果：

- 通过

### 7.2 关键测试

命令：

```powershell
node --import tsx --test test/server-collaboration-chat.test.ts test/collaboration-room.test.ts test/collaboration-project-memory.test.ts test/heart-rate-monitor.test.ts test/ui-render-smoke.test.ts
```

结果：

- 79 tests
- 79 pass
- 0 fail

这轮通过的关键点包括：

- 项目记忆文件初始化
- 项目记忆写入与阶段日志
- collaboration routing 与 explicit mention
- transcript backfill 身份还原
- Jarvis reply mention fanout
- heart rate monitor 选择和恢复逻辑
- UI shell 左栏 / inspector hook
- 附件上下文摘录
- 协作房间删除与恢复

---

## 8. 当前工作树状态

### 8.1 当前仓库仍然 dirty

截至 2026-03-21，这个仓库不是 git clean。

这不是异常，而是正在进行中的多模块迭代结果。

不要做这些事：

- 不要 `git reset --hard`
- 不要批量回退“不知道是谁改的东西”
- 不要因为看起来改动多，就强行整仓重构

正确做法：

- 在现有 dirty worktree 上继续增量修
- 只处理和当前目标直接相关的文件
- 尤其不要撤销用户自己的变更

### 8.2 当前变更主要集中在这些区域

#### 协作与记忆

- `src/runtime/collaboration-project-memory.ts`
- `src/runtime/collaboration-room.ts`
- `src/runtime/collaboration-stage-results.ts`
- `src/runtime/collaboration-agent-artifacts.ts`
- `src/ui/server-collaboration-chat.ts`
- `src/ui/server-collaboration-room.ts`

#### 心跳与运行监控

- `src/runtime/monitor.ts`
- `src/runtime/heart-rate-monitor.ts`
- `scripts/heart-rate-monitor.ts`

#### UI 壳层与页面

- `src/ui/server.ts`
- `src/ui/server-navigation.ts`
- `src/ui/server-team-panels.ts`
- `src/ui/server-staff-overview.ts`
- `src/ui/server-office-runtime.ts`
- `src/ui/server-insight-panels.ts`
- `src/ui/server-global-visibility.ts`
- `src/ui/collaboration-chat-widget*.ts`

#### 设置与安全

- `src/runtime/local-safety-settings.ts`
- `src/ui/server-inline-scripts-settings-safety.ts`
- `src/ui/server-inline-scripts-settings-budget.ts`

#### 测试

- `test/server-collaboration-chat.test.ts`
- `test/collaboration-room.test.ts`
- `test/collaboration-project-memory.test.ts`
- `test/heart-rate-monitor.test.ts`
- `test/ui-render-smoke.test.ts`
- 以及若干其他回归测试

### 8.3 新增但尚未收口的文件

需要特别注意的新增文件：

- `scripts/restart-ui-4310.ps1`
- `scripts/heart-rate-monitor.ts`
- `src/runtime/heart-rate-monitor.ts`
- `src/runtime/local-safety-settings.ts`
- `src/ui/server-inline-scripts-card-help.ts`
- `src/ui/server-inline-scripts-settings-safety.ts`
- `test/collaboration-attachment-regression.test.ts`
- `test/heart-rate-monitor.test.ts`
- `test/local-safety-settings.test.ts`
- `test/server-collaboration-threads.test.ts`

### 8.4 可能是临时产物的文件

这些文件大概率是临时预览或调试产物：

- `tmp-overview-desktop.png`
- `tmp-overview.html`
- `tmp-overview.png`
- `src/ui/server.source-anchors.txt`

处理建议：

- 不要直接删
- 如果要清理，先确认当前没有被用于视觉对比或调试锚点
- 更稳妥的方式是最后专门做一轮 cleanup

---

## 9. 下一阶段建议顺序

如果是下一个 AI 继续做，我建议按下面顺序推进。

### 9.1 第一优先：继续增强“受控自动上下文”

这是最值得继续推进的方向。

建议做法：

- 在员工派工 prompt 里自动注入“最近关键协作摘要”
- 摘要来源只限当前 `roomId`
- 只取最近关键事件，不取整个长历史
- 过滤内部控制 prompt、reply token、旧项目残留

目标：

- 员工更少依赖 Jarvis 手写转述
- 但仍然不串项目

建议同步补测试：

- worker prompt 含最近房间摘要
- 不泄露旧房间内容
- 不把内部控制 token 注进可见回复

### 9.2 第二优先：做一次 Heart rate monitor 的真实联调

单测已过，但仍建议做 live 验证。

建议检查：

- 真实 stuck 任务能否被识别
- 恢复尝试是否真正触发
- 恢复后是否正确写回 receipt / stage result
- 是否存在 gate、session binding、token auth、超时设置导致“代码正确但运行不动”

重点看：

- `src/runtime/heart-rate-monitor.ts`
- `src/runtime/monitor.ts`
- `runtime/` 下的日志与恢复状态文件

### 9.3 第三优先：继续收口协作链路的异常路径

仍值得继续查的方向：

- 员工为什么偶发只回路径
- 中断 / stopReason / upstream error 时，UI 是否会误判为红色卡死
- 协作房间删除、恢复、切换时有没有残留的跨房间状态污染

虽然这轮已经修了很多，但这是用户最敏感的区域，后续仍应谨慎继续补。

### 9.4 第四优先：最后再做 UI 精修

UI 方面不要停，但优先级排在协作可靠性后面。

合理方向：

- 继续精简卡片底部小字和说明噪音
- 保持左侧栏、主区、右栏的对齐稳定
- 继续统一按钮、卡片、附件预览语言

不要优先做的事：

- 大改交互范式
- 换整个群聊框架
- 为了“更简洁”砍掉重要信息入口

### 9.5 第五优先：最后做 git 收口和清理

最后再考虑：

- 清理临时产物
- 把改动分批归类
- 减少无意义 diff

不要在功能尚未验证前就急着清工作树。

---

## 10. 推荐下一位 AI 的阅读顺序

如果你是下一个接手的 AI，建议按这个顺序读代码。

### 第一步

先读协作链路主文件：

- `src/ui/server-collaboration-chat.ts`
- `src/runtime/collaboration-room.ts`
- `src/ui/server-collaboration-room.ts`

重点理解：

- 用户消息怎么进房间
- 派工怎么发给员工
- 回复怎么落回房间
- Jarvis reply mention fanout 怎么触发

### 第二步

再读项目记忆：

- `src/runtime/collaboration-project-memory.ts`

重点理解：

- 项目目录结构
- `PROJECT.md`
- `stage-log.jsonl`
- `open-tasks.json`
- `decisions.md`

### 第三步

再读自动上下文注入：

- `src/ui/server-collaboration-chat.ts`

重点函数：

- `resolveCollaborationDispatchRequestText(...)`
- `buildDispatchRecord(...)`
- `buildCollaborationAttachmentPromptLines(...)`
- `buildCollaborationAgentPromptV2(...)`

### 第四步

再读心跳恢复：

- `src/runtime/heart-rate-monitor.ts`
- `src/runtime/monitor.ts`

### 第五步

最后再回来看 UI：

- `src/ui/server.ts`
- `src/ui/server-navigation.ts`
- `src/ui/server-team-panels.ts`
- `src/ui/collaboration-chat-widget*.ts`

---

## 11. 常用命令

### 11.1 构建

```powershell
npm run build
```

### 11.2 跑关键协作测试

```powershell
node --import tsx --test test/server-collaboration-chat.test.ts test/collaboration-room.test.ts test/collaboration-project-memory.test.ts test/heart-rate-monitor.test.ts test/ui-render-smoke.test.ts
```

### 11.3 启动开发 UI

```powershell
npm run dev:ui
```

### 11.4 一键重启 4310 UI

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-ui-4310.ps1
```

脚本文件：

- `scripts/restart-ui-4310.ps1`

用途：

- 杀掉占用 4310 的旧进程
- 重新拉起 UI
- 等待端口恢复监听

---

## 12. 已知注意事项

### 12.1 不要再让员工无边界扫全历史

这是一个高风险方向。

应该做的是：

- 更聪明的摘要注入

不应该做的是：

- 无限自动扫全部对话
- 无限自动扫整个仓库

### 12.2 不要删群聊

再强调一次。

群聊是核心功能，不是可有可无的小挂件。

### 12.3 不要把 UI 小字备注当作“改动日志”

用户非常敏感这一点。

卡片上的小字应该是真备注、真状态，不应该像开发者自己留的 patch note。

### 12.4 Windows / PowerShell 约束是真实存在的

当前是 Windows PowerShell 环境。

注意：

- 用 PowerShell 语法
- 需要 `curl` 时优先 `curl.exe`
- 不要写 bash-only 的 `&&`

### 12.5 旧的桌面交接文档可能存在乱码显示问题

之前用户给过一个桌面交接文档，PowerShell 里读取时出现过编码显示异常。

这不一定代表原文件内容全坏了，但后续交接更建议以仓库内这份文档为主。

---

## 13. 现在最值得记住的一句话

这个项目下一阶段最正确的方向不是“再堆更多功能”，而是：

在不牺牲群聊和协作能力的前提下，让员工派工、记忆注入、附件处理、心跳恢复这四条链路越来越稳定。

如果必须二选一：

- 先选稳定协作
- 再选 UI 美化

---

## 14. 交接结束时的真实状态

截至本文件写入时：

- 构建通过
- 关键测试通过
- 交接文档已补齐
- 仓库仍 dirty
- 下一步最建议做“最近关键协作摘要自动注入”

如果你是下一个 AI，请从 `src/ui/server-collaboration-chat.ts` 开始接。
