import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import appSettingService from '../services/appSettingService.js';

export async function getGeminiModel() {
  const settings = await appSettingService.getSettingValues(['GEMINI_API_KEY', 'GEMINI_MODEL']);
  const apiKey = settings.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  const model = settings.GEMINI_MODEL || env.GEMINI_MODEL || '';

  if (!apiKey || !model) {
    throw { status: 400, message: 'Konfigurasi Gemini belum lengkap.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model });
}
