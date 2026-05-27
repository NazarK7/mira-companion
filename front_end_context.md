# 1. Context and Business Logic (Descrizione Applicativa)

- MiRa Companion is a single-user, offline-first operational archive, disaster recovery, and robotic calibration application for industrial vision systems in automotive and factory environments.
- The application domain centers on Comau MiRa_3D systems, Cognex In-Sight and DataMan devices, and multi-controller robot environments that include ABB, Comau, Fanuc, and Kuka.
- The core business object model is hierarchical and must remain stable: Customer → Plant → Station → Camera → Job / Calibration / License / Robot Backup / Test Image / Maintenance Event / Setup Photo.
- The primary operator workflow is field recovery under time pressure: open one camera context and immediately recover the latest valid backup, calibration context, robot assets, test images, and site notes.
- The calibration workflow is a first-class business capability, not a demo utility. It generates and validates robot poses, visualizes them in 3D, and preserves vendor-specific pose semantics.
- The system is not a runtime controller. It does not directly command robots, cameras, PLCs, or fieldbuses. Inputs are manual uploads, structured data entry, and file imports. Outputs are files, reports, and recovery payloads.
- The system is not multi-user and is not cloud-hosted. The authoritative execution model is local browser access against a private localhost stack on the operator machine.
- Data safety requirements are high because the repository domain includes irreplaceable customer backups, robot programs, calibration datasets, license files, and fault-recovery material.
- Large binary artifacts must be treated as durable operational evidence. Silent overwrite, lossy normalization, and hidden mutation are forbidden.
- The application must preserve a single source of truth per camera installation. Cross-camera asset reuse is allowed only when explicitly modeled and traceable.
- The application must preserve vendor semantics for robot pose conversion. Canonical internal representation is an interchange format, not a license to blur controller-specific meaning.
- The current checked-in workspace is frontend-dominant. README documents a wider Docker, NestJS, Prisma, and PostgreSQL architecture than is physically present in the repository tree. Copilot must distinguish verified workspace code from documented platform contracts.

**Prime Directive**

- Never perform simultaneous multi-file edits without an explicit, user-confirmed plan.
- Never fan out edits across unrelated slices in one pass.
- Start from one owning file, one owning abstraction, or one failing behavior.
- Validate the touched slice before expanding scope.
- Treat multi-file refactors, schema changes, and cross-layer migrations as planned operations that require stepwise confirmation.

# 2. Technology Stack and Architectural Conventions (Stack Tecnologico)

- Frontend platform is Angular 21.2.x.
- Verified Angular package constraints in the workspace are:
  - @angular/core, @angular/common, @angular/compiler, @angular/forms, @angular/platform-browser, @angular/router at ^21.2.0
  - @angular/cdk and @angular/material at ^21.2.10
  - @angular/cli and @angular/build at ^21.2.10
  - @angular/localize at ^21.2.12
  - TypeScript at ~5.9.2
- Angular bootstraps with zoneless execution through provideZonelessChangeDetection().
- Angular routing is lazy and standalone-oriented through loadComponent route entries. Preserve route-level code splitting.
- Angular view transitions are enabled. Prefer router-native view transitions and native CSS transitions or keyframes over third-party animation runtimes.
- Signals are the approved state model. The approved Angular signal API family is signal, computed, input, output, model, and linkedSignal.
- RxJS remains available only as an integration boundary for HTTP, interop, and legacy APIs. Do not expand RxJS for component-local state machines when Signals can express the same logic.
- Angular Material is present and integrated with a custom tokenized SCSS design system.
- Tailwind CSS is v4.3.0 with @tailwindcss/postcss v4.3.0. Styling is token-driven and coexists with Angular Material.
- Native CSS animations, transitions, and router view transitions are the motion baseline. Do not introduce animation frameworks unless a dedicated architectural change is approved.
- Three.js is present at ^0.184.0.
- gl-matrix is present at ^3.4.4.
- 3D rendering is an architectural subsystem, not a loose widget. Viewer lifecycle, memory disposal, and coordinate convention boundaries must be explicit.
- Three.js engine initialization must occur only in the write phase of afterRenderEffect. Do not initialize renderers, scenes, controls, or observers from constructor logic or AfterViewInit in new code.
- Current viewer implementations still rely on AfterViewInit plus effect-driven updates. Treat that pattern as legacy and do not replicate it.
- API integration is wired to <http://localhost:3000/api>. Frontend code already assumes a local NestJS backend boundary.
- Documented backend contract in the repository is:
  - NestJS 11.x
  - Prisma ORM, documented in README as 6.x
  - PostgreSQL 16
  - WSL or Docker-local execution
  - Host-side PostgreSQL access on port 5433
- Backend source code and Prisma schema are not present in this workspace. Do not invent backend modules, DTOs, or schema details that are not explicitly checked in.
- NestJS 11 is the accepted backend framework contract.
- Prisma 7 Rust-Free is the only acceptable future upgrade target, but it is not currently verified from checked-in manifests. Any Prisma 7 adoption must be handled as an explicit backend alignment task.
- PostgreSQL 16 on a WSL or Docker-local host port 5433 is the persistence contract for operational deployments.
- Large backup blobs belong in filesystem or mounted volume storage, with relational metadata in PostgreSQL. Do not store MiRa-scale archives as database BYTEA payloads.

# 3. Development Guidelines (Linee Guida di Stile)

