interface CacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  objectUrl: string;
}

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxSize = 50; // Max 50 cached images

  async get(url: string): Promise<string | null> {
    const entry = this.cache.get(url);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(url);
      return null;
    }
    
    return entry.objectUrl;
  }

  async set(url: string, blob: Blob): Promise<string> {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.delete(oldestKey);
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    const entry: CacheEntry = {
      url,
      blob,
      timestamp: Date.now(),
      objectUrl
    };
    
    this.cache.set(url, entry);
    return objectUrl;
  }

  delete(url: string): void {
    const entry = this.cache.get(url);
    if (entry) {
      URL.revokeObjectURL(entry.objectUrl);
      this.cache.delete(url);
    }
  }

  clear(): void {
    this.cache.forEach(entry => URL.revokeObjectURL(entry.objectUrl));
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const imageCache = new ImageCache();

export const getCachedImage = async (url: string): Promise<string> => {
  // Check cache first
  const cachedUrl = await imageCache.get(url);
  if (cachedUrl) return cachedUrl;

  try {
    // Fetch and cache the image
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    return await imageCache.set(url, blob);
  } catch (error) {
    console.warn(`Failed to cache image ${url}:`, error);
    return url; // Fallback to original URL
  }
};

export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
};

export const preloadImages = async (srcs: string[]): Promise<void> => {
  const promises = srcs.map(preloadImage);
  await Promise.allSettled(promises);
};

export const clearImageCache = (): void => {
  imageCache.clear();
};

export const getImageCacheSize = (): number => {
  return imageCache.size();
};

export const createImageFallback = (
  size: number, 
  text: string, 
  bgGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
): string => {
  return `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bgGradient};
      color: white;
      font-weight: 700;
      font-size: ${size * 0.35}px;
    ">
      ${text}
    </div>
  `;
};