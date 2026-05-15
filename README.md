# MiRa Companion

> Tool personale di archivio operativo, calibrazione e disaster recovery per camere di visione industriale (Comau MiRa_3D su Matrox + Cognex In-Sight / DataMan) in plant automotive. Dockerizzato su WSL Ubuntu personale, accessibile via browser.

---

## Indice

1. [Cos'è](#cosè)
2. [Cosa supporta](#cosa-supporta)
3. [Cosa NON è](#cosa-non-è)
4. [Architettura](#architettura)
5. [Funzionalità chiave](#funzionalità-chiave)
6. [Modello dati](#modello-dati)
7. [Concetti chiave del dominio](#concetti-chiave-del-dominio)
8. [Workflow utente principali](#workflow-utente-principali)
9. [Stack tecnico](#stack-tecnico)
10. [Strategia backup del tool stesso](#strategia-backup-del-tool-stesso)
11. [Sicurezza](#sicurezza)
12. [Stato del progetto](#stato-del-progetto)

---

## Cos'è

**MiRa Companion** è un'applicazione web personale single-user che centralizza tutti i dati operativi di installazioni di visione industriale automotive: calibrazioni, job di visione, immagini master e di test, backup robot e camera, licenze, commenti e log manutenzione.

Il problema che risolve: ogni installazione produce decine di file critici (`.job`, `.jobx`, backup MiRa3D da 500MB, licenze Halcon, immagini master, programmi robot) che vivono dispersi su PC del cliente, TP del robot, email, chiavette USB. Quando arrivi in cantiere per un fault o devi consegnare un sistema al cliente, recuperarli è lento e rischioso.

MiRa Companion ti dà **una sola fonte di verità per camera**, organizzata Customer → Plant → Station → Camera, con cronologia completa di backup e job. Quando apri una camera in cantiere, in 5 secondi sai: che camera è, che ottica monta, qual è l'ultimo backup, quali job ha, dove sono le foto del setup.

---

## Cosa supporta

Due famiglie di camere/sistemi di visione, ciascuna col suo flow di dati:

### Famiglia 1 — Comau MiRa_3D (host Matrox Iris GTR)

Sistema di robot guidance monocular 6DOF, Halcon `shape_model_3d`, integrazione robot.

**Dati per camera**:

- Modello camera + focale lente (campo libero, no catalogo strict)
- Job MiRa3D (1..N, in date diverse) — ogni job è un singolo **zip di backup ~500MB** che contiene già internamente: pose calibrazione, risultati Halcon (`.dat`), master image, immagini di test
- Licenza Halcon (zip)
- Backup robot (zip dal robottista, in date diverse)
- Commenti per job (cosa riconosce, anomalie note, parametri custom)
- Wizard calibrazione interno (genera le 20 pose, le confermi una a una)

### Famiglia 2 — Cognex (In-Sight Vision Suite, DataMan)

Sistemi di visione standalone, programmati col Setup Tool Cognex.

**Dati per camera**:

- Modello camera + firmware version + focale lente
- Job multipli (1..N) in formato `.job` (legacy) o `.jobx` (corrente). Esempio reale: una camera con 3 job — `1.jobx` (efad motore elettrico), `2.jobx` (erad motore elettrico), `3.jobx` (pallet sense)
- Per ogni job: master image, immagini di test (tipicamente ~20), commenti su funzionamento e parametri
- Backup job in date diverse (ogni modifica significativa = nuovo backup)

### Comune a entrambe le famiglie

- Note PLC opzionali (modello, IP, tipo trigger se utile)
- Log manutenzione opzionale (chi è stato lì, quando, cosa ha cambiato)
- Foto setup (montaggio camera, illuminatori, plate)
- Contatti referente cliente (telefono, email)

---

## Cosa NON è

Per evitare scope creep:

- **Non comunica con la camera né con il robot**. Niente TCP/IP, niente fieldbus, niente SDK. Tutti gli input arrivano da upload manuale o copia-incolla. Tutti gli output sono file che esporti.
- **Non sostituisce MiRa_3D né il Setup Tool Cognex**. La calibrazione la fa Halcon dentro MiRa, il riconoscimento online lo fa MiRa o Cognex, il movimento robot lo fa il controller. Questo tool orchestra e archivia dall'esterno.
- **Non è multi-utente**. Single-user, single-machine. La WSL è personale, su disco SSD, non esposta in rete. No login, no auth.
- **Non gira in cloud**. Tutto in locale, in Docker su WSL. I dati sono fisicamente sul tuo disco.

---

## Architettura

Tre servizi Docker su WSL Ubuntu personale:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Chrome/Edge)                   │
│                          http://localhost:8080                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Docker host (WSL Ubuntu personale)                 │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐   ┌──────────────┐    │
│  │   Frontend   │    │     Backend      │   │   Postgres   │    │
│  │              │    │                  │   │              │    │
│  │ nginx :80    │◄───┤ NestJS :3000     │◄──┤  :5432       │    │
│  │ Angular 21   │    │ Prisma ORM       │   │  postgres:16 │    │
│  │ static build │    │                  │   │              │    │
│  └──────────────┘    └────────┬─────────┘   └──────┬───────┘    │
│       :8080                   │                    │            │
│                               ▼                    ▼            │
│                      ┌──────────────────────────────────┐       │
│                      │  Volume mount: ./data/           │       │
│                      │    ├── postgres/   (DB data)     │       │
│                      │    └── blobs/      (file ZIP,    │       │
│                      │                     immagini)    │       │
│                      └──────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

**Perché backend e non più local-first browser-based**: cancelli spesso i dati del browser, ti serve persistenza stabile. La WSL è privata, in Docker, su disco fisso. Backup banale (pg_dump + tar volume + docker save). Non c'è esposizione di rete esterna.

**Perché file system per blob e non BYTEA in Postgres**: i backup MiRa3D pesano 500MB l'uno; in DB esploderebbero i dump e le performance. Lo standard industria è: filesystem per blob + DB per path/metadata.

---

## Funzionalità chiave

### Archivio gerarchico

```
Customer (Volvo, Stellantis, BMW...)
   └── Plant (Torslanda, Mirafiori, Dingolfing...)
       └── Station (codice 17-54-020, 18-22-103...)
           └── Camera (Right Side, Left Side, Pallet Check...)
               ├── Job(s) — uno o più, con storico in date
               ├── Calibration(s) — solo MiRa_3D, con storico
               ├── License(s) — solo MiRa_3D (Halcon zip)
               ├── RobotBackup(s) — solo MiRa_3D, con storico
               ├── TestImage(s) — ~20 per job per testing offline
               ├── MaintenanceEvent(s) — log opzionale interventi
               └── Photo(s) — setup fisico
```

### Pagina Camera — il cuore del tool in cantiere

Quando apri una camera, in alto vedi **immediatamente l'ultimo stato**:

- Nome camera, tipo (MiRa3D / Cognex), modello hardware, focale ottica
- **Card grande "Ultimo backup"**: data, dimensione, nome file, commento, pulsante download
- **Card "Job attuali"**: lista compatta dei job correnti (es. 1.jobx, 2.jobx, 3.jobx per Cognex; backup MiRa3D ultima data per Mira)
- Note critiche (PLC IP se inserite, trigger config, contatto referente)

Sotto, in sezioni espandibili:

- **Storico backup**: timeline con cards (data + dimensione + commento) — tipo "stratigrafia" del lavoro fatto
- **Storico calibrazioni** (solo MiRa3D)
- **Tutti i job**: lista completa con master image preview e count test images
- **Test images library**: griglia visiva delle immagini di test salvate
- **Log manutenzione**: timeline interventi
- **Photo setup**

### Wizard calibrazione (solo MiRa_3D)

Workflow tradizionale automatizzato:

1. Utente fornisce **anchor pose** (perpendicolare al plate, fornita dal robottista)
2. Indica camera (sensore, focale), distanza di lavoro, plate disponibile (catalog: 50/70/75/100/150/250/300 mm)
3. Software **genera 20 pose** rispettando vincoli geometrici (tilt 30-60°, traslazione min 150mm, rotazione min 30°, copertura plate 16% FOV)
4. Pose visualizzate in **3D viewer Three.js** con frustum colorati (anchor blu, ok verde, conflitto rosso)
5. Per ogni pose: utente click → popover edit con **POV viewer dalla camera** + form coordinate live-editable + **Conferma**
6. Auto-advance alla pose successiva alla conferma. Pose confermate marcate verde nella tabella.
7. Se modifica una pose già confermata e crea conflitto: warning e regen automatico delle successive non-confermate

### Multi-controller robot

Supporto nativo, conversioni pose bidirezionali validate:

| Controller | Formato pose | Convenzione |
|---|---|---|
| ABB (RobotWare, IRB) | Quaternione `[q1, q2, q3, q4]` | q1 = w (scalare) |
| Comau (C5GPlus, NJ4, NS) | Euler ZYX `[E1, E2, E3]` | E1=Rz, E2=Ry, E3=Rx, intrinsic |
| Fanuc (R-30iB) | WPR `[W, P, R]` | W=Rx, P=Ry, R=Rz, Euler XYZ |
| Kuka (KRC4/5) | ABC `[A, B, C]` | A=Rz, B=Ry, C=Rx |

Internamente le pose sono in formato canonico (quaternione `[qx, qy, qz, qw]` + posizione `[x, y, z]` mm). L'UI mostra il formato del controller selezionato.

### Recovery Kit export (roadmap)

Un click → zip + PDF pronti per il cliente. Contengono:

- Backup completo (camera, job, robot, licenza Halcon)
- File calibrazione (`.dat`)
- Master image e test images
- Procedura recovery in PDF custom per la specifica installazione (IP, percorsi, contatti)

---

## Modello dati

Schema Prisma (DB Postgres). Solo i campi essenziali, dettaglio completo in `backend/prisma/schema.prisma`.

```prisma
model Customer {
  id        String   @id @default(uuid())
  name      String
  contact   String?           // referente, telefono, email — campo libero
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  plants    Plant[]
}

model Plant {
  id         String   @id @default(uuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  name       String
  location   String?
  notes      String?
  stations   Station[]
}

model Station {
  id          String   @id @default(uuid())
  plantId     String
  plant       Plant    @relation(fields: [plantId], references: [id], onDelete: Cascade)
  name        String              // es. "17-54-020"
  description String?             // es. "Front side body assembly"
  cameras     Camera[]
}

enum CameraType {
  MIRA_3D          // Matrox + Halcon, robot guidance 6DOF
  COGNEX_INSIGHT   // In-Sight Vision Suite, standalone
  COGNEX_DATAMAN   // DataMan, barcode/2D code
}

model Camera {
  id              String       @id @default(uuid())
  stationId       String
  station         Station      @relation(fields: [stationId], references: [id], onDelete: Cascade)
  name            String
  type            CameraType
  // Hardware (campo libero, no catalog strict)
  model           String?      // es. "Matrox Iris GTR", "Cognex IS9912"
  focalLengthMm   Float?       // es. 12.0
  firmware        String?      // utile Cognex
  serialNumber    String?
  // Network — TUTTO OPZIONALE
  ipAddress       String?
  // PLC info — TUTTO OPZIONALE (Nazar tipicamente solo plcNotes)
  plcType         String?
  plcIpAddress    String?
  triggerType     String?      // "PROFINET", "EIP", "HARDWIRED", ecc.
  plcNotes        String?      // campo libero per qualsiasi nota PLC
  // Robot (solo MIRA_3D)
  controllerType  String?      // "ABB", "Comau", "Fanuc", "Kuka"
  // Generale
  notes           String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  // Relazioni
  jobs              Job[]
  calibrations      Calibration[]
  licenses          HalconLicense[]
  robotBackups      RobotBackup[]
  testImages        TestImage[]
  maintenanceLog    MaintenanceEvent[]
  photos            Photo[]
}

// ─── JOB ─────────────────────────────────────────────────────────
// Per Cognex: 1 record per ogni .job/.jobx. Esempio: 3 record per
// camera con jobs efad, erad, pallet sense.
// Per MIRA_3D: 1 record per ogni backup MiRa3D (zip ~500MB).
model Job {
  id                String    @id @default(uuid())
  cameraId          String
  camera            Camera    @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  name              String                   // es. "1.jobx (efad motore)"
  slot              Int?                     // 1..99 per Cognex / vision_tool_slot
  description       String?                  // cosa riconosce, modello pezzo
  date              DateTime  @default(now())
  // Master image (PNG/JPG/BMP)
  masterImagePath   String?
  masterImageName   String?
  // Job file (.job / .jobx / .zip Mira3D backup)
  jobFilePath       String?
  jobFileName       String?
  jobFileType       String?                  // "job", "jobx", "mira3d_backup"
  jobFileSize       Int?                     // bytes, utile UX
  notes             String?                  // come funziona, parametri custom
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  testImages        TestImage[]
}

// ─── CALIBRATION (solo MIRA_3D) ──────────────────────────────────
// Il backup MiRa3D contiene già pose+risultati, ma manteniamo
// CalibrationRecord per quando l'utente lavora con il wizard interno
// e vuole salvare il set di 20 pose esplicitamente.
model Calibration {
  id              String   @id @default(uuid())
  cameraId        String
  camera          Camera   @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  name            String
  date            DateTime @default(now())
  poses           Json                       // RobotPose[] serializzato
  halconResultPath String?                   // zip dei .dat se importato
  halconResultName String?
  notes           String?
}

// ─── HALCON LICENSE (solo MIRA_3D) ───────────────────────────────
model HalconLicense {
  id            String    @id @default(uuid())
  cameraId      String
  camera        Camera    @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  licensePath   String
  licenseName   String
  expiryDate    DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
}

// ─── ROBOT BACKUP (solo MIRA_3D) ─────────────────────────────────
// Storico backup robot in date diverse.
model RobotBackup {
  id          String    @id @default(uuid())
  cameraId    String
  camera      Camera    @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  backupPath  String
  backupName  String
  backupSize  Int?
  date        DateTime  @default(now())
  notes       String?
  createdAt   DateTime  @default(now())
}

// ─── TEST IMAGES ─────────────────────────────────────────────────
// Tipicamente ~20 per camera/job, usate per testare i job offline.
model TestImage {
  id          String    @id @default(uuid())
  cameraId    String
  camera      Camera    @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  imagePath   String
  imageName   String
  capturedAt  DateTime  @default(now())
  notes       String?                       // commento opzionale per immagine
  jobId       String?                       // tag opzionale a uno specifico job
  job         Job?      @relation(fields: [jobId], references: [id], onDelete: SetNull)
}

// ─── MAINTENANCE EVENT (opzionale) ───────────────────────────────
model MaintenanceEvent {
  id          String    @id @default(uuid())
  cameraId    String
  camera      Camera    @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  date        DateTime  @default(now())
  author      String?
  eventType   String                        // "calibration", "job_update", "replacement", "issue", "note"
  description String
  createdAt   DateTime  @default(now())
}

// ─── PHOTO (setup fisico) ────────────────────────────────────────
model Photo {
  id          String    @id @default(uuid())
  cameraId    String
  camera      Camera    @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  imagePath   String
  imageName   String
  caption     String?
  createdAt   DateTime  @default(now())
}
```

---

## Concetti chiave del dominio

### MiRa_3D — monocular 6DOF pose estimation

Sistema di robot guidance Comau basato su singola camera 2D (tipicamente Matrox Iris GTR) + algoritmi Halcon `shape_model_3d`. Stima la pose 6DOF (X/Y/Z/Rx/Ry/Rz) di un pezzo da una sola immagine. Calibrazione hand-eye (file `ToolInCamPose.dat`) è l'ancora geometrica.

Limite intrinseco: accuratezza Z (asse ottico) sempre peggiore di X/Y. Compensata in produzione con iterazione di presa (4-5 snap progressivi).

### Cognex In-Sight / DataMan

Sistemi di visione standalone con linguaggio interno (spreadsheet style per In-Sight, EasyBuilder per DataMan). I "job" sono singoli file `.job` (legacy) o `.jobx` (corrente, XML-based zip). Una camera ha 1..N job (es. 3 modelli di pezzo riconosciuti, ognuno con job dedicato). Switch del job tramite I/O dal PLC.

### Quattro livelli di soglie (MiRa_3D)

1. **Search range** (AngleStart/AngleExtent) — quanto l'algoritmo esplora ruotando il template
2. **Detector Limits** (X/Y/Z/Rx/Ry/Rz) — risultato Halcon accettato come valido
3. **Robot Limits** (`vi_MiraLim_*` nel programma robot) — max offset oltre cui robot rifiuta presa
4. **Robot Threshold** (`vi_MiraTh_*`) — tolleranza finale per eseguire presa

Vincolo: `detector_limits ≥ robot_limits ≥ robot_threshold`. Il tool flagga incoerenze.

### vision_tool_slot

Il PLC di stazione passa al robot un numero (es. 1, 2, 3) che identifica quale job MiRa eseguire. Quel numero è l'indice nello slot `VisionTool_NN` (1..99) sia del programma robot sia del Job in MiRa. **Devono coincidere**. Errore tipico: "Job ID not correct".

### Pose: canonical vs controller

Internamente: quaternioni (`[qx, qy, qz, qw]` numericamente stabili, no gimbal lock) + posizione mm. Per UI/export verso TP: conversione al formato del controller scelto.

---

## Workflow utente principali

### 1. Apri una camera in cantiere (UX critica)

1. Login non richiesto → app si apre direttamente sulla lista Customer
2. Click cliente → vedi i suoi plant
3. Click plant → vedi le stazioni
4. Click stazione → vedi le camere con etichetta tipo (Mira3D/Cognex) e ultimo backup data
5. **Click camera → la pagina che ti serve in cantiere**:
   - Header: nome, tipo, modello, focale, IP
   - Card grande "Ultimo backup" — data, file, dimensione, **download immediato**
   - Card "Job attuali" — lista compatta
   - Note PLC se presenti
   - Storico in cards collassabili sotto

### 2. Nuovo backup per camera esistente

1. Apri camera
2. Click "Nuovo backup"
3. Upload file zip (drag&drop) + nome file + commento + data
4. Salvato → diventa il nuovo "Ultimo backup", il precedente va in storico

### 3. Nuova camera in stazione esistente

1. Apri stazione, click "Aggiungi camera"
2. Form: nome, tipo (Mira3D/Cognex), modello, focale, IP, controller robot (se Mira3D), note
3. Salva → pagina camera vuota, pronta per caricare il primo job/backup

### 4. Nuova installazione end-to-end (workflow lungo)

1. Crea Customer (se nuovo) → Plant → Station → Camera
2. Configura hardware: modello, focale, network
3. **Solo MiRa3D**: avvia wizard calibrazione interno
   - Anchor pose dal robottista
   - Genera 20 pose
   - Conferma in sequenza con auto-advance
4. Crea Job: upload `.job/.jobx` (Cognex) o backup MiRa3D zip
5. Upload immagine master, test images
6. Backup robot (se Mira3D)
7. Licenza Halcon (se Mira3D)
8. Foto setup, contatti

### 5. Disaster recovery (camera/SSD rotto)

Scenario A — camera rotta in plant: l'utente apre Camera nel tool, scarica ultimo backup, licenza Halcon, file calibrazione, programma robot, foto del setup. Restore secondo procedura standard del cliente.

Scenario B — SSD del tool morto: l'utente ripristina il volume Docker da backup (vedi sezione [Strategia backup](#strategia-backup-del-tool-stesso)). Il tool torna online identico, dati intatti.

---

## Stack tecnico

### Frontend

| Layer | Tecnologia | Versione | Note |
|---|---|---|---|
| Framework | Angular | 21.x | Standalone components, signals, zoneless |
| UI library | Angular Material | 21.x | Mat-select, mat-form-field, mat-table, dialog |
| Styling | Tailwind CSS | 4.x | Utility via CSS variables |
| Design tokens | SCSS | — | Comau-inspired palette (`_tokens.scss`) |
| 3D rendering | Three.js | 0.184 | Frustum, plate, pose markers |
| Math | gl-matrix | 3.x | Quaternioni, vettori, matrici |
| State | Angular signals | — | No NgRx |
| HTTP | HttpClient + RxJS | — | Comunicazione col backend |
| File handling | FormData + File API | — | Upload blob zip/immagini |
| Test | Vitest 4 | — | Unit |

### Backend

| Layer | Tecnologia | Versione | Note |
|---|---|---|---|
| Runtime | Node.js | 22 LTS | TypeScript native |
| Framework | NestJS | 11.x | Modular, decoratori, DI |
| ORM | Prisma | 6.x | Schema declarativo, migrazioni |
| DB | Postgres | 16 alpine | JSONB per pose, relazioni FK |
| Validation | class-validator | — | DTO validation |
| File upload | multer | — | Multipart per blob |

### Infrastruttura

- **Docker** (3 servizi via compose: postgres, backend, frontend)
- **WSL Ubuntu** personale come host
- **nginx** (serve Angular static + proxy `/api/*` al backend)
- **Volume mount** `./data/postgres/` (DB) e `./data/blobs/` (file)

---

## Strategia backup del tool stesso

Tre livelli combinati nello script `./scripts/backup.sh`:

1. **DB dump**: `docker compose exec postgres pg_dump -U mira mira_db > backups/$(date +%Y-%m-%d)/db.sql`
2. **Blob archive**: `tar -czf backups/$(date +%Y-%m-%d)/blobs.tar.gz ./data/blobs/`
3. **Docker images snapshot**: `docker save mira-companion-backend mira-companion-frontend > backups/$(date +%Y-%m-%d)/images.tar`

Restore da SSD morto: estrai i tre file, `docker load`, ripristina volumi, `pg_restore`. Tool su un'altra macchina è funzionante identico.

**Frequenza consigliata**: pre-trasferta (manuale), o cron settimanale.

---

## Sicurezza

L'app è progettata per girare in ambiente personale isolato:

- **WSL personale**: macchina dell'utente, non in rete aziendale, non esposta
- **No auth**: single-user, single-machine, niente login
- **No HTTPS**: traffico solo localhost
- **No esposizione porte**: solo `:8080` mappata su localhost
- **DB credentials**: in `.env` non commitatato, default safe per single-user

Se mai si volesse esporre in rete, andrebbe aggiunto auth + TLS + firewall — ma è esplicitamente fuori scope.

---

## Stato del progetto

🚧 **In sviluppo attivo**

### Completato

- ✅ Wizard calibrazione MiRa_3D (anchor + generazione 20 pose + 3D viewer + POV viewer)
- ✅ Hardware catalog frontend (camera, lens, plate Halcon)
- ✅ Conversioni pose multi-controller (ABB, Comau, Fanuc, Kuka)
- ✅ Design system Comau (tokens, typography, Material theme)
- ✅ Texture plate Halcon caltab style (frame + dots + asymmetric mark)
- ✅ Conflict detection simmetrico tra pose + auto-advance

### In corso

- 🚧 Backend NestJS + Prisma + Postgres + Docker
- 🚧 Pagina Customer/Plant/Station/Camera con design Comau
- 🚧 CRUD via HttpClient (sostituisce storage browser-based)

### Roadmap

- ⏳ Supporto Cognex (job multipli per camera)
- ⏳ Upload backup zip MiRa3D 500MB con progress
- ⏳ Recovery Kit export (zip + PDF)
- ⏳ Maintenance event log UI
- ⏳ Test images library con preview grid
- ⏳ Script backup automatizzato (`./scripts/backup.sh`)

---

## Licenza e proprietà

Tool personale dell'autore (Nazar). Non distribuito pubblicamente. Eventuale distribuzione futura a clienti come parte del servizio di Vision System Engineering.

## Crediti tecnici

- Comau MiRa_3D — sistema di vision robot guidance di riferimento
- HALCON by MVTec — algoritmi vision sottostanti
- Cognex In-Sight / DataMan — sistemi visione standalone
- Convenzioni multi-controller robot da documentazione vendor (ABB RobotWare, Fanuc Karel, KUKA KRL, Comau PDL2)
