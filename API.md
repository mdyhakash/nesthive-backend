# NestHive — Housing & Roommate Platform (Backend API Documentation)
 
> 🌐 **Live Base URL:** `https://nesthive-backend.vercel.app/api/v1`  
> 📑 **Live Swagger UI:** [https://nesthive-backend.vercel.app/api-docs](https://nesthive-backend.vercel.app/api-docs)  
> **Tech Stack:** Node.js, Express.js, TypeScript, PostgreSQL, Prisma ORM, Redis, bKash Payment Gateway, Zod, Helmet.

---

## 📌 Project Overview & Architecture

NestHive is a comprehensive, production-ready backend system designed to bridge property owners and tenants seeking rooms, flats, or compatible roommates. It streamlines the entire rental lifecycle: owner KYC verification, property & room listings, in-person viewing requests, rental applications, automated security deposit & rent processing via bKash, lease lifecycle agreements, multi-tenant utility bill splitting, and maintenance ticket tracking.

### Architecture Layer:
```
Client Request (Postman / Browser)
         │
         ▼
 Express Middlewares (CORS, Helmet Security Headers, Rate Limiter)
         │
         ▼
   API Routing (/api/v1/*)
         │
         ▼
 Validation Middleware (Zod Schemas)
         │
         ▼
 Auth & RBAC Middleware (JWT Bearer Token, Role-Based Access Control)
         │
         ▼
 Controllers (Request/Response orchestration, Cookie Handling)
         │
         ▼
 Services (Business Logic, Transactions, External Gateway Integrations)
         │
         ▼
 Prisma ORM Client ────► PostgreSQL Database
         │
         ▼
 Redis Cache / Token Store (OTP, Session Tokens)
```

---

## 👥 User Roles & Role-Based Access Control (RBAC)

NestHive enforces strict role-based access control with **3 fixed primary roles** (+ 1 operational manager role):

| Role | Description | Login Methods | Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | Platform operator | Email & Password only | Verify/Reject owner KYC, manage user account statuses (Block/Unblock), view audit logs and platform-wide statistics. |
| **Owner** | Property & room landlord | Email/Password & Google OAuth | Create properties & rooms, review tenancy applications, approve/reject viewing requests, track rental payouts, create utility bills. |
| **Tenant** | Customer / Room searcher | Email/Password & Google OAuth | Search & filter properties/rooms, submit viewing requests, apply for rooms, pay deposit/rent/utilities via bKash, submit maintenance tickets, fill roommate compatibility preferences. |
| **Manager** | On-site property manager | Email & Password | Manage assigned properties, review maintenance tickets, monitor leases. |

---

## 🔑 Demo Admin & Test Credentials

For evaluation and testing purposes:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@gmail.com` | `Admin123@` |
| **Owner** | `owner@gmail.com` | `Owner123@` |
| **Manager**| `manager@gmail.com` | `Manager123@` |

---

## 🛡️ Security & Performance Implementations

1. **Security Headers (`helmet`):** Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin-Resource-Policy enabled.
2. **Rate Limiting (`express-rate-limit`):** All `/api/*` endpoints are rate-limited to 200 requests per 15-minute window per IP to prevent DDoS and brute-force attacks.
3. **Password Hashing:** Passwords securely hashed with `bcryptjs` using 10 salt rounds.
4. **CORS:** Configured with credentials support for authorized frontends.
5. **Database Indexing:** Composite and single indexes (`@@index([city, area])`, `@@index([status])`, `@@index([entityType, entityId])`) for sub-millisecond query performance.
6. **Concurrency Protection:** Multi-table atomic transactions using `prisma.$transaction` prevent race conditions (such as double-booking rooms or conflicting leases).
7. **Soft Deletes:** `isDeleted` flags and `deletedAt` timestamps retain historical and financial integrity without hard data loss.
8. **Audit Logging:** Dedicated `AuditLog` records track who performed critical state transitions (KYC approval, user blocking, lease cancellations).

---

## 💳 Mandatory Payment Gateway Flow (bKash)

NestHive integrates real bKash Checkout URL APIs without simulated manual status updates:

```
[Tenant] ──► POST /api/v1/payment/initiate-deposit (or /initiate-rent, /initiate-utility)
                     │
                     ▼
          [Backend generates bKash Checkout URL via bKash API]
                     │
                     ▼
             [Tenant pays via bKash]
                     │
                     ▼
[bKash Callback] ──► GET /api/v1/payment/bkash/callback
                     │
                     ▼
[Tenant/Frontend] ──► POST /api/v1/payment/bkash/execute
                     │
                     ▼
          [Prisma $transaction]:
          1. Verify & execute payment with bKash
          2. Mark payment record as PAID
          3. Generate active Lease agreement
          4. Increment Room occupantCount
          5. Update rental Application status to APPROVED
          6. Send confirmation email & log audit record
```

---

## 📐 Standardized Response Formats

### 1. Success Response Structure:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### 2. Error Response Structure (with `errors: []` array):
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation Error",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email address format"
    },
    {
      "path": "password",
      "message": "Password must be at least 8 characters long"
    }
  ]
}
```

---

## 🚀 Interactive Swagger Documentation & Postman

* **Live Base URL:** `https://nesthive-backend.vercel.app/api/v1`
* **Interactive Swagger UI (Live):** Visit [`https://nesthive-backend.vercel.app/api-docs`](https://nesthive-backend.vercel.app/api-docs)
* **Raw OpenAPI Spec for Postman:** `https://nesthive-backend.vercel.app/api-docs/swagger.json`
* **Import to Postman:** Open Postman ➔ Click **Import** ➔ Paste URL `https://nesthive-backend.vercel.app/api-docs/swagger.json` ➔ Click **Import**.

---

## 📋 Complete API Endpoints Directory (60+ Endpoints)

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new Tenant (sends email OTP) |
| `POST` | `/api/v1/auth/verify-email` | Public | Verify registration OTP & issue tokens |
| `POST` | `/api/v1/auth/login` | Public | User login (Credentials) |
| `POST` | `/api/v1/auth/google` | Public | **GCP Social Login** via Google ID Token |
| `POST` | `/api/v1/auth/set-password` | Tenant, Owner | Set password for Google registered account |
| `POST` | `/api/v1/auth/logout` | Authenticated | Logout & clear JWT cookies |
| `GET` | `/api/v1/auth/me` | Authenticated | Get current authenticated profile |
| `GET` | `/api/v1/auth/refresh-token` | Public | Issue new access token using refresh cookie |
| `POST` | `/api/v1/auth/forgot-password` | Public | Send password reset OTP |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset password with OTP |
| `PATCH` | `/api/v1/auth/change-password` | Authenticated | Change password for logged-in user |

### 2. Property Management (`/api/v1/property`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/property` | Public | **Search, Filter, Sort, Paginate** properties |
| `POST` | `/api/v1/property/create-property` | Owner | Create new property listing in DRAFT |
| `GET` | `/api/v1/property/my-properties` | Owner | Get logged-in owner's properties |
| `GET` | `/api/v1/property/assigned/my-properties` | Manager | Get properties assigned to manager |
| `GET` | `/api/v1/property/:id` | Public | Get single property details |
| `PATCH` | `/api/v1/property/:id` | Owner | Update property details |
| `PATCH` | `/api/v1/property/:id/publish` | Owner | Publish property (requires approved KYC) |
| `PATCH` | `/api/v1/property/:id/assign-manager`| Owner, Admin | Assign manager to property |
| `DELETE`| `/api/v1/property/:id` | Owner | **Soft delete** property |

### 3. Room Management (`/api/v1/room`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/room` | Public | List rooms with search, rent filter, pagination |
| `POST` | `/api/v1/room/create-room/:propertyId` | Owner | Create room in property |
| `GET` | `/api/v1/room/property/:propertyId` | Public | Get rooms of a property |
| `GET` | `/api/v1/room/:propertyId/my-rooms`| Owner | Get owner's rooms |
| `GET` | `/api/v1/room/:id` | Public | Get room by ID |
| `PATCH` | `/api/v1/room/:id` | Owner | Update room |
| `PATCH` | `/api/v1/room/:id/publish` | Owner | Publish room |
| `DELETE`| `/api/v1/room/:id` | Owner | Soft delete room |

### 4. Viewing Requests (`/api/v1/viewing-request`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/viewing-request/room/:roomId` | Tenant | Request in-person room viewing |
| `GET` | `/api/v1/viewing-request/my-requests` | Tenant | Get tenant's viewing requests |
| `GET` | `/api/v1/viewing-request/room/:roomId` | Owner | Get viewing requests for a room |
| `GET` | `/api/v1/viewing-request/:id` | Owner, Tenant | Get viewing request details |
| `PATCH` | `/api/v1/viewing-request/:id/status` | Owner | Approve / Reject viewing request |
| `PATCH` | `/api/v1/viewing-request/:id/cancel` | Tenant | Cancel viewing request |

### 5. Rental Applications (`/api/v1/application`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/application` | Tenant | Submit rental application |
| `GET` | `/api/v1/application/my-applications` | Tenant | Get tenant's applications |
| `GET` | `/api/v1/application/room/:roomId` | Owner | Get applications for a room |
| `GET` | `/api/v1/application/:id` | Owner, Tenant | Get application details |
| `PATCH` | `/api/v1/application/:id/status` | Owner | Approve or Reject application |
| `PATCH` | `/api/v1/application/:id/withdraw` | Tenant | Withdraw application |

### 6. Payment Integration (`/api/v1/payment`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payment/initiate-deposit` | Tenant | Initiate security deposit via bKash |
| `POST` | `/api/v1/payment/confirm-deposit` | Tenant | Confirm deposit & activate lease |
| `POST` | `/api/v1/payment/initiate-rent` | Tenant | Initiate monthly rent via bKash |
| `POST` | `/api/v1/payment/confirm-rent` | Tenant | Confirm monthly rent payment |
| `POST` | `/api/v1/payment/initiate-utility` | Tenant | Initiate utility bill payment via bKash |
| `POST` | `/api/v1/payment/confirm-utility` | Tenant | Confirm utility payment |
| `POST` | `/api/v1/payment/bkash/execute` | Tenant | Execute payment with bKash API |
| `GET` | `/api/v1/payment/bkash/callback` | Public | bKash callback webhook handler |
| `GET` | `/api/v1/payment/my-payments` | Tenant | Get tenant payment history |
| `GET` | `/api/v1/payment/owner-payments` | Owner | Get owner received rental payments |
| `GET` | `/api/v1/payment` | Admin | Get all platform payments |

### 7. Lease Management (`/api/v1/lease`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/lease/my-leases` | Tenant | Get tenant's active leases |
| `GET` | `/api/v1/lease/owner-leases` | Owner | Get owner's property leases |
| `GET` | `/api/v1/lease/:id` | Owner, Tenant | Get single lease agreement |
| `PATCH` | `/api/v1/lease/:id/terminate` | Owner, Tenant | Terminate active lease & vacate room |
| `GET` | `/api/v1/lease` | Admin, Manager | Get all system leases |

### 8. Utility Bills & Roommate Splitting (`/api/v1/utility-bill`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/utility-bill` | Owner, Tenant | Create utility bill & split among roommates |
| `GET` | `/api/v1/utility-bill/my-splits` | Tenant | Get personal assigned bill splits |
| `GET` | `/api/v1/utility-bill/room/:roomId`| Owner | Get utility bills of a room |
| `GET` | `/api/v1/utility-bill/:id` | Authenticated | Get utility bill details |

### 9. Maintenance Tickets (`/api/v1/maintenance`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/maintenance` | Tenant | Create maintenance issue ticket |
| `GET` | `/api/v1/maintenance/my-requests` | Tenant | Get tenant's tickets |
| `GET` | `/api/v1/maintenance/owner-requests`| Owner | Get tickets for owner's properties |
| `GET` | `/api/v1/maintenance/:id` | Authenticated | Get maintenance ticket details |
| `PATCH` | `/api/v1/maintenance/:id/status` | Owner, Admin, Manager | Update status (OPEN, IN_PROGRESS, RESOLVED) |
| `GET` | `/api/v1/maintenance` | Admin | Get all maintenance tickets |

### 10. Roommate Preferences & Matching (`/api/v1/roommate-preference`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `PUT` | `/api/v1/roommate-preference/me` | Tenant | Save lifestyle questionnaire preferences |
| `GET` | `/api/v1/roommate-preference/me` | Tenant | View personal roommate preferences |
| `DELETE`| `/api/v1/roommate-preference/me`| Tenant | Delete preferences |
| `GET` | `/api/v1/roommate-preference/matches` | Tenant | **Find matching roommates** by score |

### 11. Notifications (`/api/v1/notification`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notification` | Authenticated | Get user notifications with pagination |
| `PATCH` | `/api/v1/notification/read-all`| Authenticated | Mark all notifications as read |
| `PATCH` | `/api/v1/notification/:id/read`| Authenticated | Mark single notification as read |

### 12. User Profile (`/api/v1/user` & `/api/v1/tenant` & `/api/v1/owner`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/api/v1/user/profile-image` | Authenticated | Upload profile image to Cloudinary |
| `GET` | `/api/v1/tenant/me` | Tenant | Get tenant profile |
| `PATCH` | `/api/v1/tenant/me` | Tenant | Update tenant profile |
| `DELETE`| `/api/v1/tenant/me` | Tenant | Deactivate account |
| `GET` | `/api/v1/tenant` | Admin, Manager | Get all tenants |
| `GET` | `/api/v1/tenant/:id` | Authenticated | Get tenant by ID |
| `POST` | `/api/v1/owner/kyc` | Owner | Submit KYC proof documents |
| `GET` | `/api/v1/owner/me` | Owner | Get owner profile |
| `GET` | `/api/v1/owner` | Admin, Manager | Get all owners |

### 13. Manager Management (`/api/v1/manager`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/manager` | Admin, Owner | Create new property manager |
| `GET` | `/api/v1/manager/me` | Manager | Get manager profile |
| `GET` | `/api/v1/manager` | Admin, Owner | List managers |
| `GET` | `/api/v1/manager/:id` | Admin, Owner | Get manager details |
| `PATCH` | `/api/v1/manager/:id` | Admin, Owner | Update manager info |
| `DELETE`| `/api/v1/manager/:id` | Admin, Owner | Deactivate manager |

### 14. Administration (`/api/v1/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/overview` | Admin | Platform statistics & counts |
| `GET` | `/api/v1/admin/me` | Admin | Get admin profile |
| `GET` | `/api/v1/admin/kyc/pending` | Admin | View pending Owner KYC requests |
| `PATCH` | `/api/v1/admin/kyc/:ownerId` | Admin | **Approve or Reject** Owner KYC |
| `PATCH` | `/api/v1/admin/user/:userId/status`| Admin | **Block or Unblock** any user |
| `GET` | `/api/v1/admin/audit-logs` | Admin | View audit activity logs with pagination |

---

## 🏃 How to Run Locally

1. **Clone repository:**
   ```bash
   git clone https://github.com/mdyhakash/nesthive-backend.git
   cd nesthive-backend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:**
   Create `.env` file from `.env.example` with valid credentials.
4. **Generate Prisma Client & Migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
5. **Start Dev Server:**
   ```bash
   npm run dev
   ```
6. **Open API Documentation in browser:**
   👉 [https://nesthive-backend.vercel.app/api-docs](https://nesthive-backend.vercel.app/api-docs) (or local `http://localhost:5000/api-docs`)
