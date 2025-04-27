# DuckDB (Native Addon) ↔ Renderer Communication

> *How the Node-side DuckDB worker talks to the TanStack Table in the renderer*

---

## 1  Rationale for a Dedicated Node Worker

* **Main-process Safety**  Running long SQL scans on the Electron main process risks blocking window creation and OS events. We therefore isolate DuckDB in a **Node.js Worker Thread** (or child process) spawned from the main process.
* **Full Native Performance**  The `duckdb` C++ addon can perform multithreaded vectorised execution. The worker gives it an unconstrained event loop for background compute.
* **Structured IPC**  Electron provides high-throughput, type-safe channels (`MessagePort`, `ipcMain.handle`) that we can exploit for streaming result batches.

![comm diagram](./assets/duckdb-comm.svg)

```
Renderer (React) ─── IPC Renderer ─┐                             ┌─► Worker Thread
  TanStack Table                 │     ipcMain ↔ port          │     duckdb addon
  Redux rowPage slice            ├──► Main Process ──spawn()───┤     ⋮
  scroll events / SQL builder    │                             └─► Arrow/JSON rows
```

---

## 2  Channel Setup

1. **Preload Script (`preload.ts`)**  
   ```ts
   contextBridge.exposeInMainWorld('dbBridge', {
     query: (sql: string, opts?: QueryOpts) => ipcRenderer.invoke('db:query', { sql, opts }),
     importFile: (path: string) => ipcRenderer.invoke('db:import', path),
     cancel: (id: string) => ipcRenderer.send('db:cancel', id)
   });
   ```
2. **Main Process (`main.ts`)**
   ```ts
   import { Worker } from 'node:worker_threads';
   const dbWorker = new Worker(new URL('./db.worker.js', import.meta.url));

   ipcMain.handle('db:import', (e, path) => rpc(dbWorker, 'import', path));
   ipcMain.handle('db:query',  (e, q)   => rpc(dbWorker, 'query', q));
   ipcMain.on    ('db:cancel', (e, id)  => dbWorker.postMessage({ kind: 'cancel', id }));
   ```
3. **Worker (`db.worker.ts`)**
   ```ts
   const db = new duckdb.Database(':memory:');
   parentPort?.on('message', async (msg) => {
     switch (msg.kind) {
       case 'import': /* COPY FROM ... */ break;
       case 'query':  /* runQuery(msg)   */ break;
       case 'cancel': /* conn.interrupt()*/ break;
     }
   });
   ```

---

## 3  Message Contract

All messages are JSON-serialisable objects.

### Request (Renderer → Worker)
| Field | Type | Description |
|-------|------|-------------|
| `kind` | `'import' \| 'query'` | Operation type |
| `sql` | `string` | SQL text (for `query`) |
| `opts.limit` | `number` | Page size |
| `opts.offset` | `number` | Starting row |
| `id` | `string` | UUID for cancellation |

### Response (Worker → Renderer)
| Field | Type | Description |
|-------|------|-------------|
| `kind` | `'headers' \| 'rows' \| 'error' \| 'done'` | Message subtype |
| `id` | `string` | Mirrors request ID |
| `headers` | `string[]` | Sent once per query |
| `rows` | `Array<unknown[]>` | Up to `limit` rows per batch |
| `error` | `string` | Error message |
| `total` | `number` | Row count (sent with `done`) |

> **Streaming Strategy**  Rows are emitted in batches of `batchSize` (e.g. 10 K). The renderer appends each batch to the TanStack Table model. When the virtual scroll offset hits 80 % of currently buffered rows, it requests the next batch.

---

## 4  Query Flow Example

```mermaid
documentation
sequenceDiagram
    participant UI as Renderer: TanStack Table
    participant P as Preload (dbBridge)
    participant M as Main Process
    participant W as DB Worker

    UI->>P: dbBridge.query('SELECT * FROM t', { limit: 10000, offset: 0 })
    P->>M: ipcRenderer.invoke('db:query', {...})
    M->>W: postMessage({ kind: 'query', sql, opts, id })
    W-->>M: { kind: 'headers', id, headers }
    M-->>P: forward same
    P-->>UI: headers
    loop batches
        W-->>M: { kind: 'rows', id, rows: 10k }
        M-->>P: forward rows
        P-->>UI: append rows
    end
    W-->>M: { kind: 'done', id, total: 1_000_000 }
    M-->>P: forward done
    P-->>UI: done (total rows)
```

---

## 5  Cancellation & Back-pressure

* **Renderer scrolls rapidly upward** → dispatches `dbBridge.cancel(id)` for the in-flight query.  
* Worker receives `'cancel'` → calls `connection.interrupt()`; upon catch, sends `{ kind: 'error', id, error: 'cancelled' }`.
* Renderer can safely dispose buffered rows and start a fresh query for the new scroll range.

---

## 6  Performance Tips

1. **Batched Transfers**  Group ~10 K rows per IPC message to stay below 1 MB payload for smooth 60 FPS.
2. **Arrow IPC**  Optionally encode each batch as Arrow IPC buffers and transfer as `ArrayBuffer` (zero-copy). Requires an Arrow deserializer in the renderer.
3. **Worker Pool**  Maintain a single worker instance; DuckDB is thread-safe internally, but serialise requests to one connection for now. Scale out later with a pool.
4. **Shared Columnar Cache**  Keep previously fetched batches in an LRU map keyed by `offset→rows` so quick scroll back doesn’t re-query.

---

## 7  Next Steps

* Prototype the worker IPC layer and measure throughput with a 5 GB CSV.  
* Experiment with Arrow streaming to compare JSON vs binary transfer costs.  
* Consider using Comlink (or tRPC) for typed RPC wrappers over the message port.
