import { cache } from '@/lib/cache';
import { UnifiedQuote } from './routingEngine';
import { QuoteValidator } from './quoteValidator';
import logger from '@/lib/logger';

export interface CacheMetadata {
  timestamp: number;
  version: string;
  provider: string;
  validated: boolean;
}

export class QuoteCacheManager {
  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly QUOTE_EXPIRATION_SECONDS = 15 * 60; // 15 minutes
  private static readonly METADATA_SUFFIX = ':metadata';
  
  /**
   * Creates a unique cache key for quote pairs with proper namespacing
   */
  static createQuoteCacheKey(
    fromChain: number,
    toChain: number,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    preference: string
  ): string {
    // Normalize inputs to prevent cache key collisions
    const normalizedFromChain = String(fromChain);
    const normalizedToChain = String(toChain);
    const normalizedFromToken = fromToken.toLowerCase();
    const normalizedToToken = toToken.toLowerCase();
    const normalizedAmount = fromAmount.trim();
    const normalizedPreference = preference.toLowerCase();
    
    return `quote_v2:${normalizedFromChain}:${normalizedToChain}:${normalizedFromToken}:${normalizedToToken}:${normalizedAmount}:${normalizedPreference}`;
  }
  
  /**
   * Creates a unique cache key for individual unified quotes
   */
  static createUnifiedQuoteCacheKey(quoteId: string): string {
    return `unified_quote_v2:${quoteId}`;
  }
  
  /**
   * Creates a cache key for legacy quote compatibility
   */
  static createLegacyQuoteCacheKey(quoteId: string): string {
    return `quote_legacy:${quoteId}`;
  }
  
  /**
   * Creates a cache key for raw provider quotes
   */
  static createRawQuoteCacheKey(provider: string, quoteId: string): string {
    return `raw_quote_v2:${provider}:${quoteId}`;
  }
  
  /**
   * Safely caches a unified quote with validation and combined data structure
   */
  static async cacheUnifiedQuote(quote: UnifiedQuote): Promise<boolean> {
    try {
      // Validate the quote before caching
      const validation = QuoteValidator.validateAndSanitize(quote);
      if (!validation.isValid || !validation.sanitizedQuote) {
        logger.warn({ 
          quoteId: quote.id, 
          provider: quote.provider, 
          errors: validation.errors 
        }, 'Skipping cache for invalid quote');
        return false;
      }
      
      const sanitizedQuote = validation.sanitizedQuote;
      const cacheKey = this.createUnifiedQuoteCacheKey(sanitizedQuote.id);
      
      // Create combined cache object with quote, metadata, and raw data
      const cacheData = {
        quote: sanitizedQuote,
        metadata: {
          timestamp: Date.now(),
          version: this.CACHE_VERSION,
          provider: sanitizedQuote.provider,
          validated: true
        },
        rawQuote: sanitizedQuote.rawQuote
      };
      
      // Single cache operation instead of multiple
      await cache.set(cacheKey, cacheData, this.QUOTE_EXPIRATION_SECONDS);
      
      logger.debug({ 
        quoteId: sanitizedQuote.id, 
        provider: sanitizedQuote.provider,
        cacheKey 
      }, 'Successfully cached unified quote');
      
      return true;
    } catch (error) {
      logger.error({ error, quoteId: quote.id }, 'Failed to cache unified quote');
      return false;
    }
  }
  
  /**
   * Safely retrieves and validates a cached unified quote
   */
  static async getUnifiedQuote(quoteId: string): Promise<UnifiedQuote | null> {
    try {
      const cacheKey = this.createUnifiedQuoteCacheKey(quoteId);
      const cachedData = await cache.get(cacheKey);
      
      if (!cachedData) {
        logger.debug({ quoteId, cacheKey }, 'Quote not found in cache');
        return null;
      }
      
      // Handle both old and new cache formats
      let quote: UnifiedQuote;
      let metadata: CacheMetadata | undefined;
      
      if (cachedData.quote && cachedData.metadata) {
        // New combined format
        quote = cachedData.quote;
        metadata = cachedData.metadata;
      } else {
        // Legacy format - treat as quote directly
        quote = cachedData as UnifiedQuote;
      }
      
      // Check metadata if available
      if (metadata) {
        const age = Date.now() - metadata.timestamp;
        if (age > this.QUOTE_EXPIRATION_SECONDS * 1000) {
          logger.debug({ quoteId, age }, 'Quote expired based on metadata');
          await this.deleteUnifiedQuote(quoteId);
          return null;
        }
        
        if (metadata.version !== this.CACHE_VERSION) {
          logger.debug({ quoteId, version: metadata.version }, 'Quote version mismatch, invalidating');
          await this.deleteUnifiedQuote(quoteId);
          return null;
        }
      }
      
      // Fast validation for performance - only check critical fields
      if (!quote || !quote.id || !quote.provider || !quote.outputAmount) {
        logger.warn({ quoteId }, 'Cached quote missing critical fields, removing from cache');
        await this.deleteUnifiedQuote(quoteId);
        return null;
      }
      
      logger.debug({ quoteId, provider: quote.provider }, 'Retrieved valid quote from cache');
      return quote;
      
    } catch (error) {
      logger.error({ error, quoteId }, 'Failed to retrieve unified quote from cache');
      return null;
    }
  }
  
