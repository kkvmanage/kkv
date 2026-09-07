# VERCEL SERVERLESS FUNCTION CRASH ANALYSIS
**Project**: KKV Gold Finance & Rental Management  
**Target Error**: `500: INTERNAL_SERVER_ERROR` | `Code: FUNCTION_INVOCATION_FAILED`  
**Logged Trace**: `[GoogleDriveRepository] Error initializing storage folders` & `task/backend/src/repositories/googleDrive.repository...`  
**Analysis Date**: 2026-09-07  

---

# 1. Project Overview

* **Frontend Technology**: React 18 + TypeScript + Vite (`port 5173` for Finance, `port 5174` for Complex Rental Management).
* **Backend Technology**: Node.js + Express 4 + TypeScript (`port 8080` for Finance API, `port 5175` for Rental API).
* **Primary Database**: MongoDB Atlas (`kkv_gold_finance` & `kkv_rental` databases) with cached connection pooling.
* **Storage & Recovery**: Google Drive API v3 (OAuth 2.0 user tokens + Service Account fallback).
* **Deployment Architecture**: 
  * Frontend: Vercel Static Hosting (SPA).
  * Backend: Vercel Serverless Function (Node.js Lambda runtime via `@vercel/node` targeting `api/index.ts`).
* **Frontend-Backend Communication**: HTTPS REST API with JSON payloads, Bearer JWT session authentication, and `x-idempotency-key` request headers.

---

# 2. Complete Relevant Project Structure

```
backend/
├── api/
│   └── index.ts                         # Vercel serverless function entry point
├── vercel.json                          # Vercel deployment routes & build config
├── package.json                         # Backend dependencies & script definitions
├── tsconfig.json                        # TypeScript compiler options
├── src/
│   ├── app.ts                          # Express application creation & middleware mounting
│   ├── server.ts                       # Local development standalone HTTP server (port 8080)
│   ├── config/
│   │   ├── env.ts                      # Environment variable loader & defaults
│   │   └── database.ts                 # MongoDB connection pool & index initializers
│   ├── controllers/
│   │   ├── health.controller.ts        # /api/health endpoint
│   │   ├── customer.controller.ts      # Customer management
│   │   ├── loan.controller.ts          # Loan creation & closing
│   │   ├── receipt.controller.ts       # Loan payment receipts
│   │   ├── fd.controller.ts            # Fixed deposit management
│   │   ├── admin.controller.ts         # Master control & system administration
│   │   ├── drive.controller.ts         # Google Drive OAuth connect & status
│   │   ├── staff.controller.ts         # Staff authentication & management
│   │   ├── session.controller.ts       # Device session management
│   │   └── config.controller.ts        # Loan types & interest profiles
│   ├── middleware/
│   │   ├── auth.middleware.ts          # JWT bearer token verification
│   │   └── rbac.middleware.ts          # Role-based access control (MASTER_ADMIN, STAFF, RENTAL_STAFF)
│   ├── repositories/
│   │   └── googleDrive.repository.ts   # Local filesystem fallback repository (CRASH HOTSPOT)
│   ├── services/
│   │   ├── database.service.ts         # MongoDB Atlas primary service & migration
│   │   ├── googleDriveService.ts       # Google Drive API v3 service
│   │   ├── admin.service.ts            # Master settings & rate histories
│   │   ├── customer.service.ts         # Customer domain service
│   │   ├── loan.service.ts             # Loan domain service
│   │   ├── receipt.service.ts          # Receipt domain service
│   │   ├── fd.service.ts               # Fixed deposit domain service
│   │   ├── staff.service.ts            # Staff domain service
│   │   ├── session.service.ts          # Session management
│   │   ├── syncQueue.service.ts        # Outbox synchronization queue
│   │   ├── backupPackage.service.ts    # Backup zip creation & verification
│   │   ├── systemRestore.service.ts    # System recovery & restore
│   │   ├── systemWipe.service.ts       # Danger zone global wipe
│   │   ├── counter.service.ts          # ID generation sequences
│   │   ├── rentalAdminSummary.service.ts # Rental read-model for Finance Admin
│   │   └── drive/
│   │       ├── DriveService.ts         # Core Drive API client
│   │       ├── DriveFolderService.ts   # Local & Drive folder structure manager (CRASH HOTSPOT)
│   │       ├── DriveStorageService.ts  # File storage adapter (local + drive)
│   │       └── DriveTokenService.ts    # OAuth token encryption & storage
│   ├── routes/
│   │   ├── index.ts                    # Root API router aggregator
│   │   ├── health.routes.ts            # Health routes
│   │   ├── customer.routes.ts          # Customer routes
│   │   ├── loan.routes.ts              # Loan routes
│   │   ├── receipt.routes.ts           # Receipt routes
│   │   ├── fd.routes.ts                # Fixed deposit routes
│   │   ├── admin.routes.ts             # Admin & system routes
│   │   ├── drive.routes.ts             # Google Drive routes
│   │   ├── staff.routes.ts             # Staff routes
│   │   ├── session.routes.ts           # Session routes
│   │   └── config.routes.ts            # Configuration routes
│   ├── types/
│   │   └── index.ts                    # TypeScript shared interfaces & types
│   └── utils/
│       ├── encryption.ts               # AES-256 token encryption helpers
│       ├── kycValidation.ts            # Indian KYC validation helpers
│       └── receiptGenerator.ts         # Receipt number generator
```

