import fs from 'fs';
const code = fs.readFileSync('scripts/generate-ui-mockups.mjs', 'utf8');

let newCode = code.replace(
  /technicianTickets:\s*\(\)\s*=>\s*dashboardShell\([\s\S]*?router:\s*\(\)\s*=>\s*dashboardShell\([\s\S]*?\),/m,
  	echnicianTickets: () => dashboardShell("Tiket Teknisi", techMenu, 0, (x, y) =>
      card(x, y + 28, 1060, 560, "Daftar Tiket", "Tiket tugas lapangan") +
      rect(x + 24, y + 105, 1012, 45, c.card2, c.border, 1, 6) +
      rect(x + 24, y + 105, 120, 45, c.active, c.border, 1, 6) +
      text(x + 84, y + 132, "Kapten", 14, c.primary, 700, "middle") +
      text(x + 204, y + 132, "Anggota", 14, c.muted, 600, "middle") +
      table(x + 24, y + 175, 1012, ["Tiket", "Pelanggan", "Peran", "Jadwal", "Status"], [["TKT-201", "A. Rahman", "Kapten", "Hari ini, 08:00", "In Progress"], ["TKT-202", "S. Putri", "Kapten", "Hari ini, 10:00", "Scheduled"]])
    ),
    technicianSchedule: () => dashboardShell("Jadwal & Tugas", techMenu, 1, (x, y) =>
      card(x, y + 28, 640, 560, "Detail Tiket (TKT-201)", "Pemasangan Baru") +
      rect(x + 24, y + 100, 592, 120, c.card2, c.border, 1, 8) +
      text(x + 40, y + 130, "Kredensial PPPoE", 16, c.primary, 700) +
      text(x + 40, y + 160, "Username: ppp-201", 14, c.text, 500) +
      text(x + 40, y + 185, "Password: ppp-201-pass", 14, c.text, 500) +
      rect(x + 24, y + 240, 592, 200, c.card2, c.border, 1, 8) +
      text(x + 320, y + 345, "[ Map View ]", 20, c.muted, 600, "middle") +
      card(x + 665, y + 28, 395, 560, "Tim & Form Laporan", "Dokumentasi pekerjaan")
    ),
    technicianHistory: () => dashboardShell("Riwayat Teknisi", techMenu, 2, (x, y) =>
      card(x, y + 28, 1060, 560, "Riwayat Pengerjaan", "Tiket yang sudah diselesaikan") +
      table(x + 24, y + 100, 1012, ["Tiket", "Pelanggan", "Kategori", "Selesai"], [["TKT-190", "R. Aditya", "Instalasi", "10 Jan 2026"], ["TKT-191", "M. Sari", "Gangguan", "11 Jan 2026"]])
    ),
    router: () => dashboardShell("Manajemen Router", techMenu, 3, (x, y) =>
      card(x, y + 28, 1060, 560, "Manajemen Router", "Koneksi API Mikrotik") +
      table(x + 24, y + 100, 1012, ["Nama", "IP Address", "API Port", "Status", "Aksi"], [["Router Utama", "192.168.1.1", "8728", "Online", "?? ???"], ["Router Cabang", "192.168.2.1", "8728", "Offline", "?? ???"]])
    ),
    adminDashboard: () => dashboardShell("Ringkasan Admin", adminMenu, 0, (x, y) =>
      card(x, y + 28, 250, 120, "Total Pelanggan", "45 Aktif") +
      card(x + 270, y + 28, 250, 120, "Pendapatan", "Rp 12.5M") +
      card(x + 540, y + 28, 250, 120, "Tiket Open", "3 Tiket") +
      card(x + 810, y + 28, 250, 120, "Router", "2 Online") +
      card(x, y + 168, 1060, 420, "Grafik Transaksi", "Perkembangan pendapatan bulanan")
    ),
    adminTransactions: () => dashboardShell("Transaksi", adminMenu, 3, (x, y) =>
      card(x, y + 28, 1060, 560, "Daftar Transaksi", "Pembayaran pelanggan") +
      table(x + 24, y + 100, 1012, ["ID Order", "Pelanggan", "Jumlah", "Gateway", "Status"], [["ORD-01", "Budi", "Rp 150.000", "Midtrans", "PAID"], ["ORD-02", "Andi", "Rp 250.000", "Xendit", "PENDING"]])
    ),
    adminCustomers: () => dashboardShell("Kelola Pelanggan", adminMenu, 4, (x, y) =>
      card(x, y + 28, 1060, 560, "Daftar Pelanggan", "Pelanggan aktif dan non-aktif") +
      table(x + 24, y + 100, 1012, ["Nama", "Email", "No. HP", "Paket", "Status"], [["Budi Santoso", "budi@mail.com", "0812...", "Paket 10Mbps", "Aktif"], ["Andi", "andi@mail.com", "0813...", "Paket 20Mbps", "Suspend"]])
    ),
    adminTechnicians: () => dashboardShell("Kelola Teknisi", adminMenu, 5, (x, y) =>
      card(x, y + 28, 1060, 560, "Daftar Teknisi", "Tim lapangan") +
      table(x + 24, y + 100, 1012, ["Nama", "Email", "Pekerjaan Aktif", "Status"], [["Joko", "joko@mail.com", "2 Tiket", "Aktif"], ["Agus", "agus@mail.com", "0 Tiket", "Aktif"]])
    ),
    adminAccounts: () => dashboardShell("Kelola Akun", adminMenu, 8, (x, y) =>
      card(x, y + 28, 1060, 560, "Kelola Akun Admin & Staf", "Akses sistem") +
      table(x + 24, y + 100, 1012, ["Nama", "Email", "Peran", "Dibuat"], [["Admin Utama", "admin@nemafi.id", "Admin", "1 Jan 2026"]])
    ),
    adminSettings: () => dashboardShell("Pengaturan", adminMenu, 8, (x, y) =>
      card(x, y + 28, 515, 560, "Payment Gateway", "Midtrans & Xendit") +
      rect(x + 24, y + 100, 470, 45, c.card2, c.border, 1, 6) +
      text(x + 36, y + 128, "Active Gateway: Xendit", 14, c.text, 600) +
      card(x + 560, y + 28, 500, 560, "Konfigurasi Sistem", "Pengaturan Umum")
    ),
    techProfile: () => dashboardShell("Profil Saya", techMenu, 4, (x, y) =>
      card(x, y + 28, 1060, 560, "Pengaturan Profil", "Ubah kata sandi dan email") +
      rect(x + 24, y + 100, 500, 45, c.card2, c.border, 1, 6) +
      text(x + 36, y + 128, "Email: teknisi@nemafi.id", 14, c.text, 600)
    ),
    customerDashboard: () => dashboardShell("Dashboard Pelanggan", customerMenu, 0, (x, y) =>
      card(x, y + 28, 330, 160, "Status Layanan", "Aktif") +
      card(x + 365, y + 28, 330, 160, "Tagihan Bulan Ini", "Lunas") +
      card(x + 730, y + 28, 330, 160, "Tiket Aktif", "0 Tiket") +
      card(x, y + 210, 1060, 370, "Info Paket", "Paket Home 10 Mbps")
    ),
);

const newPagesList = const pages = [
  ["TA01", "Antarmuka Halaman Login", "login", "Tombol Masuk mengirim kredensial pengguna. Jika valid, sistem mengarahkan pengguna sesuai role menuju dashboard pelanggan, admin, atau teknisi."],
  ["TA02", "Antarmuka Halaman Register", "register", "Tombol Daftar menyimpan data pelanggan, alamat pemasangan, paket pilihan, dan membuat order pendaftaran layanan."],
  ["TA03", "Antarmuka Halaman Profil", "profile", "Halaman Profil digunakan pelanggan untuk melihat dan memperbarui data diri, alamat pemasangan, serta status layanan yang aktif."],
  ["TA04", "Antarmuka Halaman Dukungan", "support", "Halaman Dukungan digunakan pelanggan untuk membuat tiket gangguan dan melihat riwayat tiket yang pernah diajukan."],
  ["TA05", "Antarmuka Halaman Tagihan", "billing", "Halaman Tagihan menampilkan invoice berjalan, status pembayaran, riwayat pembayaran, dan paket berlangganan pelanggan."],
  ["TA06", "Antarmuka Halaman Kelola Paket", "packages", "Admin menggunakan halaman ini untuk menambah, mengubah, menghapus, dan mengelompokkan paket layanan internet."],
  ["TA07", "Antarmuka Halaman Kelola Tiket", "ticketsAdmin", "Admin menggunakan halaman ini untuk membuat tiket, menjadwalkan kunjungan, assign teknisi, dan memantau riwayat tiket."],
  ["TA08", "Antarmuka Halaman Kelola Inventaris", "inventory", "Admin menggunakan halaman ini untuk mengelola kategori dan stok perangkat yang dipakai pada proses survey dan instalasi."],
  ["TA09", "Antarmuka Halaman Area Layanan", "areas", "Admin menggunakan halaman ini untuk memetakan cakupan area layanan berdasarkan koordinat dan radius."],
  ["TA10", "Antarmuka Halaman History Check Area", "areaHistory", "Admin menggunakan halaman ini untuk melihat riwayat pengecekan jangkauan lokasi oleh calon pelanggan."],
  ["TA11", "Antarmuka Halaman Tiket Teknisi", "technicianTickets", "Teknisi menggunakan halaman ini untuk melihat dan mengelola status tiket pekerjaan yang ditugaskan."],
  ["TA12", "Antarmuka Halaman Jadwal & Tugas", "technicianSchedule", "Teknisi menggunakan halaman ini untuk memantau detail tugas, kredensial PPPoE pelanggan, dan mengisi laporan."],
  ["TA13", "Antarmuka Halaman Riwayat Teknisi", "technicianHistory", "Teknisi menggunakan halaman ini untuk melihat riwayat pekerjaan yang telah diselesaikan."],
  ["TA14", "Antarmuka Halaman Kelola Router", "router", "Teknisi menggunakan halaman ini untuk memantau koneksi router MikroTik fisik dan mengakses terminal perintah."],
  ["TA15", "Antarmuka Halaman Ringkasan Admin", "adminDashboard", "Admin menggunakan halaman ini untuk melihat statistik umum aplikasi, pendapatan, pelanggan aktif, dan status router."],
  ["TA16", "Antarmuka Halaman Transaksi Admin", "adminTransactions", "Admin menggunakan halaman ini untuk melihat dan merekonsiliasi pembayaran dari pelanggan melalui Xendit/Midtrans."],
  ["TA17", "Antarmuka Halaman Kelola Pelanggan", "adminCustomers", "Admin menggunakan halaman ini untuk memonitor pelanggan aktif, melakukan pemutusan/suspend, dan melihat detail profil pelanggan."],
  ["TA18", "Antarmuka Halaman Kelola Teknisi", "adminTechnicians", "Admin menggunakan halaman ini untuk menambah akun teknisi baru dan memantau tugas aktif setiap teknisi."],
  ["TA19", "Antarmuka Halaman Kelola Akun", "adminAccounts", "Admin menggunakan halaman ini untuk menambah atau menghapus akun dengan hak akses admin."],
  ["TA20", "Antarmuka Halaman Pengaturan Admin", "adminSettings", "Admin menggunakan halaman ini untuk mengubah preferensi Payment Gateway, kunci API, dan parameter tagihan (cron)."],
  ["TA21", "Antarmuka Halaman Dashboard Pelanggan", "customerDashboard", "Pelanggan menggunakan halaman ini untuk memantau secara cepat status langganan, jadwal pembayaran, dan tiket yang masih aktif."],
  ["TA22", "Antarmuka Halaman Profil Teknisi", "techProfile", "Teknisi menggunakan halaman ini untuk memperbarui password dan data kontak pribadinya."]
];;

newCode = newCode.replace(/const pages = \[\s*\["TA01"[\s\S]*?\];\s*$/m, newPagesList.trim());

fs.writeFileSync('scripts/generate-ui-mockups.mjs', newCode);
console.log('Script patched successfully!');
