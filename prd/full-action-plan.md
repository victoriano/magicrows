# Full Action Plan: TanStack Table + DuckDB Integration

**Estimated Time:** 1–2 weeks

| Task ID | Description                                                                                                | Role        | Estimate | Status      |
| :------ | :--------------------------------------------------------------------------------------------------------- | :---------- | :------- | :---------- |
| 1       | Decide: Native `duckdb` vs `duckdb-wasm`. Configure Electron Builder accordingly (native deps or asset copy). | Core        | 0.5 d    | To Do       |
| 2       | Add dependencies (`@tanstack/react-table`, `@tanstack/react-virtual`, `duckdb`/`duckdb-wasm`). Configure Vite. | Core        | 0.5 d    | To Do       |
| 3       | Build `dbEngine` Abstraction Layer (init, import, query, typed schema retrieval).                             | Backend     | 1 d      | To Do       |
| 4       | Replace `PapaParse` & Redux `csvData` state with `dbEngine` integration for initial file load.              | Backend     | 0.5 d    | To Do       |
| 5       | Implement robust paging cursor logic in `dbEngine` (handle LIMIT/OFFSET or Arrow streams).                | Backend     | 0.5 d    | To Do       |
| 6       | Create `DataTable` component using TanStack Table + react-virtual. Implement features: column resize, sort, pin. | Frontend    | 1 d      | To Do       |
| 7       | Migrate `App.tsx` to render `<DataTable />`. Remove legacy `<table>` rendering code.                          | Frontend    | 0.5 d    | To Do       |
| 8       | Implement UI for SQL Operations (generate SQL from UI state):                                                | Full-stack  | 2 d      | To Do       |
|         | • Column filter builder (multi-condition, type-aware)                                                      |             |          |             |
|         | • Group-by + Aggregates picker (SUM, COUNT, AVG, etc.)                                                     |             |          |             |
|         | • Sampling UI (random, stratified)                                                                         |             |          |             |
|         | • Save current view state as a DuckDB Virtual Table (`CREATE VIEW ... AS ...`).                                |             |          |             |
| 9       | Add support for Excel (`read_excel_auto`) & Parquet (`read_parquet`) imports via `dbEngine`. Show progress. | Backend     | 1 d      | To Do       |
| 10      | Persist recent table metadata (paths, schemas, view definitions) using IndexedDB or localStorage.          | Frontend    | 0.5 d    | To Do       |
| 11      | Performance Testing: Load & query ≥5 GB CSV/Parquet files. Profile memory usage, identify leaks.         | QA          | 1 d      | To Do       |
| 12      | Packaging & Distribution Testing: Verify builds with `electron-builder` on macOS, Windows, Linux.          | DevOps      | 0.5 d    | To Do       |
| **Total** |                                                                                                            |             | **~9 d** |             |

## Key Considerations & Watch-outs

*   **Memory Management:** Critically important to *never* load entire large result sets into Redux or component state. Always use DuckDB's paging (`LIMIT`/`OFFSET`) or Arrow streaming capabilities and fetch data on demand based on the virtualized viewport.
*   **WASM Build Assets:** If using `duckdb-wasm`, ensure the `duckdb-wasm-esm.worker.js` and `.wasm` files are correctly copied into the build output (e.g., using `vite-plugin-static-copy`) and are served appropriately.
*   **Native Addon Threading:** If using the native `duckdb` addon, run all database operations in a separate Node.js worker thread (`worker_threads`) to avoid blocking the main Electron process and freezing the UI. Use Inter-Process Communication (IPC) or `MessageChannel` for communication between the renderer/main process and the worker.
*   **DuckDB Virtual Tables:** Leverage DuckDB's `CREATE VIEW` or `CREATE VIRTUAL TABLE` features extensively. This allows you to save complex query states (filters, joins, aggregations) as named views, enabling extremely fast re-querying and UI updates without recomputing the entire pipeline.
*   **TanStack Table Features:** Utilize features like column visibility to dynamically show/hide columns, especially computed/aggregated columns resulting from group-by operations.
*   **Error Handling:** Implement robust error handling around database operations and file imports. Provide clear feedback to the user if a file fails to load or a query fails.
*   **Schema Evolution:** Consider how to handle potential schema changes if the underlying data files are modified externally. DuckDB's `DESCRIBE` command can be used to fetch the current schema.
