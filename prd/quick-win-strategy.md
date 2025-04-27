# Quick-Win Strategy (MVP)

**Goal:** Load a large CSV file, view the entire table with smooth scrolling via virtualization, and implement a simple text filter.

**Estimated Time:** ≈ 1 day

## Steps

1.  **Dependencies:**
    *   Install necessary packages:
        ```bash
        pnpm add @tanstack/react-table @tanstack/react-virtual duckdb-wasm @duckdb/duckdb-wasm
        # Or, if using the native addon:
        # pnpm add @tanstack/react-table @tanstack/react-virtual duckdb
        ```

2.  **DB Helper (Renderer - `src/renderer/lib/db.ts`):**
    *   Create a helper module to manage the DuckDB instance.
    *   Initialize the WASM instance (`DuckDB.instantiate(...)`) or connect to the native addon.
    *   Expose an `importFile(file: File)` function:
        *   Takes a `File` object.
        *   Uses DuckDB's `COPY` or `read_csv_auto` to create a table named `imported`.
    *   Expose a `query(sql: string, { limit, offset })` function:
        *   Executes the given SQL query with optional pagination.
        *   Returns results as Arrow vectors or plain JavaScript arrays.

3.  **Redux Data Slice Changes (`src/renderer/store/slices/dataSlice.ts`):**
    *   Modify the state to hold:
        *   `activeQuery: string | null` (The current base SQL query)
        *   `rowPage: YourDataType[]` (The current page of rows being displayed)
        *   `totalRows: number` (Total rows matching the `activeQuery`)
        *   `headers: string[]` (Column headers)
    *   Create an asynchronous thunk `runQuery(sql: string)`:
        *   Sets the `activeQuery`.
        *   Calls `db.query` to get the total row count (`SELECT COUNT(*) ...`).
        *   Calls `db.query` again with `LIMIT`/`OFFSET` to fetch the first page of data.
        *   Dispatches actions to update `rowPage`, `totalRows`, and `headers`.
    *   Create a thunk `fetchNextPage(offset: number)`:
        *   Calls `db.query` using `activeQuery` with the new `offset`.
        *   Dispatches action to append/replace `rowPage`.

4.  **DataTable Component (`src/renderer/components/DataTable.tsx`):**
    *   Create a new React component to encapsulate the TanStack Table logic.
    *   Use `useReactTable` hook, feeding it columns derived from the Redux `headers` and data from `rowPage`.
    *   Integrate `@tanstack/react-virtual`'s `useVirtual` hook for row virtualization.
        *   Monitor the scroll position.
        *   When the user scrolls near the end of the currently loaded `rowPage` (e.g., 90% scrolled), dispatch `fetchNextPage` with the next offset.
    *   Replace the existing hard-coded `<table>` in `App.tsx` with this new `<DataTable />` component.

5.  **CSV Upload (`src/renderer/components/CsvUpload.tsx` or `App.tsx`):**
    *   Keep the existing drag-and-drop UI.
    *   In the file handling logic (e.g., `handleFileChange` or `parseCSV`), replace the `Papa.parse` call with `await db.importFile(selectedFile)`.
    *   After successful import, dispatch `runQuery("SELECT * FROM imported")` to load and display the initial data.

6.  **Simple UI Filter:**
    *   Add a simple text input field to the UI.
    *   On input change, construct a new SQL query: `SELECT * FROM imported WHERE some_column ILIKE '%${inputValue}%'` (or apply to all columns).
    *   Dispatch `runQuery` with the new filtered SQL.

## Expected Result

After completing these steps, the application will be able to:

*   Load CSV files of potentially very large sizes.
*   Display the data in a table that scrolls smoothly due to row virtualization.
*   Apply a basic text filter across the data.
