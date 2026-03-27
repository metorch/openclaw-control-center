# AI 员工系统交接文档

更新时间：2026-03-27

仓库路径：
- `C:\Users\45441\.openclaw\workspace\external\openclaw-control-center`

运行家目录：
- `C:\Users\45441\.openclaw`

建议配套阅读：
- `README.md` 里的“AI 员工系统扩展与接手入口”
- `docs/ai-employee-system-handoff-2026-03-26.md`
- `docs/ai-employee-system-handoff-2026-03-24.md`

## 1. 这份文档是给谁看的
这份文档不是产品介绍，也不是 changelog，而是给下一位继续接手这个 AI 员工系统的开发者看的真实工程交接材料。

它主要回答这些问题：
- 当前项目到底应该按什么语义来理解
- 这轮新改动真正落在了哪里
- 哪些能力已经被验证，哪些只是还在收口
- 当前 worktree 为什么还是脏的，哪些改动不要误清
- 下一位如果继续做性能优化，应该先从哪里下手

## 2. 当前总状态
截至 2026-03-27，这个项目依然不能按“普通 OpenClaw 控制中心”来理解，而应按“运行在 OpenClaw 之上的本地 AI 员工系统”来理解。

当前固定下来的核心语义没有变化：
- `main` 就是 Jarvis，不是普通主线程标签
- 新建对话 = 新建一个协作 room，不是 Jarvis 私聊壳
- 右下角协作群聊 = 当前 room 的共享时间线，不是 Jarvis 单聊镜像
- 员工上下文必须走受控注入，不能自由扫描全历史、全房间、全仓库
- Jarvis 等用户确认时必须记为 `waitingFor:user_confirmation`，不是 `stalled`，也不是 `completed`

最近可作为已提交基线参考的提交是：
- `afdbd26 feat: consolidate AI employee system handoff and room routing`
- `bed6f3e fix: harden room-scoped collaboration recovery`
- `c893713 feat: add geo suite feature workspace`
- `0b28d2a Stabilize collaboration rooms and task workflows`
- `f296988 Merge AI employee notes into main readme`

本次交接时，工作树不是 clean 的。当前未提交改动主要集中在两条线：
- AI 员工系统的页面切换与任务页性能收口
- OpenClaw CLI 洞察、设置洞察和用量页继续收口中的改动

不要把当前脏工作树误当成“仓库坏了”。更准确的理解是：这是一批已经部分落地、但还没有整体提交封口的在途工程改动。

## 3. 本轮最重要的新落点

### 3.1 任务页不再首屏渲染整板所有卡片
这一轮最重要的优化不是“又加一个脚本”，而是把任务工作台从“首屏把全部任务卡片和列表行都渲染进 HTML，再靠前端隐藏分页”收成了“只渲染当前页，完整数据单独压成紧凑数据源”。

当前实现方式是：
- `src/ui/server-task-pages.ts`
  - 服务端只输出当前页的任务卡片或当前页的明细行
  - 同时输出一份紧凑 JSON 到 `data-task-board-items`
- `src/ui/server-inline-scripts-task-board-compact.ts`
  - 作为新的 compact fast path
  - 前端分页、详情视图、拖拽排序、批量选择、删除按钮都直接从这份数据源渲染
- `src/ui/server-inline-scripts-task-board.ts`
  - 先接入 compact fast path
  - 原来的 DOM 驱动路径暂时保留为 fallback，避免一次性把任务板交互打坏

这条改法符合当前用户要求的方向：优先删重复渲染和重复状态，不要一味继续往老结构上堆代码。

### 3.2 任务页首包体积又降了一截
这轮本地实测数据如下，端口是 `4310`，使用本地重启后的热态页面：

- `/?section=overview`
  - 约 `462KB`
  - 热态约 `0.15s - 0.16s`
- `/?section=projects-tasks`
  - 约 `823KB`
  - 热态约 `0.23s - 0.24s`
- `/?section=projects-tasks&partial=task-diagnostics`
  - 约 `83KB`
  - 约 `0.18s - 0.20s`
- `/?section=settings`
  - 约 `465KB`
  - 热态约 `0.15s - 0.20s`
- `/?section=usage-cost`
  - 约 `475KB`
  - 热态约 `0.15s - 0.20s`

任务页这条线的收敛过程目前可以概括成：
- 更早之前约 `1.187MB`
- 上一轮约 `993KB`
- 这轮继续压到约 `823KB`

也就是说，这轮已经把任务页又削掉了大约 `170KB` 左右的首屏 HTML 体积。

### 3.3 新增了“任务板当前页渲染”回归测试
为了避免后面又回退成“把全部任务卡都塞回首屏”，这轮补了：
- `test/task-board-render.test.ts`

它固定了两件事：
- 卡片模式下，服务端只输出当前页卡片，完整数据走 `data-task-board-items`
- 明细模式下，服务端只输出当前页明细行，不再把整张明细表全部预渲染

