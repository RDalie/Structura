---
title: AST Schema
sidebar_position: 4
description: Structura's normalized abstract syntax tree shape and conventions.
---

Structura normalizes Tree-sitter output into a language-agnostic AST for storage and analysis. Nodes carry deterministic `id`s, source `location`, `filePath`, and the original parser node type via `originalType`. Node-specific properties live in the `data` payload when they are not themselves child nodes.

## Expressions

### MemberExpression
- Purpose: represent direct, static member access (`object.property`, `object.method()`, `object?.property`).
- Created from Tree-sitter `member_expression`, `optional_member_expression`, or `optional_chain` that wraps a member expression.
- Shape:
  - `type`: `MemberExpression`
  - `object`: normalized child for the accessed value; `data.role = "object"`
  - `property`: normalized `Identifier`; `data.role = "property"`
- Rules:
  - Only dot-based, static identifiers become `MemberExpression`.
  - Computed/bracketed access (e.g., `obj["name"]`, `obj[prop]`) remains `Unknown`.
  - Optional chaining is preserved; roles still apply.
