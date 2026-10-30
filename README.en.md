# LifeCore

**I want to give her a whole life.**

A DeepSeek Harness plugin for persistent identity, memory, and gradual personality growth.

[中文](README.md) · [Architecture V1 (Chinese)](docs/architecture/v1.md) · [Module discussion guide (Chinese)](docs/architecture/discussions.md) · [Project design (Chinese)](docs/project-design.md)

Planning references (Chinese): [first-release requirements for all 15 modules](docs/requirements/v1-requirements.md), [architecture and data flows](docs/architecture/v1-data-flow.md), and [overview image](docs/architecture/assets/v1-architecture-overview.png). Release scope and technical choices remain under discussion.

## Purpose

LifeCore explores how an AI character can carry an identity and a personal history across conversations, model changes, and platforms. Experiences should leave traceable effects, while personality changes gradually with historical inertia.

The first intended character is 大肥鱼 (Big Fish).

## Delivery

LifeCore is a **DeepSeek Harness (DSH) plugin system**. Its life-state module runs inside the plugin, and persistent data survives plugin reloads and host restarts. No separate LifeCore server is required.

Planned capabilities include birth profiles, event memory, relationships, simulated emotion, evidence-based personality evolution, QQ/Bilibili connections, privacy boundaries, and backup and recovery.

Users install DSH, a compatible QQ gateway, and other external software themselves. These programs, model weights, credentials, and personal data are not bundled. The plugin may include its own connection code and helper scripts. It stops when DSH stops and restores saved state on restart.

## Status

**Design and documentation only. There is no runnable plugin release yet.**

The 2026-10-30 [memory architecture proposal (Chinese)](docs/architecture/modules/M04-M09-memory-system.md) connects durable events, memory processing and retrieval, context assembly, and DSH replies. It includes a [research/source register](docs/architecture/references/memory-research.md) and [evaluation specification](docs/architecture/modules/M04-M09-memory-evaluation.md). These are proposed designs, not implemented capabilities.

Architecture V1 documents 15 modules, their responsibilities, proposed approaches, boundaries, and reference implementations. Detailed module design will continue in separate conversations using the linked discussion guide. V1 is an architecture baseline, not a software release.

The first milestone is a plugin that loads in DSH, creates one persistent identity, and restores it after reload or restart. A controlled QQ private-chat loop with basic memory follows, then relationships, emotion, personality evolution, group chat, Bilibili, and autonomous activities. Privacy, persistence, and pause controls are required from the first working loop.

## Principles

- One persistent identity, separate conversation contexts and permissions.
- Short-term emotion is distinct from long-term personality.
- Models propose interpretations; deterministic rules validate state changes.
- Memories retain provenance and access rules.
- Upgrades and model changes do not silently reset identity.

Life and emotion describe the project's aspiration and behavioral models, not a claim of verified subjective consciousness.

## Contributing and data

Design feedback and synthetic test scenarios are welcome. Do not commit real conversations, life databases, credentials, cookies, or backups. Review staged content even when ignore rules are present.

## License

An open-source license has not been selected yet. This repository currently has no LICENSE file. Any reused third-party code must comply with its own license.
