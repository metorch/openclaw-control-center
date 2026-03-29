# AI 员工系统交接文档

更新时间：2026-03-30

仓库路径：
- `C:\Users\45441\.openclaw\workspace\external\openclaw-control-center`

关联项目路径：
- `OpenMAIC`: `C:\Users\45441\.openclaw\workspace\projects\features\OpenMAIC`
- `GEO`: `C:\Users\45441\.openclaw\workspace\projects\features\GEO`

运行家目录：
- `C:\Users\45441\.openclaw`

建议配套阅读：
- `README.md` 里的“AI 员工系统扩展与接手入口”
- `docs/ai-employee-system-handoff-2026-03-27.md`
- `docs/ai-employee-system-handoff-2026-03-26.md`

## 1. 这份文档是给谁看的
这不是产品介绍，也不是 changelog，而是给下一位继续接手这套 AI 员工系统的人看的工程交接材料。

这一版交接重点回答这些问题：
- 功能项目统一目录这条线，现在到底收口到什么状态了
- `AI教育 / OpenMAIC` 与 `GEO` 两条功能线，哪些已经真正确认跑通
- 哪些改动已经提交，哪些还只是本地状态
- 当前为什么 push 失败，下一位接手时应该先看哪里

## 2. 当前总状态
截至 2026-03-30，这套系统仍然应该按“OpenClaw 之上的 AI 员工系统壳”来理解，不是普通的 `openclaw-control-center`。

固定语义没有变化，仍然要守住：
- `新建对话 = 新建协作 room`
- 右下角协作群聊 = 当前 room 的共享时间线，不是 Jarvis 私聊镜像
- 员工上下文必须走受控注入，不能放开全历史、全房间、全仓库扫描
- `waitingFor:user_confirmation` 不是 `stalled`，也不是 `completed`

这次接手主要是把上一条 resume 会话 `019d2f3f-c1bd-72b3-bd05-9e42f01362ac` 停在半路的“功能项目统一目录迁移”真正收口，并把同一阶段里已经做完但未提交的 `AI教育 / OpenMAIC` 同步改动一起整理提交。

## 3. 这次真正落下来的新结果

### 3.1 功能项目目录已经统一到 `features`
上一条 resume 会话最后停在：
- `OpenMAIC` 目录已经搬到新位置，但依赖和脚本引用还在摇晃
- `GEO` 表面上已经搬过去，但运行时状态和历史产物引用还挂着旧路径

现在统一目录已经明确为：
- `C:\Users\45441\.openclaw\workspace\projects\features\OpenMAIC`
- `C:\Users\45441\.openclaw\workspace\projects\features\GEO`

本轮确认到的事实：
- `AI教育` 运行时 `repoDir` 已经指向 `features/OpenMAIC`
- `GEO` API 的 `projectRoot`、`scriptPath`、`command.args`、`artifacts`、`summary` 都已经改成 `features/GEO`
- `GEO` 历史运行结果仍可继续读取，不需要手工清缓存

### 3.2 GEO 旧路径兼容迁移已经补到运行时层
这轮最关键的修复，不是再搬一次目录，而是把“旧状态文件读取后自动重写到新目录”的兼容补齐。

改动点在：
- `src/runtime/geo-audit.ts`
- `src/runtime/geo-suite.ts`
- `src/runtime/geo-feature-snapshot.ts`

现在的行为是：
- 如果 `runtime/geo-audits/state.json` 里还记着旧 `geo-seo-claude` 路径，读取时会自动 rebasing 到 `features/GEO`
- `geo-suite` 各模块自己的 `state.json` 也会做同样的 project root 和 command path 重写
- `geo-feature-snapshot.json` 不再优先盲信陈旧快照，而是优先刷新实时状态
- 连 `stdoutTail` 这种历史日志 JSON 里的旧目录文本也会一起改成新路径，避免页面上继续显示“看起来没迁完”

### 3.3 AI教育 壳层和 OpenMAIC 的 provider/model 同步已经完整落地
这一部分其实在上一条 resume 会话里已经做完了功能，但当时没完成提交整理。

现在已经落地并提交的点包括：
- `AI教育` 壳层新增 `minimax-tts`
- `AI教育` 默认 TTS 改为 `minimax-tts / speech-02-hd`
- `LLM / TTS / 图像 / 视频 / PDF` 的壳层选择会编码进 iframe URL
- OpenMAIC 启动时会读这些 `openclaw*` query params，并把它们应用到自己的 active provider/model
- query params 应用后会从地址栏清掉，不长期暴露

控制中心相关文件：
- `src/runtime/ai-education.ts`
- `src/ui/server-features.ts`
- `src/ui/server-inline-scripts-features.ts`
- `scripts/restart-openmaic-3000.ps1`
- `scripts/start-openmaic-3000.cmd`

OpenMAIC 相关文件：
- `components/server-providers-init.tsx`
- `lib/server/provider-config.ts`
- `app/api/generate/tts/route.ts`
- `app/api/web-search/route.ts`
- `lib/store/settings.ts`

