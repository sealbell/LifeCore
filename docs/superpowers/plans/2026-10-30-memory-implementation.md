# LifeCore 记忆模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. If the user chooses delegated execution, use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** 实现一个运行在 DSH 内、可在新会话和重启后恢复身份与经历，并以有来源的相关记忆支持回复的模块。

**Architecture:** 一个插件，内部保留纯记忆规则、流程协调、SQLite 存储和 DSH 适配器边界。先打通原文入账、恢复、关键词检索和真实模型请求，再增加事实/经历整理、语义召回与有限回查。保存、检索、回答分别验证。

**Tech Stack:** TypeScript/ESM；Node 运行时跟随已固定的 DSH 基线（其 package.json 要求 >=24.9.0）；SQLite/FTS5；Vitest；pnpm。首选试验 node:sqlite + 独立数据库 worker，任务 1/2 验证宿主可用性、FTS5 和一致性备份；不通过则仅替换 SQLite 适配器并记录依赖决定。embedding/reranker 以可替换端口实现，任务 8 用中文测试确定具体模型和版本。

**Spec:** [完整架构](../../architecture/modules/M04-M09-memory-system.md)、[验收方案](../../architecture/modules/M04-M09-memory-evaluation.md)、[来源记录](../../architecture/references/memory-research.md)。

日期：2026-10-30。状态：实施计划，全部任务尚未执行。当前仓库只有文档，没有 package.json、产品源码或可运行插件。本计划中的命令/文件是后续要创建和执行的对象，不是本轮已完成事项。

范围补充：本文件是记忆链路专项计划。项目第一版的 M01–M15 需求以[全模块需求讨论稿](../../requirements/v1-requirements.md)和后续会议决定协调；[架构与数据流](../../architecture/v1-data-flow.md)解释交接路径。用户当前要求先确定开发方案，本计划不构成开始编码或安装软件的授权。

## Global Constraints

- “单 DSH 插件、单正式生命、无独立 LifeCore 服务器、数据独立于插件安装目录”。
- M02 统一提交；M03 拥有事件/情节；M04 规则不直接访问数据库、模型或网络；M09 负责模型任务；M14 实现宿主适配。
- 原文、整理任务、需要回复时的 turn 占位和 reply job 必须同事务提交。
- 权限先于候选池；派生表示继承来源限制；试聊与正式生命分开。
- 生成草稿不等于发送成功；结果未知不得盲目重发。
- 当前事实读取执行协调水位屏障；不能把未协调的旧值当当前值注入。
- 主动联想默认关闭是设计提案；保留已有配置，关闭不影响必要事实读取或明确回忆。
- 查询扩展最多 3 个；首轮候选上限为结构化 20、全文 40、向量 40、情节/时间 20；合并上限 120、重排最多 30；关联扩展 1 跳最多 10 项。均为待校准的初始值。
- 最多 2 次追加读取批次，累计新增材料默认 4,000 tokens，仍受总窗口限制；输入目标示例 16,000，必须按实际模型重算。
- 全部开发/故障测试使用合成记录与临时数据目录；真实数据不入 Git，不自动上传评测服务。
- 宿主基线固定 ce7073d51254c26cd63b22a60835b8f948deb447；实际安装版本必须记录和验证，不把源码接口存在等同集成通过。
- 不开发完整情绪、人格成长、QQ/B站接入或管理 Web UI。它们通过显式状态端口接入；首轮验证使用 DSH 测试入口，随后接唯一选定平台入口。

## Review Focus

1. 同文字不同消息、重送和编辑不能混为一件事；任务 2 的 ingest.spec.ts 验证。
2. 新消息提交后、reply worker 启动前崩溃仍能继续该轮；任务 3 的 recovery.spec.ts 验证。
3. 中文偏好更正后立即新开会话，旧事实不能作为当前事实出现；任务 6 的 reconcile.spec.ts 验证。
4. 同一人不同场景、新同名用户、旧删除缓存不能共享越权结果；任务 4/9 的 scope.spec.ts、deletion.spec.ts 验证。
5. 工具续轮、过长输入或宿主包装增加 tokens 后仍不超限、不静默截断当前请求；任务 5/8 的 context.spec.ts、read-tools.spec.ts 验证。

