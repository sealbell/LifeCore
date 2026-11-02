# LifeCore 设计梳理 07：记忆组件、提交边界与准入标准

日期：2026-11-02（Asia/Shanghai）。状态：本轮记忆接入设计收敛稿；设计建议，不是实现或运行验收报告。

承接 [06 路线建议](2026-11-02-memory-route-selection-design.md)、[05 数据契约](2026-11-02-memory-adapter-contracts.md)和[原记忆验收规范](../../architecture/modules/M04-M09-memory-evaluation.md)。用户要求继续设计并将今天的进度分步提交、推送；本轮仍不开发。以下具体边界是工程建议，继续讨论和保存文档不表示 R01–R08 全部定案。

## 1 本轮收敛的决定

推荐 SeekMemory 受控组件路线：**复用候选处理，LifeCore 负责唯一提交，受控检索返回证据，M09 负责唯一上下文装配。** PLUR 保留为满足同一 Recall 契约的替代组件。首期不挂两套记忆插件，不引入候选自有主库，不让任何候选自主修改人格、关系或动作结果。

本稿完成当前记忆专项的三个设计交付：组件允许依赖与改动边界、事务与恢复顺序、选型验证规则。全项目 P4 生活与成长、P5 能力与体验以及 P6 全链路审查仍需继续；不能将本稿或本次 Git 提交称为十五模块设计全部完成。

## 2 组件及唯一责任

以下是拟议模块边界与操作名，不是已经存在的 API、目录或数据库表。

| 组件 | 输入 → 输出 | 唯一责任及禁止事项 |
| --- | --- | --- |
| SourceIntake（M03/M13） | 可信事件/修订 → 接收回执、整理任务 | 稳定来源身份、持久原文/表示；不调用抽取模型 |
| MemoryJobRunner（M02/M04） | 持久任务＋允许范围 → PreparedBatch/处理结果 | 调度、租约、预算、暂停恢复；不能直接用候选替换当前事实 |
| CandidateProcessor（SeekMemory 门面） | 固定输入表示、受限旧记忆视图、模型结果 → CandidateSet | 解析、候选构造及可复用重要性/时间规则；无库写、模型调用、网络、宿主注册 |
| MemoryAuthority（M04/M13） | 候选/纠正命令 → 规范版本＋操作结果＋投影任务 | 证据与策略校验、唯一业务提交；模型不能分配权限与提交版本 |
| ProjectionWorker（M04/M13） | 规范版本/outbox → 派生块 manifest 与应用回执 | 词法/向量及可选图视图；不能把投影完成写成新的经历 |
| RecallProvider（受控检索门面） | 查询、许可候选视图、版本水位、预算 → 命中 ID/版本/诊断 | 先授权再检索；禁止全库预取后过滤；不返回可直接信任的插件正文 |
| ContextAssembler（M09/M14） | 当前请求＋权威回填证据 → 有预算的最终上下文 | 控制主动联想开关、重复提及、压缩/引用与最后出站检查 |
| ControlCoordinator（M02/M12/M13） | 删除/撤权/恢复命令 → 屏障、清理清单、阶段回执 | 独立控制记录与最新性核对；不以软退役宣告擦除完成 |

首期图扩散和 rerank 不作为必需项；保留明确回忆和可选主动联想。不能因为关闭图而取消“相关话题可自然提起往事”的产品行为，它仍可由词法/语义召回及 M09 判断实现。

## 3 SeekMemory 允许依赖及实际需要改的接缝

基于固定提交 `e895a4fa5986db4ac97573c95a832896032d5650` 的静态读取。详细来源链接见第 9 节。下列清单明确首期要保留的模块组，不表示已经复制源码或完成可执行闭包验证。

