# Project Requirements — NestHive (Housing & Roommate Management Platform)

## 1. Overview

NestHive connects property owners with tenants looking for a room, a flat, or a roommate. An owner lists a property, breaks it into rooms, and publishes availability. A tenant searches, requests a viewing, applies for a room, and pays upfront to secure it — at which point a lease is created and they move in. During the tenancy, rent is tracked month by month, shared utility bills are split between roommates, and maintenance issues are logged and resolved. Admins keep the platform trustworthy: they verify owners before their listings go live, and they manage accounts for both owners and tenants.

This document is the product spec — what the system must do and the exact rules it must follow. It is not the database schema and not the API design; those come next, and every rule below is written so that whoever designs them doesn't have to guess.

## 2. User roles

Three roles exist: **Admin**, **Owner**, **Tenant**.

| Role       | How they join the platform                                              | How they log in            |
| ---------- | ------------------------------------------------------------------------- | ----------------------------- |
| **Tenant** | Registers directly — email/password or Google                             | Email/password or Google      |
| **Owner**  | Registers directly — email/password or Google — but stays **unverified** until Admin reviews their ownership documents | Email/password or Google      |
| **Admin**  | Created by an existing Admin — cannot self-register                       | Email/password only           |

Google login is available to **Tenants and Owners only**. Admins always use email and password.

### 2.1 Who can manage whom

| Action                                  | Admin |
| ------------------------------------------ | :-----: |
| Verify or reject an Owner's KYC documents   | ✅      |
| Approve or reject a property for publishing | ✅      |
| Block or unblock an Owner                   | ✅      |
| Block or unblock a Tenant                   | ✅      |
| Create a new Admin                          | ✅      |
| Block or unblock another Admin              | ❌      |

Admin blocking of other Admins is intentionally left out — Admin accounts are trusted platform staff, not moderated the way Owners/Tenants are. Any Admin can create another Admin, since there is no Super Admin tier in this system.

These actions live behind three management screens: **Owner Management** (KYC verification, block/unblock), **Tenant Management** (block/unblock), and **Admin Management** (create new admins).

## 3. Accounts and authentication

### 3.1 Registration

