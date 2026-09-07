import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from './env.js';
import streamifier from 'streamifier';

// Configure Cloudinary SDK using backend environment variables
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
};

export interface UploadOptions {
  folder: string;
  publicId?: string;
  resourceType?: 'image' | 'raw' | 'auto' | 'video';
  tags?: string[];
}

/**
 * Uploads a file buffer directly to Cloudinary using an upload stream.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadApiResponse> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured in backend environment variables.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType || 'auto',
        tags: options.tags || ['kkv-gold-finance'],
        overwrite: true
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Empty response from Cloudinary upload.'));
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Deletes an asset from Cloudinary using its public_id.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image'
): Promise<{ result: string }> {
  if (!isCloudinaryConfigured() || !publicId) {
    return { result: 'not_configured_or_empty' };
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    return res;
  } catch (err) {
    console.warn(`[Cloudinary] Warning deleting asset ${publicId}:`, err);
    return { result: 'error' };
  }
}

/**
 * Determines Cloudinary subfolder based on document type
 */
export function getKycDocFolder(documentType: string): string {
  const norm = (documentType || 'other').toLowerCase().trim();
  if (norm.includes('aadhaar') || norm.includes('aadhar')) return 'kkv-gold-finance/kyc/aadhaar';
  if (norm.includes('pan')) return 'kkv-gold-finance/kyc/pan';
  if (norm.includes('voter')) return 'kkv-gold-finance/kyc/voter-id';
  if (norm.includes('driving') || norm.includes('license') || norm.includes('licence')) return 'kkv-gold-finance/kyc/driving-license';
  if (norm.includes('passport')) return 'kkv-gold-finance/kyc/passport';
  return 'kkv-gold-finance/kyc/other';
}

export { cloudinary };
export default cloudinary;
