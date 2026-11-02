# LifeCore · 生命核心

**我要给她完整的一生。**

A DeepSeek Harness plugin for persistent identity, memory, and gradual personality growth.

[English](README.en.md) · [架构 V1](docs/architecture/v1.md) · [模块讨论指南](docs/architecture/discussions.md) · [项目总体设计](docs/project-design.md) · [参考项目与致谢](ACKNOWLEDGEMENTS.md)

开发讨论入口：[第一版十五模块需求单](docs/requirements/v1-requirements.md) · [完整架构与数据流](docs/architecture/v1-data-flow.md) · [架构总览图片](docs/architecture/assets/v1-architecture-overview.png)。需求范围和技术选型仍待会议确认。

当前设计梳理入口（2026-11-02）：[基线、职责与待决事项](docs/superpowers/specs/2026-11-02-design-baseline-and-responsibilities.md) · [DSH 插件复用候选与证据](docs/architecture/references/2026-11-02-dsh-plugin-reuse.md)。当前先统一完整逻辑、模块边界和复用方案，再安排后续开发；这两份讨论稿不代表新架构或插件选型已经批准。

总体分工细化：[同一生命的执行场景与数据归属](docs/superpowers/specs/2026-11-02-runtime-and-data-ownership.md)。说明 LifeCore、DSH 和能力插件的责任、场景/任务隔离及数据权威，当前为待确认设计建议。

共同流程细化：[出生、事件接收、执行绑定、授权、动作回执和恢复](docs/superpowers/specs/2026-11-02-common-contracts.md) · [故障验收表](docs/superpowers/specs/2026-11-02-common-contracts-acceptance.md)。明确成功点与异常恢复顺序，仍为设计稿，未开始实现。

记忆与上下文选型：[LivingMemory、SeekMemory、PLUR 与 DSH 的契约对照](docs/superpowers/specs/2026-11-02-memory-context-reuse-design.md) · [固定版本证据](docs/architecture/references/2026-11-02-memory-context-evidence.md)。区分可复用机制、适配工作、已知冲突与未核实项；具体后端尚未选定，未安装或开发。

记忆接口细化：[来源版本、权限、幂等写入、删除恢复与导出](docs/superpowers/specs/2026-11-02-memory-adapter-contracts.md) · [各候选具体改动地图](docs/superpowers/specs/2026-11-02-memory-adapter-change-map.md)。包含字段、提交边界、迁移流程和 MA01–MA16 待验证场景，仍为设计建议。

记忆路线建议：[SeekMemory 受控服务与 PLUR 检索组件](docs/superpowers/specs/2026-11-02-memory-route-selection-design.md)。比较最小接入、自研与维护成本；建议优先 SeekMemory 候选处理路线，补齐中文语义检索，PLUR 作为备选。建议尚未确认，未开发。

记忆接入收敛：[组件依赖、唯一提交边界与准入标准](docs/superpowers/specs/2026-11-02-memory-integration-boundaries-design.md) · [11 月 2 日分模块进度](docs/architecture/2026-11-02-design-progress.md)。当前记忆专项已形成设计交付；生活成长、能力体验和全链路设计仍待继续，未启动产品开发。

既有完整设计：[项目设计与开发前核对稿](docs/superpowers/specs/2026-11-01-lifecore-complete-design.md)。集中说明自主生活、普通 QQ 与微信、受限工作任务、四层记忆、70% 工作段交接、低谷归纳、后台记忆星图、组件及开发验收；明确标注推荐选择与实机门槛，核对后再生成新的实施计划。下列旧稿保留为历史和专项依据，不将不同版本的默认值混用。

2026-11-01 推荐定版稿：[生产插件架构与组件选型](docs/superpowers/specs/2026-11-01-production-plugin-architecture.md)，包含自研/复用边界、QQ与微信、多层记忆与图谱、托管内核、开发阶段及生产验收。该稿显式提出对旧架构的修改，尚未替代已确认基线，也不表示已有可运行版本。

最新目标修订：[自主生活、并行活动与中断续做](docs/superpowers/specs/2026-11-01-autonomous-life-and-interruption.md)。大肥鱼应能在授权范围内主动社交、浏览视频、切换注意力并继续未完成活动；聊天是持续生活的一部分。普通QQ头像/空间和B站/抖音活动纳入目标，具体实现仍待开发与验收。

