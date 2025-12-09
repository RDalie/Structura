# Conditional Normalization Example

## Source Code

```js
if (ready) run();
else fallback();
```

## Tree-sitter Parse (summary)

- `program`
  - `if_statement`
    - `parenthesized_expression` → `identifier` `ready`
    - `expression_statement` → `call_expression` (`identifier` `run`)
    - `expression_statement` → `call_expression` (`identifier` `fallback`)

## Normalized Output

```json
{
  "type": "Conditional",
  "id": "<deterministic-id>",
  "originalType": "if_statement",
  "location": { "startLine": 0, "startCol": 0, "endLine": 1, "endCol": 15 },
  "condition": {
    "type": "Identifier",
    "id": "<deterministic-id>",
    "name": "ready",
    "originalType": "identifier",
    "location": { "startLine": 0, "startCol": 4, "endLine": 0, "endCol": 9 }
  },
  "then": {
    "type": "Block",
    "id": "<deterministic-id>",
    "originalType": "expression_statement",
    "location": { "startLine": 0, "startCol": 11, "endLine": 0, "endCol": 17 },
    "statements": [
      {
        "type": "Call",
        "id": "<deterministic-id>",
        "originalType": "call_expression",
        "location": { "startLine": 0, "startCol": 11, "endLine": 0, "endCol": 16 },
        "callee": { "type": "Identifier", "id": "<deterministic-id>", "name": "run" },
        "args": []
      }
    ]
  },
  "else": {
    "type": "Block",
    "id": "<deterministic-id>",
    "originalType": "expression_statement",
    "location": { "startLine": 1, "startCol": 5, "endLine": 1, "endCol": 15 },
    "statements": [
      {
        "type": "Call",
        "id": "<deterministic-id>",
        "originalType": "call_expression",
        "location": { "startLine": 1, "startCol": 5, "endLine": 1, "endCol": 15 },
        "callee": { "type": "Identifier", "id": "<deterministic-id>", "name": "fallback" },
        "args": []
      }
    ]
  }
}
```

## Mapping Notes

- `if_statement` nodes normalize to Structura’s `Conditional`, preserving `condition`, `then`, and optional `else` branches.
- Consequence and alternative branches become `Block` nodes even when the source omits braces, keeping statements in a consistent list format.
- Each nested expression (here, calls) is recursively normalized, so callee/args reuse the shared `Call` and `Identifier` shapes.
