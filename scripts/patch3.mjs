import fs from 'fs';
const file = 'scripts/generate-ui-mockups.mjs';
let code = fs.readFileSync(file, 'utf8');

const additionalDialogs = \
  p18: { type: "success", code: "P18", header: "P18 - Pelanggan Berhasil Didaftarkan", desc: "Pelanggan baru telah berhasil didaftarkan ke sistem." },
  p19: { type: "success", code: "P19", header: "P19 - Jadwal Teknisi Berhasil Diperbarui", desc: "Jadwal dan detail tugas teknisi berhasil diperbarui." },
  p20: { type: "success", code: "P20", header: "P20 - Sinkronisasi Paket Berhasil", desc: "Paket berhasil disinkronkan ke router MikroTik." },
  p21: { type: "error", code: "P21", header: "P21 - Gagal Memuat Detail Transaksi", desc: "Terjadi kesalahan saat memuat detail order atau transaksi." },
  p22: { type: "error", code: "P22", header: "P22 - Gagal Menyimpan Hasil Survey", desc: "Terjadi kesalahan saat menyimpan hasil survey jaringan." },
  p23: { type: "success", code: "P23", header: "P23 - Kategori Tiket Berhasil Disimpan", desc: "Kategori tiket berhasil ditambahkan atau diperbarui." },
  p24: { type: "success", code: "P24", header: "P24 - Laporan Aktual Berhasil Disimpan", desc: "Laporan pelaksanaan pekerjaan teknisi berhasil disimpan." },
  p25: { type: "error", code: "P25", header: "P25 - Gagal Menyimpan Laporan Aktual", desc: "Terjadi kesalahan sistem saat menyimpan laporan." },
  p26: { type: "success", code: "P26", header: "P26 - PPPoE User Berhasil Ditambahkan", desc: "Kredensial PPPoE berhasil disuntikkan ke dalam router." },
  p27: { type: "success", code: "P27", header: "P27 - Koneksi Router Berhasil", desc: "Koneksi API router berhasil dites dengan sukses." },
  p28: { type: "error", code: "P28", header: "P28 - Gagal Mengetes Koneksi Router", desc: "Router tidak dapat dihubungi, periksa IP atau kredensial." },
\;

// Insert into dialogConfigs right before the closing brace
code = code.replace(/p17: {[\\s\\S]*?},\\s*};/m, (match) => match.replace('};', additionalDialogs + '\\n};'));


const newSemantics = \
function generateSemanticNetworkTeknisiSvg() {
  const svgW = 800; const svgH = 850;
  let svg = \\\<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="\\\" height="\\\" viewBox="0 0 \\\ \\\">
  <rect width="\\\" height="\\\" fill="\\\"/>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 2 L 8 5 L 0 8 Z" fill="#111111"/></marker></defs>
  <text x="400" y="820" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">Jaringan Semantik Teknisi</text>
  
  <path d="M 400 240 L 400 340" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 400 460 L 250 540" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 400 460 L 550 540" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 400 460 L 400 640" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <path d="M 400 120 C 350 40, 450 40, 400 120" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="400" y="40" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P01</text>
  
  <path d="M 200 520 C 120 450, 150 350, 250 520" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="130" y="440" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P24, P25</text>
  
  <path d="M 600 520 C 680 450, 650 350, 550 520" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="670" y="440" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P26, P27, P28</text>

  <circle cx="400" cy="180" r="60" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="400" y="187" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">TA01</text>
  <circle cx="400" cy="400" r="60" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="400" y="407" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">TA07</text>
  <circle cx="250" cy="580" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="250" y="587" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA08</text>
  <circle cx="550" cy="580" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="550" y="587" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA10</text>
  <circle cx="400" cy="700" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="400" y="707" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA09</text>
</svg>\\\;
  return svg;
}

function generateSemanticNetworkAdminSvg() {
  const svgW = 800; const svgH = 850;
  let svg = \\\<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="\\\" height="\\\" viewBox="0 0 \\\ \\\">
  <rect width="\\\" height="\\\" fill="\\\"/>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 2 L 8 5 L 0 8 Z" fill="#111111"/></marker></defs>
  <text x="400" y="820" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">Jaringan Semantik Admin</text>
  
  <path d="M 400 260 L 400 340" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <circle cx="400" cy="200" r="60" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="400" y="207" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">TA01</text>
  <circle cx="400" cy="400" r="60" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="400" y="407" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">TA11</text>
  
  <circle cx="150" cy="500" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="150" y="507" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA14</text>
  <circle cx="280" cy="500" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="280" y="507" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA16</text>
  <circle cx="400" cy="550" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="400" y="557" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA12</text>
  <circle cx="520" cy="500" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="520" y="507" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA20</text>
  <circle cx="650" cy="500" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="650" y="507" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA15</text>
  
  <path d="M 340 400 L 150 460" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 360 440 L 280 460" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 400 460 L 400 510" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 440 440 L 520 460" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 460 400 L 650 460" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <path d="M 120 480 C 80 400, 120 380, 150 460" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="100" y="380" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P18</text>
  
  <path d="M 250 480 C 200 400, 260 380, 280 460" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="240" y="380" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P19, P22, P23</text>
  
  <path d="M 430 540 C 480 620, 500 600, 440 580" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="500" y="630" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P20</text>
  
  <path d="M 540 480 C 580 400, 540 380, 520 460" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="560" y="380" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P21</text>

  <circle cx="400" cy="680" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/><text x="400" y="687" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA21</text>
  <path d="M 400 590 L 400 640" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
</svg>\\\;
  return svg;
}
\;

// Insert the new semantic functions before generateSemanticNetworkSvg
code = code.replace(/function generateSemanticNetworkSvg/m, newSemantics + '\\nfunction generateSemanticNetworkSvg');

// Add the calls to export the new networks
const exportCalls = \
const netTechSvgPath = path.join(outDir, "jaringan-semantik-teknisi.svg");
const netTechPngPath = path.join(outDir, "jaringan-semantik-teknisi.png");
fs.writeFileSync(netTechSvgPath, generateSemanticNetworkTeknisiSvg(), "utf8");
convertSvg(netTechSvgPath, netTechPngPath);

const netAdminSvgPath = path.join(outDir, "jaringan-semantik-admin.svg");
const netAdminPngPath = path.join(outDir, "jaringan-semantik-admin.png");
fs.writeFileSync(netAdminSvgPath, generateSemanticNetworkAdminSvg(), "utf8");
convertSvg(netAdminSvgPath, netAdminPngPath);
\;

code = code.replace(/fs\\.writeFileSync\\(netSvgPath, generateSemanticNetworkSvg\\(\\), "utf8"\\);/m, exportCalls + '\\nfs.writeFileSync(netSvgPath, generateSemanticNetworkSvg(), "utf8");');

fs.writeFileSync(file, code);
console.log("Mockups patch applied!");
