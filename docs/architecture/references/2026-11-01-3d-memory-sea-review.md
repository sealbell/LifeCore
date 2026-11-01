# 3d-memory-sea 源码研究与 LifeCore 采用评估

- 研究日期：2026-11-01。
- 研究对象：[`asdfd3/3d-memory-sea`](https://github.com/asdfd3/3d-memory-sea)。
- 固定提交：[`bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f`](https://github.com/asdfd3/3d-memory-sea/commit/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f)。提交日期为 2026-10-28，项目版本为 `0.1.0`。本次读取的默认分支头即该根提交。
- 方法：通过 GitHub connector 读取固定版本源码、文档及完整文件树；在工作区之外的临时检出中，审阅测试后执行原有纯函数测试与额外最小样例。没有安装依赖、运行项目服务或修改项目源码。
- 验证环境：本机 Node.js `v22.11.0`。
- 结论边界：这是固定版本的源码审阅和功能边界复现，**不是生产评测、渗透测试、浏览器负载测试或长期运行验证**。测试通过不代表满足 LifeCore 的身份、权限、持久化、恢复和并发要求。

## 1. 结论

`3d-memory-sea` 适合作为 LifeCore 的 **M15 记忆浏览界面参考**，以及 **M04 词面召回算法参考**；不能直接作为 M04、M12、M13 的生产记忆底座。

它并非只有界面：仓库确实包含记忆状态判定、去重、替代、近似合并和检索规则。准确定位是：**一个可视化组件，附带两个可重用的轻量记忆规则模块**。它没有把这些规则补成完整的持久化记忆引擎。

它也没有实现 Markdown vault、Obsidian 双链存储、SQLite 或向量库。因此，不能用这个项目作为“Markdown 链接图可以替代 SQLite”的源码依据。可视化中的点和线是由输入数组生成的展示数据，并非权威知识图谱数据库。[场景服务](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/scene-service.mjs#L10-L62)、[图生成](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L306-L420)。

## 2. 能力核验

| 维度 | 固定版本实际实现 | 对 LifeCore 的意义 |
|---|---|---|
| 数据输入 | `longTerm`、`messages`、`diaries` 三组 JSON 数组；服务启动时读取 JSON 文件一次 | JSON 是外部输入，不是可靠写入存储 |
| Markdown / Obsidian | 无 Markdown vault 解析、双链读写或 Obsidian 接入 | 不能据此论证 Markdown 图谱可替代数据库 |
| SQLite / 数据库 | 无 SQLite、关系数据库或图数据库 | 无事务、关系约束、迁移和持久化版本机制 |
| 向量检索 | 无 embedding、向量索引、模型 API | 三维位置不代表语义向量距离 |
| 词面检索 | 中文 bigram、英文词、IDF、时间衰减、主题命中、规则联想、核心主题保底、近期补齐 | 可参考无模型依赖召回；不是完整语义检索系统 |
| 写入逻辑 | `applyAppend()` 在数组上创建、精确去重、近似合并、同主题替代 | 没有落盘、事务或来源证据验证 |
| 状态与历史 | `pending`、`superseded`、`expired`、`stale`、`active` 等状态判定，以及替代指针 | 简单状态和替代链，不是不可变历史版本与纠错审计 |
| 三维展示 | Canvas 2D 实现三维旋转、透视投影；簇按标签分组，簇内位置由 ID 哈希确定 | 可用于浏览；不应解释为学习得到的语义空间 |
| 身份与权限 | 无持久 `life_id`，无平台、会话、群组、主体权限校验 | 数据进入组件之前必须先完成授权过滤 |
| 删除与恢复 | 无删除 API、墓碑、删除传播、备份恢复协议 | 不具备“删除后恢复旧备份也不复活”的保证 |
| 并发与持久性 | 单进程内存数组，无 revision/CAS、幂等键、事务、崩溃恢复 | 不能承担多入口并发持久化写入 |
| 运行时 | Node.js ≥20，无第三方运行时依赖 | 可参考其 JS 实现；不需要额外 Python 运行时 |
| 许可证 | MIT | 复用时保留相应版权和许可声明 |

主要依据：[package.json](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/package.json)、[LICENSE](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/LICENSE)、[服务读取与路由](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/server.mjs#L11-L80)、[检索实现](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-retrieve.js#L16-L220)、[前端布局与投影](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/public/index.html#L109-L198)。

## 3. 实际数据链路

默认演示服务的流程是：

```text
启动时读取 JSON 文件
  → createSceneService 持有三组内存数组
  → collectPoints / pointFromDiary 转为展示点
  → buildScene / linkPoints 生成边和统计
  → GET /api/scene 返回 JSON
  → Canvas 2D 完成三维布局、投影和交互
```

`memory-store.js` 和 `memory-retrieve.js` 提供可由外部调用的规则函数，但默认 HTTP 服务没有完整的记忆新增、确认、纠错、删除或检索写回接口。它也没有自动抽取模型或现成 DSH 桥接；源码注释提到的桥接上下文不等于仓库包含该实现。[服务入口](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/server.mjs)、[场景服务](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/scene-service.mjs)。

`POST /api/rebuild` 仅重建当前内存中的数组，不会重新读取磁盘上的 JSON。宿主程序可以调用 `load()` 替换数组，但那是进程内接口，不是持久化协议。[启动读取与 rebuild 路由](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/server.mjs#L28-L58)、[load](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/scene-service.mjs#L46-L51)。

## 4. 与 LifeCore 要求直接相关的问题

### 4.1 展示层没有落实“未确认不进海”

README 声称 `confirmed:false` 的长期记忆不会进海，但 `scene-service.rebuild()` 直接把长期记忆传给 `collectPoints()`；`pointFromLongTerm()` 不检查 `confirmed` 或 `expiresAt`，只在 `active:false` 时降低点权重。

额外样例同时传入 pending、superseded、expired 三条，三条均出现在场景中。检索层确实使用 `entryState()` 排除这些状态，但展示层没有统一采用该口径。历史展示本身可以是合理功能，前提是明确模式、状态和授权，不能依赖当前默认行为或文档承诺。[长期记忆转点](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L242-L254)、[收集逻辑](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L306-L318)、[场景调用](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/scene-service.mjs#L23-L35)。

### 4.2 未确认候选能作废已确认事实

`applyAppend()` 创建 `confirmed:false` 的新条目后，仍会把所有同 `topic` 的活跃旧条目设为 superseded。样例结果为：旧条目 superseded，新条目 pending，原来可以注入的事实不再可用。

此外，同主题不等于同一事实。例如 `food` 下的食物喜好和过敏信息可以并存。LifeCore 应按实体、属性、场景、有效时间和证据关系判断替代，不应以大类主题直接互斥。[创建与同主题替代](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-store.js#L187-L219)。

### 4.3 再次出现旧文本会自动复活旧事实

精确文本匹配分支会把 `active` 改回 true，并清空 `supersededBy`、`supersededAt`。这次输入即使 `confirmed:false`，也能复活此前已经确认但后来被替代的旧条目。该行为是现有测试明确要求的设计，不是仅由本次推测得到。

仓库没有删除墓碑，因此不能把这描述成一个已经实现的“删除恢复”流程；准确风险是：照搬此规则会让旧记录导入、重放或再次提及绕过 LifeCore 的纠错和版本裁决。[复活分支](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-store.js#L143-L156)、[原有复活测试](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/tests/memory-store.test.mjs#L82-L93)。

### 4.4 “永远保留、可回滚”不是模块整体保证

`trimEntries()` 会从返回集合中移除 inactive；默认 `maxInactiveKeep` 为 0。超过总量上限时，它还可能移除活跃记忆。若宿主持久化裁剪后的集合，历史内容将丢失。近似合并也可能直接覆盖旧条目的 `text`，没有保存上一版内容。

因此，状态机注释中的“只标记、不删除、内容永远留着”不能作为整个系统的历史保留承诺。[裁剪实现](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-store.js#L89-L124)、[近似合并覆盖](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-store.js#L167-L183)。

### 4.5 检索预算与数量上限存在越界

已复现：

- `budgetChars=120`，首条文本 1000 字，最终 `chars=1000`。原因是超预算拒绝条件要求 `selected.length > 0`，第一条会被放行。
- `maxInject=1`，两条分别属于 `profile` 和 `owner-profile` 的核心记忆仍能同时返回。原因是核心保底先取最多两条，没有受这一配置同步限制。

它使用字符数量，也不等于模型 token 预算。LifeCore M09 的严格上下文预算不能直接委托给这段实现。[核心保底](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-retrieve.js#L130-L150)、[预算装箱](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-retrieve.js#L162-L202)。

### 4.6 “纯函数”实际会修改共享对象

`applyAppend()` 只使用 `entries.slice()` 浅复制数组，随后直接修改原条目对象。额外样例确认，调用前输入数组中的旧对象也被改为 `active:false`。`buildScene()` 同样直接写入 `point.cluster`。

因此，不能把输出当作与输入完全隔离的快照；这会影响回滚、并行读取和版本比较。[浅复制与修改](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-store.js#L136-L156)、[场景写 cluster](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L388-L397)。

### 4.7 展示详情不等于严格原文证据

普通点会压缩空白并截断文本；默认场景服务将 `textMax` 设为 160。日记 `full` 默认也只保留最多 1400 字。来源字段只留下 `{type,id}`，没有保留原消息哈希、精确片段位置、平台主体身份和权限快照。

点 ID 由时间与归一化后的文本生成；长期记忆 ID 使用时间加短随机串。这些 ID 都不能替代 LifeCore 永久 `life_id`、原始事件 ID 和证据版本。[点 ID 与归一化](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L208-L237)、[日记截断](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L283-L302)、[长期记忆 ID](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/memory-store.js#L127-L129)。

### 4.8 检索焦点接口缺少返回字段

后端接收 `focusIds`，但只把焦点计数放入 `stats.focusCount`，没有返回 `focusIds`。前端使用 `data.focusIds` 创建焦点集合。最小样例中计数为 1，而响应中的焦点列表不存在，因此默认契约无法支持预期高亮。[场景返回](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L406-L420)、[前端读取](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/public/index.html#L141-L145)。

## 5. 隐私、服务与图语义

`mind-sea.js` 文件头写“只服务主人的私聊”，但这是调用假设，代码没有校验 `ownerKey`。模块也没有提供按主体、平台、群组或会话隔离数据的权限机制。[模块声明](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L1-L7)。

默认 HTTP 服务监听 `127.0.0.1`，不应把它描述成默认向互联网公开。但是服务没有鉴权，静态文件路由根目录又是整个项目目录；放在该目录 `data/` 下的真实 JSON 也可通过静态文件路径读取。LifeCore 接入时应仅开放固定静态资源，并通过 M12 授权的数据 API 提供场景和详情。[监听地址及数据路径](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/server.mjs#L11-L15)、[路由边界](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/server.mjs#L49-L80)。

图边的分数来自关键词重叠、bigram 相似、主题一致、时间接近；边数受邻居上限约束。三维布局是标签簇加确定性散布，不是事实关系抽取，也不是 embedding 投影。因此，界面中的“近”和“连线”不能被解释成事实成立、因果关系、情感关系或权限关系。[连线实现](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L324-L385)、[三维布局](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/public/index.html#L109-L139)。

`guessTopic()` 是导出函数，但默认 `scene-service` 没有将它传入消息转换。消息缺少 topic 时仍走 `misc`；默认链路未自动执行该关键词分类器。[主题函数](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L100-L112)、[消息主题选择](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/mind-sea.js#L269-L273)、[默认调用](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/src/scene-service.mjs#L23-L28)。

## 6. 测试记录与复现边界

### 6.1 原有测试

在固定提交和 Node.js `v22.11.0` 下执行：

```text
node tests/memory-store.test.mjs     → 10 passed
node tests/mind-sea.test.mjs         → 16/16 passed
node tests/memory-retrieve.test.mjs  → 16/16 通过
合计                               → 42/42 通过
```

测试源码：[memory-store](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/tests/memory-store.test.mjs)、[mind-sea](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/tests/mind-sea.test.mjs)、[memory-retrieve](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/tests/memory-retrieve.test.mjs)。

### 6.2 额外最小样例

以下是本次审阅中通过直接导入模块、使用内存样例得到的结果，不计入原仓库的 42 项测试：

| 样例 | 观察结果 |
|---|---|
| 已确认 `food` 旧条目，追加同 topic 未确认新条目 | 旧条目变为 `superseded`，新条目为 `pending` |
| 再追加逐字相同的旧文本，这次仍为 `confirmed:false` | 返回 `action=reactivated`，原已确认旧条目重新为 `active` |
| 场景传入 pending、superseded、expired 各一条 | 三条全部出现在场景点集合中 |
| `budgetChars=120`，一条 1000 字核心记忆 | 返回 `chars=1000`、1 条入选 |
| `maxInject=1`，两条不同核心主题记忆 | 返回 2 条入选 |
| 调用 `applyAppend()` 前后比较输入对象 | 输入对象被修改 |
| 默认配置裁剪一条 active 和一条 inactive | 返回集合只保留 active |
| 对实际点传入一个 `focusIds` | `focusCount=1`，返回值没有 `focusIds` |

复现参数固定时间为 `1760000000000`。样例只验证上述行为，不证明所有输入或宿主集成的表现。没有把演示服务接入真实聊天，也没有执行任何真实数据的删除、恢复或权限操作。

### 6.3 未验证的生产性质

本次没有开展浏览器视觉验收、长时间运行、崩溃恢复、跨进程并发、权限隔离、备份恢复或安全渗透测试。仓库现有测试集中在三个规则模块，不能替代这些验证。

原检索测试包含 2000 条记忆耗时小于 60ms 的单机断言，本次通过；这不是稳定的容量或 SLA 承诺。README/接入文档关于 4000 点流畅、8000 点开始掉帧的描述未由本次独立验证。[检索测试](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/tests/memory-retrieve.test.mjs)、[接入文档](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/docs/how-to-plug-in.md)。

## 7. LifeCore 采用边界

以下为结合 LifeCore 要求作出的设计建议，不是该仓库已经提供的能力。

### M15：采用浏览体验，重建数据契约

可复用或参考三维布局、旋转缩放、颜色、簇标签、点详情和焦点呈现。先修复 `focusIds` 契约，再将场景数据定义为受授权限制的展示 DTO。

详情页应按原始事件 ID 请求受控证据接口，展示原文、时间、来源、状态和版本，不应把截断后的点文本冒充完整证据。组件可嵌入 LifeCore 的 DSH 插件界面，不必强制另设外部生命服务器。

### M04：借鉴可解释召回，重写写入裁决

bigram、主题、近期性和召回理由可以作为词面召回与降级策略。所有召回候选、核心保底、近期补齐、DF 统计、调试输出必须先经过 M12 权限过滤。

主题只负责分类。事实替代须引用同一事实键和有效范围；未确认候选不得自动废弃已确认事实。否定、纠错、撤回、过期、替代和删除应有不同语义。版本更新必须保留证据与被替代版本，不应直接覆盖历史文本或依赖再次出现旧文本自动复活。

### M09：单独落实严格预算

在排序后按目标模型的 token 预算装配上下文，包含模板、来源和引用开销。首条、核心保底、兜底和特殊条目都不得突破硬上限；不能直接沿用当前字符预算函数。

### M13：建立权威存储，图与 Markdown 作为投影

建议以 SQLite 保存持久 `life_id`、原始事件、证据引用、记忆版本、权限、关系、状态投影、删除墓碑、幂等键和迁移版本。全文索引、向量索引、图边、Markdown 导出和三维场景是可重建派生数据。

Markdown 与双链适合阅读、导出、手工审阅和知识组织，但不能因为有链接图就省去身份唯一性、事务、约束、并发控制和删除恢复协议。双链的展示语义与生产系统的事实、权限和版本语义需要分开建模。

### M12：统一所有数据出口

对话检索、图谱场景、统计、原文详情、导出和恢复都必须走一致的主体与范围校验。面板位于本地，不代表任何调用方都能查看所有私聊。默认未知身份或未知范围不得因核心保底、近期补齐、调试接口而获得数据。

### 删除与恢复：建立独立协议

显式删除不能复用普通 superseded 语义。删除墓碑和删除版本水位不能被旧备份、重放事件、旧 JSON 或重新生成的索引覆盖。恢复后先应用删除记录，再重建全文、向量、图和导出；任何派生索引都不能反向成为复活已删除正文的来源。

## 8. 与 SeekMemory 的使用关系

本次未重新核验 SeekMemory 源码。下表中的 SeekMemory 信息沿用主任务先前针对 `ab0fd496` 的审阅上下文，不作为本报告独立验证的新结论；详细证据应以对应研究文档为准。

| 对象 | 借鉴价值 | 不宜直接接受的部分 |
|---|---|---|
| SeekMemory | SQLite 持久化、DSH 桥接、关系/人格/runtime 的结构经验 | 先前发现的全局候选隐私边界、unknown 发送处理及额外 Python 成本 |
| 3d-memory-sea | 零依赖 JS 浏览面板、词面召回、可解释连线 | 内存数组代替权威存储、同主题覆盖、自动复活、无鉴权 JSON 服务 |
| LifeCore | 在 DSH 插件中统一身份、证据、权限、状态和生命周期；数据库为权威记录，图与 Markdown 为视图 | 让任何一个参考仓库整体决定永久身份、权限与删除语义 |

两个项目提供不同层的参考，不是两个可以直接二选一的完整长期陪伴内核。