| 组 | 保留范围 | 必须做的边界处理 |
| --- | --- | --- |
| A 输入与候选 | `app/contracts.py`；`perceive/extract.py`、`absorb.py`、`response_parser.py`、`duplicate_policy.py`、`extraction_rules.py`、`dialogue_evidence.py` | 替换 `app.ports` 聚合导入；来源查询仅能读取 PreparedBatch 中已授权版本。禁止通过缺失 parent 自主扫全库 |
| B 值对象与校验 | `core/artifact.py`、`families/*`；behavior/relationship 的纯校验依赖、`core/persona.py` 中被引用的纯规则 | 允许作为解析辅助类型；仅输出 memory 候选，不创建 persona/relationship 权威记录。保留校验器不等于开启相应功能 |
| C 词法与时间 | `recall/bm25.py`、`tokenizer.py`、`seed.py`、`temporal.py`、`app/text_rules.py` | 每次索引视图受许可范围约束；分词器和时间解释带版本，注入时钟/时区；不得把当前机器日期隐式当故事发生日期 |
| D 排序 | `recall/score.py`、`gate.py`、`core/retrieval.py` | 只保留明确需要的评分规则；随机/探索因素首期关闭或注入固定种子，过程级缓存按 realm/版本/策略隔离 |
| E 可选图 | `core/graph.py`、`core/ports.py`、`recall/spread.py`、`retriever.py` | 首期关闭扩散；以后只允许授权诱导子图。`cache.active`、邻居读取和缺失回退都要受控 |
| F 规范门面自研 | 窄 DTO/Protocol、Candidate 映射、证据/策略校验、RecallProvider、语义投影接线 | 与 05 的字段语义一一对应；上游类不是外部持久协议 |

本轮特别发现：`app.ports` 虽以声明为主，却继续导入 console、runtime contracts/topics/recorder/episode/tracing、dream 等模块。因此**不能仅靠不实例化 ServiceCollection 就宣称依赖已隔离**。接入时将 `ArtifactCache`、受限 `SourceStore` 等声明移到窄适配协议，修改调用处 import；不能原样加载聚合 ports 再声称运行时不存在。

`core.artifact` 会导入各 family 校验器，behavior 又引用 persona 的纯规则。该依赖面已列入成本；默认保留无 I/O 的必要校验闭包，不大规模改写候选算法。若发现必须带入宿主/后台或动态导入无法解释，就视为隔离门槛失败，重新比较 P 路线。

明确禁止进入首期构建闭包：`services` 整套调度/提交、`store` 主库、`adapters` 宿主、`app.runtime`、dream/maintenance 自动任务、默认模型 provider、上游 UI/插件入口。上游 app/core/perceive/recall 的已读包初始化文件无资源创建；仍需在未来独立导入验证中监测文件、网络、线程与宿主注册，静态结论不代替运行证据。

未来的组件来源 manifest 至少记录：上游仓库/SHA、原始文件路径与 digest、必要许可声明、改动说明、依赖类别、对应契约、processor/tokenizer/schema 版本。源代码以受控命名空间打包，禁止顶层 `app`/`core` fallback 导入误用其他插件同名模块；具体构建工具由实施者选择。

## 4 门面字段与候选处理规则

| 操作 | 必需输入 | 输出及行为 |
| --- | --- | --- |
| PrepareBatch | job_id、processor_revision、固定 SourceRevision/EvidenceRef 列表、可信 AccessContext、预算与时钟 | batch_id、input_manifest_digest、允许旧记忆版本视图；超范围父消息不自动补读 |
| BuildPrompt / ParseCandidates | PreparedBatch；网关取得的原始响应及模型请求引用 | CandidateSet、逐项错误、模型/规则版本；无完整来源者隔离，不自动提交 |
| CommitCandidateSet | operation_id、business_key、input digest、候选、expected revisions、租约 fence | committed/rejected/stale/conflict/blocked 或可核对结果；与 05 一致 |
| Recall | query、purpose、allowlist handle、required watermark、backend generation、deadline/budget | hit_refs、rank/match diagnostics、coverage、degraded reason、used versions |
| QueryOperation / Health | operation/job/generation 标识 | 业务提交、整理覆盖与索引状态分开；不从一次超时猜“没有写入” |