- Prefer Signals over RxJS observables for all component-local and feature-local state.
- Use observable streams only at integration edges, then convert them immediately into signal-driven state with a clear ownership boundary.
- Use computed for all pure derivations.
- Do not use effect as a substitute for derived state.
- Use WritableSignal only for mutable application state that has a clear write owner.
- New forms must use @angular/forms/signals.
- Signal forms must not use legacy template bindings such as [value], [(ngModel)], or ad hoc input mirroring.
- Legacy ReactiveFormsModule usage is transitional. Do not copy legacy form patterns into new feature work.
- Use inject() for dependency acquisition. Constructor injection is forbidden for services, router state, tokens, and framework collaborators.
- Constructor usage is acceptable only for non-DI class initialization that cannot be expressed more cleanly elsewhere.
- Use modern Angular template control flow exclusively:
  - @if
  - @for with explicit track expressions
  - @switch
- Do not introduce *ngIf,*ngFor, or *ngSwitch in new code.
- Preserve standalone-component conventions and zoneless-safe change detection.
- Keep public state explicit. Avoid hidden mutable module state.
- Isolate robot-convention conversion logic in dedicated utility layers. UI components must not implement vendor-specific math inline.
- Preserve a canonical internal pose format and map to vendor formats only through dedicated conversion functions.
- Three.js viewers must separate:
  - input normalization
  - scene initialization
  - geometry rebuild
  - render scheduling
  - disposal
- Backend file ingestion must be atomic at the application level.
- Multer-backed file intake and Prisma-backed metadata writes must be treated as one logical transaction.
- Wrap relational writes in Prisma $transaction and couple blob promotion, rollback, and cleanup to that transaction boundary.
- No endpoint may leave orphaned files, orphaned metadata, or partially committed job assets.
- Every destructive operation must have a traceable target identity and an explicit user action.
- Never collapse ABB, Comau, Fanuc, and Kuka orientation rules into a shared Euler shortcut.

# 4. Error Handling and Logging (Gestione degli Errori)

- Network and async state handling must be explicit and stateful.
- Standardize remote resource flows on Angular httpResource when building or refactoring fetch-driven feature state.
- Consume remote state through explicit state branches:
  - isLoading for pending UI
  - error for failure UI
  - value for ready UI
- Use local loading signals only for user-initiated mutations, long-running exports, uploads, or blocking transitions.
- Treat backend-unreachable conditions as first-class failures. Localhost transport failure must produce a deterministic operator-facing message and a non-ambiguous retry path.
- Do not hide async failures behind console-only logging.
- Business validation belongs in NestJS DTO validation and domain services.
- Validate incoming payloads with class-validator.
- Return structured validation failures with field-level detail and deterministic error messages suitable for direct UI presentation.
- Domain failures must be distinguishable from transport failures.
- Do not encode business-rule failure as a generic 500.
- Log operational failures with context identifiers that allow recovery tracing:
  - customer identifier
  - plant identifier
  - station identifier
  - camera identifier
  - job identifier
  - asset identifier
- Never log raw binary payloads, backup contents, license contents, or personally identifying field dumps.
- Telemetry and MQTT streams, when introduced, must write incoming payloads directly into WritableSignals.
- Derive computed telemetry state from computed, not from effect.
- Do not use effect to mirror one piece of reactive state into another.
- Maintain explicit connection-state signals for telemetry:
  - connected
  - disconnected
  - reconnecting
  - last message timestamp
  - last protocol error
- Stream handlers must be idempotent and resilient to duplicate payloads.
- 3D viewer failures must fail closed. If geometry or renderer initialization fails, release resources, surface a visible UI error state, and avoid partial scene reuse.
- Export, upload, and import flows must expose deterministic progress or busy state through signals.

# 5. Security and Persistence Standards (Standard di Sicurezza)

- The system is local and private, but it still handles safety-critical recovery data. Treat local-only execution as an operational constraint, not as a reason to lower discipline.
- Keep all persistence paths deterministic, traceable, and backup-friendly.
- Preserve filesystem blobs and relational metadata separately.
- Compute and store integrity metadata for critical artifacts whenever the backend layer exists, including file size and content hash.
- Do not overwrite artifact files in place. Version new uploads and preserve history.
- Vendor Euler and pose conventions must remain totally isolated.
- ABB quaternion ordering, Comau AER ZYZ intrinsic semantics, Fanuc WPR XYZ extrinsic semantics, and Kuka ABC ZYX intrinsic semantics must never share a lossy intermediary representation in UI logic.
- Canonical pose conversion is the only approved bridge between vendor formats.
- A conversion utility may translate between vendor and canonical. A UI component may not reinterpret vendor semantics on its own.
- Disaster recovery payload generation is a critical path and must remain non-blocking.
- JSZip ^3.10.1 and jsPDF ^4.2.1 are declared dependencies for recovery packaging and reporting.
- Recovery payload generation must run through Web Workers or asynchronous wrapper services coordinated by UI loading signals.
- Do not block the main thread while building ZIP archives, PDF procedures, or large customer export bundles.
- Export flows must provide explicit busy, success, and failure states and must support cancellation where practical.
- Recovery payloads must be reproducible and auditable. Generated archives must identify source camera, asset versions, and generation timestamp.
- No export routine may mix assets from different cameras or controller conventions without an explicit, typed aggregation rule.
- Localhost-only deployment is mandatory by default.
- Do not add remote exposure, shared auth surfaces, or cloud sync paths without an explicit architecture decision.
- High-value robot and calibration assets must remain recoverable even when the frontend state is lost. Persist authoritative records outside browser-only storage.
- Browser-local caching is a convenience layer only. It is never the source of truth for disaster recovery artifacts.
