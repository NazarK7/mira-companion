# Roadmap

> Piano dettagliato di sviluppo. Status aggiornato a ogni round di consegna codice.

**Legenda**:

- ✅ Completato
- 🔄 In corso
- 📋 Pianificato
- 🔮 Futuro / opzionale
- ❌ Bloccato (specificato motivo)

---

## Visione complessiva

Il progetto è strutturato in **8 fasi**. Ogni fase ha un obiettivo verificabile e produce un'app **utilizzabile** a quel livello, anche se non completa. Si procede solo dopo aver validato la fase precedente.

| Fase | Nome | Obiettivo | Tempo stimato part-time |
| --- | --- | --- | --- |
| 0 | Foundation | Setup, design system, domain model | 1-2 sessioni |
| 1 | Core archive | CRUD gerarchico Customer→Plant→Station→Camera | 2-3 settimane |
| 2 | Geometry engine | Calcoli geometrici, pose conversions, plate suggester | 2-3 settimane |
| 3 | Calibration wizard | Pose generator, 3D viewer, workflow OK/KO | 3-4 settimane |
| 4 | Job & robot integration | Job CRUD, robot program parser, soglie coerence check | 2-3 settimane |
| 5 | Recovery kit | ZIP + PDF generator, procedura recovery custom | 2 settimane |
| 6 | Quality of life | Photo gallery, issues, search, tags, audit log, dark mode | 2-3 settimane |
| 7 | Mobile + polish | Responsive, design polish con Claude design tool | 1-2 settimane |
| 8 | Distribution | Tauri packaging (opzionale) | 1 settimana |

**Totale stimato**: 14-20 settimane part-time. È un progetto serio, non un weekend hack.

---

## Fase 0 — Foundation 🔄

**Obiettivo**: scaffolding del progetto Angular 21, design system, modello dati canonico.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Decisioni architetturali (stack, modello, scope) | ✅ | Documentate in chat history |
| Setup Angular 21 + dipendenze (Material, Three.js, Tailwind v4, Dexie, etc.) | ✅ | `SETUP.md` consegnato |
| Domain model TypeScript completo | ✅ | `src/app/core/models/domain.model.ts` |
| Design tokens stile Comau (CSS variables, dark mode) | ✅ | `src/styles/_tokens.scss` |
| Tailwind v4 config + bridge sui tokens | ✅ | `tailwind.config.ts` |
| Global styles (typography, reset, scrollbar) | ✅ | `src/styles.scss` |
| README progetto | ✅ | `README.md` |
| Roadmap (questo file) | ✅ | `ROADMAP.md` |
| Verifica `ng build` senza errori dopo copia file | 🔄 | (utente sta validando) |
| Setup repo Git locale | 📋 | `git init`, primo commit |

### Definition of Done della fase

- [x] Domain model compila con TypeScript strict
- [x] Design tokens accessibili via CSS variables in light e dark
- [x] Tailwind utilities funzionano (`bg-primary-500`, `text-text-primary`, etc.)
- [ ] `ng serve` parte e mostra una shell base
- [ ] Repo Git inizializzato

### Note

- Il setup è il momento giusto per inizializzare Git. Comando: `git init && git add . && git commit -m "Initial scaffolding"`.
- Tutti i file `node_modules/` e `dist/` vanno in `.gitignore` (Angular CLI lo crea già).

---

## Fase 1 — Core Archive 📋

**Obiettivo**: CRUD completo della gerarchia Customer → Plant → Station → Camera. Persistenza su filesystem locale. Niente calibrazione, niente job, niente vision: solo dati strutturali.