## 交付边界与三个里程碑

| 里程碑 | 对应任务 | 可演示结果 | 使用限制 |
| --- | --- | --- | --- |
| A：持久记忆闭环 | 1–5 | 写入原话 → 退出 → 恢复 → 新会话检索 → 大肥鱼引用正确材料回复 | 合成数据开发版本；复杂语义和完整删除传播未完成 |
| B：完整语义闭环 | 6–9 | 事实更新、共同经历、中文同义回忆、无关项排除、全链路删除恢复 | 实测质量之前不宣称已达到长期陪伴要求 |
| C：可试运行版本 | 10 | 固定模型/配置、报告真实结果、包可安装、有备份与诊断 | 真实数据只在用户已授权的本地配置下使用 |

第一场演示：记录一个称呼、一件共同讨论和一个偏好；结束会话并重启；分别询问“我是谁”“上次为什么没选那个方案”“我现在喜欢什么”。然后更正偏好，再新开会话，检查旧值不会复活。每一步展示存储事件、候选、选中证据和最终请求，不只展示一句看似正确的回答。

## 文件结构

以下为拟创建的结构；具体任务才创建其所需文件，避免先建立空模块。

~~~text
src/
  contracts.ts                   版本化消息/来源/范围/回合/记忆包类型
  ports.ts                       存储、模型、宿主、发送、tokenizer 接口
  coordinator.ts                 接收与状态统一提交，任务推进
  memory/
    fact-rules.ts                事实版本、时间、冲突与当前头规则
    episode-rules.ts             情节表示、关联候选验证、重要性
    retrieval-rules.ts           融合、相关性门槛、去重与选择
    context.ts                  预算分配与证据表现层
  application/
    ingest.ts                    接收流程与重送路由
    dispatcher.ts                持久任务、租约、取消、重试
    query.ts                     授权范围内组织存储/重排查询
    maintenance.ts               抽取、协调、摘要任务
    reply.ts                     检索/上下文/生成/提交草稿
    deletion.ts                  删除意图、传播、恢复前屏障
  identity/
    bindings.ts                  稳定账号映射，不按昵称合并
  privacy/
    policy.ts                    读取/模型出站/发送/删除授权
  storage/
    sqlite-worker.ts             独立 worker 内数据库连接与事务
    sqlite-store.ts              worker RPC 与 StorePort 实现
    migrations/001-core.sql      事件/身份/任务/游标/轮次/策略/删除/索引元数据
    migrations/002-memory.sql    事实/来源/覆盖/情节/工作头
    migrations/003-vector.sql    版本化向量及索引任务
    lexical.ts                  一致分词、FTS5、原文索引
    vector.ts                   有权限预筛选的向量读取
    backup.ts                   一致性快照、manifest、恢复核验
    deletion-ledger.ts          独立目录追加与重放协议
  dsh/
    plugin.ts                   插件生命周期与唯一装配入口
    host.ts                     实现 HostPort；每轮独立 scope
    model.ts                    实现受限 ModelPort；整理与回复职责分离
    read-tools.ts               作用域 search_memory/read_evidence
  delivery/
    outbox.ts                   待发/发送/回执状态
  diagnostics/
    trace.ts                    脱敏的来源/选入理由/预算/健康指标
    commands.ts                 inspect/search/correct/erase/backup/health
test/
  support/fixture.ts             合成记录、临时目录、可控时钟和 mock ports
  support/crash-worker.ts        真实子进程崩溃点与重启控制
scripts/
  probe-dsh.ts                   真实宿主加载/请求/取消/卸载探针
  evaluate-memory.ts             四层指标、对照和消融执行器
~~~

package.json、pnpm-lock.yaml、tsconfig.json、vitest.config.ts 随任务 1 创建。插件配置只提供无凭据模板，使用者的数据目录通过绝对路径显式配置。

## 公共接口约定