---

# 3. Backend Entry Point Analysis

### Vercel Serverless Entry Point: `backend/api/index.ts`
```typescript
import app from '../src/app.js';
import { initializeMongoIndexes } from '../src/config/database.js';

// Auto-initialize indexes in background on cold start
initializeMongoIndexes().catch((err) => {
  console.warn('[Vercel Serverless] MongoDB index warmup warning:', err);
});

export default app;
```

### Module Loading & Startup Execution Flow:
1. Vercel Lambda invokes `api/index.ts`.
2. `api/index.ts` statically imports `../src/app.js`.
3. `src/app.ts` statically imports `routes/index.js`.
4. `routes/index.js` statically imports all controller files (`customer.controller.js`, `health.controller.js`, `admin.controller.js`, `drive.controller.js`, etc.).
5. Controllers statically import corresponding singleton services (`customerService`, `adminService`, `googleDriveService`, `driveFolderService`, `counterService`, etc.).
6. At the moment of module evaluation, the following top-level singleton instantiations execute:
   * `export const googleDriveRepository = new GoogleDriveRepository();` in `googleDrive.repository.ts`
   * `export const driveFolderService = new DriveFolderService();` in `DriveFolderService.ts`
   * `export const driveService = new DriveService();` in `DriveService.ts`
   * `export const googleDriveService = new GoogleDriveService();` in `googleDriveService.ts`
7. In the constructors of `GoogleDriveRepository` and `DriveFolderService`, synchronous filesystem operations (`fs.mkdirSync`, `fs.writeFileSync`) are executed immediately against `process.cwd() + '/KKV_GOLD_FINANCE'`.

---

# 4. Google Drive Integration Analysis

### 1. `backend/src/repositories/googleDrive.repository.ts`
* **Purpose**: Legacy local JSON filesystem adapter that acts as a storage fallback and cache.
* **Initialization Behavior**: **Immediate in constructor (Module Import time)**.
* **Code Snapshot**:
  ```typescript
  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'KKV_GOLD_FINANCE');
    this.dbDir = path.join(this.baseDir, 'config');
    this.backupsDir = path.join(this.baseDir, 'backups');
    this.initFolders();
  }

  private initFolders(): void {
    try {
      if (!fs.existsSync(this.dbDir)) fs.mkdirSync(this.dbDir, { recursive: true });
      if (!fs.existsSync(this.backupsDir)) fs.mkdirSync(this.backupsDir, { recursive: true });
    } catch (err) {
      console.error('[GoogleDriveRepository] Error initializing storage folders:', err);
    }
  }
  ```
* **Failure Trigger**: On Vercel, `process.cwd()` is `/var/task` (a strictly **Read-Only** filesystem). `fs.mkdirSync` fails with `EROFS: read-only file system, mkdir '/var/task/KKV_GOLD_FINANCE'`. When any service calls `readJson('file.json', fallback)`, if the file does not exist, `readJson` calls `this.writeJson()`, which executes unhandled `fs.writeFileSync('/var/task/KKV_GOLD_FINANCE/config/file.json.tmp')`, causing an immediate uncaught exception.

### 2. `backend/src/services/drive/DriveFolderService.ts`
* **Purpose**: Manages folder hierarchy both locally and on Google Drive.
* **Initialization Behavior**: **Immediate in constructor (Module Import time)**.
* **Code Snapshot**:
  ```typescript
  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'KKV_GOLD_FINANCE');
    this.initLocalStructure();
  }

  private initLocalStructure(): void {
    const folders = ['config', 'customers', 'loans', 'loan-receipts', 'interest-payments', ...];
    for (const f of folders) {
      const fullPath = path.join(this.baseDir, f);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }
  ```
