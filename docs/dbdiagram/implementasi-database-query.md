# Tabel Implementasi Database

Tabel berikut menyajikan implementasi database dalam bentuk query `CREATE TABLE` berdasarkan `schema.prisma` dan riwayat migrations. Query ditulis menggunakan format PostgreSQL. Beberapa nama tabel seperti `"User"` dan `"Order"` menggunakan tanda kutip ganda karena berpotensi bentrok dengan kata kunci SQL. Urutan tabel pada dokumen ini mengikuti kelompok model pada Prisma; pada eksekusi migration sebenarnya, sebagian foreign key dapat dibuat setelah tabel acuannya tersedia.

Sebelum tabel dibuat, ekstensi PostGIS dan tipe data enumerasi berikut perlu didefinisikan terlebih dahulu.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'TECHNICIAN', 'TECH_ADMIN', 'SUPER_ADMIN');
CREATE TYPE "Status" AS ENUM (
  'PENDING_REVIEW',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
  'SURVEY_SCHEDULED',
  'SURVEY_COMPLETED',
  'WAITING_FOR_ASSIGNMENT',
  'TECHNICIAN_ASSIGNED',
  'INSTALLATION_IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPaymentStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'EXPIRED');
CREATE TYPE "TicketHistoryActor" AS ENUM ('SYSTEM', 'ADMIN', 'TECHNICIAN', 'CUSTOMER');
CREATE TYPE "BillingStatus" AS ENUM ('PAID', 'UNPAID', 'OVERDUE');
```

<table>
<thead>
<tr><th>No</th><th>Nama Tabel</th><th>Struktur Tabel</th></tr>
</thead>
<tbody>
<tr><td>1</td><td>User</td><td><pre><code class="language-sql">CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "fullname" VARCHAR(255) NOT NULL DEFAULT 'User',
  "password" VARCHAR(255) NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>2</td><td>Profile</td><td><pre><code class="language-sql">CREATE TABLE "Profile" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE,
  "phone_number" VARCHAR(255) NOT NULL,
  "image_url" VARCHAR(255),
  "full_address" VARCHAR(255) NOT NULL,
  "province" VARCHAR(255) NOT NULL,
  "city" VARCHAR(255) NOT NULL,
  "district" VARCHAR(255) NOT NULL,
  "subdistrict" VARCHAR(255) NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "routerId" INTEGER,
  "pppUsername" VARCHAR(255) UNIQUE,
  "pppPassword" VARCHAR(255),
  "pppProfile" VARCHAR(255),
  "isPppActive" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id"),
  CONSTRAINT "Profile_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE SET NULL
);</code></pre></td></tr>
<tr><td>3</td><td>TokenBlacklist</td><td><pre><code class="language-sql">CREATE TABLE "TokenBlacklist" (
  "id" SERIAL PRIMARY KEY,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>4</td><td>PushSubscription</td><td><pre><code class="language-sql">CREATE TABLE "PushSubscription" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dhKey" TEXT NOT NULL,
  "authKey" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");</code></pre></td></tr>
<tr><td>5</td><td>Notification</td><td><pre><code class="language-sql">CREATE TABLE "Notification" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "type" VARCHAR(255) NOT NULL,
  "url" TEXT,
  "data" JSONB,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");</code></pre></td></tr>
<tr><td>6</td><td>CategoryPackage</td><td><pre><code class="language-sql">CREATE TABLE "CategoryPackage" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>7</td><td>Package</td><td><pre><code class="language-sql">CREATE TABLE "Package" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "downloadSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "uploadSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "isPopular" BOOLEAN NOT NULL DEFAULT FALSE,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "categoryId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Package_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CategoryPackage"("id")
);</code></pre></td></tr>
<tr><td>8</td><td>InventoryCategory</td><td><pre><code class="language-sql">CREATE TABLE "InventoryCategory" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>9</td><td>InventoryItem</td><td><pre><code class="language-sql">CREATE TABLE "InventoryItem" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "unit" VARCHAR(255) NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id")
);</code></pre></td></tr>
<tr><td>10</td><td>Order</td><td><pre><code class="language-sql">CREATE TABLE "Order" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'PENDING_REVIEW',
  "total" DOUBLE PRECISION NOT NULL,
  "paymentGateway" VARCHAR(255),
  "midtransTransactionId" VARCHAR(255) UNIQUE,
  "midtransOrderId" VARCHAR(255) UNIQUE,
  "xenditInvoiceId" VARCHAR(255) UNIQUE,
  "xenditExternalId" VARCHAR(255) UNIQUE,
  "redirectUrl" TEXT,
  "reviewedBy" INTEGER,
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);</code></pre></td></tr>
<tr><td>11</td><td>OrderItem</td><td><pre><code class="language-sql">CREATE TABLE "OrderItem" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "packageId" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id"),
  CONSTRAINT "OrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id")
);</code></pre></td></tr>
<tr><td>12</td><td>Ticket</td><td><pre><code class="language-sql">CREATE TABLE "Ticket" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "technicianId" INTEGER,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "paymentStatus" "TicketPaymentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "expiresAt" TIMESTAMP,
  "expiredAt" TIMESTAMP,
  "paidAt" TIMESTAMP,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "categoryId" INTEGER,
  "scheduledAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id"),
  CONSTRAINT "Ticket_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL
);</code></pre></td></tr>
<tr><td>13</td><td>TicketCategory</td><td><pre><code class="language-sql">CREATE TABLE "TicketCategory" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "isExpirable" BOOLEAN NOT NULL DEFAULT FALSE,
  "expireHours" INTEGER,
  "requiresTechnician" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>14</td><td>TicketHistory</td><td><pre><code class="language-sql">CREATE TABLE "TicketHistory" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "actorType" "TicketHistoryActor" NOT NULL DEFAULT 'SYSTEM',
  "actorId" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
  CONSTRAINT "TicketHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX "TicketHistory_ticketId_idx" ON "TicketHistory"("ticketId");</code></pre></td></tr>
<tr><td>15</td><td>TicketAttachment</td><td><pre><code class="language-sql">CREATE TABLE "TicketAttachment" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL,
  "filename" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(255) NOT NULL,
  "dataUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE
);</code></pre></td></tr>
<tr><td>16</td><td>TicketMember</td><td><pre><code class="language-sql">CREATE TABLE "TicketMember" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMember_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
  CONSTRAINT "TicketMember_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id"),
  CONSTRAINT "TicketMember_ticketId_technicianId_key" UNIQUE ("ticketId", "technicianId")
);</code></pre></td></tr>
<tr><td>17</td><td>TicketSurvey</td><td><pre><code class="language-sql">CREATE TABLE "TicketSurvey" (
  "id" SERIAL PRIMARY KEY,
  "surveyTicketId" INTEGER NOT NULL UNIQUE,
  "installationTicketId" INTEGER UNIQUE,
  "plannedItems" JSONB NOT NULL,
  "actualItems" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketSurvey_surveyTicketId_fkey" FOREIGN KEY ("surveyTicketId") REFERENCES "Ticket"("id"),
  CONSTRAINT "TicketSurvey_installationTicketId_fkey" FOREIGN KEY ("installationTicketId") REFERENCES "Ticket"("id")
);</code></pre></td></tr>
<tr><td>18</td><td>BillingInvoice</td><td><pre><code class="language-sql">CREATE TABLE "BillingInvoice" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "periodStart" TIMESTAMP NOT NULL,
  "periodEnd" TIMESTAMP NOT NULL,
  "status" "BillingStatus" NOT NULL DEFAULT 'UNPAID',
  "dueAt" TIMESTAMP NOT NULL,
  "paidAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);</code></pre></td></tr>
<tr><td>19</td><td>BillingSetting</td><td><pre><code class="language-sql">CREATE TABLE "BillingSetting" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "automationEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "suspendCron" VARCHAR(255) NOT NULL DEFAULT '0 * * * *',
  "renewCron" VARCHAR(255) NOT NULL DEFAULT '10 0 1 * *',
  "graceDays" INTEGER NOT NULL DEFAULT 3,
  "dueDays" INTEGER NOT NULL DEFAULT 7,
  "periodDays" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>20</td><td>AppSetting</td><td><pre><code class="language-sql">CREATE TABLE "AppSetting" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(255) NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "group" VARCHAR(255) NOT NULL,
  "type" VARCHAR(255) NOT NULL,
  "isSecret" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedBy" INTEGER,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>21</td><td>SuspensionHistory</td><td><pre><code class="language-sql">CREATE TABLE "SuspensionHistory" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "suspendedAt" TIMESTAMP NOT NULL,
  "resumedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuspensionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);</code></pre></td></tr>
<tr><td>22</td><td>PackageHistory</td><td><pre><code class="language-sql">CREATE TABLE "PackageHistory" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "packageId" INTEGER NOT NULL,
  "startedAt" TIMESTAMP NOT NULL,
  "endedAt" TIMESTAMP,
  "reason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PackageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
  CONSTRAINT "PackageHistory_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id")
);</code></pre></td></tr>
<tr><td>23</td><td>CoveredArea</td><td><pre><code class="language-sql">CREATE TABLE "CoveredArea" (
  "id" SERIAL PRIMARY KEY,
  "province" VARCHAR(255) NOT NULL,
  "city" VARCHAR(255) NOT NULL,
  "district" VARCHAR(255) NOT NULL,
  "village" VARCHAR(255) NOT NULL,
  "fullAddress" TEXT,
  "radius_m" INTEGER DEFAULT 10000,
  "center" GEOGRAPHY(Point, 4326),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unique_area_constraint" UNIQUE ("province", "city", "district", "village")
);</code></pre></td></tr>
<tr><td>24</td><td>CoverageCheckHistory</td><td><pre><code class="language-sql">CREATE TABLE "CoverageCheckHistory" (
  "id" SERIAL PRIMARY KEY,
  "fullAddress" TEXT NOT NULL,
  "province" VARCHAR(255) NOT NULL,
  "city" VARCHAR(255) NOT NULL,
  "district" VARCHAR(255) NOT NULL,
  "village" VARCHAR(255) NOT NULL,
  "userLocation" GEOGRAPHY(Point, 4326),
  "isCovered" BOOLEAN NOT NULL,
  "checkedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
<tr><td>25</td><td>Router</td><td><pre><code class="language-sql">CREATE TABLE "Router" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "host" VARCHAR(255) NOT NULL,
  "user" VARCHAR(255) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "port" INTEGER DEFAULT 8728,
  "portApi" INTEGER NOT NULL DEFAULT 8728,
  "portSsh" INTEGER NOT NULL DEFAULT 22,
  "pppLocalAddress" VARCHAR(255),
  "pppRemoteAddress" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);</code></pre></td></tr>
</tbody>
</table>
