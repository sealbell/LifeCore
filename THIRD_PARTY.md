# Third-party components

LifeCore v0.1 uses the following packages without copying their source into this repository:

| Component | Version | License | Use |
| --- | --- | --- | --- |
| [ws](https://github.com/websockets/ws) | 8.18.3 | MIT | OneBot WebSocket transport |
| [Playwright](https://github.com/microsoft/playwright) | 1.56.1 | Apache-2.0 | Optional browser activity and UI verification |

The dependency packages retain their upstream LICENSE/NOTICE files. Playwright downloads Chromium and related tools separately; their upstream licenses apply. Python/SQLite and Node are supplied by the user's runtime, not redistributed here.

DeepSeek Harness is an externally installed host. SnowLuma is an externally installed QQ gateway, with its own license and native components; no SnowLuma or NapCat source, binaries, or account files are included. Only the OneBot 11 protocol boundary is implemented here. The local QQ protocol test server is synthetic and is not proof of real-account compatibility.

The management interface and adapter code are project code, with API usage informed by the references in [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md). No full Agent platform, memory project, model weight or third-party media asset is bundled. LifeCore's own distribution license remains the maintainer's decision; this preview does not select a new license on the maintainer's behalf.