所有 ID 均由程序生成或可信适配器解析，模型不得生成权限范围。以下名字在任务间保持一致；完整字段直接按架构第 5/10 节编写 Schema，建立输入验证与版本迁移，禁止 any 绕过边界。

| 类型/接口 | 必需内容 |
| --- | --- |
| IncomingEnvelope | lifeId, sourceKey, sourceRevision, conversationId, actorBinding, scopeId, occurredAt/null, rawText, kind, replyTrigger |
| AcceptedEvent | eventId, duplicate, turnId/null, committedOffset |
| QueryScope | lifeId, principalId, scopeId, policyVersion, permittedSourceIds/授权查询约束, modelEgressTarget |
| SourceRef | eventId, revision, start/end（Unicode code point）, contentHash |
| Snapshot | restoreGeneration, policyVersion, sourceWatermark, unresolvedRanges, dependencyVersions |
| MemoryProposal | facts, episodeCandidates, importanceCandidates, sources, inputVersions, processorVersion |
| RecallResult | items, evidence, status(found/none/partial/unavailable), degradedModes, selected/rejectedReasons, coverage |
| ContextPacket | 按架构第 10 节，包括 token manifest、pendingReconciliation、来源版本和当前输入 |
| ReplyDraft | text, evidenceIds, uncertainty, proposals；无隐藏思维链 |
| DeliveryReceipt | actionId, state(confirmed/failed/outcome_unknown), externalId/null, observedAt |

关键端口放 src/ports.ts：

~~~typescript
interface HostPort {
  probe(): Promise<CapabilityReport>
  runPreparedTurn(packet: ContextPacket, signal: AbortSignal): Promise<ReplyDraft>
}
interface ModelPort {
  propose(task: MaintenanceInput, signal: AbortSignal): Promise<MemoryProposal>
  judge(query: RecallQuery, candidates: Candidate[], signal: AbortSignal): Promise<RelevanceJudgment[]>
}
interface EmbeddingPort {
  metadata(): EmbeddingMetadata
  embed(texts: string[], scope: QueryScope, signal: AbortSignal): Promise<number[][]>
}
interface DeliveryPort {
  send(action: OutboundAction, signal: AbortSignal): Promise<DeliveryReceipt>
  reconcile(action: OutboundAction): Promise<DeliveryReceipt>
}
~~~

CapabilityReport 明确宿主/Node/插件版本、加载/隔离/计数/取消/历史清理支持和错误。MaintenanceInput、RecallQuery、Candidate、RelevanceJudgment、EmbeddingMetadata、OutboundAction 在各自产生任务中定义，字段来自架构对应章节，并导出到 contracts.ts；相关任务实现前不得伪造生产默认值。内部存储接口按任务新增最小方法，不导出任意 SQL 执行权限给领域模块。

## 任务 1：证明 DSH 接入与运行时可用

**Files:** 创建项目配置、src/contracts.ts、src/ports.ts、src/dsh/plugin.ts、src/dsh/host.ts、scripts/probe-dsh.ts、test/dsh-contract.spec.ts、test/support/fixture.ts、docs/architecture/references/dsh-memory-compatibility.md。

**Interfaces:** 产生 HostPort.probe()；适配层确认如何将已准备的材料安装到 scoped setup、驱动一轮、取得最终结果并取消。后续 runPreparedTurn 只使用这次确认的接口，不从旧示例猜签名。

- [ ] 编写失败测试：两个 agent 分别注入 A/B 标记，真实请求中不得出现另一 scope 的标记；卸载后不再产生请求。为 mock provider 建立捕获请求的 fixture，明确 mock 只能测协议，真实宿主探针单独执行。
- [ ] 运行 pnpm exec vitest run test/dsh-contract.spec.ts，确认因缺失适配而失败。
- [ ] 创建最小项目配置和插件；锁定兼容依赖，不安装完整参考项目。实现 probe，检测原生 SQLite/FTS5 候选能力，记录宿主日志是否可清理和实际消息驱动接口。
- [ ] 重跑测试；执行 pnpm run probe:dsh。宿主不存在时报告真实集成未执行，继续独立内核工作，但不得把里程碑 A 标为完成。真实模型端点不可用时允许本地 mock provider 探针，明确模型质量未测。
- [ ] 保存兼容报告与审阅差异；有既定 Git 作者身份时提交，无身份则保留已验证改动，不自行设置身份。

