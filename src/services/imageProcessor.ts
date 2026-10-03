import type { BoundingBox } from '../types/contact';

export interface CompressionResult {
  dataUri: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
}

/**
 * Normalizes bounding box coordinates to 0.0 - 1.0 range
 * Works whether coordinates are provided as 0-1000 or 0.0-1.0
 */
export function normalizeBoundingBox(rawBox: Partial<BoundingBox>): BoundingBox {
  let ymin = rawBox.ymin ?? 0;
  let xmin = rawBox.xmin ?? 0;
  let ymax = rawBox.ymax ?? 1;
  let xmax = rawBox.xmax ?? 1;

  // Check if coordinates were returned on a 0-1000 scale
  if (ymin > 1 || xmin > 1 || ymax > 1 || xmax > 1) {
    ymin = ymin / 1000;
    xmin = xmin / 1000;
    ymax = ymax / 1000;
    xmax = xmax / 1000;
  }

  // Clamp safely between 0 and 1
  ymin = Math.max(0, Math.min(1, ymin));
  xmin = Math.max(0, Math.min(1, xmin));
  ymax = Math.max(ymin + 0.02, Math.min(1, ymax));
  xmax = Math.max(xmin + 0.02, Math.min(1, xmax));

  return { ymin, xmin, ymax, xmax };
}

/**
 * Loads a File or Blob or data URL into an HTMLImageElement
 */
export function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl: string | null = null;
    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (e) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image: ' + e));
    };
  });
}

/**
 * Client-side pre-compression:
 * - Scales down images exceeding maxDimension (1920px default) preserving aspect ratio
 * - Re-encodes to JPEG targeting under targetBytes (600 KB default)
 * - Retains high optical fidelity for text legibility
 */
export async function precompressImage(
  file: File | Blob,
  maxDimension = 1920,
  targetBytes = 550 * 1024
): Promise<CompressionResult> {
  const originalSizeBytes = file.size;
  const img = await loadImage(file);

  let { width, height } = img;

  // Scale down if longest dimension exceeds maxDimension
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill canvas with white background in case of transparent PNG/WebP
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Iterative quality adjustment to hit target file size while retaining sharpness
  let quality = 0.85;
  let blob: Blob | null = null;
  let dataUri = '';

  for (let attempt = 0; attempt < 4; attempt++) {
    dataUri = canvas.toDataURL('image/jpeg', quality);
    // Rough size estimate from base64 string
    const estimatedBytes = Math.round((dataUri.length * 3) / 4);

    if (estimatedBytes <= targetBytes || quality <= 0.6) {
      break;
    }
    quality -= 0.1;
  }

  // Convert to Blob
  blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob from canvas'));
      },
      'image/jpeg',
      quality
    );
  });

  return {
    dataUri,
    blob,
    width,
    height,
    sizeBytes: blob.size,
    originalSizeBytes,
  };
}

/**
 * Crops a card sub-region from the full image using normalized bounding coordinates,
 * formats into a standard contact avatar (360x360 px), and compresses to ~20-35 KB JPEG.
 */
export async function cropCardAvatar(
  imageSource: File | Blob | string | HTMLImageElement,
  rawBox: Partial<BoundingBox>,
  targetDimension = 360,
  targetQuality = 0.82
): Promise<string> {
  const img = imageSource instanceof HTMLImageElement ? imageSource : await loadImage(imageSource);
  const box = normalizeBoundingBox(rawBox);

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  // Source pixel coordinates
  const sx = Math.max(0, Math.floor(box.xmin * imgW));
  const sy = Math.max(0, Math.floor(box.ymin * imgH));
  const sw = Math.min(imgW - sx, Math.ceil((box.xmax - box.xmin) * imgW));
  const sh = Math.min(imgH - sy, Math.ceil((box.ymax - box.ymin) * imgH));

  if (sw <= 10 || sh <= 10) {
    throw new Error('Bounding box is too small or invalid');
  }

  // Create canvas for the cropped sub-image
  const canvas = document.createElement('canvas');
  canvas.width = targetDimension;
  canvas.height = targetDimension;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Fill background with clean neutral color
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, targetDimension, targetDimension);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Calculate aspect ratio fit (contain with subtle clean margin, or cover centered)
  // For business cards (aspect ratio ~1.6 to 1.8), fitting cleanly inside the square avatar:
  const cardAspect = sw / sh;
  let dw: number;
  let dh: number;
  let dx: number;
  let dy: number;

  if (cardAspect >= 1) {
    dw = targetDimension;
    dh = Math.round(targetDimension / cardAspect);
    dx = 0;
    dy = Math.round((targetDimension - dh) / 2);
  } else {
    dh = targetDimension;
    dw = Math.round(targetDimension * cardAspect);
    dx = Math.round((targetDimension - dw) / 2);
    dy = 0;
  }

  // Draw card crop centered
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

  // Return base64 JPEG
  return canvas.toDataURL('image/jpeg', targetQuality);
}

/**
 * Format bytes to readable string (e.g. 340 KB, 1.4 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
