# Conventions (FastAPI)

> API patterns, dependency injection, Pydantic models, and testing for FastAPI projects.

## Project layout

- `app/` — application package with `__init__.py`, `main.py`, `api/`, `core/`, `models/`, `schemas/`.
- `app/main.py` — FastAPI app instance and lifespan.
- `app/api/` — route modules grouped by domain (`users.py`, `items.py`).
- `app/core/` — config, security, dependencies.
- `app/models/` — SQLAlchemy or Tortoise ORM models.
- `app/schemas/` — Pydantic request/response models.

## Routing

- One router per domain file in `app/api/`.
- Use `APIRouter` with prefix and tags: `router = APIRouter(prefix="/users", tags=["users"])`.
- Dependency injection via `Depends()` — never instantiate services inside route handlers.
- Use `app.include_router()` in `main.py`.

## Pydantic models

- Separate schemas for request, response, and internal use.
- Use `model_config = ConfigDict(from_attributes=True)` for ORM mode.
- Validate with `Field(...)` constraints, not manual checks.
- Reuse common fields via mixins or base models.

## Async

- Route handlers are `async def` by default.
- Use `def` only for CPU-bound or blocking I/O operations.
- Database sessions via async drivers (asyncpg, asyncmy).
- Background tasks via `BackgroundTasks` or Celery.

## Dependency injection

- Define dependencies in `app/core/deps.py`.
- Use `yield` deps for resources that need cleanup (DB sessions).
- Override deps in tests with `app.dependency_overrides`.

## Testing

- Use `httpx.AsyncClient` with `app` for async tests.
- Fixture for test database session, override the DB dependency.
- Test file: `tests/test_<module>.py`.
- Use `pytest-asyncio` for async tests.
- Mock external services, not the database.

## Errors

- Use `HTTPException` with proper status codes.
- Custom exception handlers registered on the app.
- Validation errors returned automatically by Pydantic.

## Git

- Conventional commits: `feat(api): add user endpoint`.
- Branch naming: `feat/user-auth`, `fix/db-session`.