## 任务 2：可靠记录、身份和基础权限

**Files:** 创建 src/storage/sqlite-worker.ts、sqlite-store.ts、migrations/001-core.sql、src/coordinator.ts、application/ingest.ts、identity/bindings.ts、privacy/policy.ts、test/ingest.spec.ts、test/scope.spec.ts。

**Interfaces:** Coordinator.acceptEvent(envelope: IncomingEnvelope): Promise<AcceptedEvent>；Policy.authorize(turnId: string, modelTarget: string): Promise<QueryScope>；Store.readSnapshot(scope: QueryScope): Promise<Snapshot>。事务与 Schema 包含架构原文、游标、jobs、turns、dirty watermark 和删除/策略状态；只有 M02 写入。

- [ ] 失败测试包括：同 sourceKey/revision 重送返回同 eventId；相同 rawText 不同 sourceKey 产生两条事件；编辑保留旧版本；中途异常则原文/turn/job 全部回滚；新开 session 的 lifeId/personId 不变；未知账号不绑定主人。
- [ ] 运行 pnpm exec vitest run test/ingest.spec.ts test/scope.spec.ts，先确认红灯。
- [ ] 实现数据库 worker 单连接写队列、版本迁移与短事务；读取实际 WAL/FULL/foreign_keys 设置；dataDir 必须在仓库/安装目录之外。实现 scope 授权，默认拒绝跨场景材料。rawText 完整保存，Schema 不截断正文。
- [ ] 重跑上述测试；增加数据库打开失败不创建新 lifeId 的断言。坏库、磁盘满、无权限错误必须返回失败而不是 accepted。
- [ ] 审阅并提交该任务，提交条件同任务 1。

## 任务 3：重启、备份和删除账本基础

**Files:** 创建 src/application/dispatcher.ts、storage/backup.ts、storage/deletion-ledger.ts、test/recovery.spec.ts、test/support/crash-worker.ts。

**Interfaces:** Dispatcher.claim(): Promise<JobLease|null>、complete(lease: JobLease): Promise<void>；Backup.create(): Promise<BackupManifest>、restore(manifest: BackupManifest): Promise<RestoreResult>；DeletionLedger.append(intent: DeleteIntent): Promise<DeleteHead>、replay(fromSeq: number): Promise<DeleteIntent[]>。

- [ ] 失败测试：子进程在“接收提交后、领取回复前”退出；重启后同一 turn 被领取且只有一份业务效果；租约过期可恢复；DeleteIntent 持久后主库未应用即崩溃，启动先重放再开放读取。
- [ ] 运行 pnpm exec vitest run test/recovery.spec.ts，确认失败点来自未实现功能，而非测试装置错误。
- [ ] 实现持久队列/租约/CAS、启动扫描、取消与代次；一致性备份含 schema/source/delete 水位与 hash，删除账本独立恢复目录。集成测试使用原生同步/备份调用，不用普通文件复制代替活动数据库快照。
- [ ] 重跑测试并从快照恢复到另一个临时目录，比较事件 hash、lifeId、pending jobs；删除 head 无法证明最新时断言隔离。记录每小时备份和保留策略配置，不启动用户未配置的异机上传。
- [ ] 审阅并提交；此时备份服务可用，完整派生删除传播由任务 9 补齐。

## 任务 4：中文原文检索与连续性恢复

**Files:** 创建 src/storage/lexical.ts、application/query.ts、memory/retrieval-rules.ts、test/lexical.spec.ts；修改 src/application/ingest.ts、src/storage/sqlite-store.ts、sqlite-worker.ts 接入事务索引；扩展 test/scope.spec.ts。

