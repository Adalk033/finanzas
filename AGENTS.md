# Finanzas Lit

Desktop personal finance application built with Electron, React, TypeScript,
and Vite. It is a single-user application and stores all information in SQLite
on the local machine.

## Architecture

- The React renderer presents data and captures forms.
- The preload exposes a minimal, typed bridge.
- The main process validates inputs, applies financial rules, and accesses
  `better-sqlite3`.
- `electron/local-db.ts` initializes the schema and connection.
- `electron/local-service.ts` contains validation, queries, and business rules.
- `src/api/client.ts` preserves a uniform interface for controllers, but sends
  operations exclusively through IPC.
- The network is not used to read or write financial information.

## Stack and constraints

- pnpm is the only package manager allowed in this project.
- For project commands, use only `pnpm run <script>` and `pnpm exec <command>`.
- Do not run `pnpm install`; dependency installation or synchronization is always the user's responsibility.
- Do not run `npm`, `npx`, or `yarn`, and do not generate lockfiles for other
  package managers.
- Keep `ignoreScripts: true` in `pnpm-workspace.yaml`: no dependency may automatically run `preinstall`, `install`, or `postinstall`.
- Keep `verifyDepsBeforeRun: error`: `pnpm run` and `pnpm exec` must fail if
  dependencies are out of date and must never trigger an implicit installation.
- Do not add automatic lifecycle scripts to the project or approve builds with
  `allowBuilds`, `onlyBuiltDependencies`, or
  `dangerouslyAllowAllBuilds`.
- Electron rebuilding may only be started manually with
  `pnpm run rebuild:native` and with the user's explicit authorization.
- Use React with functional components and hooks.
- Use TypeScript in strict mode.
- Use native CSS with BEM and tokens from `src/styles/variables.css`.
- Use Recharts for charts and Lucide for icons.
- Use SQLite through `better-sqlite3`.
- Do not add libraries, CSS frameworks, ORMs, HTTP clients, or state managers
  without explicit authorization.

## Conventions

- Identifiers and code comments are in English; the interface is in Spanish.
- Components and types use PascalCase; functions and variables use camelCase.
- SQLite tables and columns use snake_case.
- Components use named exports.
- One primary responsibility per file.
- Do not use inline styles except for genuinely dynamic values.
- Format interface amounts with
  `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.

## Financial rules

- Amounts are stored in SQLite as integer cents.
- Values crossing the bridge use `number` and are converted to cents only in the
  main process.
- Every operation affecting balances must be atomic.
- An expense reduces an account balance or increases credit-card debt.
- Income increases an account balance.
- Payments and movements between financial instruments are transfers.
- MSI applies only to credit-card purchases with 3, 6, 9, 12, 18, or 24 months.
- MSI, amortization, balance, budget, statement, and simulation calculations
  occur in the main process, never in the renderer.

## SQLite

- Always enable foreign keys and WAL mode.
- Use prepared statements and parameters for all values.
- Do not interpolate user input into SQL.
- Internal dynamic names must pass through an allowlist.
- Maintain indexes for frequent filters and relationships.
- Close the connection when the application shuts down.
- The database file must have restrictive permissions for the current user.

## IPC and Electron

- `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, and
  `sandbox: true` are mandatory.
- The renderer cannot access Node.js, SQLite, `fs`, `child_process`, or system
  APIs.
- Expose only necessary channels, defined as constants.
- Treat every IPC argument as untrusted input.
- Validate types, ranges, lengths, dates, enumerations, and relationships before
  executing a query.
- Maintain a restrictive content security policy.

## Error handling

- All data operations must return
  `{ success: boolean, data?: T, error?: string }`.
- Show errors to the user; never fail silently.
- Do not expose SQL, internal paths, stack traces, or system details.
- Log only technical context that does not contain sensitive financial data.

## Quality

- Do not refactor areas unrelated to the request.
- Do not add unrequested functionality.
- Avoid overengineering.
- Comments explain why, not what is obvious.
- Run `pnpm run check` when finished.
- `pnpm run test:local` must validate operations and balances against a temporary
  database.

## Mandatory security analysis

After every implementation, verify:

- Prepared statements and no interpolation of user input into SQL.
- Complete validation in the main process.
- Minimal IPC channels and validated arguments.
- Electron protections remain intact.
- Financial calculations remain outside the renderer.
- Errors contain no internal details.
- No new unauthorized dependencies.
- Dependency installation scripts are blocked by pnpm.
- No network communication for financial data.


## Rules
- Don't run `pnpm run check`