- **Tenant** registers with name, email, and password — or with Google. Either way, they land in the system as a Tenant.
- **Owner** registers the same way — email/password or Google — but registering does **not** mean they can list anything yet. They land in the system as an **unverified Owner** (see [Section 5](#5-owner-verification-kyc)).
- **Admin** is never self-registered. Admins only come into existence when an existing Admin creates them (see [Section 4](#4-admin-management)).

### 3.2 Email OTP verification

Every registration that a person fills in themselves — Tenant credential registration and Owner credential registration — must be verified with a one-time password (OTP) sent to their email before the account is usable. Google registration skips this, since Google has already verified the email. Admin accounts skip OTP entirely, because they're created by someone else, not self-registered (see [Section 4](#4-admin-management) for how those are secured instead).

### 3.3 Login

- Tenants and Owners log in with email/password or with Google — and it's the same account either way. Someone who registered with email/password can also log in with Google afterward (matched by email), and vice versa; the system doesn't treat these as two separate accounts.
- Admins log in with email/password only — always.

### 3.4 Forgot password / reset password

Two-step flow, available to anyone who logs in with a password:

1. **Forgot password** — user submits their email; system emails them an OTP.
2. **Reset password** — user submits the OTP plus a new password; system verifies the OTP and updates the password.

### 3.5 Change password (logged in)

A logged-in user submits their **current password** and a **new password**. This is different from reset: it's for someone who remembers their current password and just wants to change it. Someone who's forgotten their current password uses forgot-password/reset-password instead.

### 3.6 Set password (Tenants and Owners only)

A user who first signed up through Google doesn't have a password yet. **Set Password** lets them choose one, so afterward they can log in either way: with Google or with email/password. This exists only for Tenants and Owners, since Admins never use Google login and always have a password from the moment their account is created.

### 3.7 Tokens and sessions

Every successful login or registration — credential or Google, any role — issues an **access token** and a **refresh token**, both set as cookies.

### 3.8 Welcome emails

| Event                                   | Recipient       | Contains                                                                          |
| ------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------- |
| Tenant's first registration, right after auto-login | Tenant's email     | Welcome message                                                                        |
| Owner's KYC gets verified                  | Owner's email      | Welcome message — "your properties can now go live"                                   |
| Admin gets created                         | Their personal email | Their new organization email (their login), their generated password, and a prompt to change that password after logging in |

## 4. Admin management

Only an existing Admin can create a new Admin. The creator fills in two email addresses for the new account:

- **Organization email** — the account's login identity going forward.
- **Personal email** — the actual person's own inbox, used only to deliver the welcome message.

The system generates a password for the new account and sends it to the **personal** email inside the welcome email, along with the organization email and a prompt to change the password on first login. There is no self-registration and no OTP step for Admin accounts.

## 5. Owner verification (KYC)

1. An Owner registers like anyone else and can log in immediately.
2. As part of onboarding, they submit ownership documents (e.g. deed, utility bill in their name, national ID) through a "submit verification documents" endpoint.
3. The submission sits pending in **Owner Management**, reviewed by an Admin, who verifies or rejects it.
4. Until verified, an Owner can create properties and rooms, but only in **draft** — nothing they own can be **published** for tenants to see. On verification, a welcome email goes out and their existing drafts become publishable.
5. A rejected Owner can resubmit documents; they are not permanently blocked, just left unverified.

## 6. Properties and rooms

A property belongs to exactly one Owner and contains one or more rooms.

### 6.1 Creating a property and rooms

| Rule                    | Detail                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Ownership                  | An Owner can create any number of properties, each with any number of rooms.                |
| Status                     | A property (and each room within it) starts as **draft**. It is invisible to tenants until the Owner **publishes** it — and publishing is only possible once the Owner is verified. |
| Room capacity               | Each room has a capacity (1 for a private room, 2+ for a shared room taking roommates). |
| Occupancy tracking          | A room tracks its current occupant count against its capacity. It stops appearing as bookable the moment occupant count reaches capacity. |

### 6.2 Editing a published property/room

| Field                     | Can it still be changed?                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Address / location**       | No — locked once the property is published (re-listing a moved property is a new property). |
| **Rent amount, description, amenities** | Yes, any time — editing these doesn't lock anything.                          |
| **Capacity**                  | Yes, but only until the room's first occupant moves in. Reducing capacity below current occupancy is never allowed. |

## 7. Roommate matching

Any Tenant can create a **roommate profile** — budget range, preferred area, move-in date, lifestyle tags, a short bio — independent of any specific room. The matching endpoint compares a Tenant's roommate profile against other Tenants' profiles (and against rooms with open capacity in their preferred area/budget) and returns ranked candidates. Matching is advisory only — it surfaces candidates, it never auto-assigns a roommate to a room.

## 8. Viewing requests

### 8.1 What a tenant can see

Tenants can only request a viewing for a room that is **published** and currently **has open capacity**. A room that is full, in draft, or belongs to an unverified Owner never appears in search or viewing results.

### 8.2 Requesting and responding

1. Tenant picks a room and requests a viewing, proposing a date/time.
2. The Owner (or the room's assigned manager) approves or rejects the request.
3. A viewing request can be cancelled by the Tenant at any point before it happens, at no cost — viewing requests carry no payment, so there is nothing to refund.

## 9. Applications and booking

### 9.1 Applying

1. Tenant applies for a specific room (a prior viewing is not required).
2. Applying does not reserve the room — it only registers interest.

### 9.2 Owner review and payment

1. The Owner approves or rejects the application.
2. On approval, the Tenant has a fixed window to pay the **security deposit plus first month's rent** upfront to confirm the room.
3. Because a room can receive more than one approved application when it has multiple open spots, confirming occupancy is transaction-safe: the database only allows a payment to succeed while the room still has open capacity at that instant, so two Tenants can never both pay their way into the platform's last open spot. Whichever confirmation loses that race is auto-rejected and refunded in full.
4. Once payment succeeds, a **Lease** is created with status **active**, the Tenant becomes a **RoomOccupant**, and the room's occupant count increases by one.
5. An invoice PDF — property address, room, rent amount, deposit, and payment details — is emailed to the Tenant right after payment.

## 10. Lease lifecycle

A lease moves through:

```
active  →  terminated  /  expired
```

- **Active** — set automatically once the confirming payment succeeds.
- **Terminated** — either party ends the lease early (see [Section 13](#13-lease-termination-and-refunds)).
- **Expired** — the lease's end date passes naturally with no early termination.

## 11. Rent tracking

Once a lease is active, the system generates one rent payment record per month, due on the same day-of-month as the lease start date. A Tenant pays through the platform's payment gateway; the record's status moves from **due** to **paid** on success. Rent that passes its due date unpaid is flagged **overdue** — the system does not auto-terminate a lease for a missed payment; that decision is left to the Owner.

## 12. Utility bill splitting

For a shared room (capacity > 1), the Owner (or a designated occupant) creates a monthly utility bill with a total amount and a split type (equal split, or a manually specified share per occupant). The system generates one split record per current occupant of that room. Each occupant pays their own share independently; the parent bill is considered settled only once every split is paid.

## 13. Lease termination and refunds

Whether a Tenant gets a refund on their **security deposit** depends on when they terminate relative to their **move-in date**:

| When the Tenant terminates                                                          | Refund?                          |
| ---------------------------------------------------------------------------------------- | ----------------------------------- |
| More than 7 days before the lease's move-in date                                         | Yes — full deposit refund, lease cancelled with no further obligation |
| Within 7 days of move-in, or any time after move-in has occurred                          | Termination is still allowed, but the deposit is forfeited; any already-paid rent for the current month is not refunded |

> Example: move-in date is the 1st. Terminating on or before the 24th of the prior month refunds the deposit in full. Terminating on the 25th or later — including after actually moving in — still ends the lease, but the deposit is kept.

Rent already paid for future months beyond the current one, if any, is always refunded regardless of when termination happens — only the deposit and the current month's rent follow the rule above.

## 14. Maintenance requests

Any current occupant of a room can file a maintenance request (title, description, priority) against their room or the property's shared areas. The Owner reviews it, optionally assigns it to a handler, and moves it through open → in-progress → resolved. Maintenance requests are informational only — they never affect lease status, rent, or payments.

## 15. Data models (conceptual)

The database design isn't finalized yet, so this is a description of what each model needs to hold — not a schema.

- **User** — the shared identity for every role: email, password (nullable — a Google-only Tenant/Owner has none until they set one), linked Google account, role (`ADMIN` / `OWNER` / `TENANT`), account status (active/blocked), email-verified flag, and a "must change password" flag (used right after an Admin is created).
- **Owner profile** — personal info, plus KYC document references and verification status.
- **Tenant profile** — personal info, plus an optional roommate-matching preference set.
- **Property** — belongs to one Owner; address, type, amenities, status (draft/published).
- **Room** — belongs to one Property; rent amount, capacity, current occupant count, status.
- **RoomOccupant** — links a Tenant to a Room for the duration of their stay (move-in/move-out dates).
- **ViewingRequest** — links a Tenant to a Room with a proposed date/time and a status.
- **Application** — links a Tenant to a Room with a status (pending/approved/rejected).
- **Lease** — created once a confirming payment succeeds; links Tenant, Room, and Owner with start/end dates, rent, deposit, and status.
- **Payment** — every gateway transaction (deposit, rent, utility share), tagged by type and linked back to a Lease or UtilityBillSplit.
- **UtilityBill** / **UtilityBillSplit** — a monthly bill for a room and its per-occupant shares.
- **MaintenanceRequest** — filed by an occupant against a Room or Property.
- **Notification** — in-app notices for status changes across the above.
- **AuditLog** — records who changed what (verification decisions, blocks, role-restricted actions).