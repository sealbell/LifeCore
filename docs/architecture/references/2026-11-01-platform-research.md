# LifeCore 平台接入研究：QQ、微信、企业微信

研究日期：2026-11-01（Asia/Shanghai）。本文件是技术选型与验收依据，不代表适配器已经实现或平台已经通过真实账号验收。

## 结论与首发条件

首发实现 `QQOfficialAdapter`，使用 `@tencent-connect/qqbot-nodejs` 的协议层；同时建设 `WeixinClawBotAdapter`，把腾讯官方 `Tencent/openclaw-weixin` 中的登录、HTTP 协议、长轮询和媒体处理移植为 DSH 插件内部的纯传输组件。两个适配器均只向 LifeCore M10 投递事件，通过 M11 发出已经过 M12 授权的动作；不自行创建 Agent、不直接调用模型、不额外运行 OpenClaw。

这里的“首发”是实现优先级。发布时只能把通过本文验收的账号、会话类型和媒体类型标为支持。**本次未登录任何 QQ/微信/企微真实账号，未实际收发消息，微信 ClawBot 尚未做真实账号验收。** 不应把源码存在写成 LifeCore 已支持。

当前资料纠正了三个容易误用的旧结论：

- 微信已有腾讯官方 ClawBot/iLink 接入代码；“个人微信完全没有官方机器人接口”已不成立。但这不等于接管普通个人号全部好友、群聊、联系人或朋友圈。
- QQ 官方已有 `GROUP_MESSAGE_CREATE` 全量群消息事件；机器人启用“接收所有消息”后可收到非 @ 消息。不能继续把官方能力固定描述为仅 @。是否给某账号和目标群开放、是否已启用，仍须现场验收。[官方群全量事件](https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/group_message_create.html)
- QQ 新版官方文档明确列出主动消息及其频控。旧 `bot-docs` 中“2025-04-21 停用主动消息”的页面不能覆盖 2026 年新接口文档。[当前消息概述](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/overview.html)

