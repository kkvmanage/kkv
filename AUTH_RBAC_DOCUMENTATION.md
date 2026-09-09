# KKV Gold Finance & Rental Management — Custom JWT Auth, RBAC & Storage Documentation

## 1. Executive Summary & Architectural Overview

The application operates as a self-contained, high-performance system with **zero external cloud service dependencies**:
- **Authentication**: Centralized application-owned Custom Backend Authentication with Role-Based Access Control (RBAC) via Express, MongoDB, and signed JWT tokens.
- **Database**: Authoritative MongoDB Atlas.
- **File & Document Storage**: Server-side Local Storage Vault with path traversal protection, structured category folders, and cryptographic integrity checks.
- **External Providers Removed**: **NO Firebase Auth**, **NO Google Drive**, **NO Cloudinary**.

```
                         [ USER LOGIN ]
                                |
                     POST /api/auth/login
                                |
                  [ Custom Backend Auth ]
              (Bcrypt Hash Check & Validation)
                                |
                   [ JWT Signed Access Token ]
                                |
                 +--------------+--------------+
                 |                             |
             [ ADMIN ]                     [ STAFF ]
                 |                             |
          <Admin Portal>                <Staff Portal>
       - Full Access                 - Operational Access
       - Staff Management            - Customers & Loans
       - Branch Settings             - Receipts & FDs
       - Backups & System Control    - Day Book & Rentals
       - Audit Logs                  - No Administrative Access
```

---

## 2. Authentication Architecture

### Identity Storage
- All users (Admins and Staff) are stored in the MongoDB `users` collection.
- Password hashing is enforced via **`bcrypt`** with salt rounds = 10.
- Raw passwords and password hashes (`passwordHash`) are never logged and never exposed in API responses.
- Active status (`isActive: boolean`) is enforced on every request. Inactive accounts are blocked immediately at both authentication and middleware layers.

### Token Specification
- Standard JWT signed with server-side `JWT_SECRET`.
- Payload includes only necessary identifiers:
  ```json
  {
    "sub": "<userId>",
    "email": "<userEmail>",
    "role": "ADMIN" | "STAFF"
  }
  ```
- Lifetime configured via `JWT_EXPIRES_IN` (e.g., `24h` / `15m`).
- Transmitted in HTTP Header: `Authorization: Bearer <accessToken>`.

### Authentication Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | **Public** | Authenticates email/username + password; returns JWT token + user profile. |
| `GET` | `/api/auth/me` | **Authenticated** | Returns current user profile with roles and permissions. |
| `POST` | `/api/auth/change-password`| **Authenticated** | Validates current password and updates to new password. Resets `mustChangePassword`. |
| `POST` | `/api/auth/logout` | **Authenticated** | Cleans up session state on backend and client. |

---

## 3. RBAC Matrix & Permission Guarding

### Backend Middleware
1. **`authenticateUser`** (`backend/src/middleware/auth.middleware.ts`):
   - Extracts Bearer token from `Authorization` header.
   - Verifies signature against `JWT_SECRET`.
   - Fetches fresh user record from MongoDB to verify existence and `isActive === true`.
   - Attaches `req.user` to Express Request context.
2. **`authorizeRoles(...roles)`**:
   - Compares authenticated user role against required roles (e.g. `authorizeRoles('ADMIN')`).
   - If user does not have required role, immediately returns `403 Forbidden` (`INSUFFICIENT_PERMISSIONS`).

### Authorization Matrix

| Endpoint Group | Allowed Roles | Description |
| :--- | :--- | :--- |
| `/api/auth/login` | Public | User Authentication |
| `/api/auth/me`, `/api/auth/change-password` | ADMIN, STAFF | Self management |
| `/api/admin/staff/*` | **ADMIN Only** | Staff creation, status toggling, deletion, password reset |
| `/api/admin/audit-logs` | **ADMIN Only** | System security audit trail |
| `/api/admin/master-control` | **ADMIN Only** | Global rates, branch configuration |
| `/api/backups/*`, `/api/restore/*` | **ADMIN Only** | Disaster recovery, portable archives, restore engine |
| `/api/customers/*` (read/create/update) | ADMIN, STAFF | Operational customer management |
| `/api/customers/:id/permanent` | **ADMIN Only** | Permanent database destruction |
| `/api/loans/*` | ADMIN, STAFF | Operational loan issue, renewals, day book |
| `/api/receipts/*`, `/api/fd/*` | ADMIN, STAFF | Financial ledger & Fixed Deposits |
| `/api/rental/*` | ADMIN, STAFF | Complex & Shop Rental Management |

