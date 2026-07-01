export const messageCodes = {
  P01: 'Email atau kata sandi salah, silakan periksa kembali.',
  P02: 'Email sudah terdaftar dalam sistem.',
  P03: 'Paket tidak ditemukan.',
  P04: 'Simpan Perubahan? Apakah anda yakin ingin memperbaharui seluruh pengaturan sistem?',
  P05: 'Berhasil! Data pengaturan berhasil disimpan.',
  P06: 'Berhasil! Anda telah berhasil keluar dari akun Anda.',
  P07: 'Berhasil! Pendaftaran akun Anda berhasil dilakukan.',
  P08: 'Tidak dapat menghapus paket karena masih ada pelanggan aktif yang menggunakan paket ini.',
  P09: 'Konfigurasi Midtrans belum lengkap.',
  P10: 'Hapus Router? Apakah anda yakin ingin menghapus router ini?',
  P11: 'Berhasil! Perubahan profil berhasil disimpan.',
  P12: 'Berhasil! Email berhasil diperbarui.',
  P13: 'Berhasil! Kata sandi Anda telah berhasil diubah.',
  P14: 'Berhasil! Paket berhasil diubah.',
  P15: 'Berhasil! Token pembayaran berhasil dibuat.',
  P16: 'Berhasil! Tiket dukungan berhasil dibuat.',
  P17: 'Anda belum memiliki order aktif.',
};

export function getMessageCode(message: string): string | null {
  if (!message) return null;
  const msgLower = message.toLowerCase();
  
  if (
    msgLower.includes('invalid email or password') ||
    msgLower.includes('email atau kata sandi salah')
  ) {
    return 'P01';
  }
  if (
    msgLower.includes('email already registered') ||
    msgLower.includes('email sudah terdaftar')
  ) {
    return 'P02';
  }
  if (
    msgLower.includes('package not found') ||
    msgLower.includes('paket tidak ditemukan')
  ) {
    return 'P03';
  }
  if (
    msgLower.includes('seluruh pengaturan sistem') ||
    msgLower.includes('update settings')
  ) {
    return 'P04';
  }
  if (
    msgLower.includes('data pengaturan berhasil disimpan') ||
    msgLower.includes('pengaturan berhasil disimpan') ||
    msgLower.includes('settings updated')
  ) {
    return 'P05';
  }
  if (
    msgLower.includes('logout successful') ||
    msgLower.includes('logout berhasil')
  ) {
    return 'P06';
  }
  if (
    msgLower.includes('registration successful') ||
    msgLower.includes('register berhasil') ||
    msgLower.includes('pendaftaran berhasil') ||
    msgLower.includes('pendaftaran akun berhasil')
  ) {
    return 'P07';
  }
  if (
    msgLower.includes('tidak dapat menghapus paket karena masih ada pelanggan aktif') ||
    msgLower.includes('pelanggan aktif yang menggunakan paket')
  ) {
    return 'P08';
  }
  if (
    msgLower.includes('konfigurasi midtrans belum lengkap') ||
    msgLower.includes('midtrans config incomplete')
  ) {
    return 'P09';
  }
  if (
    msgLower.includes('hapus router') ||
    msgLower.includes('yakin ingin menghapus router')
  ) {
    return 'P10';
  }
  if (
    msgLower.includes('profile updated') ||
    msgLower.includes('perubahan profil berhasil disimpan')
  ) {
    return 'P11';
  }
  if (
    msgLower.includes('email updated') ||
    msgLower.includes('email berhasil diperbarui')
  ) {
    return 'P12';
  }
  if (
    msgLower.includes('password updated') ||
    msgLower.includes('kata sandi anda telah berhasil diubah')
  ) {
    return 'P13';
  }
  if (
    msgLower.includes('paket berhasil diubah') ||
    msgLower.includes('package changed successfully')
  ) {
    return 'P14';
  }
  if (
    msgLower.includes('payment token created successfully') ||
    msgLower.includes('token pembayaran berhasil dibuat')
  ) {
    return 'P15';
  }
  if (
    msgLower.includes('support ticket created') ||
    msgLower.includes('tiket dukungan berhasil dibuat')
  ) {
    return 'P16';
  }
  if (
    msgLower.includes('anda belum memiliki order aktif') ||
    msgLower.includes('no active order found')
  ) {
    return 'P17';
  }
  
  return null;
}
