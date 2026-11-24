# Formula Engine Architecture & Grammar Specification

**Project:** OmniSheet  
**Date:** November 2026  
**Document:** `docs/FORMULA_ENGINE.md`  
**Stage:** Stage 6: Advanced Formula Library & Formula Autocomplete  

---

## 1. Architectural Overview

OmniSheet's formula calculation engine is a custom, zero-dependency, local-first evaluation system built on clean compiler design principles:

```
Formula String (e.g. "=VLOOKUP(F2, A2:D5, 2, FALSE)")
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
                         │ Abstract Syntax Tree (AST with EmptyNode support)
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
                         │ Function Registry (92 Built-in Functions across 7 Categories)
                         ▼
             Computed Cell Value (e.g. "Chair", 180, 350, #N/A)
```

### Critical Security & Architecture Principles
- **Zero `eval()` or `new Function()`:** The engine contains zero arbitrary code execution primitives. All calculations are performed via deterministic tree-walking.
- **Decoupled from React:** The engine operates on pure data structures (`Record<string, Cell>`), enabling high-performance calculation without triggering unnecessary React renders.
- **Sparse Cell Compatibility:** Reads and writes to sparse coordinate maps (`row:col`), preserving minimal memory footprints.
- **Timezone Independence:** Uses an absolute UTC serial date system (epoch December 30, 1899) ensuring identical calculations regardless of client timezones.

---

## 2. Formula Grammar & Operator Precedence

| Precedence | Level | Operators | Associativity | Description / Examples |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Primary** | Literals, `()`, Identifiers, Ranges | N/A | `100`, `"text"`, `TRUE`, `A1`, `A1:B10`, `(expr)` |
| **2** | **Postfix** | `%` | Left | Percentage conversion: `50%` $\rightarrow$ `0.5` |
| **3** | **Exponentiation** | `^` | Right | Power: `2 ^ 3` $\rightarrow$ `8` |
| **4** | **Unary** | `+`, `-` | Right | Sign negation: `-A1`, `+5` |
| **5** | **Multiplicative** | `*`, `/` | Left | Multiplication & Division: `100 / 5` $\rightarrow$ `20` |
| **6** | **Additive & Concat** | `+`, `-`, `&` | Left | Addition, Subtraction, Concatenation: `A1 & " " & B1` |
| **7** | **Comparison** | `=`, `<>`, `<`, `<=`, `>`, `>=` | Left | Boolean comparisons: `A1 > 50`, `B1 = "Apple"` |

---

## 3. Function Registry Architecture & Categorization

The `FunctionRegistry` coordinates **92 built-in functions** organized into seven distinct categories. Each function is registered with rich argument definitions, expected parameter types, optionality flags, default values, return types, and verified examples.

### 3.1 Lookup & Reference Functions (5 functions)
1. **`VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])`**:
   - Searches leftmost column of `table_array`.
   - Supports exact match (`FALSE` or `0`), approximate match on sorted numbers (`TRUE` or `1`), and Excel wildcard matching (`*`, `?`, `~`).
   - Returns `#REF!` if `col_index_num` is out of bounds; returns `#N/A` if no match is found.
2. **`HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])`**:
   - Searches top row of `table_array`.
3. **`XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])`**:
   - Modern replacement for VLOOKUP/HLOOKUP. Supports disjoint vectors, custom missing text fallbacks, exact match (`0`), approximate modes (`-1`, `1`), wildcard matching (`2`), and forward (`1`) or reverse (`-1`) searching.
4. **`INDEX(array, row_num, [column_num])`**:
   - Returns value at 1-based row and column within a 2D range or 1D array.
5. **`MATCH(lookup_value, lookup_array, [match_type])`**:
   - Returns the 1-based position of `lookup_value` in `lookup_array`. Supports exact match (`0` with wildcards), less-than (`1`), and greater-than (`-1`).

### 3.2 Text Manipulation Functions (18 functions)
- **Extraction & Length:** `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `CLEAN`.
- **Case Formatting:** `UPPER`, `LOWER`, `PROPER`.
- **Concatenation:** `CONCATENATE`, `CONCAT`, `TEXTJOIN` (with custom delimiter and `ignore_empty`).
- **Search & Mutation:** `SUBSTITUTE` (supports targeting specific occurrence index), `REPLACE`, `FIND` (case-sensitive), `SEARCH` (case-insensitive with wildcards).
- **Strings & Comparison:** `EXACT`, `REPT`.

### 3.3 Date & Time Functions (17 functions)
- **Serial Representation:** Based on December 30, 1899 UTC epoch. Integer parts represent whole days; decimal fractions represent hours, minutes, and seconds.
- **Constructors & Parts:** `DATE`, `YEAR`, `MONTH`, `DAY`, `HOUR`, `MINUTE`, `SECOND`.
- **Current Dynamic Clocks:** `TODAY()` (serial day integer), `NOW()` (day + fractional timestamp). Both inject mock clocks in test environments for deterministic execution.
- **Date Arithmetic & Intervals:** `DATEDIF` ("Y", "M", "D", "YM", "YD", "MD"), `EDATE`, `EOMONTH`, `DAYS`, `WEEKDAY`, `WEEKNUM`, `NETWORKDAYS` (excludes weekends and optional custom holidays), `WORKDAY`.

### 3.4 Mathematical Functions (19 functions)
- **Rounding:** `ROUND`, `ROUNDUP`, `ROUNDDOWN`, `INT`, `TRUNC`.
- **Arithmetic & Signs:** `ABS`, `MOD`, `POWER`, `SQRT`, `SIGN`.
- **Transcendental & Logarithmic:** `PI`, `EXP`, `LN`, `LOG`, `LOG10`, `FACT`.
- **Matrix Products:** `PRODUCT`, `SUM`, `SUMPRODUCT` (multiplies corresponding components in arrays and returns the sum of products).

### 3.5 Statistical Functions (16 functions)
- **Core Aggregations:** `AVERAGE`, `COUNT`, `COUNTA`, `MIN`, `MAX`.
- **Central Tendency & Spread:** `MEDIAN`, `MODE`, `STDEV` (sample), `STDEVP` (population), `VAR` (sample), `VARP` (population).
- **Ranking & Quantiles:** `LARGE`, `SMALL`, `RANK` (ascending and descending modes), `PERCENTILE`, `QUARTILE`.

### 3.6 Logical Functions (9 functions)
- `IF(condition, value_if_true, [value_if_false])`: Short-circuit branch evaluation.
- `AND(...conditions)`, `OR(...conditions)`, `NOT(condition)`, `XOR(...conditions)`.
- `IFERROR(value, value_if_error)`: Traps any calculation or lookup error and provides fallback.
- `IFNA(value, value_if_na)`: Traps only `#N/A` errors, preserving other formula errors.
- `TRUE()`, `FALSE()`: Boolean literals.

