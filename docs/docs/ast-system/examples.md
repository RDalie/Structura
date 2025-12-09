---
title: Examples
sidebar_label: Examples
description: Side-by-side examples of Structura's normalized AST shapes.
---

Use these examples as references for how Structura normalizes common syntax nodes. Each section shows source, a tree-sitter summary, the normalized output, and mapping notes.

## Variable

### Source

```js
const answer = 42;
```

### Tree-sitter (summary)

- `program`
  - `lexical_declaration` (`const`)
    - `variable_declarator`
      - `identifier` `answer`
      - `number` `42`

### Normalized Output

```json
{
  "type": "Variable",
  "id": "<deterministic-id>",
  "originalType": "variable_declarator",
  "location": { "startLine": 0, "startCol": 6, "endLine": 0, "endCol": 17 },
  "name": "answer",
  "kind": "const",
  "initializer": {
    "type": "Literal",
    "id": "<deterministic-id>",
    "literalType": "number",
    "value": 42,
    "originalType": "number",
    "location": { "startLine": 0, "startCol": 16, "endLine": 0, "endCol": 18 }
  }
}
```

### Mapping Notes

- Each `variable_declarator` becomes a `Variable` node capturing the declared name, declaration kind (`const`, `let`, or `var`), and optional initializer.
- Initializers are recursively normalized, so literals, identifiers, or more complex expressions retain their unified Structura shapes.
- When a single declaration contains multiple variables, Structura returns a `Block` containing one `ExpressionStatement` per variable to keep every variable accessible as a standalone node.

## Function

### Source

```js
function check(value) {
  return call(value);
}
```

### Tree-sitter (summary)

- `program`
  - `function_declaration` (`name`: `check`)
    - `formal_parameters` → `identifier` `value`
    - `statement_block`
      - `return_statement`
        - `call_expression` (`identifier` `call`, `arguments` containing `identifier` `value`)

### Normalized Output

```json
{
  "type": "Function",
  "id": "<deterministic-id>",
  "originalType": "function_declaration",
  "location": { "startLine": 0, "startCol": 0, "endLine": 2, "endCol": 1 },
  "name": "check",
  "params": [
    {
      "type": "Parameter",
      "id": "<deterministic-id>",
      "name": "value",
      "originalType": "identifier",
      "location": { "startLine": 0, "startCol": 15, "endLine": 0, "endCol": 20 }
    }
  ],
  "returnType": null,
  "body": {
    "type": "Block",
    "id": "<deterministic-id>",
    "originalType": "statement_block",
    "location": { "startLine": 0, "startCol": 21, "endLine": 2, "endCol": 1 },
    "statements": [
      {
        "type": "Return",
        "id": "<deterministic-id>",
        "originalType": "return_statement",
        "location": { "startLine": 1, "startCol": 2, "endLine": 1, "endCol": 18 },
        "value": {
          "type": "Call",
          "id": "<deterministic-id>",
          "originalType": "call_expression",
          "location": { "startLine": 1, "startCol": 9, "endLine": 1, "endCol": 18 },
          "callee": {
            "type": "Identifier",
            "id": "<deterministic-id>",
            "name": "call",
            "originalType": "identifier",
            "location": { "startLine": 1, "startCol": 9, "endLine": 1, "endCol": 13 }
          },
          "args": [
            {
              "type": "Identifier",
              "id": "<deterministic-id>",
              "name": "value",
              "originalType": "identifier",
              "location": { "startLine": 1, "startCol": 14, "endLine": 1, "endCol": 19 }
            }
          ]
        }
      }
    ]
  }
}
```

### Mapping Notes

- Function declarations become `Function` nodes with `params` converted to `Parameter` entries and a `Block` body.
- The body's statements are recursively normalized; return statements become `Return` nodes containing normalized values.
- Calls inside functions normalize callee/args to Structura's unified `Call` shape, preserving deterministic `id`, `location`, and `originalType` fields from the Tree-sitter nodes.

## Conditional

### Source

```js
if (ready) run();
else fallback();
```

### Tree-sitter (summary)

- `program`
  - `if_statement`
    - `parenthesized_expression` → `identifier` `ready`
    - `expression_statement` → `call_expression` (`identifier` `run`)
    - `expression_statement` → `call_expression` (`identifier` `fallback`)

### Normalized Output

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

### Mapping Notes

- `if_statement` nodes normalize to Structura's `Conditional`, preserving `condition`, `then`, and optional `else` branches.
- Consequence and alternative branches become `Block` nodes even when the source omits braces, keeping statements in a consistent list format.
- Each nested expression (here, calls) is recursively normalized, so callee/args reuse the shared `Call` and `Identifier` shapes.

## Call

### Source

```js
runTask('build', 3);
```

### Tree-sitter (summary)

- `program`
  - `expression_statement`
    - `call_expression`
      - `identifier` `runTask`
      - `arguments`
        - `string` `"build"`
        - `number` `3`

### Normalized Output

```json
{
  "type": "Call",
  "id": "<deterministic-id>",
  "originalType": "call_expression",
  "location": { "startLine": 0, "startCol": 0, "endLine": 0, "endCol": 19 },
  "callee": {
    "type": "Identifier",
    "id": "<deterministic-id>",
    "name": "runTask",
    "originalType": "identifier",
    "location": { "startLine": 0, "startCol": 0, "endLine": 0, "endCol": 7 }
  },
  "args": [
    {
      "type": "Literal",
      "id": "<deterministic-id>",
      "literalType": "string",
      "value": "build",
      "originalType": "string",
      "location": { "startLine": 0, "startCol": 8, "endLine": 0, "endCol": 15 }
    },
    {
      "type": "Literal",
      "id": "<deterministic-id>",
      "literalType": "number",
      "value": 3,
      "originalType": "number",
      "location": { "startLine": 0, "startCol": 17, "endLine": 0, "endCol": 18 }
    }
  ]
}
```

### Mapping Notes

- The call's callee and each argument are normalized separately, yielding consistent `Identifier` and `Literal` nodes.
- The shared `id`, `location`, and `originalType` fields make it clear where each node originated in the Tree-sitter parse.
- Argument order is preserved, so downstream tooling can reconstruct invocation semantics accurately.