### 3.4 OpenMAIC 这轮还顺手补了两条“relay 友好”能力
这轮 review 之后，我又多补了一刀真正的风险点：

1. `MiniMax TTS` endpoint 兼容
- 之前的实现只适合你当前的 relay 根地址，如 `https://api.bltcy.ai`
- 如果有人用官方 `https://api.minimaxi.com`，旧代码会误拼成 relay 路径
- 现在已经补成：
  - 官方根地址走 `/v1/t2a_v2`
  - relay 根地址走 `/minimax/v1/t2a_v2`
  - 如果用户填的是更完整路径，也不会重复拼接

2. `OpenAI Responses` web-search 接入
- `web-search` 现在不再只认 `tavily`
- 已经支持 `openai-responses`
- 配套补了 settings rehydrate、provider config、classroom generation 的接入

相关新增文件：
- `lib/utils/gemini-relay.ts`
- `lib/web-search/openai-responses.ts`
- `tests/gemini-relay.test.ts`
- `tests/minimax-tts-endpoint.test.ts`

## 4. 这次已经提交的 commit

### 4.1 control-center
仓库：
- `C:\Users\45441\.openclaw\workspace\external\openclaw-control-center`

本轮新提交：
- `62ed0b3 feat: sync AI education providers and stabilize feature paths`

这个提交包含：
- AI教育 壳层 provider/model 同步
- OpenMAIC 重启脚本新路径适配
- GEO 运行时旧路径兼容迁移
- GEO 相关回归测试

### 4.2 OpenMAIC
仓库：
- `C:\Users\45441\.openclaw\workspace\projects\features\OpenMAIC`

本轮新提交：
- `ab2ef64 feat: add relay-friendly provider sync and search support`

这个提交包含：
- 壳层 query params 同步到 OpenMAIC active settings
- `MiniMax Speech` 接入
- `OpenAI Responses` web-search 接入
- Gemini relay helper
- MiniMax native/relay endpoint 兼容
- 对应测试

## 5. push 当前为什么失败
代码提交已经成功，但推送远端没有成功，不是代码问题，是当前本机 GitHub 身份权限不够。

实际失败信息是：
- `openclaw-control-center`：`Permission to TianyiDataScience/openclaw-control-center.git denied to metorch.`
- `OpenMAIC`：`Permission to THU-MAIC/OpenMAIC.git denied to metorch.`

也就是说，下一位如果要继续做“推送远端”这一步，先要解决的是：
- 当前 git credential / token 对这两个仓库的写权限
- 或者切换到有权限的 GitHub 账号

## 6. 当前工作树真实状态

### 6.1 control-center
当前状态：
- `main...origin/main [ahead 23, behind 14]`
- 只剩未跟踪目录：`?? .run/`

也就是说：
- 本轮目标代码已经全部提交
- `.run/` 只是本地运行目录，没有被纳入 commit

### 6.2 OpenMAIC
当前状态：
- `main...origin/main [ahead 6]`
- 只剩未跟踪目录：`?? .run/`

同样说明：
- 本轮代码已提交
- 只剩运行时目录未跟踪

### 6.3 GEO
当前状态：
- `main...origin/main [ahead 3]`
- worktree 是干净的

## 7. 这次已经实际验证过什么

### 7.1 control-center 回归
已经跑过：
```powershell
node --import tsx --test test/geo-audit.test.ts
node --import tsx --test test/geo-suite.test.ts
```

重点验证内容：
- `geo-audit` 旧 project root 读取后会自动 rebasing
- rebasing 后的新路径会真正持久化写回状态文件
- `stdoutTail` 里的旧路径文本也会被规范化
- `geo-suite` 模块级状态同样会自动改写 command path

### 7.2 OpenMAIC 回归
已经跑过：
```powershell
pnpm test tests/server/provider-config.test.ts tests/store/settings-validation.test.ts tests/store/settings-server-sync.test.ts tests/gemini-relay.test.ts tests/minimax-tts-endpoint.test.ts
```

重点验证内容：
- provider config 不泄露敏感字段
- settings rehydrate 后新增 provider 能正常补齐
- Gemini relay helper 路径和 header 组装正确
- MiniMax native/relay endpoint 兼容正确

### 7.3 实时运行态验证
已经执行过：
```powershell
C:\Users\45441\Desktop\AI员工系统一键重启.cmd
```

并确认：
- OpenMAIC 在 `http://127.0.0.1:3000` 可达
- AI 员工系统 UI 在 `http://127.0.0.1:4310` 可达
- `GET /api/features/geo/state` 返回的 live 状态已经全部是 `features/GEO`
- `summary` 也已经能正常读取 `features/GEO` 下的历史产物
- `AI教育` 的 `repoDir` 已经是 `features/OpenMAIC`

## 8. 当前仍要注意的边界和坑