**Interfaces:** QueryService.search(query: RecallQuery, scope: QueryScope, snapshot: Snapshot): Promise<RecallResult>；readContinuity(scope: QueryScope): Promise<ContinuityView>；readEvidence(refs: SourceRef[], scope: QueryScope): Promise<Evidence[]>。

- [ ] 失败测试：纯中文、名字/日期、不同同名主体、很旧的原话均可检索；授权候选不会被其他场景 top-k 挤掉；取消授权后旧缓存不可返回；关闭再打开数据库仍取到同一证据。精确片段的 code point 偏移含 emoji 时仍正确。
- [ ] 运行 pnpm exec vitest run test/lexical.spec.ts test/scope.spec.ts，确认红灯。
- [ ] 实现一致中文预分词与字符二元组辅助字段、精确数字/实体路径；原文 FTS 与事件事务一致提交。查询先应用授权集，结果回权威表复核；连续性仅含可信身份和有来源的分支入口，暂不制造未抽取的当前偏好。
- [ ] 重跑；断言 FTS 缺失返回 unavailable，零匹配返回 none。初版同义检索不足应记录失败样本，交任务 8，不能用最近条目填补。
- [ ] 审阅并提交。

## 任务 5：上下文、真实回复与发送状态

**Files:** 创建 src/memory/context.ts、application/reply.ts、delivery/outbox.ts、diagnostics/trace.ts、test/context.spec.ts、test/reply.spec.ts；扩展 src/dsh/host.ts。

**Interfaces:** buildContext(input: ContextInput, tokenizer: TokenCounter): ContextPacket；ReplyService.run(turnId: string): Promise<TurnResult>；Outbox.prepare(turnId: string, draft: ReplyDraft): Promise<OutboundAction>；Outbox.record(receipt: DeliveryReceipt): Promise<void>。

- [ ] 失败测试：预算含人格/工具/宿主包装；当前请求不被静默截断；原文中的模板符号保持字面；私聊 A 的 packet 不进入 B；生成成功不计为 confirmed；发送未知不自动重试；取消后的迟到结果不发送。
- [ ] 运行 pnpm exec vitest run test/context.spec.ts test/reply.spec.ts，确认失败。
- [ ] 实现 packet/依赖清单/预算与降级状态；真实 DSH 每轮独立作用域；回复先缓冲再检查依赖，Outbox 在实际出站前再次校验策略和轮次代次。开发入口用可控 DeliveryPort，后续真实平台适配必须通过同样契约。
- [ ] 重跑测试及 probe:dsh；捕获最终模型请求，与 packet manifest 核对。演示原文写入、进程退出、重启、新会话检索和回答；未配置真实模型则只报告请求链路通过。
- [ ] 审阅并提交。达到里程碑 A 后展示实际限制，不把关键词能力当完整语义能力。

## 任务 6：事实抽取、纠正与当前状态屏障

**Files:** 创建 src/storage/migrations/002-memory.sql、src/memory/fact-rules.ts、application/maintenance.ts、dsh/model.ts、test/reconcile.spec.ts；扩展 contracts/store/query。

**Interfaces:** ModelPort.propose(input: MaintenanceInput, signal): Promise<MemoryProposal>；validateFactProposal(proposal: MemoryProposal, snapshot: Snapshot): ValidatedProposal；Coordinator.commitMemory(proposal: ValidatedProposal): Promise<CommitResult>；QueryService.ensureReconciled(query: RecallQuery, scope: QueryScope): Promise<ReconciliationState>。

- [ ] 失败测试：晚导入的旧记录不覆盖现在；“少喝”不变成“从不喝”；同主题不同日期是两次事件；虚构 sourceId 被拒绝；用户/assistant 来源不混淆；新更正到达但抽取停机时旧当前值被屏蔽；重跑任务不重复生成事实。
- [ ] 运行 pnpm exec vitest run test/reconcile.spec.ts，确认红灯。
- [ ] 实现事实版本/双时间/source spans/coverage、同事务 dirty watermark、受限抽取和输入版本 CAS；前台只协调本次所需属性，其他缺口仍保留。模型候选不能自行关闭覆盖缺口或越权写入。
- [ ] 重跑；同一合成故事在关键词旧版本和新方案上回放，记录行为差异。mock 抽取只证明规则，真实抽取准确率到任务 10 评测。
- [ ] 审阅并提交。

