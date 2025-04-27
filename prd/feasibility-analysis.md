# Feasibility Analysis: TanStack Table + DuckDB Integration

## 1. Front-end Rendering

*   **Technology:** TanStack Table (v8) + `@tanstack/react-virtual` provides robust row/column virtualization. It's proven capable of handling 10 million+ rows when data is fed in a paged or streamed manner.
*   **Compatibility:** The existing React/TypeScript + Vite setup is fully compatible. No issues are expected with Webpack or Electron-specific quirks.
*   **Implementation:** The primary change involves replacing the current basic `<table>` markup in `App.tsx` with a dedicated `DataTable` component. This component will manage TanStack Column/Row models and integrate `useVirtual` for virtualization.
*   **Styling:** Existing Tailwind/DaisyUI styles can be applied directly to the TanStack Table components.

## 2. Data Back-end / Compute Engine

*   **Technology:** DuckDB is an excellent choice. It offers native support for reading various file formats (CSV, TSV, JSON, Parquet, Arrow, Excel) and performing SQL operations like filtering, grouping, joins, sampling, and ordering directly on these files.
*   **Electron Integration Options:**
    *   **Native Addon (`duckdb`):**
        *   *Pros:* Faster execution, lower runtime memory usage.
        *   *Cons:* Adds ~25 MB per-platform binary to the application installer. Requires running in the main process or a dedicated worker thread.
    *   **WebAssembly (`duckdb-wasm`):**
        *   *Pros:* Runs entirely within the renderer process, zero native dependencies, simpler cross-platform packaging.
        *   *Cons:* Slightly slower performance compared to the native addon.
*   **Data Handling:** Both DuckDB variants allow streaming query results in manageable chunks (using `LIMIT … OFFSET` or the `arrow()` cursor API). This prevents the UI from needing to hold millions of rows in memory simultaneously.

## 3. State Management (Redux)

*   **Strategy:** The Redux store should only hold the data currently visible in the viewport (e.g., 500–1000 rows) plus essential metadata (table schema, total row count, current SQL query).
*   **Import Process:** The current `PapaParse` logic for CSV import will be replaced by DuckDB's `COPY ... FROM ... (FORMAT CSV, auto_detect=TRUE)` command. Similarly, Excel import will use `INSTALL spatial; LOAD spatial; SELECT * FROM read_excel(...)`.

## Conclusion

The integration of TanStack Table for front-end rendering and DuckDB as the back-end data engine is highly feasible within the current application architecture. This combination offers significant performance benefits for handling large datasets and enables powerful data manipulation capabilities directly within the application.