* **Failure Trigger**: `fs.mkdirSync` is called without a `try/catch` block across 14 folder paths on a read-only filesystem. This throws an uncaught `EROFS` during Node.js module compilation before the Express handler ever receives the HTTP request.

### 3. `backend/src/services/drive/DriveTokenService.ts`
* **Purpose**: Manages encrypted Google Drive OAuth refresh tokens and access tokens.
* **Authentication**: AES-256 encrypted payload stored via `googleDriveRepository.readJson('drive_oauth_tokens.json', ...)`.
* **Required Variables**: `GOOGLE_REFRESH_TOKEN`, `JWT_SECRET`.

### 4. `backend/src/services/googleDriveService.ts` & `DriveService.ts`
* **Purpose**: Primary API client using `googleapis` (Drive API v3).
* **Authentication**: OAuth 2.0 (`google.auth.OAuth2`) with user credentials, with fallback to Google Service Account JWT (`google.auth.JWT`).
* **Required Variables**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.

---

# 5. Environment Variables Required

| Variable Name | Used In File | Required in Prod? | Purpose | Vercel Considerations |
| :--- | :--- | :--- | :--- | :--- |
| `MONGODB_URI` | `src/config/database.ts` | **YES** | Live MongoDB Atlas connection string | Must be added in Vercel Project Settings. |
| `MONGODB_DB_NAME` | `src/config/database.ts` | Optional (`kkv_gold_finance`) | Primary database name | Defaults to `kkv_gold_finance`. |
| `RENTAL_MONGODB_DB_NAME` | `src/config/database.ts` | Optional (`kkv_rental`) | Rental database name | Defaults to `kkv_rental`. |
| `GOOGLE_CLIENT_ID` | `src/services/googleDriveService.ts` | **YES** | Google OAuth 2.0 Web Client ID | Required for Drive API calls. |
| `GOOGLE_CLIENT_SECRET` | `src/services/googleDriveService.ts` | **YES** | Google OAuth 2.0 Client Secret | [REDACTED] — Sensitive credential. |
| `GOOGLE_REFRESH_TOKEN` | `src/services/googleDriveService.ts` | **YES** | OAuth 2.0 Refresh Token for Drive | [REDACTED] — Enables autonomous token refresh without user popups. |
| `GOOGLE_DRIVE_FOLDER_ID` | `src/services/googleDriveService.ts` | **YES** | Target 'kkv finance' Google Drive Folder ID | Direct folder ID (e.g., `1gqDbQuvf2EWkh_y-kiqRDBV3fOpEEGPx`). |
| `GOOGLE_DRIVE_ACCOUNT_EMAIL` | `src/services/googleDriveService.ts` | Optional | Principal email address for Drive account | Defaults to `goldfinancekkv@gmail.com`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `src/config/env.ts` | Optional | Service account email fallback | Optional fallback if OAuth is configured. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `src/config/env.ts` | Optional | Service account RSA Private Key | Must handle `\n` line breaks in Vercel (`.replace(/\\n/g, '\n')`). |
| `JWT_SECRET` | `src/config/env.ts` | **YES** | Signing secret for staff sessions & encryption | Required for JWT generation & AES-256 token storage. |
| `JWT_EXPIRES_IN` | `src/config/env.ts` | Optional (`24h`) | Session expiration window | String (e.g. `24h` or `7d`). |
| `NODE_ENV` | `src/config/env.ts` | Optional | Node environment (`production`/`development`) | Vercel sets this to `production` automatically. |
| `CORS_ALLOWED_ORIGINS` | `src/app.ts` | Optional | Allowed CORS origins for frontend | Defaults to allow Vercel domain and localhost. |

---

# 6. Vercel Configuration Analysis

### `backend/vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/health",
      "dest": "api/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

### Potential Deployment Concerns:
1. **Root Directory Misalignment**: If the Vercel project's Root Directory is set to `.` (the workspace root) instead of `backend`, Vercel attempts to build the frontend with Vite and does not execute `backend/vercel.json`.
2. **Native Module Binary Incompatibility**: `package.json` includes `bcrypt` (`^5.1.1`), which contains native C++ binaries. In AWS Lambda / Vercel Serverless environments, native modules compiled on Windows or missing Linux prebuilts fail with `ERR_DLOPEN_FAILED` or `MODULE_NOT_FOUND`. Pure JavaScript `bcryptjs` is recommended for serverless.
3. **TypeScript Module Resolution in `@vercel/node`**: TypeScript files import with `.js` extensions (ESM conventions: `import app from '../src/app.js'`). `@vercel/node` handles this if `type: "module"` is configured or `tsconfig.json` targets `NodeNext`.

