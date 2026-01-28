import { prismaClient } from '../application/prisma.js';
import { getGeminiModel } from '../application/gemini.js';
import { packageRecommendationValidation } from '../validation/recommendationValidation.js';

async function recommendPackage(data: any) {
  const { usageDescription } = packageRecommendationValidation.parse(data);

  // 1. Ambil semua paket dari database
  const packages = await prismaClient.package.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      downloadSpeed: true,
      uploadSpeed: true,
      isPopular: true,
      description: true,
      metadata: true,
    },
  });

  if (packages.length === 0) {
    throw { status: 404, message: 'No packages available to recommend.' };
  }

  // 2. Buat prompt yang detail untuk Gemini
  const prompt = `
    Anda adalah asisten ahli multibahasa untuk provider internet bernama NEMAFI.
    Tugas Anda adalah merekomendasikan paket internet terbaik untuk pelanggan.

    PENTING: Anda harus mendeteksi bahasa yang digunakan pelanggan dalam deskripsi kebutuhannya. Balas pesan rekomendasi ("recommendationMessage") dalam bahasa yang SAMA persis. Jika pelanggan menggunakan Bahasa Indonesia, balas dalam Bahasa Indonesia. Jika menggunakan Bahasa Inggris, balas dalam Bahasa Inggris.

    Berikut adalah daftar paket yang tersedia dalam format JSON:
    ${JSON.stringify(packages, null, 2)}

    Berikut adalah kebutuhan pelanggan:
    "${usageDescription}"

    Analisis kebutuhan pelanggan dan pilih SATU paket yang paling sesuai.

    Berikan jawaban Anda HANYA dalam format JSON yang valid, dengan struktur ini:
    {
      "packageId": <id_paket_yang_direkomendasikan>,
      "recommendationMessage": "<pesan_rekomendasi_dalam_bahasa_yang_sesuai>"
    }

    Contoh pesan (Bahasa Indonesia): "Untuk kebutuhan streaming 4K dan kerja dari rumah, paket 'Home Premium' sangat cocok karena menawarkan kecepatan download yang tinggi."
    Contoh pesan (Bahasa Inggris): "For your 4K streaming and work-from-home needs, the 'Home Premium' package is a great fit as it offers high download speeds."
    Jangan tambahkan teks lain di luar format JSON ini.
  `;

  // 3. Panggil API Gemini
  const geminiModel = await getGeminiModel();
  const result = await geminiModel.generateContent(prompt);
  const responseText = result.response.text();
  
  let aiResponse: { packageId: number; recommendationMessage: string; };
  try {
    // Gemini kadang menambahkan ```json di awal dan ``` di akhir, kita bersihkan dulu
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    aiResponse = JSON.parse(cleanedJson);
  } catch (error) {
    console.error("Failed to parse Gemini response:", responseText);
    throw { status: 500, message: "AI failed to provide a valid recommendation." };
  }

  // 4. Validasi hasil dari AI dan kembalikan data lengkap
  const recommendedPackage = await prismaClient.package.findUnique({
    where: { id: aiResponse.packageId },
  });

  if (!recommendedPackage) {
    throw { status: 404, message: "AI recommended a package that doesn't exist." };
  }
  
  return {
    recommendedPackage,
    recommendationMessage: aiResponse.recommendationMessage,
  };
}

export default { recommendPackage };
