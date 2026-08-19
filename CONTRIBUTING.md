# Contributing to MemoryVault Community Edition

Thanks for your interest in contributing. Please read our
[Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

## How this repository works

This repository is **exported** from a private monorepo that also contains
the MemoryVault marketing website, hosted-service billing, and other
cloud-only code that isn't open source. It isn't a manually-maintained
mirror — it's regenerated from the private repo.

That has one practical consequence: **pull requests opened here can't be
merged directly with a click.** When a PR looks good, the maintainer ports
the change into the private monorepo (by hand or via patch), tests it there,
and it ships in the next export/release — at which point it appears in this
repository's history under the maintainer's commit, with credit to you in
the PR thread and release notes. This is slower than a normal open-source
repo, but it's the tradeoff of shipping a subset of a larger private
codebase. Small, focused PRs port much more easily than large ones.

## Reporting bugs

Open a [bug report issue](../../issues/new/choose) with:

- What you expected to happen, and what happened instead
- Steps to reproduce
- Your environment (self-hosted with Docker Compose? manual setup? which
  Postgres/S3 provider?)
- Relevant logs, if any

## Suggesting features

Feature suggestions are handled on the live site, not as GitHub issues here -
submit or vote on ideas at
[memory-vault.app/en/ideas-and-issues](https://www.memory-vault.app/en/ideas-and-issues).
That board covers both the hosted product and Community Edition, so ideas
and votes aren't split across two places.

## Submitting a pull request

1. Fork the repository and create a branch from `master`.
2. Set up your local environment following the [README](./README.md)
   Quickstart or Manual Setup.
3. Make your change. Keep PRs focused — one fix or feature per PR.
4. If you changed a Payload collection or global, run:
   ```bash
   npm run generate:types
   npm run db:migrate:create
   ```
5. Run the checks before opening the PR:
   ```bash
   npm run lint
   npm run test
   ```
6. Open the PR with a clear description of the change and why it's needed.

## Development setup

See the [README](./README.md) for the Docker Compose quickstart and the
manual setup steps.

## Coding conventions

- TypeScript throughout; keep new code consistent with the style already in
  the file you're editing.
- Prefer small, reviewable diffs over large refactors.
- Add or update tests for behavior changes where practical.

## Questions

Open a [discussion](../../discussions) or an issue if anything here is
unclear.