A fine fase l'app fa: "creo un Customer Volvo, dentro un Plant Torslanda, dentro una Station 17-54-020, dentro una Camera Right Side. Salvo. Chiudo browser. Riapro. I dati sono lì."

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Storage service (File System Access API + Dexie cache) | 📋 | `src/app/core/services/storage.service.ts` |
| Archive service (gestione `ArchiveState`, audit log) | 📋 | `src/app/core/services/archive.service.ts` |
| Project structure on filesystem (cartelle per customer/plant/station) | 📋 | Logica in `archive.service.ts` |
| App shell (header, sidebar, main outlet) | 📋 | `src/app/app.component.{ts,html,scss}` |
| Routing setup | 📋 | `src/app/app.routes.ts` |
| Dashboard component (lista customer + recenti) | 📋 | `src/app/features/dashboard/` |
| Customer CRUD | 📋 | `src/app/features/customer-detail/` |
| Plant CRUD | 📋 | `src/app/features/plant-detail/` |
| Station CRUD | 📋 | `src/app/features/station-detail/` |
| Camera CRUD (solo metadati base, no calibrazione né job) | 📋 | `src/app/features/camera-detail/` |
| Contact management (riusabile su Customer/Plant) | 📋 | `src/app/shared/components/contact-list/` |
| Settings dialog (cartella radice, lingua, theme, encryption toggle) | 📋 | `src/app/features/settings/` |
| First-run wizard (chiede cartella radice progetti) | 📋 | `src/app/features/first-run/` |
| Theme switcher (light/dark/auto) | 📋 | `src/app/core/services/theme.service.ts` |

### Definition of Done della fase

- [ ] Posso creare/editare/eliminare Customer, Plant, Station, Camera in cascata
- [ ] I dati persistono tra sessioni (chiusura browser → riapertura)
- [ ] Posso esportare l'intero archivio come zip e re-importarlo
- [ ] Audit log registra tutte le modifiche
- [ ] Theme switching funziona

### Decisioni da prendere durante la fase

- Se l'utente non concede permesso File System Access API, fallback a download/upload manuale o IndexedDB-only?
- Naming convention cartelle: `Customer/Plant/Station/Camera/` con slug del nome o con UUID?
  - Proposto: slug del nome (più leggibile per ispezione manuale del filesystem)
- Strategia migrations dello schema (se in futuro cambiamo il `ArchiveState` shape)?

---

## Fase 2 — Geometry Engine 📋

**Obiettivo**: tutto il calcolo geometrico, in pure functions con test unitari completi. Niente UI ancora.

A fine fase: importo i test, li lancio, tutto verde. So che la geometria è certificata.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Pose conversions: canonical ↔ ABB / Comau / Fanuc / Kuka | 📋 | `src/app/core/utils/pose-conversions.util.ts` |
| Test unitari pose conversions (round-trip, edge cases) | 📋 | `pose-conversions.util.spec.ts` |
| Camera geometry: FOV, sensor size, pixel-to-mm | 📋 | `src/app/core/utils/camera-geometry.util.ts` |
| Plate suggester (data camera + distanza → plate ottimale) | 📋 | Funzione in `camera-geometry.util.ts` |
| DOF calculator | 📋 | Funzione in `camera-geometry.util.ts` |
| Plate visibility check (data una pose → vede plate? coverage?) | 📋 | `src/app/core/utils/plate-visibility.util.ts` |
| Pose similarity metric (distanza pesata 6DOF) | 📋 | `src/app/core/utils/pose-similarity.util.ts` |
| Test unitari camera geometry | 📋 | `*.spec.ts` |
| Coherence checker per soglie (4 livelli) | 📋 | `src/app/core/utils/threshold-coherence.util.ts` |
| Test coherence checker | 📋 | `*.spec.ts` |

### Definition of Done della fase

- [ ] Conversioni pose round-trip (canonical → controller → canonical) ritornano identità entro tolleranza numerica per tutti e 4 i controller
- [ ] FOV calcolato per camera Matrox Iris GTR 12mm a 950mm = ~63x40cm (validato con valori reali)
- [ ] Plate suggester per FOV 63x40cm suggerisce caltab250mm con coverage ~16%
- [ ] DOF a f/2.8 12mm 950mm calcola ~316mm (validato)
- [ ] Plate visibility check identifica correttamente pose con plate fuori FOV
- [ ] Coherence checker flagga setup con `detector_limits < robot_limits`

### Riferimenti tecnici

- Formula DOF: `DOF_tot ≈ 2·N·c·s²/f²` (approssimazione lontana iperfocale)
- Convenzioni rotazioni dai manuali vendor (ABB Tech Ref, Fanuc Karel Ref Manual, KUKA KRL Programming, Comau PDL2)
- Halcon plate sizes: caltab30, 50, 80, 125, 150, 200, 250, 320, 400, 500 mm