### 3.7 Information Functions (8 functions)
- `ISBLANK(value)`: Checks for null or undefined unpopulated cells.
- `ISNUMBER(value)`: Checks if value evaluates to a numeric type.
- `ISTEXT(value)`: Checks if value evaluates to a string.
- `ISLOGICAL(value)`: Checks if value evaluates to boolean true/false.
- `ISERROR(value)`: Returns true for any formula error.
- `ISERR(value)`: Returns true for any formula error except `#N/A`.
- `ISNA(value)`: Returns true exclusively for `#N/A`.
- `TYPE(value)`: Returns standard Excel type integer code (1 = number, 2 = text, 4 = logical, 16 = error, 64 = array).

---

## 4. Formula Autocomplete & Argument Assistance Engine

OmniSheet delivers desktop-grade formula authoring through lexical analysis of active input strings:

### 4.1 Autocomplete Context Parser (`getAutocompleteContext`)
- Triggers when input begins with `=` and the character sequence preceding the cursor forms an identifier (e.g. `=VLO`).
- Ignores cursor movements inside quoted string literals (`"..."`).
- Computes `replaceStart` and `replaceEnd` boundaries to cleanly replace the typed prefix with the selected function name plus opening parenthesis (e.g. `VLOOKUP(`).

### 4.2 Argument Assistant Context Parser (`getArgumentHelpContext`)
- Identifies active function name by walking backwards to the unclosed opening parenthesis.
- Handles nested function invocations (e.g. `=INDEX(A1:D10, MATCH(B1, C1:C10, 0), `) by maintaining a parenthesis depth counter.
- Counts comma separators at the current parenthesis depth to determine the exact `activeArgIndex`.
- Returns full `FunctionDefinition` metadata and the 0-based active parameter index.

### 4.3 User Interface Integration
- `<FormulaAutocomplete />`: Floating dropdown positioned directly below the active editor (Formula Bar or in-cell grid input). Displays function name, category badge, description, syntax preview, and keyboard navigation instructions.
- `<FormulaArgumentHelp />`: Floating tooltip displaying the complete function syntax with the active argument highlighted in bold blue. Shows parameter description, required/optional badge, and realistic examples.
- `<FormulaReferencePanel />`: Comprehensive modal reference guide opened via the Formula Bar's `fx` button. Allows users to search, filter by category, browse documentation, copy example formulas, and insert functions with a single click.

---

## 5. Dependency Tracking & Cycle Handling

### 5.1 Directed Acyclic Graph (DAG)
The `DependencyGraph` maintains two bidirectional maps:
- `precedents`: `Map<string, Set<string>>` — cells referenced by a formula cell.
- `dependents`: `Map<string, Set<string>>` — cells that depend on a given cell.

### 5.2 Cycle Detection
Cycles are identified using depth-first search (DFS) with a recursion stack. When a circular dependency is detected (e.g. `A1 = B1 + 1` and `B1 = A1 + 1`):
- Affected cells are assigned `#CYCLE!`.
- Infinite recursion is strictly prevented.
- Calculation halts safely without freezing the browser thread.

### 5.3 Topological Ordering (Kahn's Algorithm)
When a cell changes, only its downstream reachable dependents are scheduled for recalculation. Dependencies are sorted topologically such that every cell is evaluated strictly after all of its precedents have been computed.

---

## 6. Standard Error Codes

| Error Code | Meaning | Trigger Condition |
| :--- | :--- | :--- |
| `#DIV/0!` | Division by zero | Division by 0 or `AVERAGE` over empty range |
| `#VALUE!` | Incompatible value type | Non-numeric string used in arithmetic or missing required argument |
| `#REF!` | Invalid reference | Coordinate out of bounds or `INDEX`/`VLOOKUP` col index out of range |
| `#NAME?` | Unrecognized function | Calling a function not registered in registry |
| `#NUM!` | Numeric error | Exponentiation overflow, negative square root, or invalid calculation argument |
| `#N/A` | Not available | Lookup function cannot find exact match for target value |
| `#CYCLE!` | Circular reference | Direct or indirect loop in dependency graph |
