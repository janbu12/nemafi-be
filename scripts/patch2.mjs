import fs from 'fs';
const file = 'scripts/generate-ui-mockups.mjs';
let code = fs.readFileSync(file, 'utf8');

const newPagesList = \const pages = [
  ["TA01", "Antarmuka Halaman Login", "login", "Tombol Masuk mengirim kredensial pengguna. Jika valid, sistem mengarahkan pengguna sesuai role menuju dashboard pelanggan, admin, atau teknisi."],
  ["TA02", "Antarmuka Halaman Register", "register", "Tombol Daftar menyimpan data pelanggan, alamat pemasangan, paket pilihan, dan membuat order pendaftaran layanan."],
  ["TA03", "Antarmuka Halaman Dashboard Pelanggan", "customerDashboard", "Pelanggan menggunakan halaman ini untuk memantau secara cepat status langganan, jadwal pembayaran, dan tiket yang masih aktif."],
  ["TA04", "Antarmuka Halaman Tagihan", "billing", "Halaman Tagihan menampilkan invoice berjalan, status pembayaran, riwayat pembayaran, dan paket berlangganan pelanggan."],
  ["TA05", "Antarmuka Halaman Dukungan", "support", "Halaman Dukungan digunakan pelanggan untuk membuat tiket gangguan dan melihat riwayat tiket yang pernah diajukan."],
  ["TA06", "Antarmuka Halaman Profil", "profile", "Halaman Profil digunakan pelanggan, admin, dan teknisi untuk memperbarui kata sandi serta data diri pribadi."],
  ["TA07", "Antarmuka Halaman Dashboard Teknisi", "technicianTickets", "Teknisi menggunakan halaman ini sebagai beranda utama untuk melihat tiket pekerjaan yang ditugaskan (Kapten/Anggota)."],
  ["TA08", "Antarmuka Halaman Jadwal & Tugas", "technicianSchedule", "Teknisi menggunakan halaman ini untuk memantau detail tugas, kredensial PPPoE pelanggan, dan mengisi laporan."],
  ["TA09", "Antarmuka Halaman Riwayat Teknisi", "technicianHistory", "Teknisi menggunakan halaman ini untuk melihat riwayat pekerjaan yang telah diselesaikan."],
  ["TA10", "Antarmuka Halaman Kelola Router Teknisi", "router", "Teknisi menggunakan halaman ini untuk memantau koneksi router MikroTik fisik dan mengakses terminal perintah."],
  ["TA11", "Antarmuka Halaman Dashboard Admin", "adminDashboard", "Admin menggunakan halaman ini untuk melihat statistik umum aplikasi, pendapatan, pelanggan aktif, dan status router."],
  ["TA12", "Antarmuka Halaman Kelola Paket", "packages", "Admin menggunakan halaman ini untuk menambah, mengubah, dan menghapus paket layanan internet utama."],
  ["TA13", "Antarmuka Halaman Kategori Paket", "packageCategories", "Admin menggunakan halaman ini untuk mengelompokkan jenis layanan internet."],
  ["TA14", "Antarmuka Halaman Kelola Pelanggan", "adminCustomers", "Admin menggunakan halaman ini untuk memonitor pelanggan aktif, melakukan pemutusan/suspend, dan melihat detail profil pelanggan."],
  ["TA15", "Antarmuka Halaman Kelola Teknisi", "adminTechnicians", "Admin menggunakan halaman ini untuk menambah akun teknisi baru dan memantau tugas aktif setiap teknisi."],
  ["TA16", "Antarmuka Halaman Kelola Tiket Admin", "ticketsAdmin", "Admin menggunakan halaman ini untuk membuat tiket, menjadwalkan kunjungan, assign teknisi, dan memantau riwayat tiket."],
  ["TA17", "Antarmuka Halaman Kategori Tiket", "ticketCategories", "Admin menggunakan halaman ini untuk mengelompokkan jenis gangguan atau layanan."],
  ["TA18", "Antarmuka Halaman Kelola Inventaris", "inventory", "Admin menggunakan halaman ini untuk mengelola stok perangkat yang dipakai pada proses survey dan instalasi."],
  ["TA19", "Antarmuka Halaman Kategori Inventaris", "inventoryCategories", "Admin menggunakan halaman ini untuk mengelompokkan jenis barang logistik/perangkat."],
  ["TA20", "Antarmuka Halaman Transaksi", "adminTransactions", "Admin menggunakan halaman ini untuk melihat dan merekonsiliasi pembayaran dari pelanggan melalui Xendit/Midtrans."],
  ["TA21", "Antarmuka Halaman Kelola Area Layanan", "areas", "Admin menggunakan halaman ini untuk memetakan cakupan area layanan berdasarkan koordinat dan radius."],
  ["TA22", "Antarmuka Halaman Riwayat Cek Area", "areaHistory", "Admin menggunakan halaman ini untuk melihat riwayat pengecekan jangkauan lokasi oleh calon pelanggan."]
];\;

const newRenderers = \
    packageCategories: () => dashboardShell("Kategori Paket", adminMenu, 1, (x, y) =>
      card(x, y + 28, 1060, 560, "Daftar Kategori Paket", "Grup layanan (misal: Broadband, Dedicated)") +
      table(x + 24, y + 100, 1012, ["ID", "Nama Kategori", "Jumlah Paket", "Dibuat Pada"], [["CAT-01", "Home Broadband", "3", "12 Mei"], ["CAT-02", "Corporate Dedicated", "2", "12 Mei"]])
    ),
    ticketCategories: () => dashboardShell("Kategori Tiket", adminMenu, 6, (x, y) =>
      card(x, y + 28, 1060, 560, "Daftar Kategori Tiket", "Grup insiden (misal: Instalasi, Gangguan)") +
      table(x + 24, y + 100, 1012, ["ID", "Nama Kategori", "Prioritas", "Deskripsi"], [["TC-01", "Instalasi Baru", "Normal", "Pemasangan perangkat awal"], ["TC-02", "Gangguan Jaringan", "High", "Koneksi terputus/lambat"]])
    ),
    inventoryCategories: () => dashboardShell("Kategori Inventaris", adminMenu, 2, (x, y) =>
      card(x, y + 28, 1060, 560, "Daftar Kategori Barang", "Grup stok (misal: Router, Kabel, Tiang)") +
      table(x + 24, y + 100, 1012, ["ID", "Nama Kategori", "Total Barang", "Tipe"], [["IC-01", "Router Fiber", "150", "Hardware"], ["IC-02", "Kabel Dropcore", "5000", "Consumable"]])
    ),
\;

// Replace pages array
code = code.replace(/const pages = \\[[\\s\\S]*?\\];/m, newPagesList.trim());

// Remove old ones like adminAccounts, techProfile, adminSettings, if they exist
code = code.replace(/adminSettings: \\(\\).*?\\n.*?\\n.*?\\n.*?\\n.*?\\n.*?\\n.*?\\),/m, "");
code = code.replace(/adminAccounts: \\(\\).*?\\n.*?\\n.*?\\n.*?\\),/m, "");
code = code.replace(/techProfile: \\(\\).*?\\n.*?\\n.*?\\n.*?\\),/m, "");

// Add new renderers inside pages object in pageContent
// Find 'return pages[kind]();' and insert before it
code = code.replace(/(customerDashboard: [\\s\\S]*?\\),)/, "\\\n" + newRenderers);

fs.writeFileSync(file, code);
console.log('Script patched successfully!');