  /**
   * Caches aggregated quotes for a specific request
   */
  static async cacheAggregatedQuotes(
    fromChain: number,
    toChain: number,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    preference: string,
    quotes: any[]
  ): Promise<boolean> {
    try {
      const cacheKey = this.createQuoteCacheKey(
        fromChain, toChain, fromToken, toToken, fromAmount, preference
      );
      
      // Add metadata to the cached response
      const cacheData = {
        quotes,
        metadata: {
          timestamp: Date.now(),
          version: this.CACHE_VERSION,
          requestParams: {
            fromChain,
            toChain,
            fromToken,
            toToken,
            fromAmount,
            preference
          }
        }
      };
      
      await cache.set(cacheKey, cacheData, this.QUOTE_EXPIRATION_SECONDS);
      
      logger.debug({ 
        cacheKey, 
        quotesCount: quotes.length 
      }, 'Cached aggregated quotes');
      
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to cache aggregated quotes');
      return false;
    }
  }
  
  /**
   * Retrieves cached aggregated quotes
   */
  static async getAggregatedQuotes(
    fromChain: number,
    toChain: number,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    preference: string
  ): Promise<any[] | null> {
    try {
      const cacheKey = this.createQuoteCacheKey(
        fromChain, toChain, fromToken, toToken, fromAmount, preference
      );
      
      const cachedData = await cache.get(cacheKey);
      if (!cachedData) {
        return null;
      }
      
      // Check if it's the new format with metadata
      if (cachedData.metadata && cachedData.quotes) {
        const age = Date.now() - cachedData.metadata.timestamp;
        if (age > this.QUOTE_EXPIRATION_SECONDS * 1000) {
          logger.debug({ cacheKey, age }, 'Aggregated quotes expired');
          return null;
        }
        
        return cachedData.quotes;
      }
      
      // Handle legacy format (array directly)
      if (Array.isArray(cachedData)) {
        return cachedData;
      }
      
      return null;
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve aggregated quotes from cache');
      return null;
    }
  }
  
  /**
   * Deletes a unified quote and all related cache entries
   */
  static async deleteUnifiedQuote(quoteId: string): Promise<void> {
    try {
      const cacheKey = this.createUnifiedQuoteCacheKey(quoteId);
      const metadataKey = cacheKey + this.METADATA_SUFFIX;
      
      await Promise.all([
        cache.del(cacheKey),
        cache.del(metadataKey),
        // Also clean up legacy entries
        cache.del(this.createLegacyQuoteCacheKey(quoteId)),
        cache.del(this.createRawQuoteCacheKey('sideshift', quoteId)),
        cache.del(this.createRawQuoteCacheKey('lifi', quoteId))
      ]);
      
      logger.debug({ quoteId }, 'Deleted quote from cache');
    } catch (error) {
      logger.error({ error, quoteId }, 'Failed to delete quote from cache');
    }
  }
  
  /**
   * Batch caches multiple unified quotes with optimized validation
   */
  static async batchCacheUnifiedQuotes(quotes: UnifiedQuote[]): Promise<{
    successful: number;
    failed: number;
  }> {
    if (quotes.length === 0) {
      return { successful: 0, failed: 0 };
    }
    
    // Pre-validate all quotes in parallel
    const validationPromises = quotes.map(quote => 
      QuoteValidator.validateAndSanitize(quote)
    );
    
    const validations = await Promise.all(validationPromises);
    const validQuotes = validations.filter(v => v.isValid && v.sanitizedQuote).map(v => v.sanitizedQuote!);
    
    if (validQuotes.length === 0) {
      logger.warn('No valid quotes to cache in batch');
      return { successful: 0, failed: quotes.length };
    }
    
    // Prepare all cache operations
    const cacheOperations = validQuotes.map(quote => {
      const cacheKey = this.createUnifiedQuoteCacheKey(quote.id);
      const cacheData = {
        quote,
        metadata: {
          timestamp: Date.now(),
          version: this.CACHE_VERSION,
          provider: quote.provider,
          validated: true
        },
        rawQuote: quote.rawQuote
      };
      
      return cache.set(cacheKey, cacheData, this.QUOTE_EXPIRATION_SECONDS);
    });
    
    // Execute all cache operations in parallel
    try {
      await Promise.all(cacheOperations);
      
      logger.debug({ 
        total: quotes.length, 
        successful: validQuotes.length, 
        failed: quotes.length - validQuotes.length 
      }, 'Batch cached unified quotes');
      
      return { 
        successful: validQuotes.length, 
        failed: quotes.length - validQuotes.length 
      };
    } catch (error) {
      logger.error({ error, quotesCount: quotes.length }, 'Failed to batch cache quotes');
      return { successful: 0, failed: quotes.length };
    }
  }
  
  /**
   * Cleans up expired cache entries (can be called periodically)
   */
  static async cleanupExpiredEntries(): Promise<void> {
    // This would require cache implementation to support pattern-based deletion
    // For now, we rely on TTL expiration
    logger.debug('Cache cleanup completed (TTL-based)');
  }
  
  /**
   * Gets cache statistics for monitoring
   */
  static async getCacheStats(): Promise<{
    version: string;
    expirationSeconds: number;
  }> {
    return {
      version: this.CACHE_VERSION,
      expirationSeconds: this.QUOTE_EXPIRATION_SECONDS
    };
  }
}