这比只看 smoke 源码字符串更能直接守住任务页减载这条约束。

## 4. 当前最值得先看的文件

### 4.1 任务页性能这条线
- `src/ui/server.ts`
  - 分区脚本 gated、任务诊断 shell、section 级懒加载
- `src/ui/server-task-pages.ts`
  - 任务工作台 HTML、任务板 compact 数据序列化、当前页渲染
- `src/ui/server-inline-scripts-task-board.ts`
  - 任务板总入口，compact fast path 接入点
- `src/ui/server-inline-scripts-task-board-compact.ts`
  - 这轮新增的轻量任务板渲染路径
- `src/ui/server-global-visibility.ts`
  - 当前任务 deep link 修正

### 4.2 仍然是系统核心的协作链路
下面这些文件的优先级依然高于一般 UI 文件：
- `src/ui/server-collaboration-chat.ts`
- `src/ui/server-collaboration-room.ts`
- `src/runtime/collaboration-room.ts`
- `src/runtime/collaboration-project-memory.ts`
- `src/runtime/heart-rate-monitor.ts`
- `src/clients/openclaw-live-client.ts`
- `src/clients/openclaw-gateway-stream.ts`

不要因为这轮主要在做性能收口，就忽略这些协作核心文件。当前系统最不能被改坏的仍然是 room 语义、共享时间线和受控注入边界。

## 5. 当前 worktree 的真实状态
这次交接时，`git status --short` 仍然是脏的。需要特别记住：

### 5.1 和这轮性能优化直接相关的文件
- `src/ui/server-task-pages.ts`
- `src/ui/server-inline-scripts-task-board.ts`
- `src/ui/server-inline-scripts-task-board-compact.ts`
- `test/task-board-render.test.ts`

### 5.2 同一个工作树里还有别的在途改动
当前还同时存在这些未提交改动，不要误清：
- `src/clients/openclaw-live-client.ts`
- `src/runtime/openclaw-cli-insights.ts`
- `src/runtime/openclaw-cli.ts`
- `src/runtime/usage-cost.ts`
- `src/ui/server.ts`
- `src/ui/server-inline-scripts.ts`
- `src/ui/server-insight-panels.ts`
- `src/ui/server-runtime-caches.ts`
- `src/ui/server-session-conversations.ts`
- `src/ui/server-task-spotlight.ts`
- `test/openclaw-cli-insights.test.ts`
- `test/openclaw-cli.test.ts`
- `test/openclaw-live-client-agent-turn.test.ts`
- `test/ui-render-smoke.test.ts`
- `test/usage-cost.test.ts`

以及当前未跟踪的新文件：
- `src/runtime/openclaw-employee-contract.ts`
- `src/ui/server-inline-scripts-settings-insights.ts`
- `src/ui/server-inline-scripts-task-diagnostics.ts`
- `test/openclaw-employee-contract.test.ts`
- `test/server-insight-panels.test.ts`

这意味着：
- 现在不能直接把整个仓库当作“只剩任务页性能改动”
- 也不能为了整理任务页，顺手回退其它尚未提交的系统改动

## 6. 当前已经验证过什么
这轮已经实际跑过并通过：

```powershell
npm run build
node --import tsx --test test/task-board-render.test.ts test/ui-render-smoke.test.ts test/usage-cost.test.ts
powershell -ExecutionPolicy Bypass -File scripts/restart-ui-4310.ps1
```

本地真实测量页面体积和耗时用的是：

```powershell
curl.exe -o NUL -s -w "%{http_code}`t%{time_total}`t%{size_download}" "http://127.0.0.1:4310/?section=projects-tasks"
```

当前可以认为已经被验证的结论有：
- 构建通过
- 任务页 compact 渲染新增测试通过
- UI render smoke 通过
- usage-cost 回归通过
- 本地 4310 UI 重启后可正常访问
- 任务页已经不再首屏输出整板卡片

## 7. 当前绝对不能改错的约束

### 7.1 不要因为做性能优化就碰坏协作语义
性能优化可以继续做，但不能动这些根语义：
- 不要删除、隐藏、弱化右下角协作群聊
- 不要把协作群聊退化成 Jarvis 单聊镜像
- 不要把“新建对话”重新做成 main 私聊
- 不要让 room 打开动作退回到一堆原始 session detail 跳转

### 7.2 不要为了“更聪明”放开员工扫描边界
继续守住：
- 受控注入
- 当前 room 边界
- 当前项目边界

不要做这些事：
- 员工自动扫全历史
- 员工自动扫全房间
- 员工自动扫全仓库

### 7.3 `waitingFor:user_confirmation` 不能再被误判
这条语义仍然是系统核心约束：
- 不是 `stalled`
- 不是 `completed`
- 不是 heart-rate recovery target

