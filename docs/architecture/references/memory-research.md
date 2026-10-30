# 记忆系统研究与来源登记

调研日期：2026-10-30。用于 [M04/M09 完整记忆架构](../modules/M04-M09-memory-system.md)。

这是可追溯的设计依据，不是跑分排行榜。研究中阅读了项目文档、关键源码和论文；没有部署这些完整系统，没有复现其公开基准，也没有验证 LifeCore 的最终记忆效果。源码核查只能确认特定实现路径，不能等同于生产可靠性。

## 1 如何使用本清单

- R 编号代表开源项目；P 编号代表论文；E 编号代表底层工程资料。
- 提交记录见 [memory-sources.lock.json](memory-sources.lock.json)。主要项目的关键源码已按固定提交复核；其他文件包括同一调研窗口的分支阅读，锁文件明确区分。
- 论文固定到具体版本。论文方案、当前开源代码、托管商业产品分别看待，不把一个的实验结果移用给另一个。
- “借鉴”是 LifeCore 的设计判断，不表示直接复制代码。引入代码或依赖前另做许可证、运行时兼容性和供应链检查；本次不据 README 的许可证徽章作完整法律判断。
- 只有自己用相同数据、模型、token 预算和评分标准重跑，才能做性能排名。下述跨项目验证验证的是机制与失败方式，不是证明某个方案已经最佳。

## 2 项目对比与源码入口

