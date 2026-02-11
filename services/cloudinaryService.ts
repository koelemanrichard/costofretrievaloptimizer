// services/cloudinaryService.ts
import { BusinessInfo } from '../types';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { logAiUsage } from './telemetryService';
import { getSupabaseClient } from './supabaseClient';

const CLOUDINARY_UPLOAD_URL = API_ENDPOINTS.CLOUDINARY;

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: File | Blob,
  businessInfo: BusinessInfo,
  options: {
    folder?: string;
    publicId?: string;
    transformation?: string;
  } = {}
): Promise<CloudinaryUploadResult> {
  const cloudName = businessInfo.cloudinaryCloudName;
  const apiKey = businessInfo.cloudinaryApiKey;

  if (!cloudName || !apiKey) {
    throw new Error('Cloudinary credentials not configured');
  }

  const uploadPreset = businessInfo.cloudinaryUploadPreset || 'ml_default';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('upload_preset', uploadPreset);

  if (options.folder) {
    formData.append('folder', options.folder);
  }
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  const startTime = Date.now();
  const fileSize = file instanceof File ? file.size : file.size;

  let supabase;
  try {
    if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
      supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
    }
  } catch (e) { /* ignore */ }

  try {
    const response = await fetch(
      `${CLOUDINARY_UPLOAD_URL}/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const result = await response.json();

    logAiUsage({
      provider: 'cloudinary',
      model: 'image-upload',
      operation: 'upload',
      tokensIn: 0,
      tokensOut: 1,
      durationMs: Date.now() - startTime,
      success: true,
      requestSizeBytes: fileSize,
    }, supabase).catch(() => {});

    return result;
  } catch (error) {
    logAiUsage({
      provider: 'cloudinary',
      model: 'image-upload',
      operation: 'upload',
      tokensIn: 0,
      tokensOut: 1,
      durationMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown Error',
      requestSizeBytes: fileSize,
    }, supabase).catch(() => {});
    throw error;
  }
}

export function getOptimizedUrl(
  publicId: string,
  cloudName: string,
  options: {
    width?: number;
    height?: number;
    format?: 'avif' | 'webp' | 'auto';
    quality?: number;
  } = {}
): string {
  const transforms: string[] = [];

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.format) transforms.push(`f_${options.format}`);
  if (options.quality) transforms.push(`q_${options.quality}`);

  transforms.push('c_fill'); // Crop mode

  const transformString = transforms.join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
}
