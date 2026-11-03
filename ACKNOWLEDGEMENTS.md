# 参考项目与致谢

更新日期：2026-11-01。

LifeCore 的探索受益于许多开发者、研究者和开源社区的公开工作。感谢他们分享代码、论文、设计思路和失败经验，让我们能够在已有积累上继续前进。无论最终是否采用某个组件，只要它实际启发过我们的设计，这份记录就应保留。

这份文档集中登记参考来源、具体启发和采用状态，作为未来正式致谢的基础。感谢下列项目的作者、贡献者和维护者；仓库所属账号用于准确识别来源，不代表忽略其他贡献者。

## 记录范围与状态

LifeCore 当前处于设计与文档阶段，尚无可运行插件。下文的“拟复用”“目标宿主”“适配候选”均不是已经集成的依赖，也不表示已复制上游代码。

- **灵感参考**：阅读了论文、文档或产品设计，并吸收了相关思想。
- **源码研究**：阅读过指定实现；具体深度以调研附件为准。
- **拟复用或适配**：架构建议中的候选，仍需完成许可、兼容性和实现验证。
- **实际采用**：未来实际引入代码、依赖、模型或素材后，补录版本、使用位置和许可声明。目前没有以本表代替实际依赖清单。

固定提交是研究快照，不是 LifeCore 发布锁文件。早期可变分支阅读与后续固定源码阅读分别保留，不能把后来取得的 SHA 当成过去所有阅读内容的精确版本。

## 数字生命与记忆项目

