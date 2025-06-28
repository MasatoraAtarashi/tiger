# Tiger Repository Analysis

## Build, Lint, and Test Commands
### Build
- **Build Command:** `npm run build`
- Found in: `/package.json`, `/settings.local.json`.

### Test
- **Test Command:** `npm run test`
- **Single Test:** Likely includes options for targeted testing within `/src/__tests__/App.test.tsx`.

### Lint
- Linting not explicitly found; Candidates: ESLint/Prettier might be configured implicitly in `devDependencies`.

## Code Style Guidelines
### Import Conventions
- **Library imports:** React-related modules (`React.FC`, `memo`) and `ink` modules (`Box`, `Static`) are frequent.
- **Custom Imports:** Files often utilize relative paths (`../types.js`).

### Formatting Rules
- **TypeScript Types:** Type interfaces and strict typing (`React.FC`, `TaskManager`, `RetryOptions`) used consistently.
- **Declarations:** Constants over `let` or `var`.
- **Spacing:** Clear delineation in method chains and object properties.

### Naming Conventions
- Functions: PascalCase (`ConfirmDialog`, `FallbackInput`).
- Constants: UPPERCASE underscore-separated (`DEFAULT_ENABLED_TOOLS`).

### Error Handling
- **Usage:** Wrap critical sections (`fs`, process, requests) in `try...catch`.
- Found in `/config/loader.ts`, `/core/tool-parser.ts`.