import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = path.basename(process.cwd()) === "nemafi-be"
  ? process.cwd()
  : path.join(process.cwd(), "nemafi-be");
const outDir = path.join(repoRoot, "docs", "interface-mockups");

fs.mkdirSync(outDir, { recursive: true });
for (const file of fs.readdirSync(outDir)) {
  if (/^(ta\d{2}|p\d{2}|jaringan-semantik)-.*\.(png|svg)$/i.test(file)) {
    fs.rmSync(path.join(outDir, file));
  }
}

const W = 1920;
const H = 1130;
const headerH = 84;
const mockX = 24;
const mockY = 112;
const mockW = 1450;
const mockH = 762;
const notesX = 1494;
const notesW = 402;
const specY = 886;

const c = {
  paper: "#ffffff",      // White canvas background for document layout
  line: "#111111",       // Black borders/text for document layout
  mutedLine: "#777777",  // Gray borders for document layout
  
  // App-specific light theme colors (predominantly white):
  appBg: "#ffffff",      // Body bg (white)
  appBg2: "#ffffff",     // Sidebar bg (white)
  sidebar: "#ffffff",    // Sidebar bg (white)
  card: "#ffffff",       // Card bg (white)
  card2: "#f8fafc",      // Input / unselected card bg (very light gray)
  border: "#cbd5e1",     // Borders (light gray)
  text: "#0f172a",       // Main text (dark slate-900)
  muted: "#475569",      // Muted text (slate-600)
  faint: "#64748b",      // Faint labels (slate-500)
  primary: "#0f172a",    // Primary color
  white: "#0f172a",      // Button background (dark)
  active: "#f1f5f9",     // Active item background (light slate)
  soft: "#f1f5f9",       // Browser header bar background (light gray)
};