## 任务 7：共同经历、重要时刻和工作摘要

**Files:** 创建 src/memory/episode-rules.ts、test/episodes.spec.ts；扩展 maintenance/query/context/migrations 002（若迁移已发布则追加 004，禁止修改已执行迁移）。

**Interfaces:** validateEpisodeProposal(proposal: EpisodeProposal, evidence: Evidence[]): EpisodeDecision；buildContinuity(input: ContinuityInput): ContinuityView；summarizeRange(task: SummaryInput): Promise<SummaryProposal>，模型调用仍经 M09/M14，提交仍经 M02。

- [ ] 失败测试：同一天同词不同事件不合并；误解后和解的结果不会被截掉；用户讲述旅行不会变为共同旅行；首次缺历史标“已知最早”；重要里程碑不因闲聊无关而固定注入；摘要有覆盖区间且可从原文重建。
- [ ] 运行 pnpm exec vitest run test/episodes.spec.ts，确认红灯。
- [ ] 实现情节成员/版本、带证据的重要性理由、少量连续性入口、按 conversation 的工作头；原文独立保留，摘要之间不循环充当独立证据。M08 承诺状态只能引用，不能由摘要宣布完成。
- [ ] 重跑；多来源含私密事件的聚合继承最严格适用限制，不允许通过摘要提升可见范围。
- [ ] 审阅并提交。

## 任务 8：语义检索、相关性门槛与有限回查

**Files:** 创建 src/storage/migrations/003-vector.sql、storage/vector.ts、dsh/read-tools.ts、test/hybrid.spec.ts、test/read-tools.spec.ts、eval/embedding-candidates.json；扩展 retrieval-rules/query/ports。

**Interfaces:** EmbeddingPort.embed；ModelPort.judge；VectorIndex.search(queryVector: number[], scope: QueryScope, limit: number): Promise<VectorHit[]>；selectMemories(input: SelectionInput): SelectionResult；createReadTools(scope: QueryScope, turnId: string): ScopedReadTools。

- [ ] 失败测试：中文同义改写命中原始经历；同情绪不同事件被剔除；重要度不能让 unrelated 过门；exact 历史查询不因久远降级；两次补查/4,000 新增 tokens 上限；无授权 ID 不得 read；不同模型维度不混搜。
- [ ] 运行 pnpm exec vitest run test/hybrid.spec.ts test/read-tools.spec.ts，确认红灯。
- [ ] 在相同中文调参集、模型出站许可、成本预算下比较候选 embedding/reranker，锁定选用模型及版本；不把词项 hash 当真实 embedding。小规模先用授权集精确向量检索，超过规模目标后才引入经测试的索引扩展。
- [ ] 实现 outbox 增量索引、连续水位+失败缺口、RRF 融合、相关性先筛后排序、允许空结果、有限关联、原文展开和作用域工具；tools 返回内容计入每次真实请求预算。
- [ ] 重跑规则测试并执行真实 embedding 语义样例。明确区分 semantic_disabled、semantic_failed、partial 和 none；没有模型配置就不能宣称语义验收通过。
- [ ] 审阅并提交。

## 任务 9：删除传播、恢复与管理诊断

**Files:** 创建 src/application/deletion.ts、diagnostics/commands.ts、test/deletion.spec.ts；扩展 ledger/backup/query/host。

**Interfaces:** DeletionService.erase(request: EraseRequest): Promise<DeletionProgress>；Diagnostics.inspect(eventOrMemoryId: string, scope: QueryScope): Promise<Inspection>；diagnostic commands 调用既有服务，不直接写库。

