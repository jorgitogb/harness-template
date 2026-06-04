# @jorgegb/harness-init

## 0.2.3

### Patch Changes

- fix: set execute permission on init.sh after writing

  Generated init.sh was missing +x permission, causing
  "permission denied: ./init.sh" on Unix systems.

## 0.2.2

### Patch Changes

- fix: include stack .gitignore templates in npm package

  npm automatically excludes all .gitignore files from published packages.
  Renamed stack template .gitignore files to .gitignore.txt so they are
  included in the tarball, and updated loadTemplate calls accordingly.

## 0.2.1

### Patch Changes

- [`5f7cbc7`](https://github.com/jorgitogb/harness-template/commit/5f7cbc79f2f2415475b91fee2cb9eac6d0f2c37c) Thanks [@jorgitogb](https://github.com/jorgitogb)! - Fix repository URL in package.json to point to correct GitHub org (jorgitogb).

## 0.2.0

### Minor Changes

- [`2292113`](https://github.com/jorgitogb/harness-template/commit/2292113948b3242f10e87b307ac880567682dc88) Thanks [@jorgitogb](https://github.com/jorgitogb)! - Initial release of harness-init CLI with opencode adapter, SDD/TDD support, learning mode, and stack detection for Python, Node, Go, Rust, and generic projects.
