# qq-bridge 会话接入、内部输出与记忆参考核查

日期：2026-11-03。用户要求查看此前参考的“qq-bright”；仓库既有登记为 `Derpyu520/qq-bridge`，本次据此核查。固定 main 提交 `b80fa51bc03fc4d5a1ef9a4cad7029e796b8fc67`，package.json 标注 `0.2.1-r2`。本轮通过 GitHub 工具读取源码、README、package.json、二代 preset；没有安装、运行、绑定账号或复制上游产品代码。

## 1 对当前说明的纠正

[11-02 运行时设计](../../superpowers/specs/2026-11-02-runtime-and-data-ownership.md)已推荐按场景维持 DSH 连续 Agent/session。当前预览的 `llm.stream + tools: []` 是实现差距，不是正式设计要求永远绕开宿主会话。正式 QQ 链路推荐在 DSH 会话中运行，LifeCore 管来源、状态、记忆和执行许可。

用户消息和大肥鱼回复都属于经历来源。可见反思、判断、未说出的想法也需要保存与续接渠道，分别标为解释/意图；不能升级为外部事实，不能凭自我复述增加独立成长证据。

## 2 固定版本的实际实现

| 位置 | 已读实现 | 对 LifeCore 的意义 |
| --- | --- | --- |
| bridge.js 8786–8890，ensureSession | 按 QQ 场景 key 查询 state.sessions；复用有效会话，失效退役；并发创建用 promise 合并；创建 workspace/受限 preset | 场景与 session 分开，正常交流复用宿主会话 |
| bridge.js 8849、8864–8876 | sessions.create → events.follow → 保存正反向映射 → 设置模型 | 创建、订阅、绑定均是接入的一部分 |
| bridge.js 9856–9970 | 场景串行投递 sessions.prompt({sessionId, mode:'queue', content}) | 输入真正进入 DSH Agent，并非桥接自己调用底层模型 |
| dsh-client.js 631、669–869 | RPC 经 /api/<endpoint>，事件经 /api/remote.mux 的 session/follow；快照与新事件分开 | 外部进程的宿主接入方式；不能将历史快照作为新回复外发 |
| dsh-client.js 955–1001 | collector 收集 assistant/message 的 text 块；忽略重复 chunk；turn/end 交付结果 | 不等于读取或保存完整模型内部 reasoning |
| bridge.js 12329–12602 | 工具已经发送则不再自动转发；普通聊天可转发最终文本；reserved2 的普通文字不自动发 QQ | 内部表达与实际发送分开 |
| bridge.js 3203–3244；dsh-client.js 464–499 | 退役映射、退订、清理并停止旧任务；处理宿主 inbox；归档本身只是隐藏 | 会话切换不能仅关闭窗口 |

