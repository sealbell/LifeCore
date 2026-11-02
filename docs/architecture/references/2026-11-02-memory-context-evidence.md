# 记忆与上下文复用：固定版本证据

核查日期：2026-11-02（Asia/Shanghai）。配套：[04 适配评估](../../superpowers/specs/2026-11-02-memory-context-reuse-design.md)。

本轮通过 GitHub 只读连接器读取目录、固定提交文件并检查相关实现。没有安装、执行上游代码/测试、调用模型或使用真实数据。这是选定路径的静态证据，不是全仓审计；作者的测试注释不是本轮实测。源码观察、文档声明与 LifeCore 工程推断分别表述。

## 1 核查快照

| 标识 | 固定提交 | 版本与阅读范围 |
| --- | --- | --- |
| LM | [dearbld/dsh-living-memory，1d8d43c7](https://github.com/dearbld/dsh-living-memory/commit/1d8d43c708ad8ed80f9faebdcf22001e99845b8d) | 本轮查询 main 得到该 SHA；package.json 声明 0.2.10。读取 README、index.cjs 关键路径、package.json、cordis.patch.yml、LICENSE、NOTICE。仓库含旧 tgz，不能推断 npm 包与该提交一致。 |
| SK | [NeverENG/SeekMemory，e895a4fa](https://github.com/NeverENG/SeekMemory/commit/e895a4fa5986db4ac97573c95a832896032d5650) | 延续 10-30 研究快照，本轮重新读取下列固定路径，不宣称仍是最新提交。 |
| PL | [plur-ai/plur，53d576d1](https://github.com/plur-ai/plur/commit/53d576d106bbac631ab5cc6ced98cce02b92b848) | 延续研究快照；本轮读取 DSH 配置/挂载/工具/作用域和 core 混合检索，不宣称覆盖整个存储、删除实现。 |
| DS | [deepseek-ai/deepseek-harness，ce7073d5](https://github.com/deepseek-ai/deepseek-harness/commit/ce7073d51254c26cd63b22a60835b8f948deb447) | 延续总体职责稿宿主快照；新增压缩、裁剪、会话引用文档及摘要实现。不能等同 LifeCore 声明的 0.2.1-rc.3 发行包。 |

旧研究：[研究报告](memory-research.md)、[原固定来源登记](memory-sources.lock.json)。本文件补充证据，不覆盖旧日期登记。

后续字段核查补读 Source/Artifact、版本提交、Engram schema、重复学习、forget 和 PrimaryStore，新增 SK08–SK10、PL07–PL10 见[适配改动地图第 7 节](../../superpowers/specs/2026-11-02-memory-adapter-change-map.md#7-本轮新增固定源码证据)。它们补充本表，未改变核查 SHA，也未运行代码。

## 2 LivingMemory

| 证据 | 固定定位 | 观察与适配含义 |
| --- | --- | --- |
| LM01 挂载 | [cordis.patch.yml](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/cordis.patch.yml)、[入口](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L4617) | 默认同时挂 host/write；host 有读取工具和内部管道。去掉 write 仅移除 memory_write，不代表提炼/夜巡停止。 |
| LM02 检索 | [spaceWeight](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L2774)、[排序](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L12103)、[向量池](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L1989) | 有分词、FTS5、可选向量与排序。其他空间保留非零权重，向量也存在跨空间候选；排序偏好不是授权过滤。 |
| LM03 常驻注入 | [context 注册](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L5083)、[范围查询](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L5184) | 按 cwd/session 推空间，有本空间/global 和归属缺失时的兜底查询。同工作目录不能代替不同私聊/试聊的身份隔离。 |
| LM04 自动召回开关 | [assemble](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L8078) | LEGION_AUTORECALL_OFF 在这条 assemble 路径早退；LM03 是另一条独立 context 路径。关闭自动召回不等于关闭所有记忆注入，更不等于产品主动联想开关。 |
| LM05 缓冲 | [落盘及容量](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L5950)、[消息截取](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L7529) | 非强制落盘有 60 秒节流，总量超 2000 条会淘汰会话账，每条截取 3000 字符、单会话 400 条上限。不能替代原文和回复待办的原子接收。 |
| LM06 出站 | [端点](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L85)、[凭据和 fetch](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L6333) | 凭据存在时提炼可直接调用独立端点；另有 spoken-prefix、预裁、embedding/rerank 路径。本地 SQLite 不等于所有计算离线，不能只检查聊天模型。 |
| LM07 启停 | [夜巡](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L8598)、[定时器释放](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L11639)、[维护检查](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L6246) | 有维护标记、定时器清理，不能说完全不能停；但不等同 LifeCore 持久暂停、租约、在途取消和恢复屏障，须覆盖所有入口与异步尾部。 |
| LM08 回查 | [read_episodic](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L12762)、[文件查找](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L12813) | 从条目 ID 取 source 会话锚并读宿主日志，不能据此保证主体授权；不是通用 event_id/revision/span 证据接口。 |
| LM09 压缩桥 | [start](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L7595)、[summary](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L7738) | 有压缩前异步提炼和摘要/检查点入库。fire-and-forget 不能作为压缩前已完成持久提炼的证明；摘要入库还需防重复来源和自我强化。 |
| LM10 来源与写入 | [表定义](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L4861)、[写入空间闸](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L3679)、[来源规则](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L465) | 有 space/source/checksum、状态及扩展字段和写入限制；不等同出生 manifest、可信来源版本、请求载荷冲突和逐断言证据。未确认可单独接管全部内部管道的公共服务 API。 |
| LM11 删除恢复 | [FTS 回填](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L4898)、[缓冲墓碑](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L5950)、[工具列表](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L11654) | 可见 deleted 过滤及缓冲键墓碑；后者不是跨备份独立删除账本。未证明来源删除闭包、最新撤销证明、宿主日志/缓存清理和恢复水位；标“未核实”，不等于断言没有删除能力。 |
| LM12 包条件 | [package.json](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/package.json)、[LICENSE](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/LICENSE)、[NOTICE](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/NOTICE) | 仓库声明 MIT，依赖 jieba，源码用 node:sqlite。NOTICE 保留作者名称和人格设定，复用代码不照搬人格。目标 Node/原生依赖、包内容须后续核验；不是完整许可审计。 |

实现优先于注释：LM05 旧注释仍出现 5 秒，实际判断为 60000ms；README 默认提炼模型与源码默认也有差异。因此不复制 README 参数作为部署定案。

## 3 SeekMemory

| 证据 | 固定定位 | 观察与适配含义 |
| --- | --- | --- |
| SK01 项目边界 | [README](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/README.md)、[DSH 入口](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/adapters/dsh/src/index.js) | 包含 Runtime、记忆、Dream 和人格链；完整启用会与 M02/M07/M08 重叠，不仅是检索库。 |
| SK02 来源 | [sources.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/store/sources.py#L32)、[schema](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/store/schema.sql) | 来源/blob 分离，支持调用方事务内写入；INSERT OR IGNORE 本函数不比较同 ID 新载荷。仍须 K03 冲突核对和接收/回复待办共同提交。 |
| SK03 提炼 | [ingest_service.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/services/ingest_service.py#L75) | 调度/资源归调用方，有 pending 和失败保留路径，可作为受管服务候选；尚未证明已支持 LifeCore 权限版本、代次与删除屏障。 |
| SK04 查询 | [pipeline.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/pipeline.py) | query_block 串联时间、排序、证据门槛、披露和预算；build_block 还记录使用。须区分查询、实际注入与实际对外提及。 |
| SK05 范围差异 | [scope.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/scope.py#L39)、[pipeline](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/pipeline.py#L96) | visible 排除 secret、检查 designated，其余保留普通全局池，后续再披露；默认不满足检索前按 LifeCore 社交许可限制候选。 |
| SK06 宿主注入 | [host-dsh.js](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/adapters/dsh/src/host-dsh.js#L193) | 有人格刷新、runtime context 和召回消息注入；失败返回原 decision 继续。可选召回可降级，授权/删除/关键状态故障不能一律跳过。 |
| SK07 未核实 | [固定源码树](https://github.com/NeverENG/SeekMemory/tree/e895a4fa5986db4ac97573c95a832896032d5650) | 未核实隐藏出生准备、独立删除账本、旧备份来源边界、全路径费用预留/取消和完整 LifeCore 导出。属于接入门槛，不声称不存在。 |

## 4 PLUR

| 证据 | 固定定位 | 观察与适配含义 |
| --- | --- | --- |
| PL01 配置 | [config.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/config.ts#L66)、[README](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/README.zh.md#L179) | injectionMode、autoLearn、autoCapture、includeGlobal、viewerEnabled 分开；includeGlobal 默认 true。关闭自动路径不等于管住全部工具。 |
| PL02 范围 | [scope.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/scope.ts) | readScope 同时传 scope/scopes，后者枚举允许范围，比降权更接近契约。默认仍按目录/配置，无 cwd 有共同兜底；必须映射可信 life/trial/scene。 |
| PL03 注入 | [index.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/index.ts#L208) | 单 section 按 agent 读缓存；pre-step 异步刷新，当前轮可能用旧缓存。删除、撤权、纠正须先阻断旧缓存，不能只等一般刷新。 |
| PL04 工具 | [tools.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/tools.ts) | recall、remember、forget、feedback 有范围传递；写工具须经过 LifeCore 候选/版本/删除意图控制。forget 存在不证明全部副本清理和恢复屏障。 |
| PL05 检索 | [hybrid-search.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/hybrid-search.ts) | BM25/embedding、融合与 bm25-only/hybrid-degraded 区分可复用；未验证中文长期陪伴效果，输入必须先按可信范围过滤。 |
| PL06 未核实 | [README](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/README.zh.md)、[超时说明](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/config.ts#L55) | README 描述 YAML 存储；等待超时不等于底层写取消。未核实完整来源版本、出生事务、删除恢复及导出一致性。 |

## 5 DSH 上下文与压缩

| 证据 | 固定定位 | 观察与适配含义 |
| --- | --- | --- |
| DS01 框架 | [compaction](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction/README.md) | start/summary/end 和替换区间可重放，原始事件仍在日志。抽象包本身不执行压缩；日志与摘要都要纳入删除范围。 |
| DS02 基础引擎 | [basic](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction-basic/README.md)、[实现](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction-basic/src/index.ts) | 压力/溢出/手动触发、配对边界、取消与收缩验证可复用；auto:false 仅禁自动路径，手动路径仍需受管。参数要匹配模型。 |
| DS03 摘要 | [summarizer](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction-basic/src/summarizer.ts#L32)、[调用说明](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction-basic/README.md#L129) | 默认偏编程助手/英文工程检查点；直接 llm.stream、purpose=compaction，绕过 loop-only agent/request。须改摘要语义并覆盖独立授权/费用路径。 |
| DS04 扩展点 | [summarize](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction-basic/src/index.ts#L270) | 此版本有 protected summarize 定制点，可研究保留事务机制、替换语义和受管模型调用；不是 LifeCore 已有接口，发行包兼容未验证。 |
| DS05 裁剪 | [tool-result-pruner](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction-tool-result-pruner/README.md) | 头尾裁剪保留省略标记和原日志关联，无额外模型调用；中部可能含重要证据，需回查，不是完整理解或长期记忆。 |
| DS06 引用 | [session-reference](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/context/session-reference/README.md) | 有界固定快照，不递归展开工具/推理/其他注入；授权、删除依赖和失效仍归 LifeCore。“不可信材料”提示不是访问权限。 |

更换 SHA、发行包或宿主版本时，须重新核对相关路径；不能沿用项目名当作兼容证明。