- [ ] 失败测试：删除源事件后摘要/向量/连续性/packet/宿主记录均不再可读；混合来源表示先失效再重建；仅删派生条目后抑制再抽取；恢复旧备份先重放删除；缺最新 ledger 隔离；在途生成/发送候选不能绕过删除代次。
- [ ] 运行 pnpm exec vitest run test/deletion.spec.ts，确认红灯。
- [ ] 实现来源依赖传播和各存储位置进度；管理入口提供 inspect/search/correct/erase/backup/health；诊断默认只存 ID/hash/原因，不复制私密正文。宿主或模型服务不能物理清除的位置明确报告，不能把不可见等同物理擦除。
- [ ] 重跑并完成真实 DSH 历史清理探针；把备份窗口、同盘容灾限制和外部服务残留写入操作说明。尚未解决的删除能力必须在试运行范围里显式限制。
- [ ] 审阅并提交。

## 任务 10：同条件评测、打包与试运行说明

**Files:** 创建 scripts/evaluate-memory.ts、eval/cases/*.jsonl、eval/splits.json、eval/manifest.json、test/evaluation.spec.ts、docs/architecture/reports/memory-first-run.md；修改 README、package 配置和兼容报告。

**Interfaces:** evaluate(run: EvaluationConfig): Promise<EvaluationReport>。配置含数据/模型/分词/embedding/rerank/宿主版本、预算和种子；报告含保存、表示、检索、回答四层指标，成本/延迟/失败样例与证据。

- [ ] 编写失败测试：错误来源、过期事实、越权注入、missing gold evidence 必须被评分器识别；不能因回答文字相似就满分。
- [ ] 运行 pnpm exec vitest run test/evaluation.spec.ts，确认红灯。
- [ ] 实现指标与对照：最近窗口、固定摘要、BM25、仅向量、完整方案、oracle 证据；按验收文档编写 200 个合成场景，故事级拆分 80/120。人工复核未完成就报告数据集未冻结，不能用自动生成+同模型自评代替。
- [ ] 执行 pnpm test、pnpm run typecheck、pnpm run probe:dsh、pnpm run eval:memory、pnpm pack；在隔离 DSH 安装产物并重跑跨会话演示。不同规模测试至少报告 1 万/10 万/100 万事件的实际资源数据；未跑的规模标未跑。
- [ ] 记录真实成绩与未通过项；满足对应门槛后才提升状态。若人工评审/真实模型或宿主暂不可用，交付可运行测试装置与剩余项，不声称可试运行验收完成。
- [ ] 审阅并提交；发布或远端上传是后续明确动作，不由本计划自动执行。

## 自审与覆盖映射

| 架构内容 | 任务 |
| --- | --- |
| 来源、身份、权限、事务 | 1–4 |
| 持久任务、取消、并发、重复 | 2、3、5 |
| 事实/经历/连续性/工作摘要 | 4、6、7 |
| 中文、多路召回、相关性、图与回查 | 4、8 |
| token 预算、实际 DSH 请求、发送回执 | 1、5、8 |
| 索引版本、备份、删除和恢复 | 3、8、9 |
| 诊断、成本、对照、故障测试 | 1–10，综合报告在 10 |

附件下载、完整跨平台身份管理和承诺执行依赖其他模块：本记忆模块实现可用性字段、来源接口、引用与回执语义；未接入真实媒体/平台时明确标不可用，不虚构能力。无损冷归档作为规模优化留到在线存储压测之后；此前容量不足必须停写告警，不自动删原文。这些是明确阶段边界，不计作本轮已实现能力。

实现建议在同一会话按依赖顺序推进，每个里程碑展示可复现实验；当前用户询问的是实现方案，本轮仅保存计划，没有安装依赖、修改 Git 身份、创建工作树或写产品代码。

## 新增核查来源

- [DSH 固定提交 package.json](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/package.json)：核查该版本 Node 要求、ESM 和工具链；不是用户当前已安装版本的证明。
- [Node v24.9.0 sqlite 文档](https://github.com/nodejs/node/blob/v24.9.0/doc/api/sqlite.md)：核查 DatabaseSync、backup 入口；该版本标为 Active development，故 node:sqlite 是首选验证方案，不在宿主探针前承诺兼容。