---

# 7. Serverless Compatibility Problems

| Issue | Code Location | Why It Fails on Vercel |
| :--- | :--- | :--- |
| **Read-Only Local Filesystem** | `googleDrive.repository.ts`, `DriveFolderService.ts` | AWS Lambda containers only allow writes to `/tmp`. Writing to `process.cwd()` (`/var/task`) throws `EROFS`. |
| **Top-Level Synchronous I/O in Constructors** | `GoogleDriveRepository`, `DriveFolderService` | Instantiating singletons during module import executes `fs.mkdirSync` before any handler runs. |
| **Background Cron / `setInterval`** | `syncQueue.service.ts`, `SyncService.ts` | Serverless functions freeze execution immediately after returning the HTTP response; `setInterval` will not fire persistently. |
| **Native Module Dependencies** | `package.json` (`bcrypt`) | Native bindings require architecture-specific compilation (`linux-x64`). |

---

# 8. Exact Crash Investigation

### Execution Trace of `FUNCTION_INVOCATION_FAILED`:

```
Incoming Request: GET /api/health (or any API endpoint)
   ↓
Vercel Node.js Serverless Handler Invoked: api/index.ts
   ↓
Static Import Chain Evaluated:
   api/index.ts
   └── import app from '../src/app.js'
       └── import apiRouter from './routes/index.js'
           └── import healthRoutes from './health.routes.js'
               └── import { healthCheck } from '../controllers/health.controller.js'
                   └── import { googleDriveRepository } from '../repositories/googleDrive.repository.js'
   ↓
Module Instantiation Executes:
   Line 102: export const googleDriveRepository = new GoogleDriveRepository();
   ↓
Constructor Invoked:
   googleDrive.repository.ts: Line 13 -> this.initFolders()
   ↓
Filesystem Call:
   googleDrive.repository.ts: Line 18 -> fs.mkdirSync('/var/task/KKV_GOLD_FINANCE/config', { recursive: true })
   ↓
FAILURE 1: Caught and logged: [GoogleDriveRepository] Error initializing storage folders: EROFS: read-only file system
   ↓
Next Static Import in Chain:
   routes/index.js -> drive.routes.js -> drive.controller.js -> DriveFolderService.ts
   ↓
Module Instantiation Executes:
   DriveFolderService.ts: Line 88 -> export const driveFolderService = new DriveFolderService();
   ↓
Constructor Invoked:
   DriveFolderService.ts: Line 11 -> this.initLocalStructure()
   ↓
Filesystem Call (UNCAUGHT):
   DriveFolderService.ts: Line 35 -> fs.mkdirSync('/var/task/KKV_GOLD_FINANCE/config', { recursive: true })
   ↓
FATAL ERROR: EROFS: read-only file system, mkdir '/var/task/KKV_GOLD_FINANCE/config'
   ↓
Node.js Runtime Crashes -> Vercel catches unhandled error:
500: INTERNAL_SERVER_ERROR | Code: FUNCTION_INVOCATION_FAILED
```

* **Primary Crash Hotspot**: `backend/src/services/drive/DriveFolderService.ts` (Lines 10–38) & `backend/src/repositories/googleDrive.repository.ts` (Lines 9–23 & 44–63).

---

# 9. Potential Root Causes

### 🔴 HIGH PROBABILITY
1. **Read-Only Filesystem Violation (`EROFS`) during Top-Level Module Import**:
   * **Files**: `backend/src/repositories/googleDrive.repository.ts` and `backend/src/services/drive/DriveFolderService.ts`.
   * **Evidence**: The constructors of both singletons call `fs.mkdirSync` on `process.cwd()` at the moment of import. On Vercel Lambda, `process.cwd()` (`/var/task`) is read-only.