### 8.1 这轮没有动协作根语义
仍然不要碰错这些：
- 不要把协作群聊退化成 Jarvis 私聊镜像
- 不要让员工上下文越过 room/project 边界
- 不要把 `waitingFor:user_confirmation` 当成 stalled 或 completed

### 8.2 `stdoutTail` 只是展示日志，不代表真实执行路径
这次已经把 `stdoutTail` 里旧路径文本也改了，但本质上它仍然只是历史输出的镜像。

下次再遇到“页面上显示的路径”和“真实 command/artifact path”不一致时，优先信：
- `state.projectRoot`
- `state.scriptPath`
- `state.command`
- `state.artifacts`
- `summary.artifactPath`

不要只看 `stdoutTail` 就误判系统是否真的还挂着旧目录。

### 8.3 push 不是技术阻塞，是权限阻塞
这件事很重要，因为下一位容易误判成“是不是 commit 不对”。

不是。

当前剩下没完成的不是工程修复，而是：
- GitHub 写权限
- credential 切换
- 或换一个有权限的 remote / fork 流程

## 9. 下一位最推荐的继续顺序

### 9.1 第一优先，先解决 push 权限
建议先做：
1. `git remote -v`
2. 确认当前使用的账号是不是 `metorch`
3. 切到有权限的 token / credential
4. 再 push 这两个 commit：
   - control-center `62ed0b3`
   - OpenMAIC `ab2ef64`

### 9.2 第二优先，补今天这轮的文档同步
这轮已经是成体系的功能改动，建议后续补文档时优先覆盖：
- AI教育 provider/model 同步
- GEO features 目录迁移完成
- OpenAI Responses web-search
- MiniMax native/relay 兼容

### 9.3 第三优先，如果继续 AI教育 集成，就先从这几个文件读起
control-center：
- `src/runtime/ai-education.ts`
- `src/ui/server-features.ts`
- `src/ui/server-inline-scripts-features.ts`
- `scripts/restart-openmaic-3000.ps1`

OpenMAIC：
- `components/server-providers-init.tsx`
- `lib/server/provider-config.ts`
- `app/api/generate/tts/route.ts`
- `app/api/web-search/route.ts`
- `lib/audio/tts-providers.ts`
- `lib/web-search/openai-responses.ts`

GEO：
- `src/runtime/geo-audit.ts`
- `src/runtime/geo-suite.ts`
- `src/runtime/geo-feature-snapshot.ts`

## 10. 推荐接手阅读顺序
建议下一位按这个顺序进入：

1. `README.md` 里的“AI 员工系统扩展与接手入口”
2. `docs/ai-employee-system-handoff-2026-03-27.md`
3. `docs/ai-employee-system-handoff-2026-03-30.md`
4. 如果要看上一条 resume 会话原始记录：
   - `C:\Users\45441\.codex\sessions\2026\03\27\rollout-2026-03-27T20-23-20-019d2f3f-c1bd-72b3-bd05-9e42f01362ac.jsonl`
5. 如果要看本轮 continuation 会话：
   - `C:\Users\45441\.codex\sessions\2026\03\30\rollout-2026-03-30T00-36-10-019d3a73-f3cd-7841-9064-9565378f3364.jsonl`

## 11. 常用命令

### 11.1 看当前工作树
```powershell
git -C C:\Users\45441\.openclaw\workspace\external\openclaw-control-center status --short --branch
git -C C:\Users\45441\.openclaw\workspace\projects\features\OpenMAIC status --short --branch
git -C C:\Users\45441\.openclaw\workspace\projects\features\GEO status --short --branch
```

### 11.2 看最近提交
```powershell
git -C C:\Users\45441\.openclaw\workspace\external\openclaw-control-center log --oneline -10
git -C C:\Users\45441\.openclaw\workspace\projects\features\OpenMAIC log --oneline -10
```

### 11.3 重启本地服务
```powershell
C:\Users\45441\Desktop\AI员工系统一键重启.cmd
```

### 11.4 查 AI教育 状态
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:4310/api/features/education/state -UseBasicParsing
```

### 11.5 查 GEO 状态
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:4310/api/features/geo/state -UseBasicParsing
```

### 11.6 重新跑这轮关键回归
```powershell
cd C:\Users\45441\.openclaw\workspace\external\openclaw-control-center
node --import tsx --test test/geo-audit.test.ts test/geo-suite.test.ts

cd C:\Users\45441\.openclaw\workspace\projects\features\OpenMAIC
pnpm test tests/server/provider-config.test.ts tests/store/settings-validation.test.ts tests/store/settings-server-sync.test.ts tests/gemini-relay.test.ts tests/minimax-tts-endpoint.test.ts
```

## 12. 一句话总结
这轮不是又开了新坑，而是把上一条 resume 会话停在半路的“功能项目统一目录迁移”真正收口了，并把 `AI教育 / OpenMAIC` 的 provider 同步、`GEO` 的旧路径兼容、`OpenAI Responses` web-search、`MiniMax` relay 兼容一起整理成了两笔已提交的 commit。现在工程上最大的未完成项不是代码，而是远端 push 权限。
