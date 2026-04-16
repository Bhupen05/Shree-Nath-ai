# Branching Strategy

## Long-Lived Branches
- main: production-ready code only
- dev: integration branch for upcoming release

## Short-Lived Branches
- feature/<short-name>
- fix/<short-name>
- chore/<short-name>
- docs/<short-name>
- refactor/<short-name>

## Pull Request Rules
- PR target for most work: dev
- PR to main only from dev or approved hotfix
- At least one review required
- CI must pass before merge

## Commit Message Standard
Use Conventional Commits:
- feat: add purchase bill confirmation endpoint
- fix: correct stock ledger reversal on bill cancel
- docs: update setup instructions

## Release Flow
1. Merge complete features into dev
2. Stabilize and test in dev
3. Merge dev into main with release tag
4. Deploy from main
