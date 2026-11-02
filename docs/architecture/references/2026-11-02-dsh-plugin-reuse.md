# DSH 插件复用候选与证据登记

核查日期：2026-11-02（Asia/Shanghai）。用途：支持[设计基线与职责梳理](../../superpowers/specs/2026-11-02-design-baseline-and-responsibilities.md)，不是安装推荐清单或兼容性认证。

本轮依据同日调研中读取的上游 README、DSH 官方接口文档及 LivingMemory 部分源码。下列链接指向可变分支，尚未固定依赖提交、审计发行包或完成运行联调。后续选型时需记录实际 SHA/包版本、宿主版本、许可和验证结果；不得将“能安装”直接写成“已接入 LifeCore”。

后续补充：DSH 官方接口文档已固定至 `ce7073d51254c26cd63b22a60835b8f948deb447`，来源及待运行验证项见 [总体职责稿第 12 节](../../superpowers/specs/2026-11-02-runtime-and-data-ownership.md)。下列第三方插件候选仍使用可变来源，未成为锁定依赖。

后续记忆专项：LivingMemory 已固定到 `1d8d43c708ad8ed80f9faebdcf22001e99845b8d`（源码包声明 0.2.10），并与 SeekMemory、PLUR 及 DSH 上下文机制对照，见[固定证据](2026-11-02-memory-context-evidence.md)与[04 适配建议](../../superpowers/specs/2026-11-02-memory-context-reuse-design.md)。下文保留早期候选登记；专项证据不等于安装兼容认证。

## 1 现有宿主与执行差距

当前预览声明 DSH `0.2.1-rc.3`，历史安装验证见 [v0.1 记录](../../superpowers/plans/2026-11-01-v01-preview.md)。此次没有重新读取本机安装版本或启动宿主。

LifeCore 的 [model.js](../../../src/model.js) 当前直接调用模型且 `tools: []`；[index.js](../../../src/index.js) 注入 webServer、connection 和 llm。因此插件的工具、session 事件与 systemPrompt 注入不会仅因安装就自动获得本轮 LifeCore 执行上下文。

DSH 官方[服务说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/framework/service.md)提供插件间服务注入与隔离机制；[Agent 说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent/README.md)描述创建/恢复 Agent、作用域配置、上下文注入、取消及执行驱动。本文仅据此认定有可研究的接入机制，不保证 master 的全部 API 在预览宿主版本上可用。

## 2 候选、已读证据与待验证内容