模型响应内的 ID、scope、人物、引用只是待校验建议。适配器固定来源修订和表示，把上游消息 ID 映射为 EvidenceRef；如果上游只给整条消息引用，须补定位和逐断言支持检查，不能虚构精确偏移。歧义时进入待协调，不把算法成功解析等同语义正确。

一次批处理的业务键至少包含 realm、job_id、purpose、input_manifest_digest、processor_revision；尝试 ID 独立。改变输入或处理规则是新的明确任务，不可冒充原重试；新任务也要受表达抑制、源版本和已处理候选唯一性约束。随机 Artifact ID 在提交前映射成持久 proposal/claim 标识，不承担业务去重。

重复文本相同不意味着同一经历；重复消息、同一来源修订、不同时间重复发生必须区分。上游内容去重规则只能给出建议，不能吞掉新的可信事件或纠正。批次内不同 claim 的成功/拒绝结果逐项持久化；部分待处理保留缺口，禁止把整批水位标成完成。

## 5 数据位置和唯一提交边界

### 5.1 物理保管建议

沿用现有 Python/SQLite 内核作为部署底座，扩展规范记忆模型；本节为新设计，现有 `store.py` 尚未实现这些保证。建议每个数据域明确三类保管位置，路径由 M13 管理，不接受模型给出的路径：

- **规范主库**：来源修订、表示引用、任务、MemoryVersion、证据依赖、操作结果、outbox、投影映射/可用 manifest、受管副本登记。规范主库是一组由同一事务所有者组织的表，不引入 SeekMemory/PLUR 独立主库。
- **独立控制库**：删除、撤权、抑制及控制头；从普通生命数据恢复路径中隔离。主库只存已应用水位。另一文件只是隔离故障域的机制，不天然提供灾难后的最新性证明；整个磁盘丢失或控制头无法证实时，恢复仍须隔离，不能相信旧包自带水位。
- **受管对象与派生目录**：不可变原文/附件、限制访问的临时模型材料、按 realm/策略分区/代次组织的词法和向量索引、导出 staging。缓存可重建；原文缺失必须显式标记，不能从索引重造原文。

首期不让 untrusted worker 获得规范写连接；由 MemoryAuthority 单一写入口协调。长模型请求、向量计算和文件传输均在事务外。SQLite 耐久设置和备份方式必须满足 accepted 的耐久语义，不能沿用现有参数就宣称符合；具体迁移脚本在实施阶段安排。

### 5.2 提交矩阵

| 边界 | 同一次规范主库事务内必须完成 | 事务外工作及失败出口 |
| --- | --- | --- |
| T1 接收来源 | 来源修订/表示引用、接收结果、待整理任务、新纠正协调屏障 | Blob 先写入受限 staging 并耐久，再引用；未引用对象可回收。T1 前失败不回 accepted |
| T2 领取任务 | 递增 lease fence、租约、输入 manifest、预算预留 | 读取/模型请求在外；超时进入 retryable 或 outcome_unknown，不能当成功覆盖 |
| T3 规范记忆提交 | 再核租约/来源/策略/控制屏障/expected revision；规范版本、依赖、逐项结果、覆盖/缺口、outbox、预算结算引用 | 失败整体回滚；CAS 失败需重协调，不能旧候选覆盖新事实。最终空结果也是可核对结果 |
| T4 投影发布 | 核对完整块和源版本；记录后端应用证据、manifest、连续水位与可用代次 | 派生写先完成；回执丢失先核对。重建失败不撤销 T3，也不把缺口当完整 |
| T5 注入/使用记录 | 记录实际选入请求的版本、request/attempt 与用途；幂等更新 | 只表示上下文使用，不是模型成功或消息已发送；真实发送依 M11 回执 |

T3 与 T4 不在一个跨库事务里。T4 的“发布”受规范主库控制；正在构建或只有部分块的投影不能成为当前可用版本。检索结果仍须经 M04 复核，不依赖索引自身的删除标记保护权限。

