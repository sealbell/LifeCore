# LifeCore

**I want to give her a whole life.**

A DeepSeek Harness plugin for persistent identity, memory, and gradual personality growth.

[中文](README.md) · [Architecture V1 (Chinese)](docs/architecture/v1.md) · [Module discussion guide (Chinese)](docs/architecture/discussions.md) · [Project design (Chinese)](docs/project-design.md) · [References and acknowledgements (Chinese)](ACKNOWLEDGEMENTS.md)

Planning references (Chinese): [first-release requirements for all 15 modules](docs/requirements/v1-requirements.md), [architecture and data flows](docs/architecture/v1-data-flow.md), and [overview image](docs/architecture/assets/v1-architecture-overview.png). Release scope and technical choices remain under discussion.

Current design discussion (2026-11-02): [baseline, responsibilities, and open decisions (Chinese)](docs/superpowers/specs/2026-11-02-design-baseline-and-responsibilities.md) and [DSH plugin reuse evidence (Chinese)](docs/architecture/references/2026-11-02-dsh-plugin-reuse.md). The current phase clarifies the complete behavior, module boundaries, and reuse options before further implementation. These drafts do not approve a new architecture or plugin selection.

Architecture detail: [execution contexts and data ownership for one life (Chinese)](docs/superpowers/specs/2026-11-02-runtime-and-data-ownership.md). This proposal separates LifeCore rules, DSH execution, plugin capabilities, and scene/task data boundaries; it awaits review.

Shared contracts: [birth, event intake, execution binding, authorization, action receipts, and recovery (Chinese)](docs/superpowers/specs/2026-11-02-common-contracts.md), with [failure acceptance cases (Chinese)](docs/superpowers/specs/2026-11-02-common-contracts-acceptance.md). These define proposed commit and recovery boundaries, not implemented behavior.

Memory and context comparison: [LivingMemory, SeekMemory, PLUR, and DSH against the contracts (Chinese)](docs/superpowers/specs/2026-11-02-memory-context-reuse-design.md), with [pinned source evidence (Chinese)](docs/architecture/references/2026-11-02-memory-context-evidence.md). Reusable mechanisms, adaptation work, known conflicts, and unverified requirements are separated. No backend has been selected or installed.

Memory adapter detail: [source revisions, access, idempotent writes, deletion, recovery, and exports (Chinese)](docs/superpowers/specs/2026-11-02-memory-adapter-contracts.md), with a [candidate change map (Chinese)](docs/superpowers/specs/2026-11-02-memory-adapter-change-map.md). These proposals define fields, commit boundaries, migration flows, and sixteen unexecuted acceptance cases.

Memory route recommendation: [SeekMemory services versus PLUR retrieval components (Chinese)](docs/superpowers/specs/2026-11-02-memory-route-selection-design.md). Compares minimal integration, custom work, and maintenance. Recommends controlled SeekMemory candidate processing with a Chinese semantic retrieval addition; PLUR remains the alternative. This is an unapproved design recommendation, not an implementation.

Memory integration detail: [component dependencies, commit boundaries, and acceptance gates (Chinese)](docs/superpowers/specs/2026-11-02-memory-integration-boundaries-design.md), with [November 2 progress by module (Chinese)](docs/architecture/2026-11-02-design-progress.md). The current memory design deliverables are documented; life/growth, capabilities/experience, and full-system design review remain. Product implementation has not started for these proposals.

Previous integrated proposal: [complete project design and pre-development review (Chinese)](docs/superpowers/specs/2026-11-01-lifecore-complete-design.md). It consolidates autonomous activities, QQ work tasks, memory, context handoff, cost scheduling, the memory graph UI, components, and acceptance criteria. It remains a proposal for review; earlier documents retain their historical context.

## Purpose

LifeCore explores how an AI character can carry an identity and a personal history across conversations, model changes, and platforms. Experiences should leave traceable effects, while personality changes gradually with historical inertia.

The first intended character is 大肥鱼 (Big Fish).

## Delivery

LifeCore is a **DeepSeek Harness (DSH) plugin system**. Its life-state module runs inside the plugin, and persistent data survives plugin reloads and host restarts. No separate LifeCore server is required.

Planned capabilities include birth profiles, event memory, relationships, simulated emotion, evidence-based personality evolution, QQ/Bilibili connections, privacy boundaries, and backup and recovery.

Users install DSH, a compatible QQ gateway, and other external software themselves. These programs, model weights, credentials, and personal data are not bundled. The plugin may include its own connection code and helper scripts. It stops when DSH stops and restores saved state on restart.

## Status

**Runnable v0.1.0-alpha.1 preview code is available.** The confirmed route is DSH with SnowLuma for an ordinary QQ account. See the [quickstart (Chinese)](docs/v0.1-quickstart.md). Durable birth, isolated trial chat, event records, component settings, and browser progress foundations are implemented. Real model calls, real QQ messaging and live video sites still need acceptance testing; the full architecture remains a roadmap.

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

## References and acknowledgements

We thank the developers, researchers, contributors, and maintainers whose public work has informed LifeCore. [References and acknowledgements (Chinese)](ACKNOWLEDGEMENTS.md) records the sources, specific influences, reviewed versions, and adoption status. New references should be added as they are considered; actual code, model, or asset reuse must retain the applicable attribution and license notices.

## License

An open-source license has not been selected yet. This repository currently has no LICENSE file. Any reused third-party code must comply with its own license.
