# Conventions (Flask)

> Application structure, blueprints, extensions, and testing for Flask projects.

## Project layout

- `app/` — application package with `__init__.py`, `routes.py`, `models.py`, `templates/`.
- `app/__init__.py` — app factory (`create_app()`).
- `app/routes.py` — route handlers grouped by blueprint.
- `app/models.py` — SQLAlchemy or other ORM models.
- `app/extensions.py` — Flask extensions initialized here.

## Blueprints

- One blueprint per feature: `auth`, `api`, `main`.
- Register blueprints in `create_app()`.
- Blueprint-specific templates in `app/templates/<blueprint>/`.

## Configuration

- Use `config.py` with classes: `Config`, `DevelopmentConfig`, `TestingConfig`.
- Load from environment variables with `python-dotenv`.
- Set `SECRET_KEY`, `DATABASE_URL` from env.

## Extensions

- Initialize in `app/extensions.py`: `db = SQLAlchemy()`, `migrate = Migrate()`.
- Call `db.init_app(app)` in the factory function.
- Avoid circular imports by keeping extensions separate from models.

## Testing

- Use `pytest` + `pytest-flask`.
- Test client via `app.test_client()`.
- Test file: `tests/test_<module>.py`.
- Use fixtures for app setup, DB session, test data.
- Mock external APIs, not the database.

## Errors

- Register error handlers on the app: `@app.errorhandler(404)`.
- Return JSON for API routes, templates for web routes.
- Use `abort()` with proper status codes.

## Jinja2 templates

- One template per page, extend `base.html`.
- Use `{% block %}` for overrides.
- Template filters in `app/templatetools/`.

## Git

- Conventional commits: `feat(auth): add login endpoint`.
- Branch naming: `feat/blueprint-auth`, `fix/session-config`.
