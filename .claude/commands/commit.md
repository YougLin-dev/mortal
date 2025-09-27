---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## NOTE

- Conventional commit format: Use the format <type>: <description> where type is one of:
  - feat: A new feature
  - fix: A bug fix
  - docs: Documentation changes
  - style: Code style changes (formatting, etc)
  - refactor: Code changes that neither fix bugs nor add features
  - perf: Performance improvements
  - test: Adding or fixing tests
  - chore: Changes to the build process, tools, etc.
  - ci: CI/CD improvements
- revert: Reverting changes
- Present tense, imperative mood: Write commit messages as commands (e.g., "add feature" not "added feature")
- Concise first line: Keep the first line under 72 characters

## Your task

Based on the above changes, create a single git commit.
