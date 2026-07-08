# PWA Web Push Implementation Design

Goal: implement Nemafi PWA installability and Web Push notifications for Admin and Technician roles only.

Architecture:
- Frontend exposes a PWA manifest, service worker, and notification opt-in component mounted on internal dashboards.
- Backend owns subscription persistence and delivery through `web-push` with VAPID keys in environment variables.
- Existing Socket.IO emitters remain unchanged; push delivery is called in parallel as a non-blocking side effect.

Sprint Scope:
1. PWA setup: manifest, service worker, Next.js PWA config.
2. Subscription: Prisma `PushSubscription`, authenticated API, frontend subscription client.
3. Web Push: backend delivery service, VAPID public key endpoint, invalid subscription cleanup.
4. Event integration: ticket, payment, billing/suspend/reactivate, and helper support for router status events.
5. Verification: backend build, Prisma generate, frontend targeted typecheck/build where feasible.

Out of scope:
- Customer push notifications.
- Native app FCM/APNS.
- Queue/retry infrastructure beyond best-effort async delivery.