源码：[bridge.js](https://github.com/Derpyu520/qq-bridge/blob/b80fa51bc03fc4d5a1ef9a4cad7029e796b8fc67/src/bridge.js)、[dsh-client.js](https://github.com/Derpyu520/qq-bridge/blob/b80fa51bc03fc4d5a1ef9a4cad7029e796b8fc67/src/dsh-client.js)。这些是静态实现证据，不是 LifeCore 发行包兼容认证。

## 3 内部文字与轻量记忆

[二代 preset](https://github.com/Derpyu520/qq-bridge/blob/b80fa51bc03fc4d5a1ef9a4cad7029e796b8fc67/plugins/qq-agent-presets/presets/qq-chat-v2.patch.yml)将普通文字视为内部表达，发言通过 qq_send_message / qq_reply；并提供 qq_memory_append/query/remove/clear。

bridge.js 的 7227–7241 校验 memory-append 的场景、令牌与类别；9548–9577 将 activeTopics、pendingThoughts、memberImpressions 组织给模型；9580–9647 追加/更新并限制数量和时间；9321–9349 将这些字段与近期/未读消息存入 state/social-v2.json。它确实保留“进行中的话题、想说未说的话、对人的印象”，但这不是完整长期事实/经历记忆系统，也不是底层完整推理记录。

注意 11778–11828 的 /reset 或 /new 会清理 socialV2 场景状态。因此不能原样照搬为 LifeCore 的“保留人生的新会话”。README 还明确 DSH 离线队列只在内存中，不能当作我们的耐久入站协议。

## 4 LifeCore 推荐接线

```text
SnowLuma → LifeCore 校验并耐久接收
  → 查找/创建当前 QQ 场景的 DSH Agent/session
  → 装配正式身份、人格、情绪、近期材料与获准记忆
  → DSH 执行模型和受限工具
      ├─ 可见反思/判断/计划 → 解释或意图记录，不自动发 QQ
      ├─ 记忆候选工具 → LifeCore 校验后保存或登记整理任务
      └─ QQ 发送工具 → M11 准备动作 → SnowLuma → 实际回执
  → 按来源关联双向交流、反思与结果 → 后台记忆提炼
```

建议参考二代模式的内部输出与显式发送工具边界。工具命名和接口仍待细化；模型不能自行分配可信动作 ID、目的地权限或成功状态。同一轮关闭另一条自动 QQ 转发路径，避免双发。所有副作用由 M11 包装，直接发送工具不能绕行。

这是已有“候选经 M11”分工的接线建议，不授权实际开放工具。LifeCore 已在 DSH 插件内部，优先通过宿主公开 Agent/session 服务与受管事件接入；qq-bridge 是独立进程，才需要 Web API 客户端。参考其会话组织，不照搬外部凭据读取/HTTP 鉴权代码。具体发行版本、恢复行为与事件签名仍要验证。

## 5 哪些材料保存、怎样进入长期记忆

| 材料 | 保存与提炼规则 |
| --- | --- |
| 用户消息 | 保留原始来源；提炼对方陈述与共同交流，不冒充亲眼所见 |
| 已生成的回复 | 保存生成记录；未确认发送时不记作对方已经听到 |
| 已发送内容 | 保存实际动作正文、平台消息 ID 和回执；实际发送版本可能不同于原草稿 |
| 显式反思/日记 | 标为 reflection，带来源、时间与不确定性；重要内容可入长期记忆，不能仅凭反思创造外部事实 |
| 想说未说/计划 | 标为意图或未完事项，含适用对象、状态及有效期；唤醒前核对是否过时 |
| 工具结果 | 保存与操作关联的必要证据；执行返回与平台确认分开 |
| API 实际提供的 reasoning 等轨迹 | 按 provider/DSH 实际暴露能力和留存策略处理；不假定能取得完整内部推理，不作为长期事实或跨模型续接的必需材料 |

DSH 保留执行历史，LifeCore 保留生命领域状态、来源引用和必须耐久保留的内容。通过 session/turn/message/tool/action/receipt 标识关联，原始 QQ 来源仍保留，重复采集不成为新经历。只摄入已绑定的正式场景，不把普通 DSH 编程聊天混入人生；DSH 日志、上下文与缓存纳入删除/撤权。

后台整理必须读取双向交流及相关显式反思/结果，不只读 user 消息。各来源先独立登记并产生去重整理待办；不强制等 turn/end 才保存，因为同一 Agent turn 内可能有多次实际发送。晚回执、后续回复或反思到达后，扩展来源集合并修订记忆，不能因前面的用户输入已整理就永远跳过后续内容。

主动记忆工具和后台提炼共用正式提交、来源族去重及版本规则，不双重保存或重复计成长。显式反思用简短结论/感受/待办，不强制每轮长篇独白；其访问与模型出站仍受来源范围限制。

例：用户说开始学吉他；她回复想听下一次练习；她反思希望陪伴对方坚持。三者都可保留，但分别是用户陈述、实际表达和自身意愿，不能将未发出的想法记成已经说过。

## 6 复用范围与限制

借鉴场景/session 映射、受限 preset、串行投递、事件订阅、工具发送、话题/待说想法和宿主 inbox 清理。LifeCore 仍需实现正式记忆/情绪/人格版本、耐久接收、效果去重、来源/回执关联、删除恢复及保留人生的会话交接。

固定版本 [package.json](https://github.com/Derpyu520/qq-bridge/blob/b80fa51bc03fc4d5a1ef9a4cad7029e796b8fc67/package.json) 和 [README](https://github.com/Derpyu520/qq-bridge/blob/b80fa51bc03fc4d5a1ef9a4cad7029e796b8fc67/README.md) 标注 PolyForm Noncommercial 1.0.0，早期发行版许可不同。实际逐文件复用需核对版本许可，不能将当前源码当旧 MIT 版本复制。本轮仅记录设计参考。
