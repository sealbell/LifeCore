# SnowLuma 接入参考

检查日期：2026-10-29

仓库：[SnowLuma/SnowLuma](https://github.com/SnowLuma/SnowLuma)

本次固定阅读基线：`main` 的提交 [`8ffd314260e9e2b6967eeca494d87aa5be046c34`](https://github.com/SnowLuma/SnowLuma/commit/8ffd314260e9e2b6967eeca494d87aa5be046c34)，提交标题为 `chore(release): v2.2.1`。这是文档与源码阅读记录，不是 LifeCore 兼容性或真机测试结论。

## 1 在 LifeCore 中的位置

维护者明确 QQ 接入以 SnowLuma 为目标外部运行时。规划链路为 QQ ↔ SnowLuma 的 OneBot v11 接口 ↔ LifeCore QQ 适配器 ↔ 生命协调器。

SnowLuma 负责 QQ 会话与协议接入；LifeCore 自己实现适配器，管理事件入账、权限、状态及行动回执。qq-bridge 继续作为桥接和人格配置体验的参考，SurfCore 继续作为生命相关模块和 B站能力的参考。

SnowLuma 由用户自行安装和启动，不随 LifeCore 打包；其 WebUI 管理账号、连接和运行状态，LifeCore 管理出生、人格、记忆和关系。两者的页面及认证不能混用。

## 2 已核查内容

| 来源 | 观察结果及影响 |
| --- | --- |
| [README](https://github.com/SnowLuma/SnowLuma/blob/8ffd314260e9e2b6967eeca494d87aa5be046c34/README.md) | 提供 OneBot v11 动作/事件、WebSocket/HTTP、WebUI、SDK 和 MCP；WebUI 默认地址是示例，实际以部署配置为准 |
| [SDK 使用文档](https://github.com/SnowLuma/SnowLuma/blob/main/packages/sdk/README.md) | 文档说明 HTTP/WS 客户端、事件监听、超时/取消和错误模型；本项初读为可变 main 文档，版本结论以固定提交的包元数据为准 |
| [SDK 包元数据](https://github.com/SnowLuma/SnowLuma/blob/8ffd314260e9e2b6967eeca494d87aa5be046c34/packages/sdk/package.json) | 版本为 2.2.1，许可字段为 SEE LICENSE IN LICENSE；其 Node 要求需与 DSH 实际运行时核对，尚未选择为 LifeCore 依赖 |
| [WebSocket 客户端](https://github.com/SnowLuma/SnowLuma/blob/8ffd314260e9e2b6967eeca494d87aa5be046c34/packages/sdk/src/client/websocket-client.ts) | 以 echo 匹配待处理请求，拒绝同时重复的 echo；断线时拒绝待处理请求并按配置重连。echo 关联和重连不构成跨进程发送幂等保证 |
| [qq-bridge README](https://github.com/Derpyu520/qq-bridge/blob/main/README.md) | 声明使用 SnowLumaWebSocketClient，区分 OneBot WS 和 HTTP 端点；其角色文本配置与 DSH agent preset 是不同层次。该文档仍引用较早版本，不能直接沿用为当前兼容矩阵 |

阅读时发现 SDK README 的版本段仍写 0.1.0，而固定提交包元数据为 2.2.1；本记录不据 README 的版本段锁定依赖。README 链接的根目录 CONTEXT.md 在本次 main 请求中返回 404，未将其作为证据。

## 3 适配器详细设计需要核对

- 固定 SnowLuma、QQ、DSH 版本后验证私聊入站、发送回执、断线恢复与重启。
- WS 与 HTTP 地址及凭据分别配置；是否只用 WS、是否引入 SDK，后续按兼容性与许可核对决定。
- 接入时核对实际账号身份，不能因为端点发现或重连悄悄换成另一个 QQ 账号。
- 不把“连接成功”当作“QQ 接收链路正常”；健康、账号在线、实际收发应分开诊断。
- 网络中断或超时不能证明发送失败，保留 M11 的 unknown 与核对流程，不能盲目重发。
- QQ 凭据由受保护的插件配置管理，不进入人格草案、试聊或模型上下文。

## 4 许可与复用边界

[LICENSE](https://github.com/SnowLuma/SnowLuma/blob/8ffd314260e9e2b6967eeca494d87aa5be046c34/LICENSE) 明确为源码可见非商业许可，包含商业使用、修改/衍生版本公开发布及基于本软件开发其他项目的授权限制；原生附加组件另属专有组件。

因此将它列为外部运行时与接口研究对象，不等于获得复制源码、分发 SDK、发布衍生项目或重新许可的授权。当前未复制上游代码、引入依赖、打包或部署 SnowLuma。实现和发布前应核对具体使用方式与授权要求；LifeCore 拟议 MIT 许可不覆盖 SnowLuma，也不预先断言协议对接满足其全部授权要求。
