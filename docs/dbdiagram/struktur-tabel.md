# Struktur Tabel

Struktur tabel berikut disusun berdasarkan skema relasi konseptual dan UML yang telah dibuat. Setiap tabel menjelaskan atribut utama, tipe data, panjang data, serta keterangan yang menunjukkan fungsi atribut, primary key, dan foreign key pada sistem.

### 1. Struktur Tabel User

Berikut adalah struktur tabel `User` yang digunakan untuk menyimpan data akun pengguna sistem.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| nama | varchar | 255 | Nama pengguna |
| email | varchar | 255 | Email unik pengguna |
| password | varchar | 255 | Kata sandi pengguna |
| role | Role | - | Peran pengguna dalam sistem |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 2. Struktur Tabel Profile

Berikut adalah struktur tabel `Profile` yang digunakan untuk menyimpan data profil dan informasi layanan pelanggan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| pelangganId | int | - | Foreign Key ke tabel User |
| nomorTelepon | varchar | 255 | Nomor telepon pelanggan |
| imageUrl | varchar | 255 | Lokasi file foto profil |
| alamatLengkap | varchar | 255 | Alamat lengkap pelanggan |
| provinsi | varchar | 255 | Provinsi pelanggan |
| kota | varchar | 255 | Kota atau kabupaten pelanggan |
| kecamatan | varchar | 255 | Kecamatan pelanggan |
| kelurahan | varchar | 255 | Kelurahan pelanggan |
| latitude | float | - | Koordinat latitude alamat |
| longitude | float | - | Koordinat longitude alamat |
| routerId | int | - | Foreign Key ke tabel Router |
| usernamePpp | varchar | 255 | Username PPP pelanggan |
| passwordPpp | varchar | 255 | Password PPP pelanggan |
| profilePpp | varchar | 255 | Profil PPP pada router |
| isPppActive | boolean | - | Status aktif PPP pelanggan |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 3. Struktur Tabel CategoryPackage

Berikut adalah struktur tabel `CategoryPackage` yang digunakan untuk menyimpan kategori paket layanan internet.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| nama | varchar | 255 | Nama unik kategori paket |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 4. Struktur Tabel Package

Berikut adalah struktur tabel `Package` yang digunakan untuk menyimpan data paket layanan internet.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| categoryPackageId | int | - | Foreign Key ke tabel CategoryPackage |
| nama | varchar | 255 | Nama paket layanan |
| harga | int | - | Harga paket layanan |
| downloadSpeed | float | - | Kecepatan unduh paket |
| uploadSpeed | float | - | Kecepatan unggah paket |
| deskripsi | text | - | Deskripsi paket layanan |
| isPopular | boolean | - | Penanda paket populer |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 5. Struktur Tabel Order

Berikut adalah struktur tabel `Order` yang digunakan untuk menyimpan data pendaftaran layanan pelanggan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| pelangganId | int | - | Foreign Key ke tabel User |
| packageId | int | - | Foreign Key ke tabel Package |
| status | OrderStatus | - | Status proses pendaftaran layanan |
| total | int | - | Total biaya pendaftaran atau layanan |
| catatanReview | text | - | Catatan hasil verifikasi admin |
| reviewedAt | datetime | - | Waktu pendaftaran diverifikasi |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 6. Struktur Tabel PackageHistory

Berikut adalah struktur tabel `PackageHistory` yang digunakan untuk menyimpan riwayat paket yang pernah digunakan pelanggan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| pelangganId | int | - | Foreign Key ke tabel User |
| packageId | int | - | Foreign Key ke tabel Package |
| startedAt | datetime | - | Tanggal paket mulai digunakan |
| endedAt | datetime | - | Tanggal paket berakhir |
| alasan | text | - | Alasan perubahan atau penghentian paket |
| createdAt | datetime | - | Tanggal data dibuat |

### 7. Struktur Tabel TicketCategory