2. **Missing Vercel Environment Variables**:
   * **Evidence**: If `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or `GOOGLE_REFRESH_TOKEN` are not added to the Vercel Dashboard Environment Variables, fallback file-writing logic is triggered, crashing on `fs.writeFileSync`.

### 🟡 MEDIUM PROBABILITY
3. **Native `bcrypt` Binary Addon Failure**:
   * **File**: `backend/package.json` (`bcrypt: ^5.1.1`).
   * **Evidence**: Native C++ binaries built on Windows x64 fail to load on Linux serverless containers unless recompiled during Vercel's build step.
4. **Vercel Root Directory / Monorepo Configuration**:
   * **Files**: `backend/vercel.json` vs workspace root.
   * **Evidence**: If Vercel is deployed from the repository root rather than `backend/`, the serverless function build pattern `api/index.ts` is not discovered.

### 🟢 LOW PROBABILITY
5. **MongoDB Connection Timeout during Cold Start**:
   * **File**: `backend/src/config/database.ts`.
   * **Evidence**: Serverless cold starts might exceed timeout if IP Whitelisting (`0.0.0.0/0`) is not configured in MongoDB Atlas Network Access.

---

# 10. Recommended Fixes

### Fix 1: Make Filesystem Operations Serverless-Safe (`/tmp` fallback or in-memory)
* **Problem**: Calling `fs.mkdirSync` and `fs.writeFileSync` in `process.cwd()` crashes with `EROFS` on Vercel.
* **Files Affected**:
  * `backend/src/repositories/googleDrive.repository.ts`
  * `backend/src/services/drive/DriveFolderService.ts`
  * `backend/src/services/drive/DriveStorageService.ts`
* **Recommended Solution**:
  * Detect serverless environment (`process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME`).
  * If on serverless, set `baseDir` to `/tmp/KKV_GOLD_FINANCE` or bypass local disk writes completely in favor of MongoDB Atlas.
  * Wrap all filesystem initialization in guarded `try/catch` blocks so filesystem errors never throw uncaught exceptions during module evaluation.

### Fix 2: Replace Native `bcrypt` with Pure JavaScript `bcryptjs`
* **Problem**: Native binary bindings frequently crash on AWS Lambda / Vercel with `ERR_DLOPEN_FAILED`.
* **Files Affected**:
  * `backend/package.json`
  * `backend/src/services/staff.service.ts`
* **Recommended Solution**:
  * Install `bcryptjs` and `@types/bcryptjs`.
  * Replace `import bcrypt from 'bcrypt'` with `import bcrypt from 'bcryptjs'`.

### Fix 3: Configure Environment Variables in Vercel Dashboard
* **Problem**: Backend requires MongoDB Atlas and Google Drive OAuth credentials in production.
* **Recommended Solution**:
  * Add the following keys in Vercel Project Settings → Environment Variables:
    * `MONGODB_URI`
    * `MONGODB_DB_NAME=kkv_gold_finance`
    * `GOOGLE_CLIENT_ID`
    * `GOOGLE_CLIENT_SECRET`
    * `GOOGLE_REFRESH_TOKEN`
    * `GOOGLE_DRIVE_FOLDER_ID`
    * `JWT_SECRET`

---

# 11. Required Files for External Debugging

## FILES TO SHARE WITH CHATGPT

To provide an external AI with the exact minimum context needed to fix this Vercel crash, share only these **5 files**:

1. **`backend/src/repositories/googleDrive.repository.ts`**
   * *Why needed*: Contains the exact constructor and file-writing logic causing the logged `[GoogleDriveRepository] Error initializing storage folders` error.
2. **`backend/src/services/drive/DriveFolderService.ts`**
   * *Why needed*: Contains the uncaught `fs.mkdirSync` folder loop that executes on module import.
3. **`backend/api/index.ts`**
   * *Why needed*: The Vercel Serverless Function entry point showing startup imports and warm-up logic.
4. **`backend/vercel.json`**
   * *Why needed*: The routing and serverless function build configuration for Vercel.
5. **`backend/package.json`**
   * *Why needed*: Shows dependencies, Node engine targets, and build scripts.

---

# 12. Final Diagnosis

* **Most Likely Root Cause**: Top-level module import of `DriveFolderService.ts` and `googleDrive.repository.ts` synchronously executing `fs.mkdirSync` and `fs.writeFileSync` in `process.cwd()` (`/var/task`), which is a read-only filesystem on Vercel Serverless Functions. This throws an `EROFS` error, crashing the Lambda container during module loading (`FUNCTION_INVOCATION_FAILED`).
* **Exact Files Involved**:
  * `backend/src/repositories/googleDrive.repository.ts` (Lines 10–23)
  * `backend/src/services/drive/DriveFolderService.ts` (Lines 10–38)
* **What Information Is Still Needed**:
  * Whether Vercel project settings have `MONGODB_URI` and Google OAuth environment variables populated.
  * Whether the Vercel deployment root directory is configured as `backend` or workspace root.
* **Safest Next Debugging Step**:
  * Update `googleDrive.repository.ts` and `DriveFolderService.ts` to use `/tmp` (or memory cache) when running in serverless (`process.env.VERCEL`), preventing any top-level read-only filesystem access.