const customerMenu = ["Dashboard", "Tagihan", "Dukungan", "Profil"];
const adminMenu = ["Ringkasan", "Paket", "Inventaris", "Transaksi", "Pelanggan", "Teknisi", "Tiket", "Covered Area", "Pengaturan"];
const techMenu = ["Tiket", "Jadwal", "Riwayat", "Router", "Profil"];

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rect(x, y, w, h, fill = "none", stroke = c.border, sw = 1, rx = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function line(x1, y1, x2, y2, stroke = c.border, sw = 1, dash = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

function text(x, y, value, size = 24, fill = c.text, weight = 400, anchor = "start") {
  return `<text x="${x}" y="${y}" font-family="Inter, Poppins, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;
}

function wrapText(x, y, value, size = 24, fill = c.text, width = 300, lineGap = 1.24, weight = 400, anchor = "start") {
  const words = String(value).split(/\s+/);
  const maxChars = Math.max(12, Math.floor(width / (size * 0.55)));
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);

  return lines.map((lineValue, index) =>
    text(x, y + index * size * lineGap, lineValue, size, fill, weight, anchor)
  ).join("");
}

function pill(x, y, label, fill = c.card2, stroke = c.border, fg = c.text, w = 150) {
  return `${rect(x, y, w, 36, fill, stroke, 1, 18)}${text(x + w / 2, y + 24, label, 16, fg, 700, "middle")}`;
}

function drawInfinityLogo(x, y, size = 40) {
  return `<text x="${x}" y="${y}" font-family="Inter, Poppins, Arial, sans-serif" font-size="${size}" font-weight="800" fill="${c.text}">∞</text>`;
}

function browserChrome() {
  const y = mockY + 24;
  return [
    rect(mockX, mockY, mockW, mockH, c.appBg, c.line, 1),
    rect(mockX + 1, mockY + 1, mockW - 2, 42, c.soft, c.border, 1),
    text(mockX + 20, y + 5, "<", 20, c.muted, 500),
    text(mockX + 48, y + 5, ">", 20, c.muted, 500),
    text(mockX + 76, y + 4, "o", 18, c.muted, 500),
    rect(mockX + 112, y - 18, 790, 26, c.card, c.border, 1, 13),
    text(mockX + 136, y + 1, "http://localhost:3000", 13, c.muted),
    text(mockX + mockW - 56, y + 4, "...", 22, c.muted, 700),
  ].join("");
}

function sidebar(items, active = 0) {
  const x = mockX + 1;
  const y = mockY + 43;
  const w = 245;
  const h = mockH - 44;
  let svg = rect(x, y, w, h, c.sidebar, c.border, 1, 0);
  svg += drawInfinityLogo(x + 28, y + 48, 32);
  svg += text(x + 64, y + 48, "NEMAFI", 22, c.text, 800);
  items.forEach((item, index) => {
    const iy = y + 92 + index * 48;
    svg += rect(x + 16, iy, w - 32, 34, index === active ? c.active : "transparent", index === active ? c.border : "transparent", 1, 8);
    svg += text(x + 34, iy + 23, item, 15, index === active ? c.white : c.muted, index === active ? 700 : 500);
  });
  return svg;
}

function card(x, y, w, h, title, subtitle = "") {
  let svg = rect(x, y, w, h, c.card, c.border, 1, 10);
  svg += text(x + 24, y + 36, title, 20, c.text, 800);
  if (subtitle) svg += text(x + 24, y + 60, subtitle, 13, c.muted, 500);
  return svg;
}

function table(x, y, w, headers, rows) {
  const rowH = 42;
  const colW = w / headers.length;
  let svg = rect(x, y, w, rowH * (rows.length + 1), c.card2, c.border, 1, 8);
  headers.forEach((h, i) => svg += text(x + 18 + i * colW, y + 27, h, 14, c.faint, 700));
  svg += line(x, y + rowH, x + w, y + rowH, c.border, 1);
  rows.forEach((row, r) => {
    const yy = y + rowH * (r + 1);
    if (r > 0) svg += line(x, yy, x + w, yy, c.border, 1);
    row.forEach((cell, i) => svg += text(x + 18 + i * colW, yy + 27, cell, 14, c.text, 500));
  });
  return svg;
}

function formLines(x, y, labels, w = 500) {
  return labels.map((label, index) => {
    const yy = y + index * 68;
    return text(x, yy, label, 14, c.faint, 700) +
      rect(x, yy + 14, w, 38, c.card2, c.border, 1, 8);
  }).join("");
}

function dashboardShell(title, menu, active, body) {
  const appX = mockX + 1;
  const appY = mockY + 43;
  const appW = mockW - 2;
  const appH = mockH - 44;
  const contentX = appX + 280;
  const contentY = appY + 78;
  const headerLineY = appY + 48;
  const roleName = menu === adminMenu ? "Admin" : menu === techMenu ? "Teknisi" : "Customer";
  
  return [
    browserChrome(),
    rect(appX, appY, appW, appH, c.appBg, "none", 0),
    sidebar(menu, active),
    
    // Top Bar (Header)
    line(appX + 245, headerLineY, appX + appW, headerLineY, c.border, 1),
    text(appX + 280, appY + 30, "Hai, ", 14, c.muted, 500),
    text(appX + 312, appY + 30, roleName, 14, c.text, 700),
    
    // Theme Toggle (Moon symbol)
    text(appX + appW - 96, appY + 31, "🌙", 16, c.text, 500, "middle"),
    
    // User Profile (Avatar Circle representation)
    `<circle cx="${appX + appW - 46}" cy="${appY + 24}" r="13" fill="none" stroke="${c.border}" stroke-width="1.5"/>`,
    text(appX + appW - 46, appY + 30, "👤", 11, c.text, 500, "middle"),
    
    // Main Content
    text(contentX, contentY, title, 32, c.text, 800),
    body(contentX, contentY + 38),
  ].join("");
}

function authMockup(mode) {
  const appX = mockX + 1;
  const appY = mockY + 43;
  const appW = mockW - 2;
  const appH = mockH - 44;
  const isLogin = mode === "login";

  let svg = browserChrome();
  svg += rect(appX, appY, appW, appH, c.appBg, "none", 0);

  if (isLogin) {
    svg += drawInfinityLogo(appX + 120, appY + 160, 48);
    svg += text(appX + 120, appY + 240, "Selamat Datang", 40, c.text, 800);
    svg += text(appX + 120, appY + 290, "Kembali", 40, c.text, 800);
    svg += text(appX + 120, appY + 345, "Masuk dengan email dan kata sandi Anda.", 16, c.muted, 500);

    svg += `<circle cx="${appX + 130}" cy="${appY + 400}" r="4" fill="${c.muted}"/>`;
    svg += text(appX + 146, appY + 405, "SLA 99.9% untuk pelanggan bisnis", 15, c.muted, 500);
    
    svg += `<circle cx="${appX + 130}" cy="${appY + 436}" r="4" fill="${c.muted}"/>`;
    svg += text(appX + 146, appY + 441, "Support 24/7 untuk kendala teknis", 15, c.muted, 500);

    const cardX = appX + 760;
    const cardY = appY + 110;
    const cardW = 540;
    const cardH = 470;

    svg += rect(cardX, cardY, cardW, cardH, c.card, c.border, 1, 10);
    svg += pill(cardX + 32, cardY + 32, "Masuk ke akun Anda", c.card2, c.border, c.text, 200);
    svg += text(cardX + 32, cardY + 110, "Masuk", 28, c.text, 800);
    svg += text(cardX + 32, cardY + 142, "Gunakan email dan kata sandi terdaftar.", 14, c.muted, 500);

    svg += text(cardX + 32, cardY + 195, "Email", 13, c.faint, 700);
    svg += rect(cardX + 32, cardY + 210, 476, 38, c.card2, c.border, 1, 8);
    svg += text(cardX + 48, cardY + 234, "m@example.com", 14, c.muted, 500);

    svg += text(cardX + 32, cardY + 275, "Kata Sandi", 13, c.faint, 700);
    svg += rect(cardX + 32, cardY + 290, 476, 38, c.card2, c.border, 1, 8);
    svg += text(cardX + 48, cardY + 314, "••••••••", 14, c.muted, 500);

    svg += rect(cardX + 32, cardY + 360, 476, 44, c.white, c.white, 1, 8);
    svg += text(cardX + 32 + 238, cardY + 387, "Masuk", 16, c.appBg, 700, "middle");

    svg += text(cardX + 32 + 238, cardY + 435, "Belum punya akun? Daftar", 14, c.faint, 700, "middle");
  } else {
    svg += drawInfinityLogo(appX + appW / 2 - 20, appY + 45, 40);
    svg += text(appX + appW / 2, appY + 95, "Buat Akun NEMAFI", 28, c.text, 800, "middle");
    svg += text(appX + appW / 2, appY + 125, "Dapatkan rekomendasi paket internet terbaik sesuai kebutuhan Anda.", 14, c.muted, 500, "middle");

    const colY = appY + 160;
    const colH = 520;
    
    const leftX = appX + 60;
    const leftW = 600;
    svg += rect(leftX, colY, leftW, colH, c.card, c.border, 1, 10);
    svg += pill(leftX + 24, colY + 24, "Langkah 1: Rekomendasi Cepat dengan AI", c.card2, c.border, c.text, 280);
    
    svg += text(leftX + 24, colY + 84, "Ceritakan kebutuhan internet Anda, kami", 15, c.text, 700);
    svg += text(leftX + 24, colY + 104, "sarankan paket yang pas secara instan.", 15, c.text, 700);
    
    svg += text(leftX + 24, colY + 150, "Deskripsikan kebutuhan internet Anda", 13, c.faint, 700);
    svg += rect(leftX + 24, colY + 165, leftW - 48, 140, c.card2, c.border, 1, 8);
    svg += wrapText(leftX + 40, colY + 195, "Contoh: kerja remote, meeting video harian, streaming 4K, dan main game online.", 13, c.muted, leftW - 80);

    svg += rect(leftX + 24, colY + 330, leftW - 48, 44, c.white, c.white, 1, 8);
    svg += text(leftX + leftW / 2, colY + 357, "Dapatkan Rekomendasi", 15, c.appBg, 700, "middle");

    svg += rect(leftX + 24, colY + 390, leftW - 48, 44, c.card2, c.border, 1, 8);
    svg += text(leftX + leftW / 2, colY + 417, "Pilih paket manual", 15, c.text, 600, "middle");

    const rightX = appX + 710;
    const rightW = 670;
    svg += rect(rightX, colY, rightW, colH, c.card, c.border, 1, 10);
    svg += pill(rightX + 24, colY + 24, "Langkah 2: Lengkapi data", c.card2, c.border, c.text, 180);
    
    svg += text(rightX + 24, colY + 80, "Lengkapi Data Pendaftaran", 16, c.text, 700);
    svg += text(rightX + 24, colY + 100, "Paket dipilih: Belum dipilih", 13, c.muted);

    const formY = colY + 120;
    
    svg += text(rightX + 24, formY, "Nama Lengkap", 11, c.faint, 700);
    svg += rect(rightX + 24, formY + 12, 290, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 36, formY + 31, "cth: Budi Santoso", 12, c.muted);

    svg += text(rightX + 340, formY, "Email", 11, c.faint, 700);
    svg += rect(rightX + 340, formY + 12, 300, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 352, formY + 31, "m@example.com", 12, c.muted);

    svg += text(rightX + 24, formY + 52, "Kata Sandi", 11, c.faint, 700);
    svg += rect(rightX + 24, formY + 64, 290, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 36, formY + 83, "••••••••", 12, c.muted);

    svg += text(rightX + 340, formY + 52, "Nomor Telepon", 11, c.faint, 700);
    svg += rect(rightX + 340, formY + 64, 300, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 352, formY + 83, "08xxxxxxxxxx", 12, c.muted);

    const addrY = formY + 105;
    svg += text(rightX + 24, addrY, "Alamat Pemasangan", 13, c.text, 700);
    
    svg += text(rightX + 24, addrY + 20, "Alamat Lengkap", 11, c.faint, 700);
    svg += rect(rightX + 24, addrY + 32, rightW - 48, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 36, addrY + 51, "Nama jalan, nomor rumah, RT/RW", 12, c.muted);

    svg += rect(rightX + 24, addrY + 72, 190, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 36, addrY + 91, "Pilih Provinsi", 12, c.muted);

    svg += rect(rightX + 234, addrY + 72, 190, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 246, addrY + 91, "Pilih Kota/Kabupaten", 12, c.muted);

    svg += rect(rightX + 444, addrY + 72, 196, 30, c.card2, c.border, 1, 6);
    svg += text(rightX + 456, addrY + 91, "Pilih Kecamatan", 12, c.muted);

    const mapY = addrY + 115;
    svg += text(rightX + 24, mapY, "Titik Koordinat Lokasi", 11, c.faint, 700);
    svg += rect(rightX + 24, mapY + 12, 380, 100, c.card2, c.border, 1, 6);
    svg += line(rightX + 24, mapY + 12, rightX + 404, mapY + 112, c.mutedLine, 1, "4,4");
    svg += line(rightX + 24, mapY + 112, rightX + 404, mapY + 12, c.mutedLine, 1, "4,4");
    svg += text(rightX + 214, mapY + 68, "[Peta Lokasi]", 14, c.muted, 500, "middle");

    svg += text(rightX + 420, mapY + 12, "Latitude", 11, c.faint, 700);
    svg += rect(rightX + 420, mapY + 24, 220, 28, c.card2, c.border, 1, 6);
    
    svg += text(rightX + 420, mapY + 62, "Longitude", 11, c.faint, 700);
    svg += rect(rightX + 420, mapY + 74, 220, 28, c.card2, c.border, 1, 6);

    svg += rect(rightX + 24, colY + 465, rightW - 48, 38, c.white, c.white, 1, 8);
    svg += text(rightX + rightW / 2, colY + 489, "Buat Akun", 15, c.appBg, 700, "middle");
  }

  return svg;
}

const dialogConfigs = {
  p01: {
    type: "error",
    code: "P01",
    header: "P01 - Kesalahan Mengisi Email/password",
    desc: "Email atau password salah, periksa kembali",
  },
  p02: {
    type: "error",
    code: "P02",
    header: "P02 - Email Sudah Terdaftar",
    desc: "Email sudah terdaftar dalam sistem, gunakan email lain.",
  },
  p03: {
    type: "error",
    code: "P03",
    header: "P03 - Paket Tidak Ditemukan",
    desc: "Paket layanan internet tidak ditemukan di database.",
  },
  p04: {
    type: "confirm",
    code: "P04",
    header: "P04 - Konfirmasi Penyimpanan Perubahan Pengaturan",
    title: "Simpan Perubahan?",
    desc: "Apakah anda yakin ingin memperbaharui seluruh pengaturan sistem?",
    btn1: "Ya, Update",
    btn2: "Batal",
  },
  p05: {
    type: "success",
    code: "P05",
    header: "P05 - Data Pengaturan tersimpan",
    desc: "Data pengaturan berhasil disimpan.",
  },
  p06: {
    type: "success",
    code: "P06",
    header: "P06 - Keluar dari Sistem Berhasil",
    desc: "Anda telah berhasil keluar dari akun Anda.",
  },
  p07: {
    type: "success",
    code: "P07",
    header: "P07 - Pendaftaran Akun Berhasil",
    desc: "Pendaftaran akun Anda berhasil dilakukan. Silakan masuk ke dashboard.",
  },
  p08: {
    type: "error",
    code: "P08",
    header: "P08 - Paket Digunakan oleh Pelanggan Aktif",
    desc: "Tidak dapat menghapus paket karena masih ada pelanggan aktif yang menggunakan paket ini.",
  },
  p09: {
    type: "error",
    code: "P09",
    header: "P09 - Konfigurasi Pembayaran Belum Lengkap",
    desc: "Konfigurasi Midtrans belum lengkap.",
  },
  p10: {
    type: "confirm",
    code: "P10",
    header: "P10 - Konfirmasi Penghapusan Data Router",
    title: "Hapus Router?",
    desc: "Apakah anda yakin ingin menghapus router ini? Tindakan ini tidak dapat dibatalkan.",
    btn1: "Hapus",
    btn2: "Batal",
  },
  p11: {
    type: "success",
    code: "P11",
    header: "P11 - Perubahan Profil Berhasil Disimpan",
    desc: "Perubahan profil berhasil disimpan.",
  },
  p12: {
    type: "success",
    code: "P12",
    header: "P12 - Email Berhasil Diperbarui",
    desc: "Email berhasil diperbarui.",
  },
  p13: {
    type: "success",
    code: "P13",
    header: "P13 - Kata Sandi Berhasil Diperbarui",
    desc: "Kata sandi Anda telah berhasil diubah.",
  },
  p14: {
    type: "success",
    code: "P14",
    header: "P14 - Paket Berhasil Diubah",
    desc: "Paket berhasil diubah.",
  },
  p15: {
    type: "success",
    code: "P15",
    header: "P15 - Token Pembayaran Berhasil Dibuat",
    desc: "Token pembayaran berhasil dibuat, silakan lakukan pembayaran via snap window.",
  },
  p16: {
    type: "success",
    code: "P16",
    header: "P16 - Tiket Dukungan Berhasil Dibuat",
    desc: "Tiket dukungan berhasil dibuat.",
  },
  p17: {
    type: "error",
    code: "P17",
    header: "P17 - Belum Memiliki Order Aktif",
    desc: "Anda belum memiliki order aktif.",
  },
};

function dialogSlug(config) {
  return config.header.toLowerCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getWrappedLinesCount(value, size, width) {
  const words = String(value).split(/\s+/);
  const maxChars = Math.max(12, Math.floor(width / (size * 0.55)));
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length;
}

function generateDialogSvg(kind) {
  const config = dialogConfigs[kind];
  if (!config) return "";
  
  const fontSize = 15;
  const wrapWidth = 540;
  const isLongError = config.type === "error" && config.desc.length > 50;
  const contentH = config.type === "error" ? (isLongError ? 100 : 80) : 340;
  
  const svgW = 624;
  const svgH = 48 + 16 + contentH + 24;
  
  const cx = 12;
  const cy = 12;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="${c.paper}"/>
`;
  
  // Header box
  svg += rect(cx, cy, 600, 48, "none", c.line, 1.5);
  svg += text(cx + 300, cy + 31, config.header, 16, c.line, 700, "middle");
  
  // Content box
  svg += rect(cx, cy + 64, 600, contentH, "none", c.line, 1.5);
  
  if (config.type === "error") {
    const lineGap = 1.3;
    const n = getWrappedLinesCount(config.desc, fontSize, wrapWidth);
    const textH = (n - 1) * fontSize * lineGap + fontSize;
    const startY = cy + 64 + (contentH - textH) / 2 + fontSize * 0.75;
    svg += wrapText(cx + 300, startY, config.desc, fontSize, c.line, wrapWidth, lineGap, 600, "middle");
  } else if (config.type === "success") {
    svg += `<circle cx="${cx + 300}" cy="${cy + 130}" r="32" fill="none" stroke="${c.line}" stroke-width="2"/>`;
    svg += text(cx + 300, cy + 140, "✓", 28, c.line, 800, "middle");
    svg += text(cx + 300, cy + 195, "Berhasil!", 20, c.line, 800, "middle");
    svg += wrapText(cx + 300, cy + 230, config.desc, 14, c.line, 540, 1.3, 500, "middle");
  } else if (config.type === "confirm") {
    svg += `<circle cx="${cx + 300}" cy="${cy + 130}" r="32" fill="none" stroke="${c.line}" stroke-width="2"/>`;
    svg += text(cx + 300, cy + 140, "?", 28, c.line, 800, "middle");
    svg += text(cx + 300, cy + 195, config.title, 20, c.line, 800, "middle");
    svg += wrapText(cx + 300, cy + 230, config.desc, 14, c.line, 540, 1.3, 500, "middle");
    
    const btnW = 110;
    const btnH = 34;
    const btnGap = 20;
    const b1x = cx + 300 - btnW - btnGap / 2;
    const b2x = cx + 300 + btnGap / 2;
    const btnY = cy + 295;
    
    svg += rect(b1x, btnY, btnW, btnH, "#e5e7eb", c.line, 1, 4);
    svg += text(b1x + btnW / 2, btnY + 22, config.btn1, 13, c.line, 600, "middle");
    
    svg += rect(b2x, btnY, btnW, btnH, "#e5e7eb", c.line, 1, 4);
    svg += text(b2x + btnW / 2, btnY + 22, config.btn2, 13, c.line, 600, "middle");
  }
  
  svg += `\n</svg>`;
  return svg;
}

function pageContent(kind) {
  const pages = {
    profile: () => dashboardShell("Profil", customerMenu, 3, (x, y) => {
      let svg = "";
      
      // Edit button (Ubah) at top right of layout
      svg += rect(x + 940, y - 38, 120, 36, c.card2, c.border, 1, 6);
      svg += text(x + 1000, y - 14, "Ubah", 14, c.text, 700, "middle");

      const cardW = 1060;
      
      // 1. Foto Profil Card (horizontal layout matching screenshot 3)
      svg += rect(x, y + 10, cardW, 80, c.card, c.border, 1, 10);
      svg += text(x + 24, y + 46, "Foto Profil", 16, c.text, 800);
      svg += `<circle cx="${x + 200}" cy="${y + 50}" r="22" fill="none" stroke="${c.border}" stroke-width="1"/>`;
      svg += text(x + 240, y + 48, "Mizan Nur", 14, c.text, 700);
      svg += text(x + 240, y + 66, "mizan@example.com", 12, c.muted, 500);

      // 2. Informasi Pribadi Card (2-column inputs matching screenshot 3)
      svg += rect(x, y + 105, cardW, 145, c.card, c.border, 1, 10);
      svg += text(x + 24, y + 130, "Informasi Pribadi", 16, c.text, 800);
      
      // Row 1: Nama Lengkap & Nomor Telepon
      svg += text(x + 24, y + 155, "Nama Lengkap", 11, c.faint, 700);
      svg += rect(x + 24, y + 165, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 36, y + 182, "Mizan Nur", 13, c.text);

      svg += text(x + 546, y + 155, "Nomor Telepon", 11, c.faint, 700);
      svg += rect(x + 546, y + 165, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 558, y + 182, "081234567801", 13, c.text);

      // Row 2: Email & URL Foto (opsional)
      svg += text(x + 24, y + 205, "Email", 11, c.faint, 700);
      svg += rect(x + 24, y + 215, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 36, y + 232, "mizan@example.com", 13, c.text);

      svg += text(x + 546, y + 205, "URL Foto (opsional)", 11, c.faint, 700);
      svg += rect(x + 546, y + 215, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 558, y + 232, "https://i.pravatar.cc/150?img=47", 11, c.muted);

      // 3. Alamat Pemasangan Card (matching screenshot 3)
      svg += rect(x, y + 265, cardW, 305, c.card, c.border, 1, 10);
      svg += text(x + 24, y + 290, "Alamat Pemasangan", 16, c.text, 800);
      
      // Alamat Lengkap
      svg += text(x + 24, y + 312, "Alamat Lengkap", 11, c.faint, 700);
      svg += rect(x + 24, y + 322, cardW - 48, 26, c.card2, c.border, 1, 6);
      svg += text(x + 36, y + 339, "Jl. Cisaranten Endah No. 25", 13, c.text);

      // Provinsi & Kota
      svg += rect(x + 24, y + 356, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 36, y + 373, "Jawa Barat", 13, c.text);
      svg += text(x + 495, y + 373, "▼", 10, c.muted);

      svg += rect(x + 546, y + 356, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 558, y + 373, "Kota Bandung", 13, c.text);
      svg += text(x + 1015, y + 373, "▼", 10, c.muted);

      // Kecamatan & Kelurahan
      svg += rect(x + 24, y + 390, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 36, y + 407, "Arcamanik", 13, c.text);
      svg += text(x + 495, y + 407, "▼", 10, c.muted);

      svg += rect(x + 546, y + 390, 490, 26, c.card2, c.border, 1, 6);
      svg += text(x + 558, y + 407, "Cisaranten Endah", 13, c.text);
      svg += text(x + 1015, y + 407, "▼", 10, c.muted);

      // Titik Koordinat Lokasi
      svg += text(x + 24, y + 428, "Titik Koordinat Lokasi", 11, c.faint, 700);
      svg += rect(x + 24, y + 438, cardW - 48, 70, c.card2, c.border, 1, 6);
      svg += line(x + 24, y + 438, x + cardW - 24, y + 508, c.mutedLine, 1, "3,3");
      svg += line(x + 24, y + 508, x + cardW - 24, y + 438, c.mutedLine, 1, "3,3");
      svg += text(x + cardW / 2, y + 478, "[Peta Lokasi]", 12, c.muted, 500, "middle");

      // Gunakan Lokasi Saat Ini Button
      svg += rect(x + 24, y + 516, 160, 24, c.card2, c.border, 1, 6);
      svg += text(x + 104, y + 532, "Gunakan Lokasi Saat Ini", 11, c.text, 700, "middle");

      // Latitude / Longitude
      svg += text(x + 200, y + 514, "Latitude", 10, c.faint, 700);
      svg += rect(x + 200, y + 524, 400, 24, c.card2, c.border, 1, 6);
      svg += text(x + 212, y + 540, "-6.9152", 12, c.text);

      svg += text(x + 620, y + 514, "Longitude", 10, c.faint, 700);
      svg += rect(x + 620, y + 524, 416, 24, c.card2, c.border, 1, 6);
      svg += text(x + 632, y + 540, "107.6761", 12, c.text);

      // Simpan Perubahan Button (bottom right aligned)
      svg += rect(x + cardW - 200, y + 580, 200, 36, c.white, c.white, 1, 8);
      svg += text(x + cardW - 100, y + 603, "Simpan Perubahan", 14, c.appBg, 700, "middle");

      return svg;
    }),
    support: () => dashboardShell("Pusat Dukungan", customerMenu, 2, (x, y) => {
      let svg = "";

      // Header SLA Info
      svg += rect(x + 820, y - 38, 240, 30, c.card2, c.border, 1, 15);
      svg += text(x + 940, y - 18, "SLA 1x24 jam untuk respon pertama", 11, c.text, 700, "middle");

      const leftX = x;
      const leftW = 600;

      // 1. Kontak Dukungan Card (horizontal options layout matching screenshot 4)
      svg += rect(leftX, y + 10, leftW, 150, c.card, c.border, 1, 10);
      svg += text(leftX + 24, y + 42, "Kontak Dukungan", 16, c.text, 800);
      
      // WhatsApp and Call buttons
      svg += rect(leftX + 24, y + 62, 260, 32, c.card2, c.border, 1, 6);
      svg += text(leftX + 44, y + 83, "Chat WhatsApp", 13, c.text);
      svg += rect(leftX + 300, y + 62, 276, 32, c.card2, c.border, 1, 6);
      svg += text(leftX + 320, y + 83, "Telepon Dukungan", 13, c.text);

      // Email and hours buttons
      svg += rect(leftX + 24, y + 102, 260, 32, c.card2, c.border, 1, 6);
      svg += text(leftX + 44, y + 123, "Email Dukungan", 13, c.text);
      svg += rect(leftX + 300, y + 102, 276, 32, c.card2, c.border, 1, 6);
      svg += text(leftX + 314, y + 123, "Buka Senin-Minggu, 08.00 - 22.00", 11, c.muted);

      // 2. Buat Tiket Dukungan Card (with file upload field matching screenshot 4)
      svg += rect(leftX, y + 175, leftW, 295, c.card, c.border, 1, 10);
      svg += text(leftX + 24, y + 205, "Buat Tiket Dukungan", 16, c.text, 800);
      
      svg += text(leftX + 24, y + 230, "Subjek", 11, c.faint, 700);
      svg += rect(leftX + 24, y + 242, leftW - 48, 30, c.card2, c.border, 1, 6);
      svg += text(leftX + 36, y + 261, "Contoh: Koneksi lambat di malam hari", 12, c.muted);

      svg += text(leftX + 24, y + 285, "Deskripsi Masalah", 11, c.faint, 700);
      svg += rect(leftX + 24, y + 297, leftW - 48, 60, c.card2, c.border, 1, 6);
      svg += text(leftX + 36, y + 316, "Jelaskan kendala yang Anda alami.", 12, c.muted);

      // Upload file input field
      svg += text(leftX + 24, y + 370, "Upload Screenshot/Video (opsional)", 11, c.faint, 700);
      svg += rect(leftX + 24, y + 382, leftW - 48, 30, c.card2, c.border, 1, 6);
      svg += text(leftX + 36, y + 401, "Pilih File (Choose Files)", 12, c.muted);

      svg += rect(leftX + leftW - 144, y + 424, 120, 32, c.white, c.white, 1, 6);
      svg += text(leftX + leftW - 84, y + 445, "Kirim Tiket", 13, c.appBg, 700, "middle");

      // 3. Riwayat Tiket Card
      svg += rect(leftX, y + 485, leftW, 140, c.card, c.border, 1, 10);
      svg += text(leftX + 24, y + 515, "Riwayat Tiket", 16, c.text, 800);
      svg += table(leftX + 24, y + 532, leftW - 48, ["Tiket", "Status", "Tanggal", "Lampiran"], [["#4", "Terbuka", "14/06/2026", "-"]]);

      // Right Column
      const rightX = x + 630;
      const rightW = 430;

      // 4. Status Jaringan Card (matching screenshot 4)
      svg += rect(rightX, y + 10, rightW, 150, c.card, c.border, 1, 10);
      svg += text(rightX + 24, y + 42, "Status Jaringan", 16, c.text, 800);
      // Status indicator circle (representing the green check circle)
      svg += `<circle cx="${rightX + rightW / 2}" cy="${y + 75}" r="16" fill="none" stroke="${c.line}" stroke-width="2"/>`;
      svg += text(rightX + rightW / 2, y + 80, "✓", 16, c.line, 800, "middle");
      svg += text(rightX + rightW / 2, y + 115, "Semua sistem normal", 14, c.text, 700, "middle");
      svg += text(rightX + rightW / 2, y + 132, "Jaringan berjalan normal.", 11, c.muted, 500, "middle");

      // 5. FAQs Card (accordion layout matching screenshot 4)
      svg += rect(rightX, y + 175, rightW, 450, c.card, c.border, 1, 10);
      svg += text(rightX + 24, y + 205, "Pertanyaan yang Sering Diajukan", 15, c.text, 800);
      
      const faqs = [
        "Kenapa internet saya lambat?",
        "Bagaimana cara menjadwalkan kunjungan teknisi?",
        "Bagaimana cara bayar tagihan?",
        "Apa saja yang perlu disiapkan sebelum instalasi?"
      ];
      faqs.forEach((faq, idx) => {
        const fY = y + 225 + idx * 48;
        svg += rect(rightX + 24, fY, rightW - 48, 38, c.card2, c.border, 1, 6);
        svg += text(rightX + 38, fY + 23, faq, 11, c.text, 500);
        svg += text(rightX + rightW - 44, fY + 23, "▼", 10, c.muted);
      });

      return svg;
    }),
    billing: () => dashboardShell("Tagihan & Pembayaran", customerMenu, 1, (x, y) => {
      let svg = "";

      // Secure payment indicator at header level
      svg += rect(x + 850, y - 38, 210, 30, c.card2, c.border, 1, 15);
      svg += text(x + 955, y - 18, "Transaksi aman & terenkripsi", 11, c.text, 700, "middle");

      // Warning Alert Banner (matching screenshot 5)
      svg += rect(x, y + 10, 1060, 48, c.card2, c.border, 1, 8);
      svg += text(x + 20, y + 38, "⚠️ Pengingat Pembayaran: Tagihan bulan ini belum dibayar. Selesaikan sebelum jatuh tempo.", 13, c.text, 500);

      const leftX = x;
      const leftW = 680;

      // 1. Tagihan Berjalan Card (matching screenshot 5 details)
      svg += rect(leftX, y + 80, leftW, 230, c.card, c.border, 1, 10);
      svg += text(leftX + 24, y + 116, "Tagihan Berjalan", 18, c.text, 800);
      svg += text(leftX + 24, y + 138, "Periode 1/1/2026 - 1/2/2026", 13, c.muted);
      
      svg += text(leftX + 24, y + 185, "Total Tagihan", 12, c.muted);
      svg += text(leftX + 24, y + 230, "Rp 300.000", 36, c.text, 800);

      svg += text(leftX + 450, y + 185, "Jatuh Tempo: 6/2/2026", 13, c.muted);
      // Status badge (monochrome wireframe badge)
      svg += pill(leftX + 450, y + 202, "Terlambat", c.card2, c.border, c.text, 100);

      svg += rect(leftX + 24, y + 256, 140, 36, c.white, c.white, 1, 6);
      svg += text(leftX + 94, y + 279, "Bayar Sekarang", 13, c.appBg, 700, "middle");

      svg += rect(leftX + 180, y + 256, 140, 36, c.card2, c.border, 1, 6);
      svg += text(leftX + 250, y + 279, "Unduh Invoice", 13, c.text, 700, "middle");

      // 2. Riwayat Pembayaran Card (matching table with lunas and terlambat lines)
      svg += rect(leftX, y + 330, leftW, 260, c.card, c.border, 1, 10);
      svg += text(leftX + 24, y + 366, "Riwayat Pembayaran", 18, c.text, 800);
      svg += table(leftX + 24, y + 390, leftW - 48, ["Tanggal", "Jumlah", "Status", "Invoice"], [
        ["1/1/2026 - 1/2/2026", "Rp 300.000", "Terlambat", "[Unduh]"],
        ["1/12/2025 - 1/1/2026", "Rp 300.000", "Terlambat", "[Unduh]"],
        ["1/11/2025 - 1/12/2025", "Rp 300.000", "Lunas", "[Unduh]"]
      ]);

      const rightX = x + 710;
      const rightW = 350;

      // 3. Paket Berlangganan Card
      svg += rect(rightX, y + 80, rightW, 230, c.card, c.border, 1, 10);
      svg += text(rightX + 24, y + 116, "Paket Berlangganan", 18, c.text, 800);
      svg += text(rightX + 24, y + 160, "BROADBAND NEW 30 Mbps", 18, c.text, 800);
      svg += text(rightX + 24, y + 188, "30 Mbps Download / 30 Mbps Upload", 13, c.muted);
      svg += text(rightX + 24, y + 215, "Rp 300.000/bln", 15, c.text, 700);

      svg += rect(rightX + 24, y + 250, rightW - 48, 36, c.card2, c.border, 1, 6);
      svg += text(rightX + rightW / 2, y + 273, "Ubah Paket", 13, c.text, 700, "middle");

      // 4. Metode Pembayaran Card (accordions list matching screenshot 5)
      svg += rect(rightX, y + 330, rightW, 260, c.card, c.border, 1, 10);
      svg += text(rightX + 24, y + 366, "Metode Pembayaran", 16, c.text, 800);
      
      const methods = ["Virtual Account", "QRIS", "Kartu Kredit/Debit"];
      methods.forEach((method, idx) => {
        const mY = y + 390 + idx * 44;
        svg += rect(rightX + 24, mY, rightW - 48, 34, c.card2, c.border, 1, 6);
        svg += text(rightX + 38, mY + 21, method, 12, c.text, 600);
        svg += text(rightX + rightW - 44, mY + 21, "▼", 10, c.muted);
      });

      return svg;
    }),
    packages: () => dashboardShell("Kelola Paket", adminMenu, 1, (x, y) => {
      let svg = "";
      
      // Buttons in header line
      svg += rect(x + 580, y - 56, 230, 36, c.card, c.border, 1, 6);
      svg += text(x + 695, y - 33, "🔄 Sinkronisasi MikroTik", 13, c.text, 700, "middle");
      
      svg += rect(x + 830, y - 56, 230, 36, c.white, c.white, 1, 6);
      svg += text(x + 945, y - 33, "➕ Tambah Paket Baru", 13, c.appBg, 700, "middle");

      // Table (direct drawing matching screenshot)
      const tabY = y + 10;
      const startX = [x + 18, x + 318, x + 538, x + 958];
      
      // Header
      svg += text(startX[0], tabY + 20, "Nama Paket", 13, c.muted, 600);
      svg += text(startX[1], tabY + 20, "Detail", 13, c.muted, 600);
      svg += text(startX[2], tabY + 20, "Harga", 13, c.muted, 600);
      svg += text(startX[3], tabY + 20, "Aksi", 13, c.muted, 600);
      svg += line(x, tabY + 36, x + 1060, tabY + 36, c.border, 1);

      // Rows data
      const rows = [
        ["UP TO NEW 15 Mbps", "UP TO NEW", "15 Mbps / 15 Mbps", "Unlimited Quota: true", "Rp 165.000/bln"],
        ["UP TO NEW 20 Mbps", "UP TO NEW", "20 Mbps / 20 Mbps", "Unlimited Quota: true", "Rp 200.000/bln"],
        ["UP TO NEW 25 Mbps", "UP TO NEW", "25 Mbps / 25 Mbps", "Unlimited Quota: true", "Rp 225.000/bln"],
        ["UP TO NEW 30 Mbps", "UP TO NEW", "30 Mbps / 30 Mbps", "Unlimited Quota: true", "Rp 250.000/bln", true], // Has popular badge
        ["UP TO NEW 35 Mbps", "UP TO NEW", "35 Mbps / 35 Mbps", "Unlimited Quota: true", "Rp 300.000/bln"],
        ["SOHO 10 Mbps", "SMALL OFFICE HOME OFFICE", "10 Mbps / 10 Mbps", "Static Ip: true", "Rp 499.000/bln", false, true] // Has static ip
      ];

      let rowY = tabY + 37;
      rows.forEach((row) => {
        const hasBadge = row[4] === true;
        const isSoho = row[6] === true;
        const rowH = hasBadge ? 80 : 64;
        
        svg += text(startX[0], rowY + 26, row[0], 14, c.text, 700);
        svg += text(startX[0], rowY + 44, row[1], 11, c.muted);
        
        if (hasBadge) {
          // Badge "Paling Populer"
          svg += rect(startX[0], rowY + 52, 90, 18, c.card2, c.border, 1, 9);
          svg += text(startX[0] + 45, rowY + 64, "Paling Populer", 9, c.text, 700, "middle");
        }

        svg += text(startX[1], rowY + 26, row[2], 14, c.text, 700);
        svg += text(startX[1], rowY + 44, isSoho ? "Static Ip: true, Unlimited Quota: true" : row[3], 11, c.muted);

        svg += text(startX[2], rowY + 26, row[4], 14, c.text, 500);

        // Aksi icons
        svg += text(startX[3], rowY + 26, "✏️", 13);
        svg += text(startX[3] + 28, rowY + 26, "🗑️", 13);

        svg += line(x, rowY + rowH, x + 1060, rowY + rowH, c.border, 1);
        rowY += rowH;
      });

      // Table border box
      svg += rect(x, tabY, 1060, rowY - tabY, "none", c.border, 1, 8);

      return svg;
    }),
    ticketsAdmin: () => dashboardShell("Manajemen Tiket", adminMenu, 6, (x, y) => {
      let svg = "";
      
      // Header buttons stacked vertically on the right
      svg += rect(x + 830, y - 56, 230, 32, c.white, c.white, 1, 6);
      svg += text(x + 945, y - 35, "➕ Tambah Tiket Baru", 12, c.appBg, 700, "middle");
      
      svg += rect(x + 830, y - 18, 230, 32, c.card, c.border, 1, 6);
      svg += text(x + 945, y + 2, "➕ Tambah Kategori Tiket", 12, c.text, 700, "middle");

      // Tabs bar
      const tabs = ["Registrasi", "Survey", "Instalasi", "Customer", "Technician", "Termination"];
      const tabW = 1060 / tabs.length;
      svg += rect(x, y + 25, 1060, 36, c.card, c.border, 1, 6);
      tabs.forEach((tab, i) => {
        const tx = x + i * tabW;
        if (i === 0) {
          // Active tab: Registrasi
          svg += rect(tx, y + 25, tabW, 36, c.active, c.border, 1, 6);
          svg += text(tx + tabW / 2, y + 48, tab, 12, c.white, 700, "middle");
        } else {
          svg += text(tx + tabW / 2, y + 48, tab, 12, c.muted, 500, "middle");
        }
      });

      // Table headers
      const tabY = y + 75;
      const startX = [x + 18, x + 318, x + 618, x + 958];
      
      svg += text(startX[0], tabY + 20, "Pelanggan", 13, c.muted, 600);
      svg += text(startX[1], tabY + 20, "Status", 13, c.muted, 600);
      svg += text(startX[2], tabY + 20, "Dibuat pada", 13, c.muted, 600);
      svg += text(startX[3], tabY + 20, "Aksi", 13, c.muted, 600);
      svg += line(x, tabY + 36, x + 1060, tabY + 36, c.border, 1);

      // Rows
      const rows = [
        ["Mizan Nur", "1", "Selesai", "14/6/2026, 16.27"],
        ["Rina Putri", "5", "Selesai", "14/6/2026, 16.27"],
        ["Agus Santoso", "9", "Selesai", "14/6/2026, 16.27"],
        ["Dewi Lestari", "13", "Selesai", "14/6/2026, 16.27"],
        ["Yoga Pratama", "17", "Selesai", "14/6/2026, 16.27"]
      ];

      rows.forEach((row, i) => {
        const rowY = tabY + 37 + i * 58;
        svg += text(startX[0], rowY + 22, row[0], 14, c.text, 700);
        svg += text(startX[0], rowY + 38, row[1], 10, c.muted);

        // Status badge
        svg += pill(startX[1], rowY + 12, row[2], c.card2, c.border, c.text, 80);

        svg += text(startX[2], rowY + 26, row[3], 13, c.text);

        // Icons
        svg += text(startX[3], rowY + 26, "🔄", 13);
        svg += text(startX[3] + 28, rowY + 26, "✏️", 13);

        svg += line(x, rowY + 50, x + 1060, rowY + 50, c.border, 1);
      });

      // Table border box
      svg += rect(x, tabY, 1060, 326, "none", c.border, 1, 8);

      return svg;
    }),
    inventory: () => dashboardShell("Kelola Inventaris", adminMenu, 2, (x, y) => {
      let svg = "";
      
      // Header dropdown Kategori & button Tambah Item Baru
      svg += rect(x + 630, y - 56, 180, 36, c.card, c.border, 1, 6);
      svg += text(x + 700, y - 33, "Kategori ▼", 13, c.text, 700, "middle");

      svg += rect(x + 830, y - 56, 230, 36, c.white, c.white, 1, 6);
      svg += text(x + 945, y - 33, "➕ Tambah Item Baru", 13, c.appBg, 700, "middle");

      // Table columns: Nama Item, Kategori, Stok, Satuan, Aksi
      const tabY = y + 10;
      const startX = [x + 18, x + 368, x + 618, x + 768, x + 958];
      
      svg += text(startX[0], tabY + 20, "Nama Item", 13, c.muted, 600);
      svg += text(startX[1], tabY + 20, "Kategori", 13, c.muted, 600);
      svg += text(startX[2], tabY + 20, "Stok", 13, c.muted, 600);
      svg += text(startX[3], tabY + 20, "Satuan", 13, c.muted, 600);
      svg += text(startX[4], tabY + 20, "Aksi", 13, c.muted, 600);
      svg += line(x, tabY + 36, x + 1060, tabY + 36, c.border, 1);

      const items = [
        ["Clamp Tiang Fiber", "Aksesoris", "200", "buah"],
        ["Kabel Drop Core", "Kabel", "1500", "meter"],
        ["Kabel Fiber Optik 12 Core", "Kabel", "2500", "meter"],
        ["Konektor SC/UPC", "Konektor", "500", "buah"],
        ["ODP 8 Port", "ODP/ONT/ONU", "30", "buah"],
        ["ONT Modem", "ODP/ONT/ONU", "95", "buah"],
        ["Router WiFi Dual Band", "Router", "120", "buah"]
      ];

      items.forEach((item, i) => {
        const rowY = tabY + 37 + i * 54;
        svg += text(startX[0], rowY + 26, item[0], 14, c.text, 500);
        svg += text(startX[1], rowY + 26, item[1], 14, c.text, 500);
        svg += text(startX[2], rowY + 26, item[2], 14, c.text, 500);
        svg += text(startX[3], rowY + 26, item[3], 14, c.text, 500);

        svg += text(startX[4], rowY + 26, "✏️", 13);
        svg += text(startX[4] + 28, rowY + 26, "🗑️", 13);

        svg += line(x, rowY + 46, x + 1060, rowY + 46, c.border, 1);
      });

      // Table border box
      svg += rect(x, tabY, 1060, 414, "none", c.border, 1, 8);

      return svg;
    }),
    areas: () => dashboardShell("Covered Area", adminMenu, 7, (x, y) => {
      let svg = "";
      
      // Header button
      svg += rect(x + 910, y - 56, 150, 36, c.white, c.white, 1, 6);
      svg += text(x + 985, y - 33, "Tambah area", 13, c.appBg, 700, "middle");

      // 1. Peta Area Cakupan Card (full-width)
      svg += rect(x, y + 10, 1060, 220, c.card, c.border, 1, 10);
      svg += text(x + 24, y + 42, "Peta Area Cakupan", 16, c.text, 800);
      svg += text(x + 24, y + 62, "Menampilkan titik pusat cakupan (radius default 10 km jika tidak ada).", 12, c.muted);

      // Map interior representation
      svg += rect(x + 24, y + 80, 1012, 120, c.card2, c.border, 1, 6);
      svg += line(x + 24, y + 80, x + 1036, y + 200, c.mutedLine, 1, "4,4");
      svg += line(x + 24, y + 200, x + 1036, y + 80, c.mutedLine, 1, "4,4");
      svg += text(x + 530, y + 145, "[Peta Area Cakupan - Map]", 14, c.muted, 500, "middle");
      svg += text(x + 1020, y + 195, "Pigeon | © OpenStreetMap", 10, c.muted, 500, "end");

      // 2. Grid 2x2 of covered area cards (bottom area)
      const gridY = y + 250;
      const cardW = 515;
      const cardH = 115;
      
      const locations = [
        ["Cisaranten Kulon, Arcamanik", "-6.9141, 107.6717"],
        ["Ciumbuleuit, Cidadap", "-8.8722, 107.6048"],
        ["Dago, Coblong", "-6.8896, 107.6191"],
        ["Pasteur, Sukajadi", "-6.8893, 107.5952"]
      ];

      locations.forEach((loc, i) => {
        const cx = x + (i % 2) * (cardW + 30);
        const cy = gridY + Math.floor(i / 2) * (cardH + 20);
        
        svg += rect(cx, cy, cardW, cardH, c.card, c.border, 1, 10);
        svg += `<circle cx="${cx + 34}" cy="${cy + 34}" r="14" fill="${c.card2}" stroke="${c.border}" stroke-width="1"/>`;
        svg += text(cx + 34, cy + 39, "📍", 12, c.text, 500, "middle");
        
        svg += text(cx + 64, cy + 30, loc[0], 14, c.text, 700);
        svg += text(cx + 64, cy + 48, "Kota Bandung, Jawa Barat", 11, c.muted);

        svg += pill(cx + cardW - 120, cy + 18, "Aktif", c.card2, c.border, c.text, 70);
        svg += text(cx + cardW - 34, cy + 38, "✏️", 12);

        svg += text(cx + 64, cy + 78, "Radius: 10 km", 12, c.muted);
        svg += text(cx + 64, cy + 96, `Koordinat: ${loc[1]}`, 12, c.muted);
      });

      return svg;
    }),
    areaHistory: () => dashboardShell("History Check Area", adminMenu, 7, (x, y) => {
      let svg = "";

      // 1. Three Summary Cards
      const sumW = 330;
      const sumH = 100;
      
      // Card 1
      svg += rect(x, y + 10, sumW, sumH, c.card, c.border, 1, 10);
      svg += text(x + 20, y + 36, "Calon pelanggan tercover", 13, c.muted, 600);
      svg += text(x + 20, y + 56, "Total yang tercover", 11, c.muted);
      svg += text(x + 20, y + 88, "0", 24, c.text, 800);
      
      // Card 2
      svg += rect(x + 365, y + 10, sumW, sumH, c.card, c.border, 1, 10);
      svg += text(x + 385, y + 36, "Calon pelanggan tidak tercover", 13, c.muted, 600);
      svg += text(x + 385, y + 56, "Total yang tidak tercover", 11, c.muted);
      svg += text(x + 385, y + 88, "0", 24, c.text, 800);

      // Card 3
      svg += rect(x + 730, y + 10, sumW, sumH, c.card, c.border, 1, 10);
      svg += text(x + 750, y + 36, "Total pengecekan", 13, c.muted, 600);
      svg += text(x + 750, y + 56, "Semua pengecekan", 11, c.muted);
      svg += text(x + 750, y + 88, "0", 24, c.text, 800);

      // 2. Peta Titik Cek Card
      const mapY = y + 130;
      svg += rect(x, mapY, 1060, 220, c.card, c.border, 1, 10);
      svg += text(x + 24, mapY + 30, "Peta Titik Cek", 16, c.text, 800);
      svg += text(x + 24, mapY + 50, "Titik pengecekan pelanggan yang terbaru.", 12, c.muted);

      svg += rect(x + 24, mapY + 66, 1012, 110, c.card2, c.border, 1, 6);
      svg += line(x + 24, mapY + 66, x + 1036, mapY + 176, c.mutedLine, 1, "4,4");
      svg += line(x + 24, mapY + 176, x + 1036, mapY + 66, c.mutedLine, 1, "4,4");
      svg += text(x + 530, mapY + 125, "[Peta Titik Cek - Map]", 14, c.muted, 500, "middle");
      svg += text(x + 1020, mapY + 170, "Pigeon | © OpenStreetMap", 10, c.muted, 500, "end");

      // Legend below map inside card
      svg += text(x + 24, y + 325, "● POP / lokasi layanan", 12, c.muted);
      svg += text(x + 220, y + 325, "● Calon pelanggan tercover", 12, c.muted);
      svg += text(x + 460, y + 325, "● Calon pelanggan tidak tercover", 12, c.muted);

      // 3. Riwayat Pengecekan Card (with sub tables)
      const tabY = y + 370;
      svg += rect(x, tabY, 1060, 210, c.card, c.border, 1, 10);
      svg += text(x + 24, tabY + 30, "Riwayat Pengecekan", 16, c.text, 800);
      svg += text(x + 24, tabY + 48, "Menampilkan hasil cek cakupan terbaru.", 12, c.muted);

      // Sub table 1: Per Kota
      svg += rect(x + 24, tabY + 56, 490, 85, c.card2, c.border, 1, 6);
      svg += text(x + 36, tabY + 80, "Per Kota", 13, c.text, 700);
      svg += text(x + 36, tabY + 96, "Ringkasan tercover vs tidak", 10, c.muted);
      svg += line(x + 24, tabY + 104, x + 514, tabY + 104, c.border, 1);
      svg += text(x + 36, tabY + 125, "Kota", 11, c.muted);
      svg += text(x + 200, tabY + 125, "Tercover", 11, c.muted);
      svg += text(x + 340, tabY + 125, "Tidak", 11, c.muted);

      // Sub table 2: Per Kecamatan
      svg += rect(x + 546, tabY + 56, 490, 85, c.card2, c.border, 1, 6);
      svg += text(x + 558, tabY + 80, "Per Kecamatan", 13, c.text, 700);
      svg += text(x + 558, tabY + 96, "Ringkasan tercover vs tidak", 10, c.muted);
      svg += line(x + 546, tabY + 104, x + 1036, tabY + 104, c.border, 1);
      svg += text(x + 558, tabY + 125, "Kecamatan", 11, c.muted);
      svg += text(x + 720, tabY + 125, "Tercover", 11, c.muted);
      svg += text(x + 860, tabY + 125, "Tidak", 11, c.muted);

      // Main Table header at the bottom inside card
      svg += line(x + 24, tabY + 155, x + 1036, tabY + 155, c.border, 1);
      svg += text(x + 36, tabY + 180, "Alamat", 12, c.muted, 600);
      svg += text(x + 350, tabY + 180, "Hasil", 12, c.muted, 600);
      svg += text(x + 600, tabY + 180, "Koordinat", 12, c.muted, 600);
      svg += text(x + 850, tabY + 180, "Waktu", 12, c.muted, 600);

      return svg;
    }),
    ticketsAdmin: () => dashboardShell("Manajemen Tiket", adminMenu, 6, (x, y) => {
      let svg = "";
      
      // Header buttons stacked vertically on the right
      svg += rect(x + 830, y - 56, 230, 32, c.white, c.white, 1, 6);
      svg += text(x + 945, y - 35, "Tambah Tiket Baru", 12, c.appBg, 700, "middle");
      
      svg += rect(x + 830, y - 18, 230, 32, c.card, c.border, 1, 6);
      svg += text(x + 945, y + 2, "Tambah Kategori Tiket", 12, c.text, 700, "middle");

      // Tabs bar
      const tabs = ["Registrasi", "Survey", "Instalasi", "Customer", "Technician", "Termination"];
      const tabW = 1060 / tabs.length;
      svg += rect(x, y + 25, 1060, 36, c.card, c.border, 1, 6);
      tabs.forEach((tab, i) => {
        const tx = x + i * tabW;
        if (i === 0) {
          // Active tab: Registrasi
          svg += rect(tx, y + 25, tabW, 36, c.active, c.border, 1, 6);
          svg += text(tx + tabW / 2, y + 48, tab, 12, c.white, 700, "middle");
        } else {
          svg += text(tx + tabW / 2, y + 48, tab, 12, c.muted, 500, "middle");
        }
      });

      // Table headers
      const tabY = y + 75;
      const startX = [x + 18, x + 318, x + 618, x + 958];
      
      svg += text(startX[0], tabY + 20, "Pelanggan", 13, c.muted, 600);
      svg += text(startX[1], tabY + 20, "Status", 13, c.muted, 600);
      svg += text(startX[2], tabY + 20, "Dibuat pada", 13, c.muted, 600);
      svg += text(startX[3], tabY + 20, "Aksi", 13, c.muted, 600);
      svg += line(x, tabY + 36, x + 1060, tabY + 36, c.border, 1);

      // Rows
      const rows = [
        ["Mizan Nur", "1", "Selesai", "14/6/2026, 16.27"],
        ["Rina Putri", "5", "Selesai", "14/6/2026, 16.27"],
        ["Agus Santoso", "9", "Selesai", "14/6/2026, 16.27"],
        ["Dewi Lestari", "13", "Selesai", "14/6/2026, 16.27"],
        ["Yoga Pratama", "17", "Selesai", "14/6/2026, 16.27"]
      ];

      rows.forEach((row, i) => {
        const rowY = tabY + 37 + i * 58;
        svg += text(startX[0], rowY + 22, row[0], 14, c.text, 700);
        svg += text(startX[0], rowY + 38, row[1], 10, c.muted);

        // Status badge
        svg += pill(startX[1], rowY + 12, row[2], c.card2, c.border, c.text, 80);

        svg += text(startX[2], rowY + 26, row[3], 13, c.text);

        // Icons
        svg += text(startX[3], rowY + 26, "🔄", 13);
        svg += text(startX[3] + 28, rowY + 26, "✏️", 13);

        svg += line(x, rowY + 50, x + 1060, rowY + 50, c.border, 1);
      });

      return svg;
    }),
    technicianTickets: () => dashboardShell("Tiket Teknisi", techMenu, 0, (x, y) =>
      card(x, y + 28, 330, 160, "Tiket Ditugaskan", "Pekerjaan aktif teknisi") +
      card(x + 365, y + 28, 330, 160, "Sedang Dikerjakan", "Progress lapangan") +
      card(x + 730, y + 28, 330, 160, "Perlu Laporan", "Upload hasil pekerjaan") +
      card(x, y + 225, 1060, 350, "Daftar Tiket", "Tiket survey, instalasi, dan gangguan") +
      table(x + 24, y + 295, 1012, ["Tiket", "Pelanggan", "Status", "Jadwal"], [["TK-201", "A. Rahman", "Scheduled", "08:00"], ["TK-202", "S. Putri", "In Progress", "10:00"], ["TK-203", "D. Nugraha", "Open", "13:00"]])
    ),
    technicianSchedule: () => dashboardShell("Jadwal & Tugas", techMenu, 1, (x, y) =>
      card(x, y + 28, 590, 520, "Kalender Jadwal Teknisi", "Agenda kunjungan lapangan") +
      Array.from({ length: 21 }).map((_, i) => rect(x + 30 + (i % 7) * 74, y + 115 + Math.floor(i / 7) * 76, 62, 52, i === 8 ? c.active : c.card2, c.border, 1, 8) + text(x + 61 + (i % 7) * 74, y + 148 + Math.floor(i / 7) * 76, String(i + 1), 16, c.text, 700, "middle")).join("") +
      card(x + 625, y + 28, 435, 520, "Detail Jadwal", "Alamat, pelanggan, dan tim teknisi") +
      table(x + 650, y + 118, 385, ["Jam", "Tiket", "Status"], [["08:00", "TK-201", "Survey"], ["10:00", "TK-202", "Instalasi"], ["13:00", "TK-203", "Gangguan"]])
    ),
    technicianHistory: () => dashboardShell("Riwayat Teknisi", techMenu, 2, (x, y) =>
      card(x, y + 28, 320, 140, "Selesai", "Pekerjaan selesai") +
      card(x + 350, y + 28, 320, 140, "Survey", "Riwayat survey") +
      card(x + 700, y + 28, 360, 140, "Instalasi", "Riwayat instalasi") +
      card(x, y + 205, 1060, 390, "Riwayat Pengerjaan", "Laporan hasil pekerjaan teknisi") +
      table(x + 24, y + 275, 1012, ["Tiket", "Pelanggan", "Pekerjaan", "Selesai"], [["TK-190", "R. Aditya", "Instalasi", "10 Jan"], ["TK-191", "M. Sari", "Gangguan", "11 Jan"], ["TK-192", "F. Hidayat", "Survey", "12 Jan"]])
    ),
    router: () => dashboardShell("Manajemen Router", techMenu, 3, (x, y) =>
      card(x, y + 28, 320, 140, "Router Aktif", "Koneksi API/SSH") +
      card(x + 350, y + 28, 320, 140, "Sinkronisasi", "Paket dan PPPoE") +
      rect(x + 805, y + 47, 210, 44, c.white, c.white, 1, 9) +
      text(x + 910, y + 76, "Tambah Router", 16, c.appBg, 700, "middle") +
      card(x, y + 205, 650, 390, "Daftar Router", "Host, user, port API, dan status") +
      table(x + 24, y + 275, 602, ["Nama", "Host", "API", "Status"], [["Core-01", "10.10.1.1", "8728", "Online"], ["POP-02", "10.10.2.1", "8728", "Online"]]) +
      card(x + 680, y + 205, 380, 390, "Terminal Router", "Eksekusi command RouterOS") +
      rect(x + 708, y + 290, 324, 190, c.card2, c.border, 1, 8) +
      text(x + 730, y + 330, "/ppp/secret/print", 18, c.text, 600) +
      text(x + 730, y + 368, "!re name=pelanggan01", 16, c.faint, 500)
    ),
  };

  return pages[kind]();
}

const specs = [
  "Ukuran: 1920 x 1080 Pixels",
  "Font: Inter / Poppins",
  "Background-body: #FFFFFF (White)",
  "Background-card: #FFFFFF (White)",
  "Background-sidebar: #FFFFFF (White)",
  "Warna garis: #CBD5E1 (Slate 300)",
];

const pages = [
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
  ["TA12", "Antarmuka Halaman Jadwal & Tugas", "technicianSchedule", "Teknisi menggunakan halaman ini untuk memantau jadwal tugas harian dan agenda kunjungan lapangan."],
  ["TA13", "Antarmuka Halaman Riwayat Teknisi", "technicianHistory", "Teknisi menggunakan halaman ini untuk melihat riwayat pekerjaan yang telah diselesaikan."],
  ["TA14", "Antarmuka Halaman Kelola Router", "router", "Teknisi menggunakan halaman ini untuk memantau koneksi router MikroTik fisik dan mengakses terminal perintah."],
];

function drawNotes(note) {
  return [
    rect(notesX, mockY, notesW, mockH, c.paper, c.line, 1),
    wrapText(notesX + 18, mockY + 44, note, 25, c.line, notesW - 36),
  ].join("");
}

function drawSpecs() {
  let svg = rect(24, specY, W - 48, 220, c.paper, c.line, 1);
  specs.forEach((spec, index) => svg += text(42, specY + 38 + index * 30, spec, 24, c.line, 400));
  return svg;
}

function svgPage([code, title, kind, note]) {
  const content = kind === "login" || kind === "register" ? authMockup(kind) : pageContent(kind);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${c.paper}"/>
  ${rect(24, 20, W - 48, headerH - 20, c.paper, c.line, 1)}
  ${text(48, 65, code, 30, c.line, 800)}
  ${text(210, 65, title, 30, c.line, 700)}
  ${content}
  ${drawNotes(note)}
  ${line(notesX, mockY, notesX, specY, c.line, 2)}
  ${drawSpecs()}
</svg>`;
}

function slug(code, title) {
  return `${code.toLowerCase()}-${title.toLowerCase()
    .replaceAll("antarmuka halaman ", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function convertSvg(svgPath, pngPath) {
  try {
    try {
      execFileSync("convert", [svgPath, pngPath], { stdio: "pipe" });
    } catch (error) {
      execFileSync("magick", [svgPath, pngPath], { stdio: "pipe" });
    }
  } catch (error) {
    // Gracefully handle missing ImageMagick binary instead of crashing
    console.warn(`[Warning] Failed to convert ${path.basename(svgPath)} to PNG: ImageMagick (convert/magick) is not installed.`);
  }
}

function generateSemanticNetworkSvg() {
  const svgW = 800;
  const svgH = 850;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="${c.paper}"/>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 2 L 8 5 L 0 8 Z" fill="#111111"/>
    </marker>
  </defs>
  
  <text x="400" y="820" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">Gambar 3.183 Jaringan Semantik Pelanggan</text>
  
  <!-- Connections (Arrows) -->
  <!-- Top-Left TA02 to Center TA01 -->
  <path d="M 271 184 L 362 254" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <!-- Top-Right TA02 to Center TA01 -->
  <path d="M 529 184 L 438 254" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <!-- Center TA01 to Left-Middle TA03 -->
  <path d="M 340 400 L 208 400" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <!-- Center TA01 to Right-Middle TA05 -->
  <path d="M 460 400 L 592 400" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <!-- Left-Middle TA03 to Left-Lower TA04 -->
  <path d="M 160 440 L 160 532" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <!-- Left-Lower TA04 to Left-Bottom TA01 -->
  <path d="M 160 620 L 160 692" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  
  <!-- Self Loops -->
  <!-- Top-Left TA02 -->
  <path d="M 230 115 C 210 50, 290 50, 270 115" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="250" y="45" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P02</text>
  
  <!-- Top-Right TA02 -->
  <path d="M 530 115 C 510 50, 590 50, 570 115" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="550" y="45" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P03</text>
  
  <!-- Center TA01 -->
  <path d="M 380 348 C 360 270, 440 270, 420 348" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="400" y="260" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P01</text>
  
  <!-- Left-Middle TA03 -->
  <path d="M 140 365 C 120 300, 200 300, 180 365" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="160" y="290" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P11, P12, P13</text>
  
  <!-- Left-Lower TA04 -->
  <path d="M 140 545 C 120 480, 200 480, 180 545" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="160" y="470" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P17, P16</text>
  
  <!-- Right-Middle TA05 -->
  <path d="M 620 365 C 600 300, 680 300, 660 365" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="640" y="290" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">P09, P14, P15</text>
  
  <!-- Nodes (Circles with labels) -->
  <!-- Top-Left Register TA02 -->
  <circle cx="250" cy="150" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
  <text x="250" y="157" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA02</text>
  
  <!-- Top-Right Register TA02 -->
  <circle cx="550" cy="150" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
  <text x="550" y="157" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA02</text>
  
  <!-- Center Login TA01 -->
  <circle cx="400" cy="400" r="60" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
  <text x="400" y="407" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">TA01</text>
  
  <!-- Left-Middle Profile TA03 -->
  <circle cx="160" cy="400" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
  <text x="160" y="407" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA03</text>
  
  <!-- Left-Lower Support TA04 -->
  <circle cx="160" cy="580" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
  <text x="160" y="587" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA04</text>
  
  <!-- Left-Bottom Redirect TA01 -->
  <circle cx="160" cy="740" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
  <text x="160" y="747" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA01</text>
  
  <!-- Right-Middle Billing TA05 -->
  <circle cx="640" cy="400" r="40" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
  <text x="640" y="407" font-family="Inter, Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#111111" text-anchor="middle">TA05</text>
</svg>`;
  return svg;
}

for (const page of pages) {
  const fileName = slug(page[0], page[1]);
  const svgPath = path.join(outDir, `${fileName}.svg`);
  const pngPath = path.join(outDir, `${fileName}.png`);
  fs.writeFileSync(svgPath, svgPage(page), "utf8");
  convertSvg(svgPath, pngPath);
}

const dialogKeys = Object.keys(dialogConfigs);
for (const key of dialogKeys) {
  const config = dialogConfigs[key];
  const fileName = dialogSlug(config);
  const svgPath = path.join(outDir, `${fileName}.svg`);
  const pngPath = path.join(outDir, `${fileName}.png`);
  fs.writeFileSync(svgPath, generateDialogSvg(key), "utf8");
  convertSvg(svgPath, pngPath);
}

const netSvgPath = path.join(outDir, "jaringan-semantik-pelanggan.svg");
const netPngPath = path.join(outDir, "jaringan-semantik-pelanggan.png");
fs.writeFileSync(netSvgPath, generateSemanticNetworkSvg(), "utf8");
convertSvg(netSvgPath, netPngPath);

console.log(`Generated ${pages.length} interface mockups, ${dialogKeys.length} standalone message SVGs, and semantic network in ${path.relative(process.cwd(), outDir)}`);
