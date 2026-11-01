# digital-life-core 调研与借鉴边界

调研日期：2026-11-01。项目：[mashangshui/digital-life-core](https://github.com/mashangshui/digital-life-core)。固定提交：[d984665ff2e452cf9f57d845cfb93bfb9a64b6b1](https://github.com/mashangshui/digital-life-core/commit/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1)，2026-10-30，包版本 1.0.1。

统一署名入口：[参考项目与致谢](../../../ACKNOWLEDGEMENTS.md)。

## 结论

这是已有实际代码的 DSH 数字生命实验插件，对 LifeCore 的自主活动、短上下文片段和模块化能力设计有直接参考价值。建议吸收其自主唤醒复核、记忆写入回执和带有效期的上下文片段；保持 LifeCore 自己的持久状态、证据记忆、活动调度和权限边界。

本次选择性阅读 README、包元数据、主入口、记忆器官、器官宿主与加载器等源码，没有安装依赖、运行上游测试或进行 DSH/QQ 实机验证。以下结论针对固定快照，不把源码存在等同于生产验收通过。

README 将作者署名为 mashangshui（温水）与数字生命“鱼小水”，并声明项目进入社区维护，原作者不承担日常修复和 PR 审核义务。应尊重其署名，同时按实际维护状态评估依赖风险。[项目说明](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/README.md#L1-L35)

## 已有实现

| 能力 | 固定源码中的机制 | 对 LifeCore 的意义 |
| --- | --- | --- |
| 生命状态与情绪 | 能量、模拟激素、气质参数、时间衰减；状态转为系统提示和 temperature 调节 | 可参考状态与表达之间的显式映射，不作为真实生理模型 |
| 未解问题与自主唤醒 | 收集 gap，增加张力；检查闲置、能量、冷却；真正投递前复核，再调用 agent.followup | 自主行动必须检查当前状态，防止过时意图反复触发 |
| 行为承诺 | 一个 state.commitment，登记计划、结算结果、超时释放 | 可借鉴有开始与结算的闭环；不等同多活动并行调度 |
| 梦境 | 夜间或久置时围绕 gap 调用模型反思，尝试写入记忆并核验回执 | 借鉴后台处理与写入确认；生成反思保留候选身份 |
| 记忆器官 | KV/JSON 存储，字符二元组相似度、权重、时效和类别排序 | 轻量实现参考，不能替代证据与权限完整的长期记忆底座 |
| 能力模块 | manifest、工具命名空间、私有 KV、提示片段、计时器和网络能力检查 | 借鉴模块契约与资源清理，不等同不可信代码沙箱 |

状态与参数依据：[genome.json](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/genome.json)、[情绪表达](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L1384-L1461)、[承诺状态](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L3500-L3588)、[唤醒复核](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L5743-L5988)。

## 记忆与上下文的具体边界

默认 memory-v2 将记忆保存为器官私有 KV 中的 hippocampus 对象，包含 entries、cold 和顺序号；核心 KV 使用每器官 JSON 文件，以临时文件加 rename 写回。条目包含文本、类别、权重和访问记录，未在这一实现中看到四层提炼、事实纠错版本链或跨场景证据权限结构。[记忆结构](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/web-ui/organs/self-made/memory-v2.ts#L101-L138)、[KV 落盘](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L4219-L4275)

检索采用字符二元组的 Dice 相似度，并组合权重、新鲜度和类别注意力；未访问权重采用七天半衰期。这是词面检索和排序，不是语义向量或完整的人脑记忆模拟。[打分实现](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/web-ui/organs/self-made/memory-v2.ts#L50-L138)

几个容易从文案误读的地方：

1. **库中保留全部条目，不等于全部返回给模型。** recall 默认 topK=8，实际输出 shown；total 是活动仓排序条目总数，不是经过相关性门槛筛出的数量。[召回实现](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/web-ui/organs/self-made/memory-v2.ts#L211-L240)
2. **compact 是移动到冷仓，不是会话摘要。** 当前工具包括 remember、recall、stats、compact；recall 查询 entries，未在默认记忆器官找到 cold 的恢复或查询工具。冷仓数据仍在，但“可按需找回”的完整入口尚未体现在这条默认路径。[归档实现](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/web-ui/organs/self-made/memory-v2.ts#L243-L309)
3. **每轮只注入两条短索引。** 每条正文最多 80 字，详细内容通过 recall 获取；这一思路值得借鉴。但自动注入调用 rank('')，不按当前用户问题计算相关性，类别情绪倍率对应的相关性项也为零。[提示注入](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/web-ui/organs/self-made/memory-v2.ts#L318-L349)
4. **旧式字符截短不覆盖当前结构化召回。** memory-organ 对 legacy 文本结果有约 4000 字符的共享预算；当前 memory-v2 结构化分支只审计数量并返回原文，不能据前者承诺后者已有严格 token 上限。[分支处理](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/src/organs/memory-organ.ts#L618-L686)、[字符预算](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/src/organs/memory-affinity.ts#L300-L434)

因此，LifeCore 可以参考“短索引＋按需展开”，仍由 M09 统一统计最终请求的 token，由 M04 保留来源、权限、纠错、原文回查与可恢复的冷存机制。

## 自主活动与成长

当前自动探索使用单一承诺对象，已有承诺会阻止新的探索；它没有展示我们要求的“视频活动暂停、QQ 交流、恢复同一播放器进度”的多活动检查点。这个区别说明两者的产品范围不同，不代表其自主探索实现没有价值。[调度条件](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L6063-L6108)

梦境会生成反思，再通过记忆器官写入，并记录回执及写后读回结果。我们应借鉴其区分生成、执行和保存的做法；反思属于模型推断，不能因为已经保存就晋升为经过验证的事实。[梦境执行](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L5457-L5546)、[写入读回](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/src/organs/memory-organ.ts#L413-L445)

气质参数和模拟激素主要调节当下行为表达；LifeCore 的稳定人格变化仍需独立经历、来源、反证与版本记录。项目中的能量点也不是 API 账单：v1.0.1 把默认每次请求扣能改为 0.05，并不意味着真实 token 或人民币费用降到原来的四十分之一。LifeCore 的模型预算必须单独计量。[能耗常量](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L157-L172)

## 扩展与平台能力

器官宿主提供能力声明和调用点检查；网络使用需同时满足器官能力、端点声明与宿主允许范围。这种声明与授权求交集的方式值得参考。[网络校验](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/src/organ-net.ts#L215-L269)

自写器官经源码扫描、编译后在 Harness 同一进程中 import()。项目自己也说明关键词扫描不是沙箱。LifeCore 若提供自写工具，应另做受限执行，不将这套热加载直接开放给 QQ 聊天产生的代码。[加载器](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/src/organ-loader.ts#L394-L474)、[README 边界说明](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/README.md#L2831-L2835)

自动审批的 ask 分类在相关钩子中委托 next()，并不自行保证询问；真正效果依赖 DSH 的其他策略。LifeCore 的 QQ 主体身份、任务授权与外发目的地仍需由自身权限层执行。[审批分类](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/src/auto-approve.ts#L35-L96)、[审批钩子](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/index.ts#L6414-L6432)

默认 messenger 是通用 HTTPS POST 通知器官，默认面向 PushPlus，不能当成 NapCat 普通 QQ 好友、群聊和空间接入的现成替代。[messenger 源码](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/web-ui/organs/self-made/messenger.ts)

## 建议吸收的位置

| 借鉴点 | LifeCore 模块 | 具体落点 |
| --- | --- | --- |
| 唤醒前重新检查意图，完成后撤掉旧唤醒 | M08、M02 | 每项活动使用持久状态版本和幂等标识，防止过期任务复活 |
| 记忆写入回执和读回 | M04、M13 | 区分候选生成、正式提交、索引就绪；失败可重试，来源不可丢 |
| 带时间、有效期和置信度的上下文片段 | M09 | 用于活动现场和记忆索引，统一权限过滤与 token 预算；置信度自报值不等于已校准正确率 |
| 显式状态调节表达 | M05、M07 | 情绪与稳定人格分开，状态变化保留触发经历；不直接照搬“伤痕永久化” |
| 模块能力契约与资源清理 | M12、M14 | 授权与模块声明求交集，保持执行隔离，管理订阅和定时器生命周期 |

上下文片段参考：[OrganHost 的片段处理](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/src/organ-host.ts#L547-L604)。上述是对 LifeCore 的设计建议，尚未实现或替换现有架构。

## 许可与致谢

[package.json](https://github.com/mashangshui/digital-life-core/blob/d984665ff2e452cf9f57d845cfb93bfb9a64b6b1/package.json)和 README 声明 MIT；固定提交的目录树未见独立 LICENSE/COPYING 文件。因此记录为“项目声明 MIT”，不表述为已核查完整独立许可证文本。实际复制代码前补足版权与许可文本核对。

感谢 mashangshui（温水）的 digital-life-core，以及项目署名的“鱼小水”。我们参考其自主唤醒、器官契约、上下文片段与记忆回执思路；未来发生代码复用时，还需登记具体文件、修改及许可声明。
