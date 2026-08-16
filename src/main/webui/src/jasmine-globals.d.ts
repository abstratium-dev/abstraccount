// Makes Jasmine's global test functions (describe, it, expect, beforeEach,
// ...) visible to the IDE language server regardless of which tsconfig it
// resolves .spec.ts files against. Karma itself compiles specs via
// tsconfig.spec.json ("types": ["jasmine"]), so this file is a no-op there
// and only helps editors whose tsserver routes spec files to tsconfig.app.json
// ("types": []).
/// <reference types="jasmine" />