---

## Fase 3 — Calibration Wizard 📋

**Obiettivo**: il workflow di calibrazione assistita end-to-end. È il **task principale** del progetto.

A fine fase: dato anchor pose + camera config, ottengo 20 pose generate, le visualizzo in 3D, le marco OK/KO/override, l'app rigenera dinamicamente le successive in base a quelle confermate.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Pose generator algoritmo (greedy maximin con vincoli) | 📋 | `src/app/core/utils/pose-generator.util.ts` |
| Test pose generator (copertura, distinguibilità, plate visibility) | 📋 | `*.spec.ts` |
| Three.js setup base (scene, camera, lights, OrbitControls) | 📋 | `src/app/shared/components/three-viewer/` |
| Plate rendering 3D (textured square con dot pattern) | 📋 | `three-viewer/plate-mesh.ts` |
| Camera frustum rendering (piramide con FOV reale) | 📋 | `three-viewer/camera-frustum.ts` |
| Pose markers 3D (colore per status) | 📋 | `three-viewer/pose-marker.ts` |
| Visibility lines plate ↔ camera | 📋 | `three-viewer/visibility-lines.ts` |
| Calibration wizard component (multi-step) | 📋 | `src/app/features/calibration-wizard/` |
| Step 1: Setup geometrico (distanza, plate, camera config) | 📋 | `wizard-step-setup/` |
| Step 2: Anchor pose input (controller-specific format) | 📋 | `wizard-step-anchor/` |
| Step 3: Generated poses + 3D viewer + table | 📋 | `wizard-step-poses/` |
| Pose status update UI (OK/KO/skip/override) | 📋 | `pose-status-editor/` |
| Pose timeline (clickable, mostra stato di ogni pose) | 📋 | `pose-timeline/` |
| Override coordinates input + auto-recompute remaining | 📋 | Logica in `calibration-wizard.service.ts` |
| Step 4: Calibration result upload (ToolInCamPose.dat) | 📋 | `wizard-step-result/` |
| Step 5: Validation (rotation around lens center test) | 📋 | `wizard-step-validation/` |
| Salvataggio Calibration in Camera.calibration_history | 📋 | `archive.service.ts` extension |

### Definition of Done della fase

- [ ] Genero 20 pose da una anchor, sono tutte raggiungibili in teoria (visibilità plate OK)
- [ ] 3D viewer mostra plate + 20 frustum colorati per status
- [ ] Marco una pose KO con coordinate alternative → le successive si rigenerano
- [ ] Le pose finali rispettano: tilt 30-60° tra pose, translation 40-50cm, plate coverage 12-20%
- [ ] Salvo la calibrazione, esce, rientro: stato preservato correttamente
- [ ] Posso vedere lo storico calibrazioni e quale è current

### Decisioni da prendere durante la fase

- L'algoritmo deterministico o con seed casuale? Proposto: deterministico (riproducibile)
- Pesi α e β per la similarity 6DOF (mm vs gradi): tarare empiricamente su 5-10 setup test
- Visualizzazione 3D: orbit attorno a plate o attorno a robot base? Proposto: plate (più chiaro)

---

## Fase 4 — Job & Robot Integration 📋

**Obiettivo**: Job CRUD completo, parser dei backup robot (almeno ABB), coherence check soglie, validation runs.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Job editor component | 📋 | `src/app/features/job-editor/` |
| Master image upload + viewer | 📋 | `master-image-uploader/` |
| Detector params form (con limits, time, match score, search range) | 📋 | `detector-params-form/` |
| Advanced params form | 📋 | `advanced-params-form/` |
| `vision_tool_slot` validation (deve essere unico per camera) | 📋 | Logica in `job.service.ts` |
| Object in tool position input | 📋 | Form con conversione controller |
| Job export `.zip` upload + storage | 📋 | `job-zip-uploader/` |
| Validation run inserter (numeri da Continuous Recognition MiRa) | 📋 | `validation-run-form/` |
| Robot program parser ABB | 📋 | `src/app/core/utils/robot-parsers/abb-parser.util.ts` |
| Auto-extract: Config.txt, VisionTools.txt, soglie | 📋 | Funzioni in parser |
| Robot program parser Comau (placeholder) | 🔮 | Quando avremo backup esempio |
| Robot program parser Fanuc (placeholder) | 🔮 | Quando avremo backup esempio |
| Robot program parser Kuka (placeholder) | 🔮 | Quando avremo backup esempio |
| Robot integration form (network, thresholds, correction_enabled) | 📋 | `robot-integration-form/` |
| Coherence check UI (warnings su mismatch soglie) | 📋 | `coherence-check-panel/` |
| Camera detail view (panoramica completa: jobs, calibrations, robot, photos) | 📋 | `camera-detail/` extension |