Berikut adalah struktur tabel `TicketCategory` yang digunakan untuk menyimpan kategori tiket layanan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| nama | varchar | 255 | Nama unik kategori tiket |
| requiresTechnician | boolean | - | Penanda tiket membutuhkan teknisi |
| isExpirable | boolean | - | Penanda tiket memiliki batas waktu |
| expireHours | int | - | Durasi kedaluwarsa tiket dalam jam |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 8. Struktur Tabel Ticket

Berikut adalah struktur tabel `Ticket` yang digunakan untuk menyimpan data tiket pekerjaan layanan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| orderId | int | - | Foreign Key ke tabel Order |
| ticketCategoryId | int | - | Foreign Key ke tabel TicketCategory |
| teknisiUtamaId | int | - | Foreign Key ke tabel User sebagai teknisi utama |
| judul | varchar | 255 | Judul tiket |
| deskripsi | text | - | Deskripsi pekerjaan atau kendala |
| status | TicketStatus | - | Status pengerjaan tiket |
| scheduledAt | datetime | - | Jadwal pengerjaan tiket |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 9. Struktur Tabel TicketTechnicianMember

Berikut adalah struktur tabel `TicketTechnicianMember` yang digunakan untuk menyimpan anggota teknisi pada suatu tiket.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| ticketId | int | - | Foreign Key ke tabel Ticket |
| teknisiId | int | - | Foreign Key ke tabel User sebagai teknisi anggota |
| assignedAt | datetime | - | Tanggal teknisi ditugaskan |

### 10. Struktur Tabel TicketHistory

Berikut adalah struktur tabel `TicketHistory` yang digunakan untuk menyimpan riwayat aktivitas pada tiket.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| ticketId | int | - | Foreign Key ke tabel Ticket |
| actorId | int | - | Foreign Key ke tabel User sebagai pelaku aktivitas |
| actorType | TicketHistoryActor | - | Jenis pelaku aktivitas |
| aksi | varchar | 255 | Nama aksi pada tiket |
| deskripsi | text | - | Keterangan aktivitas tiket |
| createdAt | datetime | - | Tanggal aktivitas dibuat |

### 11. Struktur Tabel TicketAttachment

Berikut adalah struktur tabel `TicketAttachment` yang digunakan untuk menyimpan lampiran bukti atau dokumen pada tiket.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| ticketId | int | - | Foreign Key ke tabel Ticket |
| filename | varchar | 255 | Nama file lampiran |
| mimeType | varchar | 255 | Tipe file lampiran |
| fileUrl | text | - | Lokasi file lampiran |
| uploadedBy | int | - | Foreign Key ke tabel User sebagai pengunggah |
| createdAt | datetime | - | Tanggal lampiran diunggah |

### 12. Struktur Tabel TicketSurvey

Berikut adalah struktur tabel `TicketSurvey` yang digunakan untuk menyimpan hasil survei sebelum atau sesudah instalasi.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| ticketId | int | - | Foreign Key ke tabel Ticket sebagai tiket survei |
| installationTicketId | int | - | Foreign Key ke tabel Ticket sebagai tiket instalasi |
| catatanSurvey | text | - | Catatan pelaksanaan survei |
| hasilSurvey | text | - | Hasil survei lapangan |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 13. Struktur Tabel TicketSurveyItem

Berikut adalah struktur tabel `TicketSurveyItem` yang digunakan untuk menyimpan rincian perangkat yang direncanakan dan digunakan pada survei atau instalasi.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| ticketSurveyId | int | - | Foreign Key ke tabel TicketSurvey |
| inventoryItemId | int | - | Foreign Key ke tabel InventoryItem |
| type | SurveyItemType | - | Jenis item, yaitu rencana atau aktual |
| quantity | int | - | Jumlah item |
| satuan | varchar | 255 | Satuan item |
| catatan | text | - | Catatan penggunaan item |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 14. Struktur Tabel InventoryCategory

