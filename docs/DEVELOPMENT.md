# Development Guide

This document describes the development principles of the Workout Community Portal.

---

1. Project Structure

The repository is organized as a monorepo.

```
apps/
    backend/
    frontend/

docs/

infrastructure/
```

---

2. Git Workflow

- The `main` branch is always stable.
- New work is developed in feature branches.
- Changes are merged into `main` using Pull Requests.

---

3. Commit Convention

We use Conventional Commits.

Examples:

- feat(auth): add registration
- feat(events): create QR check-in
- fix(profile): correct rank calculation
- docs: update TDD
- refactor(workouts): simplify parser
- chore: update dependencies

---


4. Branch Naming

Examples:

feature/auth

feature/profile

feature/events

feature/programs

fix/login

docs/update-readme

---

5. Coding Standards

General principles:

- Keep code simple.
- Prefer readability over cleverness.
- Avoid premature optimization.
- Small functions are preferred.
- Business logic should be separated from presentation.

---

6. Technology Stack

Frontend

- React
- TypeScript
- Vite

Backend

- FastAPI
- SQLModel

Database

- SQLite (development)
- PostgreSQL (production)

---

7. Development Principles

- Build the MVP first.
- Avoid unnecessary complexity.
- Every feature should provide value to the community.
- Documentation evolves together with the code.
- Decisions should support long-term maintainability.