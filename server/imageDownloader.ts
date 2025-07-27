import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

export interface ImageDownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

export async function downloadImageFromUrl(imageUrl: string): Promise<ImageDownloadResult> {
  try {
    console.log('Downloading image from URL:', imageUrl);
    
    // Validate URL
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'Invalid URL protocol' };
    }

    // Get file extension from URL or default to jpg
    const urlPath = url.pathname;
    const extension = path.extname(urlPath).toLowerCase() || '.jpg';
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (!allowedExtensions.includes(extension)) {
      return { success: false, error: 'Unsupported image format' };
    }

    // Generate unique filename
    const filename = `${nanoid()}_${Date.now()}${extension}`;
    const uploadDir = path.join(process.cwd(), 'uploads');
    const localPath = path.join(uploadDir, filename);

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Download image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return { success: false, error: 'Response is not an image' };
      }

      // Get image buffer
      const buffer = await response.arrayBuffer();
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (buffer.byteLength > maxSize) {
        return { success: false, error: 'Image file too large (max 10MB)' };
      }

      // Save to file
      fs.writeFileSync(localPath, Buffer.from(buffer));
      
      console.log('Image downloaded successfully:', filename);
      return { 
        success: true, 
        localPath: `/uploads/${filename}` // Return web-accessible path
      };

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return { success: false, error: 'Download timeout' };
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('Error downloading image:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown download error' 
    };
  }
}

export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}