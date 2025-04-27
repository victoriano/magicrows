# Detailed Design Rationale: High-Volume Table Rendering with DuckDB & TanStack Table

> *A long-form narrative to read on the treadmill and mull over*

---

## Why TanStack Table?

1. **Declarative Column/Row Model**  
   TanStack Table treats your data grid as a *state machine*. Columns, sorting, grouping, aggregation, and even virtualization are just plugins over a core table model. This aligns nicely with Redux: the table state can be reproduced purely from serialised UI state + the underlying SQL query.

2. **Virtualisation Built-in**  
   Competing libraries (e.g. AG-Grid, Handsontable) inhale entire datasets into JS memory, then hide DOM rows. TanStack defers to `@tanstack/react-virtual`, which only renders DOM nodes for visible rows *and* lets us fetch additional pages once the scroll offset nears the end. That pagination hook is crucial when our data source is DuckDB.

3. **Unopinionated Styling**  
   DaisyUI + Tailwind classes drop directly onto the generated elements. We avoid vendor CSS bloat and keep bundle size lean.

4. **Community & Maintenance**  
   Tanner Linsley’s libraries (React-Query, React-Table) are well maintained and forward-looking (React 19 support inbound). We minimise the risk of future migration pain.

### Potential Downsides

*   No built-in Excel-like cell editing – we can bolt this on later with controlled components.
*   Requires us to manage data fetching and caching ourselves (but that’s actually an advantage given we have DuckDB paging logic).

---

## Why DuckDB?

1. **On-device Analytics Engine**  
   DuckDB delivers PostgreSQL-level SQL inside an embeddable library. No running server, no IPC overhead if we use `duckdb-wasm`.

2. **Columnar Execution & Vectorisation**  
   Ideal for analytical (OLAP) queries. When a user requests a slice of rows, DuckDB can read only the necessary columns from Parquet/CSV, then vectorise the computation. Even group-bys on millions of rows complete in milliseconds if we’re aggregating narrow columns.

3. **File-format Superpowers**  
   * Parquet & Arrow are first-class citizens – zero-copy reads.  
   * CSV auto-type inference is solid (better than manually handling strings via PapaParse).  
   * Excel files read via `read_excel_auto()` after installing the `spatial` extension – no need for third-party XLSX JS parsers.

4. **Streaming via Arrow**  
   DuckDB’s `arrow()` API streams query results as Arrow record batches. This pairs perfectly with TanStack’s virtualisation: we fetch, say, 20K rows per batch and release previous batches when the scroll position leaves them.

5. **Extensibility**  
   We can register UDFs (e.g. OpenAI embeddings, domain-specific functions) later without re-architecting the pipeline.

### Native vs WASM: The Core Trade-off

| Aspect            | Native `duckdb` (Node Addon) | `duckdb-wasm` |
|-------------------|------------------------------|---------------|
| Performance       | 1× (baseline)                | ~0.8× slower  |
| Bundle Size       | +25 MB / platform            | +4 MB total   |
| Cross-platform    | Needs separate binaries      | One build     |
| Main/Renderer     | Must run in Node context     | Runs in web worker |
| Security Upgrades | Requires reinstall           | CDN hot-swap  |

For MVP we choose **`duckdb-wasm`** to avoid installer complexity. When performance demands rise we can add a native optional dependency.

---

## Architecture Sketch

```
┌─────────────────────────────────────┐
│  Renderer (React)                   │
│  ─────────────────────────────────   │
│  🟦 DataTable (TanStack)            │
│  ─ scroll event ───────────┐        │
│  🟥 Redux slice: tableRows  │        │
│                            │        │
└──────────┬─────────────────┘        │
           │ IPC / postMessage        │
┌──────────▼────────────────────────┐ │
│ 🟩 duckdb-wasm Worker            │ │
│   ├─ importFile(file)            │ │
│   ├─ query(sql, limit, offset)   │ │
│   └─ streamArrow(sql)            │ │
└──────────────────────────────────┘ │
```

1. The CSV/Parquet/XLSX drag-and-drop component passes the `File` handle to the worker (`importFile`).  
2. Worker `COPY`s the file into an in-memory DuckDB table.  
3. Renderer dispatches `runQuery("SELECT * FROM imported")`.  
4. Worker returns `{headers, totalRows}` immediately, then streams the first page of rows.  
5. TanStack Table virtualisation monitors scroll; on nearing the end, Redux thunk dispatches `fetchNextPage`, the worker returns the next batch.

---

## Implementation Notes & Gotchas

*   **SharedArrayBuffer & WASM Memory**  
    For very wide tables you may hit browser memory limits. DuckDB-wasm supports `--experimental-wasm-threads` with `SharedArrayBuffer`, but Electron requires `crossOriginOpenerPolicy` headers. Might be overkill for now.

*   **Back-pressure**  
    Ensure we *cancel* fetches when the user scrolls rapidly upward. Use an AbortController per page request.

*   **Column Types → Cell Renderers**  
    Use DuckDB `PRAGMA show_tables` / `DESCRIBE` to detect ints, floats, dates. Then map to right-aligned numeric columns & date formatting for readability.

*   **Persistent Caching**  
    Later, we can dump DuckDB database files into IndexedDB (using [absurd-sql] + Origin Private File System). Makes re-opening huge files instant.

*   **Security/Sandboxing**  
    Avoid evaluating user-entered SQL that writes to disk. Restrict to `SELECT` in WASM worker (check `plan` output or wrap connection with ACL).

---

## Mental Exercise

While you’re on the rower, consider:

1. **Perfect Paging Size**  
   Is 20 K rows per batch optimal? It depends on average row width; we can compute `mean(row_size)` from DuckDB heuristics to auto-adjust.

2. **Group-by UI**  
   Should we expose a pivot-table interface (drag-drop columns) or a simpler builder (checkbox aggregates)?

3. **Native Addon Migration**  
   At what data size or latency threshold do we flip the switch to native DuckDB? We could measure query latency and prompt the user to enable a native extension.

4. **Columnar → Arrow → GPU**  
   Long-term, could we pass Arrow batches to WebGPU for histogram rendering and ML inference?

Happy thinking!
