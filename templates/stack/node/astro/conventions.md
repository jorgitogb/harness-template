# Conventions (Astro)

> Component patterns, islands, content collections, routing, and testing for Astro projects.

## File types

- `.astro` — UI components with frontmatter + template + scoped styles.
- `.md` / `.mdx` — Content files (posts, docs) in `src/content/`.
- `.ts` / `.js` — Utilities, helpers, server-side logic only.

## Component structure

- One component per file, file named after the component in `PascalCase.astro`.
- Place components in `src/components/`.
- Co-locate related styles in the same `.astro` file's `<style>` block.

## Frontmatter

- The `---` block runs at build time — server-side only by default.
- Use `Astro.props` to receive props from parent components.
- Import other components in frontmatter: `import Card from './Card.astro'`.
- Use `Astro.glob()` or `getCollection()` for content queries in frontmatter.

## Islands and client directives

- Astro components are static HTML by default — zero JS shipped.
- Add interactivity with `client:*` directives on framework components:
  - `client:load` — hydrate immediately.
  - `client:idle` — hydrate when browser is idle.
  - `client:visible` — hydrate when scrolled into view.
  - `client:media` — hydrate when a CSS media query matches.
- Use React, Vue, Svelte, or Solid components inside `.astro` files.

## Routing

- File-based routing in `src/pages/`.
- `[slug].astro` for dynamic routes, `[...slug].astro` for catch-all.
- `getStaticPaths()` returns the list of static paths for SSG.
- Use `Astro.url` and `Astro.request` in server mode.

## Content Collections

- Store content in `src/content/<collection>/`.
- Define schemas with `defineCollection` + Zod in `src/content/config.ts`.
- Query with `getCollection('blog')` or `getEntry('blog', 'my-post')`.
- Render with the Content component.

## Layouts

- Place reusable page layouts in `src/layouts/`.
- Layout wraps page content and provides head, body, nav, footer.
- Pass slot for page-specific content.

## Images

- Use Image from `astro:assets` for optimized images.
- Picture for responsive picture elements.
- Place static images in `public/` or import from `src/assets/`.
- Avoid raw img tags — Astro optimizes automatically.

## Styling

- style in .astro files is scoped by default.
- Tailwind CSS via `@astrojs/tailwind` integration.
- Global styles: use style is:global sparingly.
- CSS custom properties for theming in :root.

## Testing

- Run `astro check` for type checking the full project.
- Use `vitest` for unit/logic tests (not `.astro` component tests).
- Place tests in `src/__tests__/` or `*.test.ts` next to the source.
- E2E: Playwright with `astro build && astro preview`.

## Performance

- Static output (`output: 'static'`) for maximum performance.
- Server output (`output: 'server'`) for dynamic routes.
- Use `transition:animate` for view transitions between pages.
- Lazy-load below-the-fold content with `client:visible`.

## Git

- Conventional commits: `feat(blog): add new post`.
- Branch naming: `feat/content-collection`, `fix/routing-slug`.
