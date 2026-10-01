# AI jobs

How bot moves, game analyzes and Hexplorer positions are computed by AI workers.

Code: `src/server/ai-jobs/`, workers in [hex-ai-distributed](https://github.com/playhex/hex-ai-distributed).
Protocol and job types: `src/server/ai-jobs/protocol.ts` (copied in hex-ai-distributed `src/shared/protocol.ts`).

## Overview

```mermaid
flowchart LR
    bots["Bots (AIConfig)<br>engine + config"]
    hexplorer["Hexplorer"]
    analyze["Game analyze<br>1 job per move"]
    deep["Deep analyze<br>of a single move"]

    subgraph hex["hex server: AiJobService, one queue per job type"]
        direction TB
        q1["katahex-intuition-move"]
        q2["katahex-mcts-move"]
        q3["mohex"]
        q4["davies"]
        q5["katahex-intuition-analyze-position"]
        q7["katahex-mcts-analyze-position"]
        q6["katahex-intuition-analyze-move"]
        q8["katahex-mcts-analyze-move"]
    end

    subgraph workers["Workers, pull jobs from /api/ai-workers<br>HTTPS long-polling, Bearer AI_WORKER_KEY"]
        direction TB
        wk["playhex/worker-katahex<br>ENGINE=katahex"]
        wm["playhex/worker-mohex<br>ENGINE=mohex"]
        wd["playhex/worker-davies<br>ENGINE=davies"]
    end

    bots -- "katahex, maxPlayouts: 0" --> q1
    bots -- "katahex, maxPlayouts > 0" --> q2
    bots -- "mohex" --> q3
    bots -- "davies" --> q4
    hexplorer -- "katahex-intuition" --> q5
    hexplorer -- "katahex-mcts" --> q7
    analyze --> q6
    deep --> q8

    q1 --> wk
    q5 --> wk
    q6 --> wk
    q2 -. "opt-in: AI_JOB_TYPES" .-> wk
    q7 -. "opt-in" .-> wk
    q8 -. "opt-in" .-> wk
    q3 --> wm
    q4 --> wd
    q4 -. "dev only" .-> local["davies computed by hex server<br>no worker needed"]
```

## Names

| Bot (AIConfig)                    | Job type = queue                     | Task data                      | Worker engine | Docker image             |
|-----------------------------------|--------------------------------------|--------------------------------|---------------|--------------------------|
| `katahex`, `maxPlayouts: 0`       | `katahex-intuition-move`             | `KatahexMoveInput`             | `katahex`     | `playhex/worker-katahex` |
| `katahex`, `maxPlayouts: N > 0`   | `katahex-mcts-move`                  | `KatahexMctsMoveInput`         | `katahex`     | `playhex/worker-katahex` |
| `mohex`, `maxGames`               | `mohex`                              | `MohexMoveInput`               | `mohex`       | `playhex/worker-mohex`   |
| `davies`, `level`                 | `davies`                             | `DaviesMoveInput`              | `davies`      | `playhex/worker-davies`  |
| (Hexplorer, intuition)            | `katahex-intuition-analyze-position` | `AnalyzePositionInput`         | `katahex`     | `playhex/worker-katahex` |
| (Game analyze, one job per move)  | `katahex-intuition-analyze-move`     | `AnalyzeMoveInput`             | `katahex`     | `playhex/worker-katahex` |
| (Hexplorer, MCTS)                 | `katahex-mcts-analyze-position`      | `MctsAnalyzePositionInput`     | `katahex`     | `playhex/worker-katahex` |
| (Deep analyze of a single move)   | `katahex-mcts-analyze-move`          | `MctsAnalyzeMoveInput`         | `katahex`     | `playhex/worker-katahex` |
| `random`                          | none, computed by server             |                                |               |                          |

- **Engine**: AI program run by a worker (`ENGINES` in protocol). One worker process runs one engine.
- **Job type**: kind of task, and name of its queue (`AI_JOB_TYPES` in protocol). Determines the engine.
  Bot to job type: `getBotJobType()` in `botTasks.ts`.
- **Task**: `{ type: <job type>, data: <input> }`, what is sent to the worker.
- **Job**: a task in a queue, with a `jobId`, `meta` (i.e `analyzeId` for game analyzes) and `expiresAt`.
- **Worker**: a process pulling jobs. Identified by `workerId` (random uuid on start), authenticated by a key (`PlayerAiWorkerKey`).
  A key can be used by multiple workers. Processes default job types of its engine, or the ones listed in `AI_JOB_TYPES` env var.
- **Opt-in job types**: `katahex-mcts-*` (`OPT_IN_AI_JOB_TYPES` in protocol), require more computing power.
  Not processed by default, only by workers listing them in `AI_JOB_TYPES`.
  So katahex bots with `maxPlayouts > 0`, Hexplorer MCTS and deep analyzes are available only when such a worker is connected.
- **Playouts**: set by bots config (`maxPlayouts`) for bot moves,
  and by server (`MCTS_PLAYOUTS` in `src/shared/app/mctsSettings.ts`) for analyzes, clients cannot choose them.
  `MCTS_PLAYOUTS` is part of MCTS analyzes cache keys (`analysisCacheKey()`), so it can be changed between releases.

## Dev and prod

`createAiJobQueue()` in `AiJobService.ts` chooses the queue implementation:

```mermaid
flowchart TB
    choice{"NODE_ENV=production<br>and REDIS_URL?"}

    choice -- yes --> bull["<b>BullMqAiJobQueue</b> (prod)<br>jobs in redis<br>single hex instance only<br><br>one bullmq Queue + Worker per job type<br>queue name: ai-&lt;job type&gt;<br>redis prefix: &lt;REDIS_PREFIX&gt;-ai-jobs<br>i.e keys hex-ai-jobs:ai-mohex:*<br><br>jobId: &lt;job type&gt;-&lt;bullmq id&gt;, i.e mohex-12<br><br>davies needs a davies worker"]

    choice -- no --> memory["<b>InMemoryAiJobQueue</b> (dev)<br>jobs in memory, lost on restart<br><br>jobId: incremental, i.e 12<br><br>davies computed by the server<br>(local processor, no worker needed)<br>katahex and mohex need a worker"]
```

In both cases, jobs waiting when server starts are removed (nobody waits their result anymore),
and game analyzes not finished are marked as errored.

bullmq `Worker` is not used to process jobs, only to reserve them with a token (`getNextJob`)
and to move back stalled jobs to waiting. Jobs are processed by remote workers.

## Job lifecycle

```mermaid
sequenceDiagram
    participant S as AiJobService
    participant Q as Queue (redis or memory)
    participant C as AiWorkerController
    participant W as Worker (ENGINE=mohex)

    W->>C: POST /jobs/next { types: [mohex], workerId }
    Note over C,Q: held up to 25s (LONG_POLL_MS),<br>then 204 and worker asks again

    S->>Q: submit({ type: mohex, data }, { expiresAt })
    Q-->>C: reserve(types): job + token
    C-->>W: 200 { jobId, token, task }

    loop every 10s (HEARTBEAT_MS)
        W->>C: POST /jobs/:jobId/heartbeat { token }
        C->>Q: extend lock 30s (LOCK_MS)
    end

    W->>C: POST /jobs/:jobId/result { token, result }
    C->>C: validateAiResult (legal move...)
    C->>Q: complete(jobId, token, result)
    Q-->>S: onCompleted(job, result)
```

- **Priority**: a worker processing multiple job types gets jobs by `AI_JOB_TYPES` order
  (bot moves, then Hexplorer, then game analyzes and deep analyzes), then oldest first in a queue.
  A queue without any worker does not block other queues.
- **No heartbeat for 30s** (worker killed, laptop closed): job is given to another worker, up to 3 times, then fails.
  The old worker gets 409 and abandons the job.
- **fail with retryable** (engine crashed): job is given to another worker. **Not retryable** (unsupported task): job fails.
- **Expired** (`expiresAt`, i.e bot clock elapsed): job fails instead of being given to a worker.
- **401**: key invalid or revoked, worker stops.

Online workers are tracked in memory by `AiWorkersRegistry` (seen in the last 60s),
used to know which AIs are available (`/api/ai-configs-status`), and shown in `/api/admin/ai-workers`.

## Game analyze

```mermaid
flowchart LR
    game["Game, N moves"] -- "splitToAnalyzeMoveInputs()" --> jobs["N jobs<br>katahex-intuition-analyze-move<br>meta: analyzeId"]
    jobs --> workers["katahex workers,<br>in parallel"]
    workers -- "each result" --> progress["consolidateGameAnalyze()<br>emit websocket 'analyze' (partial)"]
    progress -- "all moves done" --> db["GameAnalyze saved in database"]
```

Partial results are kept in memory only: if server restarts, the analyze is marked as errored and can be requested again.

Moves not taken by a worker within 1h fail (null in analyze).
10 minutes later, the analyze ends anyway with moves analyzed so far,
in case a move job is still waiting in queue with no worker left to take it.

## Deep analyze of a move

Once a game analyze has ended, a logged in player can request a deep analyze of any move
(`PUT /api/games/:publicId/analyze/moves/:moveIndex/mcts`, rate limited per player).

```mermaid
flowchart LR
    player["Player"] -- "PUT .../moves/:moveIndex/mcts" --> job["1 job<br>katahex-mcts-analyze-move<br>maxPlayouts: MCTS_PLAYOUTS"]
    job --> worker["katahex worker<br>with opt-in mcts job types"]
    worker -- "result" --> db["analyze[moveIndex].mcts<br>saved in GameAnalyze"]
    db --> ws["emit websocket 'analyze'"]
    worker -- "failed or timeout (10 min)" --> failed["emit websocket 'analyzeMoveMctsFailed'"]
```

- Intuition analyze of the move is kept, deep analyze is added in `mcts`, and displayed instead of intuition.
- A move already deeply analyzed, or being analyzed, is not analyzed again (pending analyzes kept in memory by `GameAnalyzeController`).
- Results of a same game are saved one after the other, to not lose one when two finish at the same time.