---

## 4. Initial Admin Seeding Flow

Initial administrator creation is completely automated and idempotent through the secure seed CLI script.

### Seeding Command:
```bash
cd backend
ADMIN_NAME="KKV Master Admin" ADMIN_EMAIL="admin@kkvgold.com" ADMIN_PASSWORD="SetAStrongPasswordHere123!" npm run seed:admin
```

### Safety Rules:
- Fails with clear error if `ADMIN_PASSWORD` or `ADMIN_EMAIL` is omitted.
- Idempotent: If an `ADMIN` account already exists, it skips duplicate creation safely.
- Never hardcodes passwords or credentials in source code.

---

## 5. Staff Account Creation & Security Flow

1. **Admin Creation**:
   - Admin accesses **Settings → Staff Management** or calls `POST /api/admin/staff`.
   - System assigns a unique staff ID (e.g., `KKV-STAFF-000001`).
   - Admin sets a temporary initial password.
   - Account is marked with **`mustChangePassword = true`**.
2. **First-Time Staff Login**:
   - Staff member logs in using their unique email / staff ID and temporary password.
   - On success, the frontend detects `mustChangePassword === true`.
   - The `<ForceChangePasswordModal />` is presented, blocking operational tabs until the staff member inputs their temporary password and sets a secure private password.
   - Backend resets `mustChangePassword = false` upon successful password update.

---

## 6. Complete Removal of External Services (Firebase, Google Drive, Cloudinary)

### Firebase Removal
- Removed `firebase` from dependencies.
- Removed all Firebase Auth SDK listeners (`onAuthStateChanged`, `signInWithEmailAndPassword`, `signInWithPopup`, `GoogleAuthProvider`).
- Deleted `src/config/firebase.ts`, `src/services/firestoreService.ts`, `src/services/authService.ts`.

### Google Drive & Google OAuth Removal
- Removed `googleapis` and `google-auth-library` from backend dependencies.
- Replaced cloud drive backup upload/download with authoritative **Local Encrypted Vault & Server Archive Repository** (`LocalFileRepository`).
- Replaced Google Drive restore engine with multi-step verified archive importer (`SystemRestoreModal` supporting portable `.ZIP` and `.JSON` schema validation and SHA-256 checksums).

### Cloudinary Removal
- Removed `cloudinary` and `streamifier` packages from backend dependencies.
- Deleted `backend/src/config/cloudinary.ts`.
- Removed all `CLOUDINARY_*` environment variables and startup verification logs.
- Replaced file handling with dedicated server-side local storage abstraction ([`backend/src/services/storage.service.ts`](file:///d:/final/kkv/backend/src/services/storage.service.ts)).

---

## 7. Environment Variables Reference

### Backend (`backend/.env`)

```env
PORT=8080
APP_NAME=KKV Gold Finance & Rental Management
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# MongoDB
DATABASE_URL=mongodb://localhost:27017/kkv_gold_finance
MONGODB_URI=mongodb://localhost:27017/kkv_gold_finance
MONGODB_DB_NAME=kkv_gold_finance
RENTAL_MONGODB_DB_NAME=kkv_rental

# Security & JWT
JWT_SECRET=your_super_strong_jwt_secret_key_at_least_32_chars
JWT_EXPIRES_IN=24h

# Admin Seeding
ADMIN_NAME=KKV Master Admin
ADMIN_EMAIL=admin@kkvgold.com
ADMIN_PASSWORD=SetAStrongPasswordHere123!

# Storage Vault
LOCAL_STORAGE_PATH=./data
```

### Frontend (`.env.development` / `.env.production`)

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_FINANCE_API_BASE=http://localhost:8080/api
VITE_APP_NAME=KKV Gold Finance
```

---

## 8. Development & Production Deployment

### Running Locally
1. Start MongoDB.
2. In `backend/`:
   ```bash
   npm install
   npm run seed:admin
   npm run dev
   ```
3. In root:
   ```bash
   npm install
   npm run dev
   ```

### Production Build Verification
- **Backend Build**: `cd backend && npm run build` -> compiles cleanly to `backend/dist/`.
- **Frontend Build**: `npm run build` -> compiles cleanly to `dist/`.