## 为什么做 LifeCore

我们希望 AI 不只存在于一次聊天中。

她可以记得自己的出生，记得和谁相识、经历过什么，也可以因为长期经历慢慢改变。会话可以结束，模型可以更换，但她走过的生活不应因此被清空。

LifeCore 希望为这样的连续性提供基础：持久的身份、有来源的记忆、有历史惯性的人格成长，以及跨平台延续的关系。首个正式生命是“大肥鱼”。

## 项目形态

LifeCore 是 **DeepSeek Harness（DSH）插件系统**。生命核心运行在插件内部，由 DSH 管理启停，生命数据独立持久化。

项目计划提供：

- 出生档案与持久身份；
- 事件记忆、关系与短期情绪状态；
- 有证据、可追溯、缓慢的人格演化；
- QQ／B站连接与场景隐私隔离；
- 数据导出、备份恢复与管理界面。

DSH、QQ 网关及其他外部软件由用户自行安装，不随本项目分发。必要的连接代码和辅助脚本可以属于插件，但不要求额外部署一个 LifeCore 生命服务器。DSH 关闭时插件也停止运行，重新启动后恢复保存的状态。

## 当前进度

**v0.1.0-alpha.1 已有可运行预览代码。** 最新已确认路线为 **DSH 宿主 + SnowLuma 普通 QQ**，覆盖此前文档中的候选建议。先看 [v0.1 启动与安装说明](docs/v0.1-quickstart.md)：出生草案、持久身份、隔离试聊、时间线、组件配置和浏览器进度基础已经实现。真实模型调用、QQ 账号收发和真实视频网站尚待验收；完整设计中的其他能力仍属规划。

2026-10-30 已补充[完整记忆架构方案](docs/architecture/modules/M04-M09-memory-system.md)，贯通原始记录、记忆整理与检索、上下文组装和 DSH 回复；配有[研究来源与项目对比](docs/architecture/references/memory-research.md)及[验收方案](docs/architecture/modules/M04-M09-memory-evaluation.md)。这些是待实施的工程设计，不是已有功能。

当前已整理[第一版架构基线](docs/architecture/v1.md)，涵盖 15 个模块的职责、初步做法、协作边界和参考源码。各模块的算法、数据结构及接口将在后续新会话中逐项详细讨论，入口见[模块讨论指南](docs/architecture/discussions.md)。上述能力均为规划，不是已经实现的功能。

第一个验证目标是：插件能够在 DSH 中加载，建立唯一生命身份，并在插件重载和宿主重启后恢复。随后完成受控 QQ 私聊与基础记忆闭环，逐步深化关系、情绪和人格成长，再扩展群聊、B站与自主活动。隐私、持久化和暂停能力从最小闭环开始具备。

## 设计原则

- 同一个生命，多种交互场景；私聊、群聊与公开活动的上下文分别管理。
- 一件事可以改变当下的情绪，长期人格变化需要累积证据。
- 模型提出解释，程序校验并提交状态变化。
- 记忆具有来源与访问范围，删除需要覆盖派生摘要和索引。
- 更换模型、升级插件和恢复备份不自动触发重新出生。

这里的“生命”和“情绪”是项目的创作愿景与行为模型，不预设可验证的主观意识。

## 数据与贡献

仓库只接收合成案例、脱敏配置及测试材料。请勿提交真实聊天、生命数据库、平台 Cookie、账号凭据或备份。`.gitignore` 是辅助保护，提交前仍需检查文件内容。

欢迎围绕设计、事件模型、隐私边界和 DSH 兼容性提出 Issue。正式代码贡献流程将在最小插件实现时补充。

## 参考与致谢

感谢为数字生命、长期记忆、平台连接与基础工具分享成果的开发者和研究者。[参考项目与致谢](ACKNOWLEDGEMENTS.md)集中记录作者与项目链接、具体启发、研究版本和采用状态。新增参考来源时同步登记；未来实际复用代码、模型或素材时，补齐对应的版权和许可声明。

## 许可

开源许可证尚待维护者确定，当前仓库未添加 LICENSE。引入第三方代码时必须核对其许可并保留相应声明。
