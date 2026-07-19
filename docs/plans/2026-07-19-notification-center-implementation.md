# Notification Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an in-app notification center with unread badge, notification list, mark-as-read actions, and realtime updates.

**Architecture:** Store notifications in PostgreSQL through Prisma, expose authenticated API endpoints, and reuse existing Socket.io/Web Push events. Existing Web Push calls will also create persisted notifications, so current billing/ticket/router notification events automatically appear in the app.

**Tech Stack:** Express, Prisma, PostgreSQL, Socket.io, Next.js App Router, shadcn/ui dropdown/button components.

---

### Task 1: Backend Notification Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260719123000_add_notifications/migration.sql`
- Create: `src/services/notificationService.ts`
- Modify: `src/application/socket.ts`

**Steps:**
1. Add `Notification` model related to `User`.
2. Add helper functions to list notifications, count unread, mark one read, mark all read, and create notifications for explicit `userIds` or `roles`.
3. Add `emitNotificationCreated` and `emitNotificationCountUpdated` to Socket.io.

### Task 2: Backend Routes

**Files:**
- Create: `src/controllers/notificationController.ts`
- Create: `src/routes/notificationRoutes.ts`
- Modify: `src/routes/index.ts`

**Steps:**
1. Add authenticated endpoints for list, unread count, mark one read, and mark all read.
2. Mount under `/notifications`.

### Task 3: Wire Existing Push Events

**Files:**
- Modify: `src/services/pushSubscriptionService.ts`

**Steps:**
1. Resolve target users once.
2. Persist the notification payload for each target user.
3. Continue sending Web Push to subscribed devices.

### Task 4: Frontend API Proxies

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/unread-count/route.ts`
- Create: `src/app/api/notifications/read-all/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`

**Steps:**
1. Forward authenticated requests from Next routes to backend using the existing `auth_token` cookie pattern.

### Task 5: Frontend Notification Center UI

**Files:**
- Create: `src/components/notification-center.tsx`
- Modify: `src/components/dashboard-layout.tsx`

**Steps:**
1. Render a bell button with unread badge.
2. Show latest notifications in a dropdown.
3. Mark notification read when clicked and navigate to its URL.
4. Add “Tandai semua dibaca”.
5. Listen to existing Socket.io URL for realtime notification events.

### Task 6: Verification

**Commands:**
- `cd nemafi-be && npx prisma validate`
- `cd nemafi-be && npm run build`
- `cd nemafi-fe && npm run typecheck -- --pretty false 2>&1 | rg "notification|dashboard-layout|api/notifications" || true`

**Manual checks:**
1. Login as admin/technician/customer.
2. Open dashboard and verify bell appears.
3. Trigger an existing ticket/billing event.
4. Verify unread badge increases and notification appears.
5. Click notification and verify it is marked as read and navigates.
