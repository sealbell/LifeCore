# RecallWeaver 调研与借鉴边界

调研日期：2026-11-01。项目：[gaoweimax/recallweaver](https://github.com/gaoweimax/recallweaver)。固定提交：[2de0e8a1e7199e4d97ba02a222e1f9bd06de099f](https://github.com/gaoweimax/recallweaver/commit/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f)，提交日期 2026-10-31，包版本 0.1.0。

统一署名入口：[参考项目与致谢](../../../ACKNOWLEDGEMENTS.md)。当前设计：[完整项目设计与开发前核对稿](../../superpowers/specs/2026-11-01-lifecore-complete-design.md)。

## 结论与研究范围

值得参考，定位是轻量的本地文本与时态事实记忆引擎。它实际使用 SQLite、FTS5、关系表和递归查询，进一步说明“SQLite 存储”与“记忆关系图”可以同时存在。图结构不要求额外部署图数据库。

建议参考其原子事实更新、图遍历防环、整笔事务重试、在线备份和边界测试组织；暂不把它加入运行依赖，也不据此替换当前拟受控复用的 SeekMemory 领域代码。这个判断基于职责匹配和实现缺口，不是同条件性能排名；SeekMemory 的复用本身也仍需通过 G0 验证。

本次静态阅读固定快照的 README、包配置、schema、核心 Python 模块、API/服务、演示、备份脚本、相关测试与评测。没有安装依赖、运行上游测试、构建 wheel 或调用真实模型，文中不承诺实际运行性能。

## 已实现的机制及适用位置

| 机制 | 源码中的实际行为 | 对 LifeCore 的用处 |
| --- | --- | --- |
| 时态事实 | 三元组保存主体、谓词、对象及有效区间；在同一事务关闭旧边并插入新边，相同当前事实幂等 | M04 的单值状态纠错参考，例如在明确语义下更新“当前常住城市” |
| SQLite 图检索 | 递归 CTE 遍历，带租户条件、跳数限制和路径防环 | M04/M13 的有界关系查询；M15 可使用查询结果，但仍需自建星图界面 |
| 中文文本检索 | FTS5 trigram，短词或未命中退回 LIKE，再按实时权重筛选 | 作为可比较的轻量检索方案；需单独测试短姓名、同义改写和大量候选 |
| 事务重试 | BEGIN IMMEDIATE；忙锁时回滚、关闭连接，随机指数退避后重放数据库事务 | M02/M13 的短事务失败恢复参考；不可把网络请求放入可重试事务 |
| 一致性备份 | SQLite 在线 backup API、quick_check、临时文件再发布 | M13 的快照流程参考；不能替代 LifeCore 的删除账本与恢复协议 |
| 测试与诊断 | 冲突、租户、回滚和噪音测试，trace 与召回日志 | 增补 LifeCore 的边界用例及诊断字段，避免只演示顺利路径 |

实现证据：[事实更新](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/memory_manager.py#L318-L400)、[图遍历](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/graph.py#L122-L181)、[文本检索](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/retrieval.py#L78-L162)、[事务重试](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/db.py#L52-L155)、[备份](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/scripts/backup.py#L66-L96)。

## 不能直接照搬的行为

### 1. 新信息并不总是替代旧信息

当前冲突更新对同一主体、同一谓词关闭全部有效旧边，再保留一个新对象。因此依次写入“用户—过敏—花生”和“用户—过敏—青霉素”，后一条会关闭前一条；这不是现实中应有的集合语义。

LifeCore 应为关系声明基数与更新方式：单值状态允许替代，多值集合允许共存，事件按事件标识区分，明确否定才撤销对应事实。迟到的历史陈述不能覆盖当前状态。上游有效时间主要由写入时刻生成，未提供完整的历史生效时间输入与“当时系统知道什么”的双时态查询，不能仅凭 valid_from/valid_to/tx_time 字段宣称完整双时态能力。[更新规则](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/memory_manager.py#L318-L400)、[数据模型自述](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/docs/data_model.md)

### 2. 默认衰减速度不适合长期陪伴

普通文本默认 base_weight=1、decay_lambda=0.01，时间单位为秒，未强化时 score=exp(-0.01×秒数)。文本检索要求 score≥0.3；由公式推算约 120.4 秒后低于门槛，约 300 秒后计算分数归零。这里是默认文本检索路径的静态推导，不是实测，也不代表物理删除或所有图事实同时消失。[初始参数](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/memory_manager.py#L29-L98)、[衰减公式](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/decay_engine.py#L12-L76)、[召回门槛](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/retrieval.py#L140-L147)

公式对检索强化设置了最多 1.5 倍的上限，这个抑制无限抬权的思路有价值；但所读公共召回链没有更新 retrieval_count，不能把“越用越牢”当成已自动运行的闭环。LifeCore 保持“衰减影响活跃度，重要事实保护、真伪和删除各自处理”，并以明确的时间尺度配置参数，不复制默认常数。

### 3. 有来源字段，不等于来源链已经接通

schema 有 episodes、source_episode_id 和 edges.memory_id，但公共文本写入不填来源字段，图事实写入也不关联 memory。图更新与文本失效没有统一协调，相关测试甚至保留旧文本为 active；两条召回通道可能给出不同版本。LifeCore 必须由同一事实版本和证据关系派生文本、向量与图视图。[表结构](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/schema.sql)、[两种写入](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/memory_manager.py)、[旧文本断言](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/tests/integration/test_chaos_boundaries.py#L130-L142)

未见条目删除/恢复的公共闭环；外键 ON DELETE SET NULL 仅解除来源引用，不会自动删除衍生内容。故不能借备份能力宣称已经解决“忘掉这件事”和恢复旧备份后的再删除。

### 4. 检索能力与完整记忆系统仍有距离

文本先取至多 50 条候选，最终按衰减权重排序，BM25 不参与最终融合；没有本地语义 embedding。图入口按完整实体名匹配查询，公开图写入又不填 memory_id，使相应图结果默认分数为 0，在合并中可能被文本挤掉。因此“有图＋FTS”不能直接推出同义提问和跨事件推理效果。[检索实现](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/retrieval.py)、[合并召回](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/api.py#L347-L397)

chat 路径先把消息存成 active/fact，再通过正则抽取“过敏”和“住在”，随后召回；没有四层归纳、持久整理队列、低谷调度或 70% 工作段交接。独立 LLMExtractor 未自动接入主 API。LifeCore 可以保留“待整理原文仍可查”的思想，但原消息属于 L0 陈述，不能因此升级成已确认事实。[服务流程](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/server.py#L267-L338)、[编排责任](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/docs/architecture.md)

### 5. 租户过滤不能代替我们的权限体系

主要查询和更新有 tenant 条件，值得保留；但 HTTP 的 user_id 由请求者传入，未见认证身份绑定或场景授权。get_history 固定 default，底层 get_memory(id) 也没有 tenant 参数。不能直接开放这个服务给 QQ 用户作为管理接口。LifeCore 仍由 M12 核验真实账号、场景、用途和动作权限，M14 负责受认证的本机桥接。[HTTP 输入](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/server.py#L392-L420)、[历史查询](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/api.py#L403-L444)

## 如何理解演示和评测

| 展示或指标 | 实际核查范围 | 可以得出的结论 |
| --- | --- | --- |
| 100 组合成样本 P/R/F1=1 | 每租户模板噪音与三条核心事实；查询使用唯一用户编号；评测直接写库，预设核心/噪音权重并关闭衰减 | 验证特定构造下的检索行为；不是抽取、真实回答或长期陪伴满分 |
| LongMemEval / real_world | 默认 mock，官方下载是选项；测试协议并非完整官方基准，项目数据报告承认缺少独立测试集与人工标注 | 可以学习测试脚手架，不能当作通过官方评测或优于其他方案的证明 |
| 30 分钟压测与 P99 10.5ms | 作者记录的特定负载；现有长稳脚本默认 10 workers，另一个 50 workers 脚本默认 300 秒，与 README 表格不能直接一一对应 | 需要固定机器、参数和原始结果复现；不是 HTTP＋模型回答 SLA |
| 清空上下文后仍记得用户 | 默认确定性 mock，预置事实和实体查询；显式 --live 才调用真实模型 | 演示外部记忆注入的接线；不是自动会话交接和真实回答质量验证 |

证据：[样本生成](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/benchmarks/gen_eval_dataset.py#L81-L120)、[质量评测](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/benchmarks/bench_quality.py#L67-L107)、[数据质量说明](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/benchmarks/datasets/DATA_QUALITY_REPORT.md)、[长稳脚本](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/benchmarks/soak_test.py)、[并发脚本](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/benchmarks/stress_deadlock.py)、[上下文重置演示](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/examples/context_reset_demo.py)。

本地检索不必调用模型，具有低调用成本的潜力；但不能据此量化总 token 节省。LifeCore 仍须在相同材料、模型、预算和评分规则下比较抽取、检索、回答、归纳和重试的总成本。

## 接入与许可条件

当前入口是 Python 库、rw CLI 和 FastAPI 服务；插件目录 README 明示暂未实现，base.py/registry.py 为空，不是现成 DSH 插件，也没有 LifeCore 所需的记忆星图管理后台、QQ 动作或活动中断调度。[插件状态](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/plugins/README.md)

README 的 Python 3.11+ 与实际 requires-python==3.11.9 不一致；安装例子的 [dev] 与实际仅有 [test] 也不一致。数据库初始化依赖源码根 schema.sql，pyproject 未见相应包数据配置，独立 wheel 安装需要另验，不能直接承诺兼容我们的打包方案。[包配置](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/pyproject.toml)、[schema 路径](https://github.com/gaoweimax/recallweaver/blob/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f/src/recallweaver/db.py#L193-L203)

README 声明 MIT 并链接 LICENSE，但固定快照的完整目录树未见独立许可证文件，包配置也未声明 license。实际复制代码或发布依赖前需补齐许可文本与版权记录；本次仅作研究与设计参考。[固定快照](https://github.com/gaoweimax/recallweaver/tree/2de0e8a1e7199e4d97ba02a222e1f9bd06de099f)

## 对当前开发方案的具体影响

1. **M04 记忆：** 将单值、多值、事件和撤销规则写成明确契约；事实更新、文本召回和星图必须指向同一版本。重要记忆不能因未访问几分钟而不可检索。
2. **M02/M13 协调与存储：** 参考短事务整体重试和一致性快照；延续单写入权威、来源链、删除账本与恢复校验。
3. **M09 上下文：** 保留现有工作段、阈值交接和增量归纳方案；其演示未提供这些模块的替代实现。
4. **M15 后台：** 继续使用同一 SQLite 数据投影到二维/三维星图，节点展开显示原文和版本；图数据库、图检索与图界面分别验收。
5. **验收：** 增加多过敏源共存、补记历史不覆盖当前、图文版本一致、重要事实跨时间找回、自然语言提问不依赖预置实体查询等用例。评测不提前给正确答案更高权重，不把 mock 结果当真实模型结论。

因此，本项目补充的是局部实现参考和验收要求。当前方案继续采用四层证据记忆＋独立工作段＋SQLite 混合检索；不新增第二个记忆服务或第二套正式状态。