### 7.4 做页面优化时，优先做减法
这一轮已经确认方向正确的做法是：
- 删掉首屏重复服务端渲染
- 把重内容改成按需加载
- 把视图切换建立在紧凑数据源上

不推荐继续做的方向是：
- 再往老 DOM 结构上补更多 data-attribute
- 再做一层“隐藏全部节点”的本地分页
- 用更多前端补丁掩盖服务端重复渲染

## 8. 已知边界与坑

### 8.1 任务板现在是“新 fast path + 旧 fallback”并存
当前 `server-inline-scripts-task-board.ts` 里，compact fast path 已经接入，但老的 DOM 驱动路径还在。

这不是坏事，它是本轮为了稳住交互故意保留的缓冲层。

但后续如果继续做这条线，应该考虑：
- 先用浏览器 dogfood 再确认交互没回归
- 再逐步删除老 fallback，避免长期双轨维护

### 8.2 待处理队列仍然是潜在热点
虽然任务板已经减重了，但当前页面里仍有一块没有彻底做掉：
- 待处理队列还不是完全按当前页直渲染

如果后续任务页还嫌慢，下一刀最值得下在：
- `Pending queue / 待处理队列`
- 相关 inline pager 列表

### 8.3 当前测量不是浏览器完整性能审计
这轮体积和耗时测量用的是本地 `curl` 和本地热态 UI，适合判断：
- 首包体积有没有明显下降
- 服务器响应有没有改善

它还不能替代：
- 真实浏览器交互时延
- 切视图/翻页/删除后的前端交互体感

所以下一位如果继续往下收，最好补一轮真实浏览器 dogfood。

### 8.4 工作树现在不适合粗暴清理
当前工作树里混着多条未提交改动，不适合做这些事：
- `git checkout -- .`
- 大面积回退“看起来不相关”的文件
- 为了只留下任务页性能改动，把其它在途文件硬清空

## 9. 下一位最推荐的继续顺序

### 9.1 第一优先：继续收任务页热点，但别动协作根语义
下一步如果继续做性能，推荐顺序是：
1. 先 dogfood 任务页的卡片/明细切换、页码切换、单删、批删、房间打开
2. 再把待处理队列改成和任务板一样的当前页直渲染
3. 最后考虑是否清掉旧 fallback

### 9.2 第二优先：继续收 settings / usage 页重量
现在 `settings` 和 `usage-cost` 还在 `465KB - 475KB` 左右，说明仍有可削空间。

推荐方向：
- 保持 section 级脚本 gated
- 继续把重卡片拆成 shell + lazy fill
- 优先删重复服务端拼装，不要再往总页面上堆更多静态 HTML

### 9.3 第三优先：在下一次提交前做一次小范围封口
当前最理想的下一个工程动作不是继续开更多新面板，而是：
- 把这轮任务页性能改动和相关测试整理提交
- 再决定是否继续推进 settings / queue / usage 这条线

## 10. 推荐接手阅读顺序
建议下一位按这个顺序开始：

1. `README.md` 里的“AI 员工系统扩展与接手入口”
2. `docs/ai-employee-system-handoff-2026-03-26.md`
3. `docs/ai-employee-system-handoff-2026-03-27.md`
4. 任务页性能这条线：
   - `src/ui/server.ts`
   - `src/ui/server-task-pages.ts`
   - `src/ui/server-inline-scripts-task-board.ts`
   - `src/ui/server-inline-scripts-task-board-compact.ts`
5. 然后再回到协作核心文件：
   - `src/ui/server-collaboration-chat.ts`
   - `src/ui/server-collaboration-room.ts`
   - `src/runtime/collaboration-room.ts`
   - `src/runtime/collaboration-project-memory.ts`
   - `src/runtime/heart-rate-monitor.ts`
   - `src/clients/openclaw-live-client.ts`
   - `src/clients/openclaw-gateway-stream.ts`

## 11. 常用命令

### 11.1 看工作树
```powershell
git status --short
```

### 11.2 看最近提交
```powershell
git log --oneline -10
```

### 11.3 构建
```powershell
npm run build
```

### 11.4 跑当前关键回归
```powershell
node --import tsx --test test/task-board-render.test.ts test/ui-render-smoke.test.ts test/usage-cost.test.ts
```

### 11.5 重启本地 4310 UI
```powershell
powershell -ExecutionPolicy Bypass -File scripts/restart-ui-4310.ps1
```

### 11.6 本地测页面体积与耗时
```powershell
curl.exe -o NUL -s -w "%{http_code}`t%{time_total}`t%{size_download}" "http://127.0.0.1:4310/?section=projects-tasks"
```

## 12. 现在最值得记住的一句话
这轮最正确的方向不是“继续给任务页补更多交互补丁”，而是继续把 AI 员工系统里那些首屏重复渲染、整板预输出、再前端隐藏的旧路径做减法，同时始终守住 room 语义、右下角协作群聊和受控注入边界。
