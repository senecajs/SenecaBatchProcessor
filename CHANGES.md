# Changes

## 0.4.0 2026-11-22

First entry of this change log. Earlier versions are on npm and in the git
history.

- Seneca 4: the peer dependency is `seneca` `^4.0.0` (was
  `>=3||>=4.0.0-rc2`). Seneca 3 users stay on `@seneca/batch-processor@0.3`.
- Node.js 24 or later (`engines.node` `>=24`, was `>=14`).
- The peer dependencies `gubu`, `seneca-entity` and `@seneca/entity-util` are
  removed. The plugin does not use entities; the tests load `@seneca/entity`
  and `@seneca/entity-util` as development dependencies.
- The type check of a message field reference such as
  `'ctx~place.order~Number'` uses the validator that Seneca provides
  (`seneca.valid`) instead of the `gubu` package (B1). Its behaviour is
  unchanged.
- Removed an unused read of the deprecated `seneca.util.deepextend` (D2).
- The tests load plugins by their full names, such as `@seneca/entity` (B14),
  and no longer use `promisify` (D4). They use `@seneca/batch-monitor`
  `^0.1.0`.
- `prepublishOnly` runs the build. `repository.url` uses `git+https`, and
  `publishConfig.access` is `public`.
- The README describes the plugin and gives a Seneca 4 install line.