| ID / 项目 | 已读内容与主要机制 | 对生命核心的价值 | 限制及不直接照搬的部分 |
| --- | --- | --- | --- |
| R01 [SeekMemory](https://github.com/NeverENG/SeekMemory) | Source 与可版本化 Artifact；召回流水线、BM25/字面信号、图激活、证据门槛、披露与预算；阅读关键源码及自带基准说明 | 来源与派生记忆分离；允许不召回；记录筛选理由 | 门槛包含情绪/激活信号，不等于经校准的语义正确率；不能只因情绪相似就取回往事。主要 Python/AstrBot 体系，不能视为即插即用的成熟 DSH 内核 |
| R02 [SurfCore](https://github.com/Mieksido/surfcore) | 重点阅读真正的 memory-card 主链：活跃记忆卡、完整归档、重要度/初遇保护、清晰度衰减、固定栏目渲染、归档搜索 | 活跃视图与归档分离；重要时刻保护；低成本运行 | full archive 是已摄入且规范化的记录，不是无损全聊天。固定记忆卡渲染没有当前 query 参数；清晰度可通过截断实现，不能替代可回查原文。归档搜索有扫描范围限制，不能推导全部历史已参与召回 |
| R03 [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) | MemoryCore：L0 原始会话、L1 原子记忆、L2 场景、L3 核心/画像；关键词/向量/RRF 混合；自动召回与工具回查 | 多种表示各有职责；保留原文回查；模型调用前准备材料 | 当前分支包含独立 Gateway 及可选服务；不直接搬进单插件。场景导航不能无限全量注入；FTS5 不可用可能返回空，必须显式健康检查 |
| R04 [Hy-Memory](https://github.com/Tencent-Hunyuan/Hy-Memory) | 多模式记忆 SDK；事实协调、状态演变链、时间顺序检查；pro 图扩展设计及搜索说明 | 区分同一事件补充、不同次事件、当前状态替代；轻量有类型关联 | 部分层级保留未实现，不能按“八层全部完成”介绍。检索能力依后端变化，所读 Chroma keyword 路径为空；图失败可降级不代表权限失败可放行 |
| R05 [PLUR](https://github.com/plur-ai/plur) | hybrid-search、相关性裁剪测试、DSH 集成目录；BM25+向量、RRF、可选 rerank、检索健康模式 | 区分主动关闭语义与语义服务失败；相关性筛选和对比测试 | 阅读的部分排序测试使用模拟向量，不能证明真实中文效果；排序分数不能当可信度 |
| R06 [haitang1/dsh-memory](https://github.com/haitang1/dsh-memory) | README、store、workspace 范围、global/rollout 摘要、journal/回滚和测试 | 摘要之外保留日志；恢复和场景隔离 | 本地 feature-hash/字符 ngram 向量不等于神经语义 embedding；远端 embedding 是另一条能力路径 |
| R07 [LittleBlackTong/dsh-plugin-memory](https://github.com/LittleBlackTong/dsh-plugin-memory) | boot、recall-nudge：启动加载 SOUL/MEMORY/index 和近期日志，定时提醒 | 简单启动恢复；预算意识 | 周期注入最近标题不是按当前问题检索；长期增长后还需筛选与来源管理 |
| R08 [vpromise/dsh-memory](https://github.com/vpromise/dsh-memory) | retrieve.ts 的 tokenizer/检索逻辑；此前在本次讨论执行了独立 tokenizer 样例 | 是中文兼容性必须实际检验的反例 | 所读 tokenizer 为 ASCII 词；纯中文样例产生空词项，回落最近记忆。只验证了该函数，未运行完整插件 |
| R09 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 官方 agent、system-prompt、tools、session 服务源码 | 核实异步 setup、Agent 作用域、同步 context provider、持久会话事件边界 | 接口存在不等于 LifeCore 已完成接入；发布前还要验证真实请求内容、取消、发送回执、宿主升级 |
| R10 [Mem0](https://github.com/mem0ai/mem0) | 固定提交 README 与 P05 论文，未审计当前完整 SDK | 抽取与读路径分开；多路检索；新旧信息处理 | 2025 论文的更新式方案与 2026 README 的 ADD-only 说明不能混写。README 明确平台跑分含未开源优化。本项目不让 assistant 自称完成直接成为外部行动事实 |
| R11 [Graphiti](https://github.com/getzep/graphiti) | 固定提交 README 与 P06 论文，未审计图数据库写入实现 | 原始 episodes 溯源，事实有效时间/系统记录时间，当前与过去分开查询 | 部署和图维护复杂；建图本身不解决权限和事实正确性。先在 SQLite 保存轻量边，不强制图数据库 |
| R12 [Letta / MemGPT](https://github.com/letta-ai/letta) | 固定提交 README 与 P01；README 已指向 letta-code，旧服务移至 archive | 有限活跃上下文配合外部记忆和主动读取 | 不能将旧 MemGPT 服务代码当当前 Letta 实现；本次没有审计迁移后的 letta-code。只借用论文中的分层思想 |
| R13 [A-MEM](https://github.com/agiresearch/A-mem) | 固定提交 README 与 P07 摘要；笔记、标签、链接和演化 | 为事件建立可检索描述和关联入口 | 自主重写易漂移，LifeCore 所有派生更新均留版本/来源；仓库指明论文复现另有代码，不能把此仓库等同完整复现 |
| R14 [FlexA-Mem](https://github.com/WujiangXu/Flex-Amem) | 固定提交 README 与 P10 摘要；原始单元保留，相关单元按预算展开 | 摘要是导航，重要查询返回原文；按 token 成本选择表现层 | 2026-10 新预印本，尚未在本项目复现。不会把全生命周期每条短笔记都塞进上下文；全历史时间线也需要分层分页 |
| R15 [LongMemEval](https://github.com/xiaowu0162/LongMemEval) | 固定提交 README 与 P08 摘要 | 信息提取、多会话、时间、更新、拒答五类验证；拆开检索与回答评价 | 原数据及模型不是中文陪伴场景；自建中文数据不能冒称官方成绩。README 已有 V2 链接，本次固定研究原版 |
| R16 [LoCoMo](https://github.com/snap-research/locomo) | 固定提交 README.MD 与 P09 摘要 | 长期对话、事件及时间关系的评估参考 | 数据生成/人工核验条件与真实多年陪伴不同；只作为补充，不能用一项 QA 分数代表关系连续性 |

### 2.1 关键源码的固定链接

以下路径是后续复核最有用的入口；锁文件记录更完整的阅读路径及阅读方式。

- R01：[recall/score.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/score.py)、[recall/pipeline.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/pipeline.py)、[dream_tradeoff.md](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/benchmarks/results/dream_tradeoff.md)。
- R02：[src/memory-card.js](https://github.com/Mieksido/surfcore/blob/ff78e1173bd2204e4becaf8cf4356be987943159/src/memory-card.js)、[MEMORY_CARD.md](https://github.com/Mieksido/surfcore/blob/ff78e1173bd2204e4becaf8cf4356be987943159/docs/guides/MEMORY_CARD.md)。
- R03：[auto-recall.ts](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/ecc01a545da0b2ac6cae2f0f0af0d39d41469793/MemoryCore/src/core/hooks/auto-recall.ts)、[tokenize.ts](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/ecc01a545da0b2ac6cae2f0f0af0d39d41469793/MemoryCore/src/core/store/tokenize.ts)。
- R04：[reconciler.py](https://github.com/Tencent-Hunyuan/Hy-Memory/blob/988667cd876fb80bee6d618482f78a2fe426402c/hy_memory/agent/reconciler.py)、[pro_graph_design.md](https://github.com/Tencent-Hunyuan/Hy-Memory/blob/988667cd876fb80bee6d618482f78a2fe426402c/docs/pro_graph_design.md)。
- R05：[hybrid-search.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/hybrid-search.ts)。
- R09：[agent/src/index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/core/agent/src/index.ts)、[system-prompt/src/index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/core/system-prompt/src/index.ts)、[session/src/index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/core/session/src/index.ts)、[tools/src/index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/core/tools/src/index.ts)。

### 2.2 不应省略的反证

1. SeekMemory 自带冻结合成基准报告过压缩成本与重要信息召回的冲突，报告结论并非“压缩越多越好”。这是作者的特定测试，不能移作各项目排名。
2. SurfCore “全量卡”不能补回从未摄入或摄入前已截断的内容。因此 LifeCore 的原始事件入账必须先于重要性筛选。
3. Hy-Memory 与 DSH 小插件说明“支持混合/向量”必须继续核实具体后端、中文分词和失败回退，不能根据名称判断能力。
4. 新近 Mem0 README 与旧论文存在架构差异，Letta 的仓库位置发生变化。仅依靠既有印象会得到过期结论。
5. 重要性、情绪强度、相似度、事实可信度是不同量。没有任何一个可直接替代“这条记忆能支持当前回答”。

## 3 论文登记

| ID | 论文 / 阅读范围 | 本方案采用的启发 | 不作出的推论 |
| --- | --- | --- | --- |
| P01 | [MemGPT, 2310.08560v1](https://arxiv.org/abs/2310.08560v1)，摘要/架构概览 | 外部持久记忆和有限活跃上下文分离，按需读取 | 不认为工具调用必然能找到所有相关记忆 |
| P02 | [Generative Agents, 2304.03442v1](https://arxiv.org/abs/2304.03442v1)，摘要/架构概览 | 事件流、检索和反思分开；重要性有助于组织 | 不照搬单一加权总分，不把反思当事实 |
| P03 | [Lost in the Middle, 2307.03172v1](https://arxiv.org/abs/2307.03172v1)，摘要 | 上下文长度之外还要测位置和干扰 | 不用旧模型实验预测当前“大肥鱼”1M 上下文的精确能力 |
| P04 | [MemoryBank, 2305.10250v3](https://arxiv.org/abs/2305.10250v3)，摘要 | 长期互动与用户信息持续更新 | 不采用不可恢复的遗忘曲线删除珍贵经历 |
| P05 | [Mem0, 2504.19413v1](https://arxiv.org/html/2504.19413v1)，方法章节 | 抽取与维护分离，比较新旧事实 | 不是 2026 SDK/平台全部行为的说明 |
| P06 | [Zep, 2501.13956v1](https://arxiv.org/html/2501.13956v1)，方法/时间章节 | 事实发生时间与系统知道时间分开，保留历史状态 | 不将“后入库”直接当“更新事实”，不保证自动冲突裁决正确 |
| P07 | [A-MEM, 2502.12110v1](https://arxiv.org/abs/2502.12110v1)，摘要及项目说明 | 结构化笔记、标签和有界链接辅助召回 | 不让生成式重写成为唯一历史 |
| P08 | [LongMemEval, 2410.10813v2](https://arxiv.org/abs/2410.10813v2)，摘要及数据/评测说明 | 分开测试索引、检索、阅读；明确更新、时间与拒答能力 | 不把英文标准集成绩等同中文长期陪伴 |
| P09 | [LoCoMo, 2402.17753v1](https://arxiv.org/abs/2402.17753v1)，摘要及项目说明 | 多次对话、事件、时间关系测试 | 不把生成数据等同多年真实用户分布 |
| P10 | [FlexA-Mem, 2610.33274v1](https://arxiv.org/abs/2610.33274v1)，摘要及项目说明 | 原始历史不变；摘要导航；相关单元按预算展开 | 新预印本，未自行复现，不能声称已胜过所有方案 |
| P11 | [Hy-Memory / DCPM, 2606.09483v1](https://arxiv.org/abs/2606.09483v1)，摘要 | 写入协调与异步组织分离，持续个性化 | 论文与之后版本代码分别验证；个性化质量不等于逐字召回 |

## 4 工程资料

- E01 [SQLite WAL](https://www.sqlite.org/wal.html)：本机事务及日志模式依据；数据库与 WAL 生命周期必须一起管理。
- E02 [SQLite synchronous](https://www.sqlite.org/pragma.html#pragma_synchronous)：选择 WAL + FULL；NORMAL 的性能取舍不能被表述为同等断电持久性。保障仍依赖存储栈正确同步。
- E03 [SQLite Online Backup API](https://www.sqlite.org/backup.html)：活动数据库通过一致性备份接口生成快照，不直接拷贝正在写入的单个 db 文件。
- E04 [DSH 固定提交 package.json](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/package.json)：实施规划时补查，Node 要求 >=24.9.0、ESM 与工具链信息；实际用户安装版本仍需探针验证。
- E05 [Node v24.9.0 sqlite 文档](https://github.com/nodejs/node/blob/v24.9.0/doc/api/sqlite.md)：实施规划时补查 DatabaseSync、backup；该版本标为 Active development，选作宿主验证候选，不据此承诺所有打包环境兼容。官网抓取失败后核对官方仓库文档。

## 5 从证据到设计决定

| LifeCore 决定 | 交叉依据 | 与参考实现的区别 |
| --- | --- | --- |
| 原文是权威记录，摘要/事实/索引可重建 | R01、R02、R03、R14 | 在摄入阶段无损留存被允许保留的事件，不先按重要性筛掉 |
| 事实与完整经历并存 | R03、R04、R11、P08/P09 | 原子事实回答“是什么”，经历保存“我们如何走到这里” |
| 有效时间 + 版本 + 来源链 | R01、R04、R11 | 不靠最新写入覆盖旧事实；未知时间保持争议 |
| 中文关键词 + 向量 + 结构化时间/主体查询 | R03、R05；R06/R08 提供反例 | 向量失败有可见降级，纯中文是强制回归项 |
| 相关性先过门，再看重要性与多样性 | R01、R05、P02 | 情绪、置顶、近期频率不能豁免事实相关性 |
| 摘要导航并按需展开原文 | R03、R14、P01/P03 | 不无限注入全历史；精确问题优先原文证据 |
| 权限/删除/恢复贯穿所有投影 | 原架构约束 + E01/E03 | 这是 LifeCore 的工程决定，不宣称已被论文解决 |
| 同条件基准 + 故障注入 + 中文关系场景 | R15/R16、R01 自带反证 | 同时评价不乱回忆、不会编造、不会丢已提交记录 |

## 6 后续复核约定

实施时为实际采用的 tokenizer、embedding、reranker、抽取模型、DSH、SQLite 驱动固定版本与配置；把它们写入每次实验 manifest。调参集与最终验收集分开。更新来源时增加日期和差异，不覆盖旧提交记录。引用新的跑分时一并记录数据集版本、样本量、模型、预算、评分者、失败样本和是否自测。

本次不下载真实用户私密历史给第三方评测，不创建外部项目，不执行参考仓库的安装脚本。
