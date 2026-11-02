# 记忆适配：候选改动位置与验证边界

日期：2026-11-02（Asia/Shanghai）。状态：与[05 接口与数据契约](2026-11-02-memory-adapter-contracts.md)配套的改动地图，尚未开发。比较基于[04 固定证据](../../architecture/references/2026-11-02-memory-context-evidence.md)的同一批 SHA；本轮补读字段、版本提交与遗忘路径，新增证据见第 7 节。

这里的“修改”是未来工作要求，不表示已改上游文件。范围标记：C 配置/组合；A 外围适配；I 内部扩展或受控分支；U 尚需核实。A 与 I 的边界必须靠真实接口验证，不假定所有函数可公开调用。

后续收敛见[06 两路线选型建议](2026-11-02-memory-route-selection-design.md)：补读发现 SeekMemory 已有无提交的 build_plan，PLUR 完整混合检索不是独立公共导出；最小建议仅复用处理组件，不接入候选独立主库。下表是各类接入的改动地图，并非其中所有项目均纳入最小方案。

## 1 不论选谁都由 LifeCore 提供的部分

| 契约责任 | 本地适配/领域层必须做的事 | 不能转嫁的理由 |
| --- | --- | --- |
| 来源与修订 | 稳定 source_key、规范版本、原文/证据定位、事件与待办一起接收、当前事实协调屏障 | 插件自产的文本 hash、会话 ID 或学习次数不等同平台来源身份。 |
| 身份与许可 | AccessContext、允许候选集合、多来源约束、读/模型/分享/导出分离、依赖失效 | 插件自身的 scope/global 不是用户已授予的社交许可。 |
| 业务提交 | CommitMemory 的 expected_revision、operation result、候选唯一键、依赖边与 outbox | 插件返回写入成功不能自动更新生命、人格或已发送事实。 |
| 防重与投影 | operation/generation 映射、结果核对、完整块 manifest、连续覆盖/缺口、旧写隔离 | 多库间隙无法靠外围 request cache 或“重试一次”抹掉。 |
| 删除与恢复 | 独立控制账本、抑制、依赖闭包、逐组件清理回执、最新性/旧输入核对 | 退役一条记忆不等于删除其来源、图、摘要、备份和在途写。 |
| 导出与迁移 | 一致快照、三种产物、目标授权、发布前屏障、受限导入和新代次切换 | 原始目录拷贝、插件导出、正文 YAML 各自不能自动满足完整恢复。 |

这些是共同成本，不应用来夸大某候选的“缺陷”。若后端提供同语义原语可以复用实现，但逻辑责任仍归上述模块。

## 2 LivingMemory：需要改哪些位置