### Definition of Done della fase

- [ ] Carico backup ABB zip → parser estrae IP, slot vision tools, soglie
- [ ] Creo Job con `vision_tool_slot=1`, salvo. Provo a creare altro job con stesso slot → errore
- [ ] Inserisco soglie robot inconsistenti con MiRa detector limits → warning visibile
- [ ] Vedo riepilogo Camera con tutti i suoi Job, calibration corrente, ultima validation run

---

## Fase 5 — Recovery Kit 📋

**Obiettivo**: il deliverable finale per il cliente. Un click → zip + PDF completi.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Recovery kit generator service | 📋 | `src/app/core/services/recovery-kit.service.ts` |
| ZIP packaging con JSZip (struttura cartelle definita) | 📋 | Logica in service |
| README_FIRST.md template | 📋 | Template con placeholder |
| Recovery procedure PDF template (jsPDF) | 📋 | `src/app/core/services/recovery-pdf.service.ts` |
| Customizzazione procedura per controller robot | 📋 | Templates per ABB/Comau/Fanuc/Kuka |
| Recovery kit wizard UI | 📋 | `src/app/features/recovery-kit/` |
| Selettore file da includere (camera image, backup release, robot program, etc.) | 📋 | `recovery-kit-selector/` |
| Preview PDF prima di esportare | 📋 | `recovery-pdf-preview/` |
| Export su filesystem | 📋 | Via File System Access API |
| Storico recovery kit generati per camera | 📋 | Salvati in `Backup[]` con type='recovery_kit' |
| Handover document PDF (manuale operativo per cliente) | 📋 | `handover-document.service.ts` |
| Certification PDF (calibrazione validata, soglie configurate) | 📋 | `certification.service.ts` |

### Definition of Done della fase

- [ ] Esporto Recovery Kit per camera Volvo Right Side
- [ ] Lo zip contiene: aomei image, release backup, halcon license, comau license, calibration files, jobs, robot program, README, procedure PDF
- [ ] PDF è ben formattato, contiene IP, contatti, percorsi specifici
- [ ] Re-import del kit ricostruisce dati Camera (per disaster recovery di MiRa Companion stesso)

---

## Fase 6 — Quality of Life 📋

**Obiettivo**: tutte le piccole cose che migliorano l'esperienza quotidiana ma non sono core.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Photo gallery component | 📋 | `src/app/shared/components/photo-gallery/` |
| Photo upload + categorizzazione | 📋 | `photo-uploader/` |
| Issue tracker per camera | 📋 | `src/app/features/issues/` |
| Tag manager | 📋 | `src/app/shared/components/tag-input/` |
| Search globale (cross-customer/plant/station) | 📋 | `src/app/features/search/` |
| Audit log viewer | 📋 | `src/app/features/audit-log/` |
| Calendar view (timeline interventi) | 📋 | `src/app/features/calendar/` |
| Risk assessment automatico | 📋 | `src/app/core/services/risk-assessment.service.ts` |
| Calculatori standalone (DOF, FOV, plate suggester) | 📋 | `src/app/features/calculators/` |
| Bulk export/import archivio | 📋 | `src/app/features/archive-io/` |
| Encryption attivo per dati sensibili (SubtleCrypto) | 📋 | `src/app/core/services/encryption.service.ts` |
| i18n IT/EN completa | 📋 | `src/locale/messages.it.xlf`, `messages.en.xlf` |

### Definition of Done della fase