任务租约过期并不等于旧 worker 已停止。旧 worker 返回结果必须携带 fence，由 T3 拒绝；已发出的模型调用可以产生实际费用，不能承诺跨 provider 恰好调用一次。内部费用结算按请求/尝试证据幂等，未知费用单列；05 的“不重复费用结算”不是免除实际重试费用。

### 5.3 删除、撤权、恢复与发布的顺序

ControlCoordinator 串行安排控制变化与敏感结果发布。删除先建立不可见屏障并向独立控制库耐久追加意图，再将清理任务/抑制/控制头应用到规范主库。两库之间不是原子事务：任何间隙崩溃后，读写与导出必须等待控制头追平；读不到最新控制状态则 fail closed。

同一入口的“最新策略检查＋向外发布许可”按顺序与撤权仲裁，不能检查结束就释放所有保护再任意晚发送。模型请求、导出 Release、分享均记录此次许可水位；撤权到来时取消尚未交付的步骤，并如实说明已经交付的字节无法追回。具体锁/消息队列可以选择，但必须实现这个可验证顺序；不得用非原子的两次查询代替。

恢复顺序固定为：停止旧代次→取得可信控制头→隔离校验快照→重放控制意图与抑制→恢复规范版本和任务结果→核对缺口→重建新代次派生层→允许 Recall/模型出站。无可信最新性证明则停在隔离。内存缓存、待完成投影和历史动作不得直接恢复执行资格。

导出从规范快照创建 memory-portable 或 life-backup；类型、缺失项和受管副本按 05 保留。组件升级只重建需要改变的派生代次；规范 schema 变化另外走可逆迁移。降级版本也必须追平新事实与删除头，不能直接换旧目录。

## 6 中文质量与成本的准入标准

沿用原规范的 200 场景、10 组、80 调参/120 验收划分；按故事/人物隔离分组，不按同义问句随机分割。新增切片复用这些场景标注，不把测试规模悄悄算成已创建的素材：单字/长中文、同义改写、否定纠正、同名人物、时间状态、共同经历与转述、模型猜测、试聊/私聊隔离、删除后重提炼、取消后的缓存尾部写。

每个样本包含版本/hash、realm/scene/principal、问题时钟、源修订及精确 gold spans、允许/禁止断言、是否可回答、主动联想开关、预期控制水位。记录四层结果：来源接收、候选/版本、最终装配证据、回复。不得只看检索 top-k 就给整条链路打分。

| 门槛 | 通过条件 | 处理方式 |
| --- | --- | --- |
| 确定性安全与一致性 | accepted 保存和精确溯源 100%；故障用例中 0 越权、0 删除复活、0 重复业务提交、0 历史动作重发 | 任一失败阻断；不得用平均准确率抵消 |
| 最终证据 | 可回答题 gold evidence 逐题召回率宏平均 ≥95%；误注入率 ≤5% | 报每组及完整必要证据覆盖，不以重复片段增高分母 |
| 更新/时间/未知 | 时间与纠正准确率 ≥95%；恰当未知率 ≥95% | 主体混淆、亲历捏造或泄漏单例阻断 |
| 回答与主动联想 | 无依据具体断言率 ≤1%；不适宜回合错误联想率 ≤5%；关闭时 0 自发旧事插入 | 至少两位评审的开放回答判定；固定模型 judge 仅辅助 |
| 预算与降级 | 每次请求不超有效窗口/已配置调用预算；语义故障有明确诊断；暂停后无新未获准工作 | 模型失败或 BM25-only 不能冒充完整语义能力 |

这些沿用的数值仍是候选验收标准，不是统计保证或用户已确认的发布承诺。报告样本数、失败清单、置信区间和非确定模型的重复波动。

成本比较采用分开的两张账：初建/回填，以及稳定运行。稳定运行包含主回复、自动整理、embedding、可选 rerank、重试和证据补查；同时记录 p50/p95、冷启动、队列年龄、CPU/峰值内存/磁盘、人工维护步骤。语义回忆不能只报缓存全热时延。