| 项目及来源 | 对 LifeCore 的启发 | 研究版本与当前状态 |
| --- | --- | --- |
| [mashangshui/digital-life-core](https://github.com/mashangshui/digital-life-core) | 自主唤醒、未解问题驱动、梦境反思、模块化能力与状态面板。README 署名包括 mashangshui（温水）与“鱼小水” | [d984665f](https://github.com/mashangshui/digital-life-core/commit/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1)，v1.0.1；源码研究，作为自主生活参考，未集成。见[专项调研](docs/architecture/references/2026-11-01-digital-life-core-review.md) |
| [NeverENG/SeekMemory](https://github.com/NeverENG/SeekMemory) | 原始来源与派生记忆分离、版本与证据、召回流水线、关系与人格、后台整理、事务内写入原语 | 初读 [e895a4fa](https://github.com/NeverENG/SeekMemory/commit/e895a4fa5986db4ac97573c95a832896032d5650)；后续 [ab0fd496](https://github.com/NeverENG/SeekMemory/commit/ab0fd496a8d569c4734d73c47d8f96aec5b77d04)。源码研究；拟受控复用部分内核，未集成 |
| [gaoweimax/recallweaver](https://github.com/gaoweimax/recallweaver) | SQLite 时态事实、原子冲突更新、递归图查询、整笔事务重试、一致性备份与边界评测 | [2de0e8a1](https://github.com/gaoweimax/recallweaver/commit/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f)，0.1.0；源码研究，参考局部机制，不新增运行依赖。见[专项调研](docs/architecture/references/2026-11-01-recallweaver-review.md) |
| [Mieksido/surfcore](https://github.com/Mieksido/surfcore) | 活跃记忆卡与归档、重要时刻保护、驱动和人格、隐私与身份关联、扩展接口及 B 站能力 | 记忆卡研究快照 [ff78e117](https://github.com/Mieksido/surfcore/commit/ff78e1173bd2204e4becaf8cf4356be987943159)；部分早期模块阅读为 main。源码与架构参考，不作为必需运行时 |
| [TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) | L0 原始记录、L1 原子信息、L2 场景、L3 核心画像的分层归纳；混合召回与原文回查 | [ecc01a54](https://github.com/TencentCloud/TencentDB-Agent-Memory/commit/ecc01a545da0b2ac6cae2f0f0af0d39d41469793)；源码研究，参考分层机制，不整体部署 |
| [Tencent-Hunyuan/Hy-Memory](https://github.com/Tencent-Hunyuan/Hy-Memory) | 事实协调、状态演变、时间顺序、有类型的记忆关联 | [988667cd](https://github.com/Tencent-Hunyuan/Hy-Memory/commit/988667cd876fb80bee6d618482f78a2fe426402c)；源码研究，与 TencentDB Agent Memory 分别登记 |
| [plur-ai/plur](https://github.com/plur-ai/plur) | 混合检索、相关性筛选、检索健康与显式降级 | [53d576d1](https://github.com/plur-ai/plur/commit/53d576d106bbac631ab5cc6ced98cce02b92b848)；源码研究 |
| [haitang1/dsh-memory](https://github.com/haitang1/dsh-memory) | 工作区隔离、摘要之外保留日志、journal 与回滚 | 研究快照 [15de1c79](https://github.com/haitang1/dsh-memory/commit/15de1c791bbcb5be2c9b0c2096eddedcaa61cc17)；选定源码研究 |
| [LittleBlackTong/dsh-plugin-memory](https://github.com/LittleBlackTong/dsh-plugin-memory) | 启动恢复、近期日志加载、上下文预算意识 | 研究快照 [eb568c1e](https://github.com/LittleBlackTong/dsh-plugin-memory/commit/eb568c1e9d551428b46b72748ce63c8e69d389c6)；选定源码研究 |
| [vpromise/dsh-memory](https://github.com/vpromise/dsh-memory) | 提醒我们必须实际检验中文分词、检索及失败回退 | 研究快照 [1e1109b0](https://github.com/vpromise/dsh-memory/commit/1e1109b08890e9b3aa12cce4962e28634a2cfe65)；函数研究及独立样例，未运行完整插件 |
| [asdfd3/3d-memory-sea](https://github.com/asdfd3/3d-memory-sea) | 记忆空间的可视化、焦点浏览、可解释的词面召回 | [bcc1bb6b](https://github.com/asdfd3/3d-memory-sea/commit/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f)，v0.1.0；源码与规则测试研究，参考浏览体验，不作为持久记忆底座 |
| [mem0ai/mem0](https://github.com/mem0ai/mem0) | 抽取与维护分离、新旧信息处理、多路检索 | [26cdefb4](https://github.com/mem0ai/mem0/commit/26cdefb46600c0fa5953c4b5ee5003c125539fc4)；README 与论文参考，未审计完整 SDK |
| [getzep/graphiti](https://github.com/getzep/graphiti) | 经历来源、事实有效时间与系统记录时间、历史状态 | [72b5c59c](https://github.com/getzep/graphiti/commit/72b5c59c06607e09ea855be61b6ff5a3446fc951)；README 与论文参考，未采用其图数据库实现 |
| [letta-ai/letta](https://github.com/letta-ai/letta) 与 MemGPT | 有限工作上下文、外部持久记忆、按需读取 | [8816d3a8](https://github.com/letta-ai/letta/commit/8816d3a8516893bfdc0fa14bfb1235226012e295)；README 与历史论文参考，未审计迁移后的 letta-code |
| [agiresearch/A-mem](https://github.com/agiresearch/A-mem) | 结构化笔记、标签和记忆之间的关联 | [ceffb860](https://github.com/agiresearch/A-mem/commit/ceffb860f0712bbae97b184d440df62bc910ca8d)；README 与论文摘要参考 |
| [WujiangXu/Flex-Amem](https://github.com/WujiangXu/Flex-Amem) | 保留原始单元，以摘要导航，按预算展开相关原文 | [37ba0ce2](https://github.com/WujiangXu/Flex-Amem/commit/37ba0ce2b4d14f6746e819b6a2d728ad74c364f2)；README 与论文摘要参考，未复现实验 |
| [xiaowu0162/LongMemEval](https://github.com/xiaowu0162/LongMemEval) | 信息提取、跨会话、时间推理、更新和拒答的分项评估 | [9e0b455f](https://github.com/xiaowu0162/LongMemEval/commit/9e0b455f4ef0e2ab8f2e582289761153549043fc)；原版基准研究，未运行官方评测 |
| [snap-research/locomo](https://github.com/snap-research/locomo) | 长期对话、事件和时间关系的评估参考 | [3eb6f2c5](https://github.com/snap-research/locomo/commit/3eb6f2c585f5e1699204e3c3bdf7adc5c28cb376)；基准研究，未运行官方评测 |

更细的阅读范围、局限与来源见[记忆系统研究](docs/architecture/references/memory-research.md)、[研究快照登记](docs/architecture/references/memory-sources.lock.json)及 [3d-memory-sea 调研](docs/architecture/references/2026-11-01-3d-memory-sea-review.md)。这些项目的公开实验结果不直接作为 LifeCore 的性能承诺。

## 宿主与平台连接项目

| 项目及来源 | 对 LifeCore 的启发或候选用途 | 研究版本与当前状态 |
| --- | --- | --- |
| [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | 插件生命周期、Agent 作用域、工具控制、会话日志、上下文计量和压缩 | [ce7073d5](https://github.com/deepseek-ai/deepseek-harness/commit/ce7073d51254c26cd63b22a60835b8f948deb447)；目标宿主与源码研究，LifeCore 尚未完成加载验证 |
| [Derpyu520/qq-bridge](https://github.com/Derpyu520/qq-bridge) | 群聊/私聊会话映射、失效恢复、消息媒体、宿主事件流、人格配置体验 | 2026-10-28/29 的 main 阅读，未登记精确 SHA；源码与文档参考，不整体并用独立回复器 |
| [tencent-connect/qqbot-nodejs](https://github.com/tencent-connect/qqbot-nodejs) | 官方 QQ Bot 的协议、媒体、事件与发送回执 | [429a0f1b](https://github.com/tencent-connect/qqbot-nodejs/commit/429a0f1b798f3b0fcef3679e207dbc0469a1df2d)，1.0.5；官方 Bot 可选入口的协议组件候选 |
| [tencent-connect/dsh-qqbot](https://github.com/tencent-connect/dsh-qqbot) | DSH 接入、账号绑定、媒体、访问白名单与交互体验 | [a4a01fa9](https://github.com/tencent-connect/dsh-qqbot/commit/a4a01fa9f122e187733fbd990c3d6a41e4d7e538)，0.5.5；研究参考，不并用其独立 Agent 调度 |
| [Tencent/openclaw-weixin](https://github.com/Tencent/openclaw-weixin) | ClawBot/iLink 的登录、长轮询、媒体、上下文与请求标识 | [874637a0](https://github.com/Tencent/openclaw-weixin/commit/874637a0dbc24050f72d1385add4fc6170a2d726)，2.4.10；拟适配协议层，未接入，不依赖另一套 OpenClaw 宿主 |
| [WecomTeam/aibot-node-sdk](https://github.com/WecomTeam/aibot-node-sdk) | 企业微信智能机器人的 WebSocket、ACK 与媒体 | [80615b98](https://github.com/WecomTeam/aibot-node-sdk/commit/80615b987ef69c6028ad764924609247c0725955)，源码包 1.0.6；后续扩展候选，发布包差异待核对 |
| [NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ) | 普通 QQ 账号的 OneBot 接入、头像与空间动作 | [98d781d1](https://github.com/NapNeko/NapCatQQ/commit/98d781d19815d1625b24d717ce280ecf0a4f6d0c)；自主生活修订中的首个真机验证目标，外部运行时，不随 LifeCore 打包 |
| [SnowLuma/SnowLuma](https://github.com/SnowLuma/SnowLuma) | OneBot、多账号、请求关联/重连、头像与空间动作 | 初读 [8ffd3142](https://github.com/SnowLuma/SnowLuma/commit/8ffd314260e9e2b6967eeca494d87aa5be046c34)（2.2.1）；后续 [c120b0fb](https://github.com/SnowLuma/SnowLuma/commit/c120b0fb9790a3b41a18f4acfdb49f7f5b02022e)。可替换外部适配候选，不打包 |

2026-11-03 补充核查：qq-bridge 固定到 `b80fa51bc03fc4d5a1ef9a4cad7029e796b8fc67`（package.json 为 0.2.1-r2），核对 DSH 会话投递/订阅、二代内部输出与工具发送、轻量记忆和会话退役。详见[固定版本核查记录](docs/architecture/references/2026-11-03-qq-bridge-session-review.md)。当前版本声明 PolyForm Noncommercial 1.0.0；此次未复制产品代码，不能将早期发行版许可套用于当前源码。

维护者后续已明确选择 **DSH + SnowLuma 普通 QQ**，作为 [v0.1 预览](docs/v0.1-quickstart.md)的实现路线；此前 NapCat 优先、官方 Bot 首发等建议被此次选择覆盖。早期不同路线的研究仍保留，详见[平台调研](docs/architecture/references/2026-11-01-platform-research.md)和 [SnowLuma 早期调研](docs/architecture/references/snowluma.md)。外部网关不随插件打包，真实账号仍需验收。

## 基础组件与产品体验参考

以下是文档中讨论的工程组件或产品体验来源。除明确标注的文档版本外，运行包版本、模型 revision 和集成组合尚未锁定。

| 来源 | 参考或候选用途 | 当前状态 |
| --- | --- | --- |
| [SQLite](https://www.sqlite.org/)、[FTS5](https://www.sqlite.org/fts5.html) | 权威记录、全文检索、事务、WAL 与一致性备份 | 工程文档研究，拟采用 |
| [nodejs/node](https://github.com/nodejs/node/blob/v24.9.0/doc/api/sqlite.md) | 宿主运行时及 node:sqlite 的早期适配比较 | v24.9.0 文档；后续推荐稿将数据库权威移到托管 Python 内核 |
| [fxsjy/jieba](https://github.com/fxsjy/jieba) | 中文预分词与词典 | 组件候选 |
| [FastEmbed](https://qdrant.tech/documentation/embeddings/fastembed/) | 本地向量编码 | 组件候选；不等于需要部署 Qdrant 服务 |
| [BAAI/bge-small-zh-v1.5](https://huggingface.co/BAAI/bge-small-zh-v1.5) | 中文 embedding 基线 | 模型候选，revision/hash 未锁定 |
| [Cytoscape.js](https://js.cytoscape.org/) | 二维局部记忆图、筛选与证据展开 | 组件候选 |
| [vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph) | 可选三维记忆视图 | 组件候选 |
| [Obsidian 图视图](https://obsidian.md/help/plugins/graph) | 双向链接与图浏览体验、Markdown 导出兼容 | 产品体验参考，非必需运行依赖，不复制其产品代码 |
| [Playwright](https://playwright.dev/docs/browser-contexts) | 隔离浏览器、活动控制与管理流程测试 | 组件候选 |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | 本地视频音频转写 | 组件候选，尚未验证站点音频采集与模型组合 |

另已讨论 Python 的 `sqlite3`/`unittest`、NumPy、React、TypeScript、Vite、JSON Schema、Ajv、Python jsonschema、Vitest 和 pnpm。这些是规划中的工程工具，不冒称已做专项源码调研或已引入依赖；实际采用后补充版本、上游链接和第三方声明。

其他工程资料包括：[QQ 官方 bot-docs](https://github.com/tencent-connect/bot-docs)、[DeepSeek API 文档](https://api-docs.deepseek.com/zh-cn/)、[Chrome tabCapture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)、[MDN 播放进度](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime)与[暂停接口](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/pause)。感谢相应文档维护者。

## 论文与研究工作

感谢下列论文的作者与公开材料维护者。这里登记设计启发，不表示已经复现论文实验；论文机制与后续开源实现分别核查。

| 论文与版本 | 对 LifeCore 的启发 |
| --- | --- |
| [MemGPT，2310.08560v1](https://arxiv.org/abs/2310.08560v1) | 外部持久记忆与有限活跃上下文分离 |
| [Generative Agents，2304.03442v1](https://arxiv.org/abs/2304.03442v1) | 事件流、检索与反思各司其职 |
| [Lost in the Middle，2307.03172v1](https://arxiv.org/abs/2307.03172v1) | 评估上下文位置与干扰，不能只看窗口大小 |
| [MemoryBank，2305.10250v3](https://arxiv.org/abs/2305.10250v3) | 长期互动、记忆强化与衰减；曲线作为待验证的检索调度思路 |
| [Mem0，2504.19413v1](https://arxiv.org/html/2504.19413v1) | 抽取与维护分开、新旧事实比较 |
| [Zep，2501.13956v1](https://arxiv.org/html/2501.13956v1) | 区分事实发生时间与系统记录时间 |
| [A-MEM，2502.12110v1](https://arxiv.org/abs/2502.12110v1) | 笔记、标签和有界关联 |
| [LongMemEval，2410.10813v2](https://arxiv.org/abs/2410.10813v2) | 分开评价索引、检索与阅读，覆盖更新、时间与拒答 |
| [LoCoMo，2402.17753v1](https://arxiv.org/abs/2402.17753v1) | 多次对话、事件及时间关系测试 |
| [FlexA-Mem，2610.33274v1](https://arxiv.org/abs/2610.33274v1) | 原始历史保留、摘要导航、按预算展开 |
| [Hy-Memory / DCPM，2606.09483v1](https://arxiv.org/abs/2606.09483v1) | 写入协调与异步组织分离、持续个性化 |
| [Murre 与 Dros，Replication and Analysis of Ebbinghaus’ Forgetting Curve，2015](https://doi.org/10.1371/journal.pone.0120644) | 区别人类记忆实验与软件检索调度，不把一条公式当成完整人脑模型 |

“记忆星图＋四层记忆＋艾宾浩斯曲线”另受到用户在抖音看到的演示启发。目前没有作品链接或作者信息，保留这条来源线索；确认后补充署名，不擅自归给某个已知项目。

## 署名与许可记录

致谢与许可记录需要同时维护。思想借鉴、代码改编、运行依赖、模型权重和素材应分别说明，不把所有参考项目统一标成 MIT，也不把“公开可读”等同于可任意复制或分发。

当前已有的许可材料：

| 项目 | 已记录材料 |
| --- | --- |
| digital-life-core | [README](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/README.md)与 [package.json](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/package.json)声明 MIT；该快照目录树未见独立 LICENSE 文件。若实际复制代码，补足版权与许可文本核对 |
| recallweaver | [README](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/README.md)声明 MIT，但[固定快照](https://github.com/gaoweimax/recallweaver/tree/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f)完整目录树未见独立许可证文件；实际复用前补足许可文本与版权记录 |
| 3d-memory-sea | [MIT LICENSE](https://github.com/asdfd3/3d-memory-sea/blob/bcc1bb6b7e9e8b3dc4cf16b649a94445c8b6f25f/LICENSE) |
| qqbot-nodejs、dsh-qqbot、openclaw-weixin | 固定 LICENSE 链接与版本见[平台调研许可表](docs/architecture/references/2026-11-01-platform-research.md#固定版本维护和许可证据) |
| Wecom aibot-node-sdk | 已记录 package.json 的 MIT 声明；发布包差异另核对 |
| NapCat、SnowLuma | 固定许可正文及其非商业、修改或分发限制见[平台调研](docs/architecture/references/2026-11-01-platform-research.md)；外部运行时不随本项目打包 |
| 其余项目、模型和素材 | 尚未在此统一完成许可正文审阅；实际采用时按具体版本补录，不猜测许可证 |

未来发生实际代码或素材复用时，为每一项补齐：上游项目和作者、完整 commit/包版本、原文件路径、LifeCore 对应文件、修改说明，以及保留的 LICENSE/NOTICE/版权声明。发布版的第三方声明从实际采用记录生成，灵感来源仍保留在本文。

## 持续维护约定

1. 新参考项目在同一次文档更新中登记名称、作者或组织、官方链接、借鉴点和采用状态。
2. 有源码阅读时记录固定提交与阅读范围；未知版本明确写“未锁定”，不补造历史记录。
3. 更新来源时保留旧快照；技术路线改变或最终未采用，不删除曾经产生的启发。
4. 实际复用时补齐文件映射和许可材料，再更新 README 与发布致谢。
5. 如果作者或社区指出署名遗漏、归属错误或引用不准确，核对后及时更正。

## 专项研究入口

- [早期架构与参考实现](docs/architecture/v1.md)
- [记忆系统研究与来源登记](docs/architecture/references/memory-research.md)
- [记忆项目研究快照](docs/architecture/references/memory-sources.lock.json)
- [QQ 与微信平台调研](docs/architecture/references/2026-11-01-platform-research.md)
- [SnowLuma 早期接入参考](docs/architecture/references/snowluma.md)
- [3d-memory-sea 调研](docs/architecture/references/2026-11-01-3d-memory-sea-review.md)
- [digital-life-core 调研](docs/architecture/references/2026-11-01-digital-life-core-review.md)
- [RecallWeaver 调研](docs/architecture/references/2026-11-01-recallweaver-review.md)
- [生产架构与组件建议](docs/superpowers/specs/2026-11-01-production-plugin-architecture.md)
- [自主生活与中断续做修订](docs/superpowers/specs/2026-11-01-autonomous-life-and-interruption.md)