Berikut adalah struktur tabel `InventoryCategory` yang digunakan untuk menyimpan kategori perangkat inventaris.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| nama | varchar | 255 | Nama unik kategori inventaris |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 15. Struktur Tabel InventoryItem

Berikut adalah struktur tabel `InventoryItem` yang digunakan untuk menyimpan data perangkat atau material inventaris.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| inventoryCategoryId | int | - | Foreign Key ke tabel InventoryCategory |
| nama | varchar | 255 | Nama perangkat atau material |
| stok | int | - | Jumlah stok inventaris |
| satuan | varchar | 255 | Satuan inventaris |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 16. Struktur Tabel CoveredArea

Berikut adalah struktur tabel `CoveredArea` yang digunakan untuk menyimpan area yang termasuk jangkauan layanan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| provinsi | varchar | 255 | Provinsi area layanan |
| kota | varchar | 255 | Kota atau kabupaten area layanan |
| kecamatan | varchar | 255 | Kecamatan area layanan |
| kelurahan | varchar | 255 | Kelurahan area layanan |
| alamatLengkap | text | - | Detail alamat area layanan |
| radiusMeter | int | - | Radius jangkauan layanan dalam meter |
| titikPusat | geography | - | Titik pusat area layanan |
| createdAt | datetime | - | Tanggal data dibuat |

### 17. Struktur Tabel CoverageCheckHistory

Berikut adalah struktur tabel `CoverageCheckHistory` yang digunakan untuk menyimpan riwayat pengecekan area pelanggan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| coveredAreaId | int | - | Foreign Key ke tabel CoveredArea |
| alamatLengkap | text | - | Alamat yang dicek |
| provinsi | varchar | 255 | Provinsi alamat yang dicek |
| kota | varchar | 255 | Kota atau kabupaten alamat yang dicek |
| kecamatan | varchar | 255 | Kecamatan alamat yang dicek |
| kelurahan | varchar | 255 | Kelurahan alamat yang dicek |
| userLocation | geography | - | Titik lokasi pengguna |
| isCovered | boolean | - | Status keterjangkauan area |
| checkedAt | datetime | - | Tanggal pengecekan area |

### 18. Struktur Tabel BillingInvoice

Berikut adalah struktur tabel `BillingInvoice` yang digunakan untuk menyimpan data tagihan pelanggan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| pelangganId | int | - | Foreign Key ke tabel User |
| amount | int | - | Nominal tagihan |
| periodStart | datetime | - | Awal periode tagihan |
| periodEnd | datetime | - | Akhir periode tagihan |
| dueAt | datetime | - | Tanggal jatuh tempo |
| paidAt | datetime | - | Tanggal pembayaran |
| status | BillingStatus | - | Status pembayaran tagihan |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |

### 19. Struktur Tabel SuspensionHistory

Berikut adalah struktur tabel `SuspensionHistory` yang digunakan untuk menyimpan riwayat suspend dan reaktivasi layanan pelanggan.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| pelangganId | int | - | Foreign Key ke tabel User |
| reason | text | - | Alasan layanan disuspend |
| suspendedAt | datetime | - | Tanggal layanan disuspend |
| resumedAt | datetime | - | Tanggal layanan diaktifkan kembali |
| createdAt | datetime | - | Tanggal data dibuat |

### 20. Struktur Tabel Router

Berikut adalah struktur tabel `Router` yang digunakan untuk menyimpan data perangkat router yang terhubung dengan sistem.

| Nama | Tipe Data | Panjang | Keterangan |
|---|---:|---:|---|
| id | int | - | Primary Key |
| nama | varchar | 255 | Nama unik router |
| host | varchar | 255 | Alamat host router |
| username | varchar | 255 | Username akses router |
| password | varchar | 255 | Password akses router |
| portApi | int | - | Port API router |
| portSsh | int | - | Port SSH router |
| createdAt | datetime | - | Tanggal data dibuat |
| updatedAt | datetime | - | Tanggal data diperbarui |
