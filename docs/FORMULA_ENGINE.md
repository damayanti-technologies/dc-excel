# Formula Engine Architecture & Grammar Specification

**Project:** OmniSheet  
**Date:** November 2026  
**Document:** `docs/FORMULA_ENGINE.md`  
**Stage:** Stage 5: Cell Editing & Formula Calculation Engine  

---

## 1. Architectural Overview

OmniSheet's formula calculation engine is a custom, zero-dependency, local-first evaluation system built on clean compiler design principles:

```
Formula String (e.g. "=SUM(A1:A5) * 10% + IF(B1 > 50, 10, 0)")
                         │
                         ▼
             ┌─────────────────────────┐
             │   Tokenizer / Lexer     │  (src/engine/calculation/tokenizer.ts)
             └───────────┬─────────────┘
                         │ Token Stream
                         ▼
             ┌─────────────────────────┐
             │ Recursive Descent Parser│  (src/engine/calculation/parser.ts)
             └───────────┬─────────────┘
                         │ Abstract Syntax Tree (AST)
                         ▼
             ┌─────────────────────────┐
             │ AST Reference Extractor │  (src/engine/calculation/dependency-graph.ts)
             └───────────┬─────────────┘
                         │ Precedent keys
                         ▼
             ┌─────────────────────────┐
             │    Dependency Graph     │  (Cycle Detection & Topological Sort)
             └───────────┬─────────────┘
                         │ Topologically Ordered Queue
                         ▼
             ┌─────────────────────────┐
             │   Tree-Walk Evaluator   │  (src/engine/calculation/evaluator.ts)
             └───────────┬─────────────┘
                         │ Function Registry (SUM, AVERAGE, COUNT, MIN, MAX, IF)
                         ▼
             Computed Cell Value (e.g. 750, "Pass", #DIV/0!)
```

### Critical Security & Architecture Principles
- **No `eval()` or `new Function()`:** The engine contains zero arbitrary code execution primitives. All calculations are performed via deterministic tree-walking.
- **Decoupled from React:** The engine operates on pure data structures (`Record<string, Cell>`), enabling high-performance calculation without triggering unnecessary React renders.
- **Sparse Cell Compatibility:** Reads and writes to sparse coordinate maps (`row:col`), preserving minimal memory footprints.

---

## 2. Formula Grammar & Operator Precedence

| Precedence | Level | Operators | Associativity | Description / Examples |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Primary** | Literals, `()`, Identifiers, Ranges | N/A | `100`, `"text"`, `TRUE`, `A1`, `A1:B10`, `(expr)` |
| **2** | **Postfix** | `%` | Left | Percentage conversion: `50%` $\rightarrow$ `0.5` |
| **3** | **Exponentiation** | `^` | Right | Power: `2 ^ 3` $\rightarrow$ `8` |
| **4** | **Unary** | `+`, `-` | Right | Sign negation: `-A1`, `+5` |
| **5** | **Multiplicative** | `*`, `/` | Left | Multiplication & Division: `100 / 5` $\rightarrow$ `20` |
| **6** | **Additive & Concat** | `+`, `-`, `&` | Left | Addition, Subtraction, Concatenation: `A1 & " " & B1` |
| **7** | **Comparison** | `=`, `<>`, `<`, `<=`, `>`, `>=` | Left | Boolean comparisons: `A1 > 50`, `B1 = "Apple"` |

---

## 3. Supported Functions Registry

Functions are managed via an extensible registry pattern (`FunctionRegistry`):

### 3.1 `SUM(...args)`
- Aggregates all numeric values across single cells, numbers, and rectangular ranges.
- Ignores blank cells and text strings within ranges (matching Excel standards).
- Propagates formula errors immediately.

### 3.2 `AVERAGE(...args)`
- Calculates the arithmetic mean of all numeric values in arguments and ranges.
- Returns `#DIV/0!` if no numeric values are present.

### 3.3 `COUNT(...args)`
- Counts the total number of cells or arguments containing numeric values.

### 3.4 `MIN(...args)` and `MAX(...args)`
- Computes minimum and maximum numeric values across ranges and parameters.

### 3.5 `IF(condition, value_if_true, [value_if_false])`
- Evaluates `condition`. If truthy, evaluates and returns `value_if_true`.
- If falsy, evaluates and returns `value_if_false` (or `false` if omitted).
- Supports full short-circuit evaluation: only the active branch is computed.
- Fully supports nesting (e.g. `=IF(A1>90, "A", IF(A1>75, "B", "C"))`).

---

## 4. Dependency Tracking & Cycle Handling

### 4.1 Directed Acyclic Graph (DAG)
The `DependencyGraph` maintains two bidirectional maps:
- `precedents`: `Map<string, Set<string>>` — cells referenced by a formula cell.
- `dependents`: `Map<string, Set<string>>` — cells that depend on a given cell.

### 4.2 Cycle Detection
Cycles are identified using depth-first search (DFS) with a recursion stack. When a circular dependency is detected (e.g. `A1 = B1 + 1` and `B1 = A1 + 1`):
- Both cells are assigned `#CYCLE!`.
- Infinite recursion is strictly prevented.
- Calculation halts safely without freezing the browser thread.

### 4.3 Topological Ordering (Kahn's Algorithm)
When a cell changes, only its downstream reachable dependents are scheduled for recalculation. Dependencies are sorted topologically such that every cell is evaluated strictly after all of its precedents have been computed.

---

## 5. Error Codes

| Error Code | Meaning | Trigger Condition |
| :--- | :--- | :--- |
| `#DIV/0!` | Division by zero | Division by 0 or `AVERAGE` over empty range |
| `#VALUE!` | Incompatible value type | Non-numeric string used in arithmetic |
| `#REF!` | Invalid reference | Coordinate out of bounds or malformed reference |
| `#NAME?` | Unrecognized function | Calling a function not registered in registry |
| `#NUM!` | Numeric error | Exponentiation resulting in infinite or NaN value |
| `#CYCLE!` | Circular reference | Direct or indirect loop in dependency graph |
