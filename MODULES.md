# MODULES (Prompt 2)

Paste the import lines and the `imports: []` entries below into
`apps/api/src/app.module.ts` under the existing comment
`// === PROMPT 2 MODULES GO HERE ===`.

## Import statements

```ts
import { JobsModule } from "./jobs/jobs.module";
import { SearchModule } from "./modules/search/search.module";
import { StatsModule } from "./modules/stats/stats.module";
import { AiModule } from "./modules/ai/ai.module";
import { CveModule } from "./modules/cve/cve.module";
import { BountyModule } from "./modules/bounty/bounty.module";
import { VdpModule } from "./modules/vdp/vdp.module";
import { PayloadsModule } from "./modules/payloads/payloads.module";
import { ChecklistsModule } from "./modules/checklists/checklists.module";
import { VaultModule } from "./modules/vault/vault.module";
import { ExportModule } from "./modules/export/export.module";
import { ImportModule } from "./modules/import/import.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
```

## `imports: []` entries

Add these to the `imports` array of `@Module({ ... })`. `JobsModule` is
`@Global` and provides the BullMQ queues that CVE / VDP / Export / Webhooks
producers inject, so keep it first among the Prompt 2 modules.

```ts
    // --- feature modules (Prompt 2 scope) ---
    JobsModule,
    SearchModule,
    StatsModule,
    AiModule,
    CveModule,
    BountyModule,
    VdpModule,
    PayloadsModule,
    ChecklistsModule,
    VaultModule,
    ExportModule,
    ImportModule,
    WebhooksModule,
```

No changes to the `providers: []` array are required — all Prompt 2 guards are
applied at the controller level with `@UseGuards(RolesGuard)`.
