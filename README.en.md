# LifeCore

**I want to give her a whole life.**

A DeepSeek Harness plugin for persistent identity, memory, and gradual personality growth.

[中文](README.md) · [Project design (Chinese)](docs/project-design.md)

## Purpose

LifeCore explores how an AI character can carry an identity and a personal history across conversations, model changes, and platforms. Experiences should leave traceable effects, while personality changes gradually with historical inertia.

The first intended character is 大肥鱼 (Big Fish).

## Delivery

LifeCore is a **DeepSeek Harness (DSH) plugin system**. Its life-state module runs inside the plugin, and persistent data survives plugin reloads and host restarts. No separate LifeCore server is required.

Planned capabilities include birth profiles, event memory, relationships, simulated emotion, evidence-based personality evolution, QQ/Bilibili connections, privacy boundaries, and backup and recovery.

Users install DSH, a compatible QQ gateway, and other external software themselves. These programs, model weights, credentials, and personal data are not bundled. The plugin may include its own connection code and helper scripts. It stops when DSH stops and restores saved state on restart.

## Status

**Design and documentation only. There is no runnable plugin release yet.**

The first milestone is a plugin that loads in DSH, creates one persistent identity, and restores it after reload or restart. Memory and growth validation come next, followed by controlled platform integration.

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