`@tencent-connect/dsh-qqbot` 适合直接把 DSH 接到 QQ 的用户，但不应和 LifeCore 同时承担同一入口的调度。其会话管理器调用 `agents.create()`，入站调用 `record.agent.followup()`；直接并用会形成两套会话/调度/出站路径。可参考其绑定 UI 和兼容处理，不能把它当作没有业务逻辑的传输 SDK。[会话管理器](https://github.com/tencent-connect/dsh-qqbot/blob/a4a01fa9f122e187733fbd990c3d6a41e4d7e538/src/session/session-manager.ts)、[入站处理](https://github.com/tencent-connect/dsh-qqbot/blob/a4a01fa9f122e187733fbd990c3d6a41e4d7e538/src/transport/inbound.ts)

## 能力矩阵

表中“有”指本次官方文档或上游源码有证据，不等于本项目已实测。“主动”指无需绑定当前触发消息的发送，不表示绕过关系、权限、用户开关和额度。

| 路径 | 对外身份与接收范围 | 主动发送与限制 | 附件/回执 | 部署与适用性 |
| --- | --- | --- | --- | --- |
| QQ 官方 `qqbot-nodejs` | QQ 机器人应用身份；C2C、群 @、启用后的全量群消息；频道/频道私信为独立场景 | 当前文档支持主动消息；需关系、权限、拒收开关及频控通过。被动群聊 5 分钟/5 次；单聊文档主规则 60 分钟/4 次，但字段说明仍残留 5 分钟 | 图片/语音/视频/文件上传；C2C 流式，群不支持流式；成功返回平台消息 `id`，不等于用户已读 | Node ≥20、ESM，WebSocket 或 Webhook；协议层 MIT。首选 |
| QQ 官方 `dsh-qqbot` | 同上游 QQ 官方能力；额外管理 DSH Agent/session、群历史、模型、命令 | 具有自己的回复限制器和主动降级行为 | 额外包含发送文件工具、模型/会话事件转发 | Node ≥20.3，DSH/Cordis 插件，MIT；作为参考，不与 LifeCore 双调度 |
| NapCatQQ | 原生 QQ 客户端账号的 OneBot 11 桥接；非官方机器人应用路径 | 暴露普通账号的发送操作；实际关系、客户端、风控限制仍在，不等于无限主动发送 | 原生消息/媒体、OneBot 返回 `message_id`；无本次证据证明通用请求幂等 | 需 QQ 客户端/运行环境；自定义非商业、限制再分发许可；不默认打包进生产产品 |
| SnowLuma | 原生 QQ 会话转 OneBot 11；明确独立第三方、与腾讯/QQ 无授权关系 | 同普通账号路径；不能宣称无风控限制 | 文本、图像、语音、视频、文件、引用、转发；多账号独立会话/映射 | Windows/Linux/发行包；Lite/开发要求 Node 24+；非商业源码可见许可及专有 native addon；不作默认生产依赖 |
| 微信官方 ClawBot/iLink | 微信内 ClawBot 的独立机器人会话；当前官方插件 `chatTypes: ["direct"]`；不是普通微信个人号托管 | 回复使用入站 `context_token`；缺 token/过期/无入站上下文的主动发送服务端保证未证实 | 入站文本/图像/语音/文件/视频；官方出站路径实现文本、图片、视频、文件。协议含语音枚举不等于出站语音已实现；可有服务端 `message_id` | 扫码、token、HTTPS 长轮询，无需入站公网；官方代码 MIT，但现成包依赖 OpenClaw，须抽取协议实现 |
| 企业微信智能机器人 | BotID 身份；单聊与群内 @ 回调；本次官方文档未证明普通群全量旁听 | `aibot_send_msg` 可主动推送；先需用户在该会话给机器人发过消息；普通回复 24 小时窗口与主动推送应分开建模 | 支持流式、卡片及媒体；`req_id` + `errcode` 是请求 ACK，非已读凭据；`msgid` 用于入站排重 | 官方 `@wecom/aibot-node-sdk`，出站 WebSocket，BotID/Secret，无需公网回调；后续优先扩展 |
| 微信客服 | 企业客服账号对微信客户的服务会话；不是个人微信好友或普通群 | 指定接待状态；客户发消息后 48 小时内最多 5 条，续发消息重开额度 | 支持文本、媒体、文件、小程序等；发送可指定唯一 `msgid`，有异步发送失败事件 | 企业微信凭证、回调通知 + `sync_msg` 拉取；适合客服业务扩展 |
| 微信公众号/服务号 | 公众号身份；用户向公众号发送的消息和关注/菜单等事件；无普通微信群消息证据 | 被动 XML 回复；异步客服消息按交互窗口与次数限制；不能当通用无限主动 IM | 按公众号接口的媒体类别验收，不能据此承诺任意文件；入站 `MsgId` 去重 | 服务号权限、HTTPS 回调、验签/解密；适合内容/服务入口，非个人社交托管 |
| 普通个人微信全部好友/群自动化 | 本次未找到官方来源证明 ClawBot 可读取普通个人号全部好友/群或代该账号发言 | 不承诺 | 不承诺 | 不纳入首发；如以后引入第三方协议，单独评估适用许可、账号风险和部署，不继承 ClawBot 的官方属性 |

QQ SDK 证据：[协议事件转换](https://github.com/tencent-connect/qqbot-nodejs/blob/429a0f1b798f3b0fcef3679e207dbc0469a1df2d/src/protocol/gateway/event-dispatcher.ts)、[SDK README](https://github.com/tencent-connect/qqbot-nodejs/blob/429a0f1b798f3b0fcef3679e207dbc0469a1df2d/README.md)。微信范围证据：[官方 channel capabilities](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/src/channel.ts)、[官方协议说明](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/docs/protocol_zh_CN.md)。企微证据：[官方长连接文档](https://developer.work.weixin.qq.com/document/path/101463)、[官方 SDK](https://github.com/WecomTeam/aibot-node-sdk/blob/80615b987ef69c6028ad764924609247c0725955/README.md)。

## QQ 的当前限制与证据冲突

2026-11-01 直接读取新版官方页面得到：

1. 群主动消息：认证机器人维度 60/qpm，未认证 30/qpm；单群 20/qpm、每日 1000 条。群被动回复为 5 分钟、每个消息 5 次。群不支持流式。[发送群聊消息，页面更新 2026-10-28](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_messages.post.html)
2. 单聊主动消息：认证机器人维度 10/qps，未认证 5/qps 且 30/qpm；单关系 20/qpm、每日 1000 条。互动召回 `is_wakeup` 是另一种能力，不要和普通主动消息混同。[发送单聊消息，页面更新 2026-10-28](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_messages.post.html)
3. 单聊页首及概述写 60 分钟/4 次，但同页 `msg_id` 字段写 5 分钟。这是官方文档内部冲突，不应静默消除。先将窗口/额度做成可验证的账号能力配置；验收 5 分钟内、5～60 分钟、超 60 分钟及第 4/5 次回复，记录业务码与实测结果。
4. 概述说明用户可关闭主动发送。发送错误还区分无权限、无好友关系、机器人非群成员、用户拒收、禁言、消息过期、去重等。M12 不得把“SDK 有 sendProactiveMessage 方法”当成该账号任意目标可发送。
5. 全量群消息的 `author` 有 `member_openid`、角色、昵称及可能为空的跨应用 ID；这些均是平台标识，不是经 LifeCore 验证的真人身份。全量消息功能不代表历史回放、所有撤回/已读事件、任意群访问或所有账号都有此权限。[全量群事件，页面更新 2026-10-21](https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/group_message_create.html)

旧源 [bot-docs/send.md](https://github.com/tencent-connect/bot-docs/blob/main/docs/develop/api-v2/server-inter/message/send-receive/send.md) 仍可被搜索引擎检索，包含旧的停用公告与旧额度。新源码和新版官方站点已经变化，选型以新页面为当前依据，并在上线前用目标账号复核。网页会继续变化，本研究日期不构成永久配额保证。

“普通 QQ”必须区分两件事：官方机器人能进入普通 QQ 的私聊/群界面，不等于使用一个普通用户 QQ 号登录；NapCat/SnowLuma 则依托原生客户端账号。若产品要求 LifeCore 以普通账号在全部既有好友和群中活动，官方 Bot 是否满足该需求仍有身份和授权范围差异，不能只用“支持 QQ”概括。

## 微信代码复用：只复用协议，不引入第二套 Agent

建议组件边界：`WeixinClawBotAdapter`、`IlinkAuthService`、`IlinkHttpClient`、`IlinkPoller`、`IlinkMediaCodec`、`IlinkContextStore`。这些是 LifeCore 的拟议组件名，并非已经存在的实现。

- 以官方 `src/auth/login-qr.ts`、`src/api/api.ts`/`types.ts`、`src/cdn/*`、`src/media/media-download.ts` 和发送请求构造为代码/协议参考，保留 MIT 著作权与许可。[官方 LICENSE](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/LICENSE)
- 现成 npm 包 `@tencent-weixin/openclaw-weixin@2.4.10` 是 OpenClaw 插件，声明宿主依赖；直接装包不是 DSH 兼容方案。不要复用其 `processOneMessage` → OpenClaw runtime 的 Agent 调度路径。[package.json](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/package.json)
- 官方协议说明自行声明“客户端类型和行为不能代表完整的服务端契约”。类型存在 `group_id`、语音上传枚举、可选 `context_token`，均不能推导出已支持群聊、出站语音或无上下文主动发送。
- `context_token` 必须按接入账号与外部会话隔离、作为秘密材料保护。LifeCore 首发对缺失/已知失效 token 拒绝自动发送或返回待交互，不照搬官方发送器“警告后继续发送”的宽松行为。不能编造 token 有效时长；应通过真实账号验收建立边界。
- 入站 `message_id` 等 uint64 按字符串处理；不经 JavaScript Number 损失精度。官方当前 API 代码已有无损解析，移植时需保留。[API 实现](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/src/api/api.ts)
- 只把服务器返回 `message_id` 记为平台消息 ID。官方高级发送器也返回自行生成的 `clientId`；本地请求 ID 不能被包装成平台投递凭证。[发送器](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/src/messaging/send.ts)

## M10、M11、M12 必须统一承担的职责

### M10 PlatformAdapter

统一保存 `platform`、`adapter_kind`、`account_binding_id`、`conversation_kind`、`external_conversation_id`、`external_sender_id`、`external_message_id`、平台时间和接收时间、原始事件类型、附件引用、回复上下文引用。平台原始内容是外部输入，不能直接获得系统指令权限。

一个 `life_id` 可以绑定多个 QQ Bot、ClawBot 或企微账号；绑定记录各自持有凭证和场景策略。外部用户 ID、昵称、手机号外观、`union_openid` 或相同字符串都不能自动触发跨平台/跨账号身份合并。身份关联须由明确绑定流程留下证据，并可撤销。群权限与该用户私聊权限分别计算。

QQ 中间件里的 `mentionGate` 只能决定交互触发，不能在需要群环境感知时把所有非 @ 消息先丢掉。全量事件是否入库、是否进入上下文、是否唤醒、是否允许出声应由不同的明确策略决定。所有允许的事件先可靠入站，再由唯一 LifeCore 调度器决定处理方式。

### M11 Outbox 与回执

内部 action、出站消息分片、平台请求和回执建立持久化映射。状态至少区分 `prepared`、`sending`、`accepted`、`failed`、`unknown`；只有平台真的提供并验证时才使用 `delivered`/`read`。网络超时不能直接等同发送失败，也不能因本地函数返回字符串就认定已投递。

| 平台/组件 | 本次发现 | M11 处理要求 |
| --- | --- | --- |
| QQ `MessageApi.sendMessage` | 每次调用通过 `getNextMsgSeq()` 生成序号；当前实现为时间与随机数，不是持久化递增序号 | 同一逻辑发送先持久化固定 `msg_id`/`msg_seq` 与请求体，再用协议 `ApiClient.request` 发送，或对上游新增显式序号入口。不可在外层重试时重新调用高级发送器生成新序号 |
| QQ 服务端 | 同一 `msg_id + msg_seq` 重发会被去重拒绝 | 重复拒绝不是“可改 seq 再发”的指令；这可能制造重复。收到去重错误又没有首次成功回执时，保留已接受但凭据不全/unknown 状态，按可核对证据收敛 |
| QQ SDK 重试 | 低层 `ApiClient.request` 本身是单次请求；`retry.ts`/媒体上传有专门重试策略，部分分片确认持续重试 | 不概括成“SDK所有发送自动重试”；逐条审计调用链，只保留一个业务发送重试拥有者，上传重试与最终发消息重试分开记账 |
| iLink | 高级文本发送器每次新建 `client_id`；官方协议没有给出完整服务器幂等保证 | Outbox 固定 `client_id`，使用低层构造发送；即使复用该 ID，也不能宣称 exactly-once。超时未知状态不可换新 ID 无条件重发 |
| iLink monitor | 当前代码先保存新 `get_updates_buf`，再逐条处理消息 | 不能原样复制进可靠入口；应先将整批事件写入 durable inbox，与游标推进同事务，再异步调度。否则崩溃可能跳过尚未接收的消息 |
| 企微 SDK | `req_id` 关联 ACK；同 ID 回复串行排队，超时 reject 后继续下一条；媒体分片另有重试 | ACK 延迟≠服务端未发送；`req_id` 不是官方承诺的幂等键。记录请求与 ACK，超时 unknown；验证延迟 ACK、断线、同 req_id 连续流式更新行为 |
| 微信客服 | 可自定义客服账号内唯一 `msgid`，重复 ID 返回错误；另有 `msg_send_fail` | 固定 `msgid`，关联同步结果与异步失败事件，不把同步成功当最终投递成功 |

固定证据：[QQ 序号生成](https://github.com/tencent-connect/qqbot-nodejs/blob/429a0f1b798f3b0fcef3679e207dbc0469a1df2d/src/protocol/api/routes.ts)、[QQ MessageApi](https://github.com/tencent-connect/qqbot-nodejs/blob/429a0f1b798f3b0fcef3679e207dbc0469a1df2d/src/protocol/api/messages.ts)、[QQ API client](https://github.com/tencent-connect/qqbot-nodejs/blob/429a0f1b798f3b0fcef3679e207dbc0469a1df2d/src/protocol/api/api-client.ts)、[QQ retry](https://github.com/tencent-connect/qqbot-nodejs/blob/429a0f1b798f3b0fcef3679e207dbc0469a1df2d/src/protocol/api/retry.ts)、[iLink monitor](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/src/monitor/monitor.ts)、[企微 ACK 队列](https://github.com/WecomTeam/aibot-node-sdk/blob/80615b987ef69c6028ad764924609247c0725955/src/ws.ts)。

### M12 Policy

政策应显式区分用户/群授权、收取范围、触发范围、主动发言、媒体类型、配额、回复有效期、用户拒收、机器人禁言/被移除与凭证失效。出站执行前重新核对当前绑定和策略版本；不能让旧 Outbox 绕过后来撤销的权限。平台拒绝不自动改发其他账号或其他会话。

附件统一进行大小/MIME/下载域名与地址范围校验、受控缓存、路径边界、有效期检查；媒体上传凭据按账号和私聊/群场景隔离。QQ 官方明确单聊与群上传接口不互通。下载 URL、AES key、context token 和会话鉴权字段不可流入普通日志或成为模型自由选择的出站凭证。

## 企业微信、客服、公众号的扩展顺序

1. **企业微信智能机器人**：优先扩展 `WecomAibotAdapter`，复用官方 `@wecom/aibot-node-sdk`。最新长连接文档明确单聊/群 @、先互动后主动推送、30 条/分钟及 1000 条/小时的会话总频控；普通回复 24 小时、流式刷新 10 分钟。不要沿用旧文章的“全部回复只有 5 秒”或“流式固定 6 分钟”。欢迎语/卡片更新等特殊响应仍按各自时限。用户 ID 还可能是企业主体下加密 ID，不能假定始终是管理员看到的明文 userid。[官方长连接文档](https://developer.work.weixin.qq.com/document/path/101463)
2. **微信客服**：实现 `WechatCustomerServiceAdapter`，独立建模 `open_kfid`、`external_userid`、接待状态和客服窗口；通知后拉取、保存游标并处理 `has_more`，空消息列表不代表没有更多数据。同步发送及失败事件共同更新 M11。[发送消息](https://developer.work.weixin.qq.com/document/path/94677)、[接收消息和事件](https://developer.work.weixin.qq.com/document/path/94670)
3. **服务号**：实现 `WechatOfficialAccountAdapter`。回调先可靠接收并及时 ACK，异步推理结果按客服消息权限发回。当前官方服务号规则为用户发消息触发 48 小时/5 条，关注、扫码、菜单等有独立短窗口与额度，不能统一套 48 小时。无需复制整套第三方聊天框架。[客服消息介绍](https://developers.weixin.qq.com/doc/service/guide/product/kf/intro.html)、[被动回复与重试规则](https://developers.weixin.qq.com/doc/service/guide/product/message/Passive_user_reply_message.html)
4. **普通 QQ 第三方桥**：若明确需要原生账号身份，保留 `OneBot11Adapter` 扩展口，但 NapCat/SnowLuma 应是显式选装、隔离进程、按目标版本验收的外部依赖；本次不建议复制/捆绑其代码进入可商用产品。协议兼容不等于其所有扩展、媒体和发送回执可以互换。

企业微信群的“消息推送（原群机器人）”Webhook、智能机器人、企业自建应用、微信客服是不同产品面，不能把一个入口的发送能力推导成另一个入口的全群接收权限。企业会话存档也不能直接当成机器人发送授权。

## 固定版本、维护和许可证据

以下为本次通过 GitHub connector 读取的默认分支 HEAD；版本号来自该 commit 的 package.json，不保证与 npm latest 完全相同。上线应锁发布包版本、完整性和已审计源码对应关系。

| 组件 | 完整 commit SHA | 快照版本/维护信息 | 许可依据 |
| --- | --- | --- | --- |
| `tencent-connect/qqbot-nodejs` | `429a0f1b798f3b0fcef3679e207dbc0469a1df2d` | package 1.0.5；仓库 pushed_at 2026-10-12 | [MIT](https://github.com/tencent-connect/qqbot-nodejs/blob/429a0f1b798f3b0fcef3679e207dbc0469a1df2d/LICENSE) |
| `tencent-connect/dsh-qqbot` | `a4a01fa9f122e187733fbd990c3d6a41e4d7e538` | package 0.5.5；pushed_at 2026-10-30；声明验证 DSH 0.1.0-rc.8/0.2.0-rc.2 | [MIT](https://github.com/tencent-connect/dsh-qqbot/blob/a4a01fa9f122e187733fbd990c3d6a41e4d7e538/LICENSE) |
| `Tencent/openclaw-weixin` | `874637a0dbc24050f72d1385add4fc6170a2d726` | package 2.4.10；pushed_at 2026-10-13；Node ≥22.13；宿主 peer ≥2026.5.12 | [MIT 正文](https://github.com/Tencent/openclaw-weixin/blob/874637a0dbc24050f72d1385add4fc6170a2d726/LICENSE)；GitHub 元数据 Other 不是实际条款 |
| `WecomTeam/aibot-node-sdk` | `80615b987ef69c6028ad764924609247c0725955` | main commit 日期 2026-04-07；package 1.0.6，npm 页面显示 1.0.7，发布产物差异尚未审计 | [仓库 package.json: MIT](https://github.com/WecomTeam/aibot-node-sdk/blob/80615b987ef69c6028ad764924609247c0725955/package.json) |
| `NapNeko/NapCatQQ` | `98d781d19815d1625b24d717ce280ecf0a4f6d0c` | pushed_at 2026-10-30；活跃提交不等于官方 SLA | [Limited Redistribution License for NapCat](https://github.com/NapNeko/NapCatQQ/blob/98d781d19815d1625b24d717ce280ecf0a4f6d0c/LICENSE)；明确禁止商业用途，修改/再分发受限 |
| `SnowLuma/SnowLuma` | `c120b0fb9790a3b41a18f4acfdb49f7f5b02022e` | pushed_at 2026-10-31；Node 24+；SDK/MCP/多账号能力见 README | [源码可见非商业许可](https://github.com/SnowLuma/SnowLuma/blob/c120b0fb9790a3b41a18f4acfdb49f7f5b02022e/LICENSE)，商业及公开衍生版本需书面授权；native addon 专有 |

[SnowLuma 运行与第三方属性说明](https://github.com/SnowLuma/SnowLuma/blob/c120b0fb9790a3b41a18f4acfdb49f7f5b02022e/README.md)。上表对许可仅摘录仓库明示约束；依赖/发行包还须按实际发布组合保留各自声明，不能因 OneBot 协议公开就推导实现许可宽松。

## 发布前验收与本次证据边界

本次完成：当前官方网页读取、GitHub 源码/许可证/元数据检查；没有安装上述包，没有运行其测试，没有进行身份登录、扫码或线上发消息。部分官方网页无法由 web 工具展开，本次使用 HTTPS `Invoke-WebRequest` 直接取得官方 HTML 并读取正文；以上链接均为该官方地址。GitHub 查询优先使用已连接 GitHub connector。

发布门槛：

- QQ：真实机器人应用的私聊、群 @、启用/关闭全量群事件、主动开关/拒收、退出群与禁言；验证身份字段、附件、流式只在 C2C 使用、被动窗口冲突及配额错误。
- 微信：真实账号扫码/解绑/重新绑定、专属 ClawBot 会话可达、文本和每种宣称支持的媒体双向验收、缺 token/旧 token、重启后上下文恢复、多账号隔离。官方 types 里的群字段不能替代真实群验收。
- 可靠性：回调重复、断线恢复、批量收取中途崩溃、Inbox 提交前后崩溃、发送前后崩溃、响应丢失、重复请求、延迟 ACK、媒体过期/部分上传失败；同时检查消息不能重复触发第二套 Agent。
- 权限：同一 `life_id` 多账号共享核心但不共享默认场景权限；不同平台相同外部 ID 不合并；私聊工具/记忆不能自动泄露到群；撤销权限后积压 Outbox 不执行。
- 状态标注：实现前为 `planned`，协议模拟测试通过为 `contract-tested`，目标账号真实收发验收通过才为 `account-verified`；不能用单一全局 `supported=true` 表示所有账号、场景和附件类型。

本文件推荐官方 QQ 与微信 ClawBot 的协议接入路径，不承诺平台持续提供某项能力、普通账号风控豁免、消息 exactly-once、任意群全量监听或用户已读回执。