首轮实验配置建议：相同主回复/抽取模型、同一 tokenizer、每题相同总输入窗口、相同记忆注入上限、相同历史范围，rerank 与图扩散先关闭；抽取一个批次最多一次初始请求和一次显式修复，超出转待处理。具体 token/货币/时延上限必须在运行前写入冻结 manifest，以部署设备和用户配置预算为准；本轮不代用户承诺费用或编造毫秒指标。

选择规则为：先通过硬约束和质量门槛，再在同一预先固定成本包络内比较；满足者选总自研/维护负担较小的一条。若 S 的额外语义链使成本超包络，或候选逻辑必须重写，则比较 P；若均失败，记录不准入，不降低产品目标。无需为了验证 S 而先实现完整 P，先用 BM25/向量基础对照定位瓶颈；只有换型条件触发才投入 P 的验证成本。

## 7 后续验证顺序与明确出口

下列是准入设计，不是已执行的测试或本轮编码任务。

| 关口 | 必须取得的证据 | 不通过时 |
| --- | --- | --- |
| V1 依赖隔离 | 固定来源清单；静态闭包无禁止模块；独立导入无文件/网络/线程/宿主注册副作用 | 缩小窄协议或判 S 隔离失败；不能靠关闭界面隐藏后台 |
| V2 事务与控制 | MA01–MA16、T1–T5 崩溃点、旧租约、控制库与主库间隙、发布撤权顺序 | 先修共同底座，不把它误判成某检索算法失败 |
| V3 完整质量 | 冻结中文样本四层报告及基础对照；来源真实支持率单列 | 定位抽取/检索/装配/回答层，不盲目增加组件 |
| V4 资源与恢复 | 同成本包络；冷/热索引；取消尾部、删除、恢复、升级/回退及代次清理证据 | 不准入正式生命；以受限模式明确报告缺失能力 |
| V5 宿主连通 | 固定 DSH 发行版本下只装配一次上下文、受控压缩出站、暂停恢复和真实回执 | 调整 M14 接线，不安装完整记忆插件绕过 |

V1–V5 不会因静态审查通过而自动通过。实现、安装与运行验证等待后续明确开发指令；本次已获授权的是整理并提交推送设计进度。

## 8 全局状态与交付归档

R03 当前建议收敛为：SeekMemory 候选组件优先、规范权威留在 LifeCore、PLUR 检索为备选；R05 维持 M09 唯一装配；R06 细化到独立控制记录与规范提交/派生发布的顺序。它们仍是待确认设计，不把 Git 合入当作产品决定自动生效。

今天的文档按以下逻辑归档：①总体基线与插件证据；②运行时及数据归属；③六条共同流程与故障场景；④记忆/上下文候选研究；⑤适配字段与一致性；⑥两路线选型及本稿；⑦导航与当日进度。每组提交只含相应 Markdown，最后一组统一更新入口。文档间前向引用在整组提交完成后检查；未实现能力继续明确标记。

## 9 本轮补充源码依据与检查

源码都固定在 [SeekMemory e895a4fa](https://github.com/NeverENG/SeekMemory/tree/e895a4fa5986db4ac97573c95a832896032d5650)，不是最新版本声明。

- [app/ports.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/app/ports.py)：聚合声明继续导入 runtime/dream；窄接口替换的直接依据。
- [absorb.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/perceive/absorb.py)、[dialogue_evidence.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/perceive/dialogue_evidence.py)：候选与父消息读取边界。
- [artifact.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/core/artifact.py)、[bot_behavior.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/core/bot_behavior.py)、[persona.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/core/persona.py)：family/行为校验的传递依赖，不是自主运行时启用证明。
- [score.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/score.py)、[seed.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/seed.py)、[temporal.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/temporal.py)：缓存、随机性与时钟需显式治理。

依赖表还静态读取了表中解析/去重/规则、family、词法、contracts 与包初始化模块；未复制到产品目录、安装依赖或执行上游函数。2026-11-02 独立文档复核对照 05/06 及原验收规范，未发现影响规划的重要矛盾；检查记录见当日进度文档。运行准入仍待实施验证。
