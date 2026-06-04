# Conventions (Django)

> Project structure, models, views, templates, and testing for Django projects.

## Project layout

- `config/` — project settings, urls.py, wsgi.py.
- `apps/` — one directory per Django app (`users/`, `blog/`).
- Each app: `models.py`, `views.py`, `urls.py`, `serializers.py`, `tests/`.
- `templates/` — project-level templates, namespaced per app.
- `static/` — collected static files.

## Models

- One model per file when models are large.
- Use `ForeignKey` with `on_delete` explicitly set.
- Add `__str__` and `Meta` to every model.
- Migrations for every model change — never skip.
- Use `related_name` on relations for clarity.

## Views

- Prefer class-based views (CBVs) for standard CRUD.
- Use function-based views for simple or one-off endpoints.
- Keep views thin — delegate business logic to services or models.
- Use `select_related` / `prefetch_related` to avoid N+1 queries.

## URLs

- One `urls.py` per app, included in the project root.
- Use `path()` with named patterns: `path("users/", include("apps.users.urls"))`.
- Name every URL pattern for reverse lookups.

## Templates

- Use template inheritance: `base.html` → `page.html`.
- One block per child template override.
- Template tags/filters in `templatetags/` directory.

## Testing

- Use `django.test.TestCase` for DB tests (wrapped in transactions).
- Use `pytest-django` as the runner.
- Test file: `tests/test_<module>.py`.
- Factory Boy for test data.
- Use `Client` for view tests, `APIClient` for API tests.

## Settings

- Split settings: `base.py`, `production.py`, `local.py`.
- Use `django-environ` or `python-decouple` for secrets.
- `ALLOWED_HOSTS`, `DEBUG`, `SECRET_KEY` from environment.

## Git

- Conventional commits: `feat(blog): add post model`.
- Branch naming: `feat/user-model`, `fix/migration-0003`.