- [ ] Cerco "12mm" → trovo tutte le camere con quella focale
- [ ] Tag "body-side" aggregato su 5 stazioni → click filtra
- [ ] Risk assessment segnala camera con calibrazione vecchia >6 mesi
- [ ] Encryption attivo: contatti cliente cifrati a riposo, decifrati on-demand

---

## Fase 7 — Mobile + Polish 📋

**Obiettivo**: app consultabile da iPhone in plant. Polish estetico finale con Claude design tool.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Responsive layout audit | 📋 | Tutti i feature components |
| Mobile navigation (bottom bar o drawer) | 📋 | `src/app/shared/components/mobile-nav/` |
| Vista mobile dashboard | 📋 | `dashboard/` extension |
| Vista mobile camera detail | 📋 | `camera-detail/` extension |
| Vista mobile recovery procedure (read-only) | 📋 | `recovery-kit/` extension |
| Disabled features in mobile (calibration wizard, job editor) | 📋 | Routing guard |
| Polish con Claude design tool (microinterazioni, animazioni, typography) | 📋 | Iterazione UI |
| Loading states + skeleton screens | 📋 | Componenti shared |
| Empty states ben curati | 📋 | Componenti per ogni lista |
| Error handling UI completo (toast, dialog, recovery suggestions) | 📋 | `error-handler.service.ts` |

### Definition of Done della fase

- [ ] App funziona su iPhone 15 Pro Max in Safari
- [ ] Posso consultare dati di una stazione mentre sono on-site
- [ ] Posso leggere recovery procedure dal telefono
- [ ] L'app ha un look professionale, niente "demo da hackathon"

---

## Fase 8 — Distribution 🔮 (opzionale)

**Obiettivo**: distribuire come eseguibile nativo.

### Tasks

| Task | Status | File / Output |
| --- | --- | --- |
| Tauri 2 setup | 🔮 | `src-tauri/` |
| Bundle Windows .exe | 🔮 | `dist/` |
| Bundle macOS .app | 🔮 | `dist/` |
| Bundle Linux AppImage | 🔮 | `dist/` |
| Auto-update mechanism | 🔮 | Tauri updater |
| Code signing (Windows + macOS) | 🔮 | Cert acquisition needed |

### Quando attivare questa fase

- Se vuoi distribuire ai colleghi (1+ Vision Engineer in azienda)
- Se vuoi consegnarla a un cliente come parte del servizio
- Se vuoi un eseguibile portable senza dipendenze

---

## Backlog generale

Cose da considerare ma non ancora pianificate:

- 🔮 ML anomaly detection sui validation runs (predici quale job sta per degradare)
- 🔮 Comparazione visiva master image storiche (drift nel tempo)
- 🔮 Integration con RobotStudio / RoboGuide per simulazione cinematica calibrazione
- 🔮 Sync via Google Drive personale (multi-device, no cliente)
- 🔮 Plugin system per parser robot di altri vendor (Stäubli, Yaskawa)
- 🔮 Voice notes durante installazione (più veloce che typing)
- 🔮 OCR di foto delle etichette (MAC address, serial number, IP da label cella)
- 🔮 Dashboard analytics (numero installazioni per cliente, tempo medio calibrazione, etc.)

---

## Track del lavoro

### Round 1 (consegnato)

- ✅ Setup instructions
- ✅ Domain model
- ✅ Design tokens + Tailwind config
- ✅ Global styles

### Round 2 (questo)

- ✅ README.md
- ✅ ROADMAP.md (questo file)

### Round 3 (prossimo)

Quando confermi il setup base e questi documenti:

- 📋 `pose-conversions.util.ts` + tests
- 📋 `camera-geometry.util.ts` + tests

---

## Come usare questo documento

Aggiorna i checkbox e gli status man mano che le cose vengono completate. Quando una fase è chiusa, il suo titolo passa da 🔄 a ✅. Quando inizi una nuova, da 📋 a 🔄.

Ogni Round di consegna codice corrisponde idealmente a 2-4 task della roadmap. Alla fine del round, aggiorna la sezione "Track del lavoro".

Se durante lo sviluppo emerge una funzionalità nuova non pianificata, aggiungerla al **Backlog** prima di pianificarla in una fase.
