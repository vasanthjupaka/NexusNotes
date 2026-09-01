# Contributing to NexusNotes

Thank you for your interest in contributing to NexusNotes! This document
provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Security](#security)

---

## Code of Conduct

By participating in this project, you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/NexusNotes.git
   cd NexusNotes
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/NexusNotes.git
   ```
4. **Create a branch** for your work:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Development Setup

### Prerequisites

- Docker Desktop 24+
- Docker Compose v2+
- Node.js 20 LTS (for frontend development outside Docker)
- Python 3.12+ (for backend development outside Docker)
- Make

### Quick Start

```bash
# Copy environment file
cp .env.example .env

# Start the full stack (Docker)
make dev

# The application will be available at:
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000
# API Docs:  http://localhost:8000/docs
# MinIO UI:  http://localhost:9001
```

### Running Without Docker

See [docs/development.md](docs/development.md) for instructions on running
individual services locally.

---

## How to Contribute

### Bug Fixes

1. Check if the bug is already reported in [Issues](../../issues)
2. If not, create a bug report using the bug report template
3. Create a branch: `fix/issue-number-short-description`
4. Write a failing test that reproduces the bug
5. Fix the bug
6. Verify the test passes
7. Submit a pull request

### New Features

1. Open an issue to discuss the feature before implementing
2. Get feedback and approval from maintainers
3. Create a branch: `feat/feature-name`
4. Implement the feature with tests
5. Update documentation
6. Submit a pull request

### Documentation

1. Create a branch: `docs/what-you-are-documenting`
2. Make your changes
3. Submit a pull request

---

## Pull Request Process

1. **Update documentation** if you are changing behavior
2. **Write or update tests** — PRs without tests may be rejected for features
3. **Ensure all checks pass**:
   ```bash
   make lint
   make test
   make build
   ```
4. **Fill in the PR template** completely
5. **Request review** from at least one maintainer
6. **Address feedback** promptly

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add knowledge graph filtering by tag
fix: resolve autosave race condition
docs: add S3 deployment guide
chore: update dependencies
refactor: extract note service from router
test: add attachment upload tests
```

---

## Coding Standards

### Backend (Python)

- Python 3.12+
- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Use type hints everywhere
- Format with **Black** (line length: 88)
- Lint with **Ruff**
- Use **Pydantic** for data validation
- **No business logic in route handlers** — use services
- **No raw SQL** — use SQLAlchemy ORM or repositories

```bash
# Format and lint
make format
make lint
```

### Frontend (TypeScript)

- TypeScript strict mode enabled
- React functional components with hooks only
- **No `any` types** — use proper typing
- Format with **Prettier**
- Lint with **ESLint**
- **No business logic in components** — use hooks and services
- Use **Zustand** for global state
- Use **TanStack Query** for server state

```bash
# Format and lint
cd frontend
npm run lint
npm run format
```

### CSS / Styling

- **Tailwind CSS** utility classes
- **shadcn/ui** for component primitives
- Avoid inline styles
- Follow the design system defined in `frontend/src/styles/`

---

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting (no logic change)
- `refactor` — code restructuring
- `test` — adding/fixing tests
- `chore` — maintenance tasks
- `ci` — CI/CD changes
- `perf` — performance improvements
- `security` — security improvements

**Examples:**
```
feat(notes): add wiki-link autocomplete
fix(auth): resolve JWT expiry not clearing session
docs(aws): add EC2 deployment walkthrough
test(notes): add CRUD integration tests
```

---

## Reporting Bugs

Please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

Include:
- NexusNotes version
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Relevant logs (redact any credentials!)

---

## Requesting Features

Please use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

Include:
- Problem you are solving
- Proposed solution
- Alternatives you considered
- Additional context

Large features should be discussed as an issue **before** a PR is opened.

---

## Security

**Please do not report security vulnerabilities as public issues.**

Read [SECURITY.md](SECURITY.md) for the responsible disclosure process.

---

## Questions?

- Open a [GitHub Discussion](../../discussions) for questions
- Check [docs/](docs/) for documentation
- Review existing [issues](../../issues) and [PRs](../../pulls)

We appreciate every contribution, large or small. Thank you!
