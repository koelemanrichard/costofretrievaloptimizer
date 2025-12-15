// services/cloudinaryService.ts
import { BusinessInfo } from '../types';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1';

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

  return response.json();
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