| 编号/项目 | 读取的上游材料与能力声明 | 可能复用的职责 | 关键缺口或待验证内容 |
| --- | --- | --- | --- |
| C01 [nisew2/dsh-whale-dive](https://github.com/nisew2/dsh-whale-dive/blob/main/README.md) | README：9 个模型工具；B站详情/推荐/搜索/作者/评论/弹幕/字幕；抖音 hot/feed/video/search；只读 | M10 内容发现和读取，M09 的材料输入 | 真实账号、中文返回、故障与登录行为；没有据此证明播放暂停/定位或完整视频理解 |
| C02 [CZX2244/dsh-bilibili](https://github.com/CZX2244/dsh-bilibili/blob/main/README.zh.md) | README：bilibili_extract，字幕/评论/弹幕、可选 ASR/关键帧/视觉描述，登录与体检工具 | M10 内容提取，M09 证据和理解覆盖 | 实际依赖、帧与时间来源、费用和媒体出站；工具提取不等于已持续播放；系统提示模板需避免覆盖角色规则 |
| C03 [JianHeShui/dsh-douyin](https://github.com/JianHeShui/dsh-douyin/blob/main/README.md) | README：DSH 工具、Python 脚本及可选 HTTP API；热榜/搜索/详情/评论、下载抽帧、消息相关能力 | M10 抖音能力，M11 可评估外发执行 | 各能力是否同样暴露到 DSH 工具需逐项确认；登录、真实平台回执、运行依赖及非工具入口权限需核查 |
| C04 [Alterssss/dsh-bili-whale](https://github.com/Alterssss/dsh-bili-whale/blob/main/README.md) | README：作息唤醒、内容读取/抽帧、日记、分享、私信等；独立 persona、工作目录、会话、额度与文件状态 | 内容工具、生活流程参考；可评估受控接入 | 如何关闭/接管定时器与独立人格；统一暂停、记录、预算和外发；不能假定已有稳定 LifeCore service 接口 |
| C05 [sharkisyou/dsh-dy-whale](https://github.com/sharkisyou/dsh-dy-whale/blob/main/README.md) | README：依赖 C03；定时向 dy-whale 会话投递唤醒；独立日记/persona；只读路线 | M08 作息实现参考或可控适配，证明工具层与生活层可分开 | 固定会话、独立计划/日志与 LifeCore 生命周期如何协调；不等同通用任务调度器 |
| C06 [NEWJO123/dsh-douyin-scroll](https://github.com/NEWJO123/dsh-douyin-scroll/blob/main/README.md) | README：推荐流和热榜、评论与互动指标、筛选和日报；明确不做视频画面/OCR/ASR理解 | 内容候选与筛选参考，减少重复采集开发 | 不满足真实视频感知全部要求；独立人格/调度/报告需对齐；外发入口与默认开关另审 |
| C07 [dearbld/dsh-living-memory](https://github.com/dearbld/dsh-living-memory/blob/main/README.md) | README 及部分 index.cjs：SQLite、FTS5中文分词、可选向量、图、自动提炼/召回、夜巡；memory 与 memory_write | M04 提炼/整理/检索候选，M09 召回注入候选 | 原文寿命、来源跨度、社交权限隔离、关闭自动注入/后台写入的范围、删除/导出/恢复、API成本和目标宿主兼容 |

C01/C02/C03/C07 是当前优先比较的工具/记忆候选，不是全部同时安装的决定。C04/C05/C06 为完整生活或定期任务方案，需区分可复用工具、可控调度和无法直接接入的部分。插件名称类似时以完整仓库标识区分，不把同名 dsh-douyin 项目视为同一实现。

## 3 LivingMemory 已经确认的源码接入事实

已读 [index.cjs](https://github.com/dearbld/dsh-living-memory/blob/main/index.cjs) 的相关片段：

- 声明 tools、credentials、systemPrompt 依赖；host/write 两种角色分别承担内部管道与写工具挂载。
- 使用 session/event、agent/inbox/claimed、system-prompt/assemble 以及 systemPrompt.context；当前 LifeCore 直接 llm.stream 路径不能假定触发这些钩子。
- 召回空间使用 cwd/session 映射，部分查询组合本空间和 global；存在跨空间排序权重。此事实不足以认定它满足 QQ 私聊/群聊等硬权限隔离，需检查所有读取、注入和后台路径。
- README 提供自动召回等开关，但不能由某一个开关推断所有 context 注入、提炼和后台写入都停用；需逐项验证。
- 本地保存 SQLite，不代表所有计算都离线：提炼模型及可选 embedding/rerank 有独立端点和凭据路径。接入时需要统一记录允许出站的材料和实际费用。

这些是局部源码观察，不是完整安全审计、可靠性结论或效果评测。检索质量、中文长期记忆、并发场景和删除恢复尚未在 LifeCore 中验证。

## 4 同条件比较记忆后端

LivingMemory 是可安装插件候选；SeekMemory 是旧设计中的受控复用候选，两者接入代价不同。SeekMemory 证据沿用[现有研究](memory-research.md)与[完整设计](../../superpowers/specs/2026-11-01-lifecore-complete-design.md)，本轮未更新其源码快照。

后续对两者填写同一张能力矩阵，每格记“满足/需适配/不满足/未核实”及证据，不以功能数量或宣传排名选型：

1. 共同经历与重要信息保留；原文、摘要和推断区分；来源版本可回查。
2. 新会话连续性、中文同义检索、时间与更正、多值事实。
3. 试聊与正式隔离、不同主体/场景隔离、模型出站范围。
4. 主动联想开关与自然表达；显式回忆不受误伤；不能重复注入。
5. 删除、导出、备份恢复、后端替换及宿主日志清理。
6. 提炼/召回/夜巡触发、预算、重复处理、失败重试和暂停。
7. 标准工具/服务 API、目标 DSH 兼容、数据独立、许可证与维护补丁成本。

只有明确哪些职责可直接配置、哪些需要适配、哪些必须补实现，才能估计节省的工作量。本轮不报未经证明的“省掉百分之多少开发”。

## 5 下一次证据工作（待设计阶段安排）

先做只读材料核查：固定候选源码版本、确认公开入口与挂载范围、列出独立写库/定时器/外发路径、对照 LifeCore 公共契约。运行实验另列目的、输入、隔离环境、成功标准和失败出口，当前用户要求先规划，不执行安装、登录或收费调用。

评估结论最终落到主设计的 R02–R06，不能只在这份研究附件里改变生命数据归属、范围或权限规则。
