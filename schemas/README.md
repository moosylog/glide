# schemas/

`glove80-layout.schema.json` and `go60-layout.schema.json` are MoErgo's layout JSON Schemas (draft-07), kept
byte-for-byte as supplied. GLIDE's validator (`core/integrity/schemaValidator.js`) loads them at runtime and
contains no copy of their rules. To update: replace the file; `tests/core/schemaSync.test.js` checks that
both still compile, that every fixture still validates, and that the two differ only where expected.