| 契约/位置 | 范围 | 所需改变与保留部分 | 验证出口 |
| --- | --- | --- | --- |
| [index.cjs 挂载/角色](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L4617)、cordis.patch.yml | C＋I | 增加可受管的组件组合边界：正式域不自动启动竞争注入/提炼/维护；保留需要的检索机制。不能仅卸 write 角色。 | G01/MA04：列全 host 内部路径，所有都受控；缺少可拆接口则须分支或放弃整插件路线。 |
| [表与 source/checksum](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L4861) | A＋I | 稳定 LifeCore 对象到后端 id/块映射；增加源修订、逐断言/派生依赖和投影版本/操作证据。可用独立受控元数据表，但所有读取必须经过它。 | MA01/MA02/MA07：老 id/新正文冲突、定位和半批写入。 |
| [观察与缓冲](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L5950)、[摄入](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L7529) | I | 将已有提炼逻辑作为有输入区间/任务 ID 的候选处理器，改接持久来源任务；截断/淘汰只用于受限计算窗口，不能丢权威接收。 | MA03/MA06：崩溃不丢 accepted 来源，不把候选写入当原子接收。 |
| [spaceWeight](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L2774)、search/图/时间线 | I | 在每个查询/向量池/图扩展前接入允许集合；保留后续相关性算法，移除把跨空间非零权重当权限的假设。 | MA04：不同私聊、global、无 cwd、诊断及邻居扩展均无越权候选。 |
| [read_episodic](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L12762) / read_evolution | A＋I | 按 SourceRevision/EvidenceRef 的可信范围回查；宿主日志只作明确映射来源，不能任意按模型给的 id/路径读取。 | MA02/MA04/MA11：旧表示、删除后原文、备份日志不能绕行。 |
| [写工具及内部写入](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L3679) | I | 受管写入口支持 operation、expected version、control fence 和结果核对；业务变更改为候选。增量计数/强化等副作用纳入幂等，不只比较 checksum。 | MA05–MA08：后端写后丢响应、旧写晚到、乱序 tombstone。 |
| [context](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L5083)、[assemble](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L8078) | C＋I | 关闭全部竞争注入，或改为返回结构化材料给 M09；缓存带策略/源版本失效，不仅调整自动召回开关。 | MA03/MA12：即时纠正与撤销，主动联想关闭不被常驻注入绕开。 |
| [提炼出站](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L6333)、[夜巡](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L8598)、[压缩桥](https://github.com/dearbld/dsh-living-memory/blob/1d8d43c708ad8ed80f9faebdcf22001e99845b8d/index.cjs#L7595) | I | 替换全部独立模型请求为受管调用；定时器改受管任务，维护改提交候选/投影；压缩桥不能二次建立成长证据。 | G05/G07/G08、MA08：暂停、预算、尾部结果和重复摘要。 |
| 删除、快照、导出 | A＋I/U | 根据源码存储面建立清理清单及 staging/manifest；先屏障后清理；核实同库 WAL/派生表/日志/出生准备的快照与擦除。已有维护标记可辅助，但不是全流程完成证明。 | MA08–MA16；无法限制内部后台访问时不能仅靠外围包装准入。 |

判断：现有能力丰富，但受控接入触点集中在大体量 index.cjs 的多个内部管道。当前已知内部修改面较广；不能报成“加几个配置”。若只抽取其检索算法，需另列依赖和维护成本，不能继续把它称为完整插件直接接入。

## 3 SeekMemory：优先核对记忆服务边界

| 契约/位置 | 范围 | 所需改变与保留部分 | 验证出口 |
| --- | --- | --- | --- |
| [core/source.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/core/source.py)、[store/sources.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/store/sources.py#L32) | A＋I | 使用 LifeCore 稳定 source_id/source_revision 映射；不能直接用含正文的 make_source_id 生成平台事件身份。新增无正文 tombstone/缺附件表示与内容冲突处理。 | MA01/MA02：同事件编辑不会变独立新事件；INSERT OR IGNORE 不吞异载荷。 |
| [core/artifact.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/core/artifact.py) | A | 可映射 id/revision、有效时间、lineage、subject、scope；补证据 span、可信策略/保留引用与规范 realm。persona/relationship 家族不另立权威。 | 多源约束、逐断言依据和候选校验；不把插件 family 当已批准共享。 |
| [store/artifacts.py commit](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/store/artifacts.py#L84) | A＋I/U | CAS、版本/证据/账本事务可保留；增加操作幂等结果、投影 fence、完整 batch 状态。不得使用注明仅用于样本的 upsert。 | MA05–MA07；验证与 LifeCore 事务的所有权，不能把内部 with conn 嵌套当分布式/外层原子保证。 |
| [ingest_service.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/services/ingest_service.py#L75) | A＋I | 受管输入/调度/模型网关，输出带来源的候选；既有 pending 和失败保留可复用。若它自行提交业务事实，须移到领域认可后的阶段。 | MA03/MA06/MA08：晚候选不能覆盖新纠正/删除。 |
| [scope.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/scope.py#L39)、[pipeline.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/recall/pipeline.py) | I | 替换普通全局池；在 pinned、主候选、Source fallback、图与轨迹前统一授权。保留时间筛选/排序/有界装配；拆分查询与使用反馈。 | MA04/MA12；拒绝结果处过滤代替前置范围。 |
| [DSH host bridge](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/adapters/dsh/src/host-dsh.js#L193) | C＋A/I | 不挂竞争 Runtime、人格刷新和独立召回消息注入；提供受控记忆服务调用，不把所有错误一律“跳过继续”。 | G01/G08；确认能否只装服务，否则记录需要改的组合入口。 |
| [store/ledger.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/store/ledger.py)、[management_commands.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/services/management_commands.py) | A＋I | 保留普通版本审计；删除另接独立控制账本与实际闭包清理。现有同库链/forgotten 修订不能证明不随备份回滚或字节已擦除。 | MA09–MA11；不能把 hash chain 当最新性证明。 |
| 导出与迁移 | A＋U | 序列化规范 Source/Memory/Evidence 与版本映射，隔离准备/快照校验、最新控制水位、源/Blob 去重引用清理；核实共享 blob 清理不会误删仍合法来源。 | MA13–MA16；输出 memory-portable，不默认带活跃 Runtime 执行资格。 |

判断：已读 Source/Artifact/CAS 接近所需领域结构，是“受控记忆服务复用”的优先可行性核对对象。仍有必须修改的权限和组合边界，不能称已通过。共享同一物理存储时须明确唯一事务所有者；分库存储时按 05 投影协议，不跨两个事务假装一起提交。

## 4 PLUR：先明确是复用检索还是整个记忆服务

| 契约/位置 | 范围 | 所需改变与保留部分 | 验证出口 |
| --- | --- | --- | --- |
| [DSH config](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/config.ts#L66)、[index](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/index.ts#L208) | C＋A/I | 可配置关闭 autoLearn/autoCapture/injection、默认 global；工具注册、viewer、后台及缓存仍单独接管。 | G01/MA04/MA12：无未受管写和越权缓存。 |
| [scope.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/scope.ts) | A | 保留 scopes 允许集合，替换 cwd/共同缺省映射，传可信 realm/scene 策略；不同来源共用表达须满足全部约束。 | MA04：同目录、多主体、global/private 不串。 |
| [Engram schema](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/schemas/engram.ts) | A＋I/U | 可映射 engram_version、previous_version_ref、provenance/claim_class、episode_ids；补稳定源修订、精确片段、策略/控制水位。schema version 不等于内容版本；sources[] 写入履历不等同完整 EvidenceRef。 | MA01/MA02/MA10；不把“有 provenance 字段”当全契约覆盖。 |
| [重复学习](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/index.ts#L3545) | I 或绕开该学习入口 | 重试不能再次增加 write_count、sources 和强化；须原子 operation 证据或确定性投影写入。跨 scope 复现不得自动扩大 LifeCore 权限。 | MA05/MA06；不能以正文 dedup 成功判断幂等。 |
| [forget](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/index.ts#L10325)、[DSH 调用](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/dsh/src/tools.ts#L155) | A＋I | 区分普通计数递减、force 退役和真正擦除。显式删除须走屏障/抑制及副本清理，不能重复调用 forget 凑到零；force:true 也不是全链路擦除。 | MA08–MA11；确认回执按真实清理阶段返回。 |
| [PrimaryStore](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/store/primary-store.ts) | A＋I/U | 可研究增量更新/存储能力，不直接使用具有去重强化语义的 learn 作为投影写。核实所选具体实现的事务/操作回执、多块发布与 fencing；接口可选能力不能当所有实现都有。 | MA05–MA08：选定实现逐项证明，不用接口声明替代后端证据。 |
| [core hybrid-search](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/hybrid-search.ts) | A | 只检索预授权投影/允许集合；保留算法与健康状态；结果回权威记录复核版本/删除，补当前事实协调屏障。 | MA03/MA04/MA12，另做中文质量验收。 |
| [provenance-store](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/provenance-store.ts)、导出/恢复 | A＋I/U | 来源快照、history、旧版本/索引、受管导出均纳入删除登记；构建规范包及恢复 manifest。不可把作者的 provenance/export 格式直接认作 LifeCore 生命备份。 | MA10/MA13–MA16；校验来源闭包和目标授权。 |

判断：如果只用检索组件和明确范围机制，可以避免大量学习/强化/退役语义接管，但 LifeCore 仍需实现规范来源与记忆服务。若完整采用 PLUR，需新增受控写入及删除路径；其现有版本/来源字段是可复用起点，不是“完全没有”，也不是已经满足。

## 5 DSH 上下文：与任何记忆后端共用的适配

| 位置 | 范围 | 所需改变 |
| --- | --- | --- |
| systemPrompt / session 组合 | A | M09 一套材料清单；注入内容与源版本/范围绑定，旧缓存和隐藏历史都可失效；记忆插件不竞争写上下文。 |
| [BasicCompactionEngine.summarize](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction-basic/src/index.ts#L270) | A/I | 复用事务和配对，定制生活摘要及受管模型调用；实际 summary 请求也核对来源范围、费用、取消和控制水位。验证发行版扩展点后决定外围子类还是内部适配。 |
| [原始日志/检查点](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/compaction/compaction/README.md) | A＋U | 建立覆盖及来源依赖映射、删除时失效重建；核实具体持久后端的清除能力，禁止只 dispose 就报擦除。 |
| [session-reference/spill](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/context/session-reference/README.md) | A＋U | 受众授权、所有复制快照登记、删除传播、导出包限制；不能默认跨所有 session 引用。 |

宿主日志和摘要清理未通过时，不能以记忆后端本身支持删除来宣布总体满足。

## 6 比较结果与下一步收敛

| 路线 | 目前最主要的内部改动 | 额外领域实现 | 当前建议 |
| --- | --- | --- | --- |
| LivingMemory 整插件受管化 | 多条查询、注入、观察、写入、夜巡和直接模型路径 | 来源版本/幂等/删除/导出协议及映射 | 已知改动面较广；先证明可拆入口，不直接默认采用。 |
| SeekMemory 记忆服务复用 | 普通全局池、服务提交边界、Runtime/人格/宿主挂载解耦 | 可信 AccessContext、操作幂等、独立控制账本、规范导出 | 优先核对服务可独立接入及事务边界；不是最终选型。 |
| PLUR 检索组件复用 | 控制输入/范围/缓存及关闭竞争写入 | 完整来源和领域记忆服务较多 | 与 SeekMemory 路线并列比较总成本；不能只比较插件接线量。 |
| PLUR 完整服务复用 | 重复学习、跨范围复现、遗忘/清理、提交/回执 | 规范证据与删除恢复、迁移协调 | 等核实具体 PrimaryStore 和受控写入路径再判断。 |

“已知改动面较广”是基于已读入口的工程推断，不是工时估算或源码质量排名；未读路径不算零成本。没有运行实验，不能说某条路线已经兼容、最快或记忆最好。

建议下一轮先做两项设计核对：SeekMemory 的纯记忆服务如何暴露稳定事务/候选接口；PLUR 仅作为检索后端时 LifeCore 需要补哪些存储与领域能力。按同一 MA01–MA16 验收出口形成最小接入边界，再确定主路径。LivingMemory 保留候选，若出现足够可控的服务接口可重新比较。

## 7 本轮新增固定源码证据

版本沿用 04 的 SHA。只读源码，不运行项目；以下补充旧表的未核实项，不能推成全仓已审计。

| 编号 | 路径与观察 | 本稿推断边界 |
| --- | --- | --- |
| SK08 | [core/source.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/core/source.py)：make_source_id 在有 event_id 时仍将正文等字段加入哈希；Source 有 metadata、reply_to，要求非空文本。 | 不能原样作为平台消息身份/无正文墓碑协议；可由适配层传规范 id 和单独修订。 |
| SK09 | [core/artifact.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/core/artifact.py)、[artifacts.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/store/artifacts.py#L84)：有 revision、time、lineage、subject；commit/commit_many 在本地事务做预期版本检查及版本/证据/账本写入。 | 是可复用原语，不等于 LifeCore operation 幂等或跨存储事务。 |
| SK10 | [ledger.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/store/ledger.py)、[management_commands.py](https://github.com/NeverENG/SeekMemory/blob/e895a4fa5986db4ac97573c95a832896032d5650/services/management_commands.py)：普通 hash chain 在同数据库；管理忘记可通过新修订/state 路径提交。 | 所读链不能证明独立删除最新性；忘记修订不等于全部副本擦除，其他路径仍未完整核查。 |
| PL07 | [schemas/engram.ts](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/schemas/engram.ts#L348)：区分 schema version 与 engram_version，有 provenance、claim_class、episode_ids、写入来源数组；draft 的描述明确仍可召回。 | 可以映射部分字段，不能断言没有版本/来源；draft 不能未经核实当出生隐藏准备区。 |
| PL08 | [重复写](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/index.ts#L3545)：_recordDuplicate 增加 write_count 并追加 sources；[跨 scope 逻辑](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/index.ts#L3884)有复现计数/扩大适用范围的路径。 | 内容去重不等于请求幂等，也不能根据频繁出现自动扩大授权。未对全部配置组合做实验。 |
| PL09 | [forget](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/index.ts#L10325)、[主存储处理](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/index.ts#L10507)：普通主路径减计数，force 可立即 retired；该主路径为原位软退役。另有 remote-only 排队行实际移除分支。 | 不把所有 forget 路径一概说成软删除，但不能用通用 forget/force 承诺全面擦除；DSH 工具所读调用传 scope，没有传 force。 |
| PL10 | [PrimaryStore](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/store/primary-store.ts)、[provenance-store](https://github.com/plur-ai/plur/blob/53d576d106bbac631ab5cc6ced98cce02b92b848/packages/core/src/provenance-store.ts)：有不同后端与增量/事务相关能力，来源记录可积累独立快照。 | 可复用程度取决于实际实现；来源快照是删除/导出清单之一，未证明其完整清除协议。 |

## 8 当前边界

完成了字段契约到具体模块的改动映射；尚未选最终后端、承诺开发量、提交上游补丁或运行验收。该地图供后续设计收敛与实现计划引用，不自行启动开发。

独立静态复核及文档检查记录见[05 第 11 节](2026-11-02-memory-adapter-contracts.md#11-本轮检查记录)。部分上游原语已抽查，不代表完整兼容性验证。
