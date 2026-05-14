import { UnifiedQuote } from './routingEngine';
import logger from '@/lib/logger';

export interface QuoteValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedQuote?: UnifiedQuote;
}

export class QuoteValidator {
  /**
   * Validates and sanitizes a unified quote to ensure data integrity
   */
  static validateAndSanitize(quote: UnifiedQuote): QuoteValidationResult {
    const errors: string[] = [];
    
    // Create a deep copy to avoid mutating the original
    const sanitizedQuote: UnifiedQuote = JSON.parse(JSON.stringify(quote));
    
    try {
      // Validate required fields
      if (!sanitizedQuote.id || typeof sanitizedQuote.id !== 'string') {
        errors.push('Quote ID is missing or invalid');
      }
      
      if (!sanitizedQuote.provider || !['sideshift', 'lifi'].includes(sanitizedQuote.provider)) {
        errors.push('Provider is missing or invalid');
      }
      
      // Validate and sanitize output amount
      const outputAmountValidation = this.validateAndSanitizeAmount(sanitizedQuote.outputAmount, 'outputAmount');
      if (!outputAmountValidation.isValid) {
        errors.push(...outputAmountValidation.errors);
      } else {
        sanitizedQuote.outputAmount = outputAmountValidation.sanitizedValue!;
      }
      
      // Validate and sanitize fees
      if (!sanitizedQuote.fees || typeof sanitizedQuote.fees !== 'object') {
        sanitizedQuote.fees = { total: '0' };
      } else {
        const feesValidation = this.validateAndSanitizeAmount(sanitizedQuote.fees.total, 'fees.total');
        if (!feesValidation.isValid) {
          sanitizedQuote.fees.total = '0';
        } else {
          sanitizedQuote.fees.total = feesValidation.sanitizedValue!;
        }
      }
      
      // Validate estimated time
      if (typeof sanitizedQuote.estimatedTime !== 'number' || sanitizedQuote.estimatedTime < 0) {
        sanitizedQuote.estimatedTime = 300; // Default to 5 minutes
      }
      
      // Validate chain ID
      if (!sanitizedQuote.chainId) {
        errors.push('Chain ID is missing');
      } else {
        // Normalize chain ID to string
        sanitizedQuote.chainId = String(sanitizedQuote.chainId);
      }
      
      // Provider-specific validations
      if (sanitizedQuote.provider === 'sideshift') {
        this.validateSideShiftQuote(sanitizedQuote, errors);
      } else if (sanitizedQuote.provider === 'lifi') {
        this.validateLiFiQuote(sanitizedQuote, errors);
      }
      
      // Validate raw quote exists
      if (!sanitizedQuote.rawQuote) {
        errors.push('Raw quote data is missing');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        sanitizedQuote: errors.length === 0 ? sanitizedQuote : undefined
      };
      
    } catch (error) {
      logger.error({ error, quote }, 'Quote validation failed with exception');
      return {
        isValid: false,
        errors: ['Quote validation failed due to unexpected error']
      };
    }
  }
  
  /**
   * Validates and sanitizes amount strings
   */
  private static validateAndSanitizeAmount(amount: string, fieldName: string): {
    isValid: boolean;
    errors: string[];
    sanitizedValue?: string;
  } {
    const errors: string[] = [];
    
    if (!amount || typeof amount !== 'string') {
      errors.push(`${fieldName} is missing or not a string`);
      return { isValid: false, errors };
    }
    
    // Remove any whitespace
    const trimmedAmount = amount.trim();
    
    // Check if it's a valid number
    const numericValue = parseFloat(trimmedAmount);
    if (isNaN(numericValue)) {
      errors.push(`${fieldName} is not a valid number: ${amount}`);
      return { isValid: false, errors };
    }
    
    // Check if it's positive (reject zero amounts for output amounts)
    if (numericValue < 0) {
      errors.push(`${fieldName} cannot be negative: ${amount}`);
      return { isValid: false, errors };
    }
    
    // Reject zero output amounts as they indicate failed quotes
    if (fieldName === 'outputAmount' && numericValue === 0) {
      errors.push(`${fieldName} cannot be zero - indicates failed quote: ${amount}`);
      return { isValid: false, errors };
    }
    
    // Check for unreasonably small amounts (likely precision errors)
    if (fieldName === 'outputAmount' && numericValue > 0 && numericValue < 1e-18) {
      errors.push(`${fieldName} is unreasonably small: ${amount}`);
      return { isValid: false, errors };
    }
    
    // Check for scientific notation and convert to decimal
    let sanitizedValue = trimmedAmount;
    if (trimmedAmount.includes('e') || trimmedAmount.includes('E')) {
      sanitizedValue = numericValue.toFixed(18).replace(/\.?0+$/, '');
    }
    
    // Remove trailing zeros after decimal point
    if (sanitizedValue.includes('.')) {
      sanitizedValue = sanitizedValue.replace(/\.?0+$/, '');
    }
    
    return {
      isValid: true,
      errors: [],
      sanitizedValue
    };
  }
  
  /**
   * SideShift-specific validation
   */
  private static validateSideShiftQuote(quote: UnifiedQuote, errors: string[]): void {
    // Note: SideShift quotes during quote phase don't have deposit/settle addresses
    // These are only available after creating a shift during swap phase
    
    // Validate basic quote information
    if (!quote.depositCoin) {
      errors.push('SideShift quote missing deposit coin');
    }
    
    if (!quote.settleCoin) {
      errors.push('SideShift quote missing settle coin');
    }
    
    if (!quote.depositNetwork) {
      errors.push('SideShift quote missing deposit network');
    }
    
    if (!quote.settleNetwork) {
      errors.push('SideShift quote missing settle network');
    }
    
    if (!quote.depositAmount) {
      errors.push('SideShift quote missing deposit amount');
    }
    
    if (!quote.settleAmount) {
      errors.push('SideShift quote missing settle amount');
    }
    
    // Type is optional during quote phase, will be set during shift creation
    if (quote.type && !['fixed', 'variable'].includes(quote.type)) {
      errors.push('SideShift quote has invalid type');
    }
    
    // Validate expiration
    if (quote.expiresAt) {
      const expirationDate = new Date(quote.expiresAt);
      if (isNaN(expirationDate.getTime())) {
        errors.push('SideShift quote has invalid expiration date');
      } else if (expirationDate <= new Date()) {
        errors.push('SideShift quote has expired');
      }
    }
    
    // Validate raw quote contains the SideShift quote ID
    if (!quote.rawQuote || !quote.rawQuote.id) {
      errors.push('SideShift quote missing raw quote ID');
    }
  }
  
  /**
   * LiFi-specific validation
   */
  private static validateLiFiQuote(quote: UnifiedQuote, errors: string[]): void {
    // During quote phase, transaction request might not be fully populated
    // Only validate basic structure if present
    if (quote.transactionRequest) {
      const txReq = quote.transactionRequest;
      // Don't require "to" address during quote phase - it may be populated later
      // Only validate that if data is present, it's valid, or if value is present, it's valid
      if (txReq.data !== undefined && typeof txReq.data !== 'string') {
        errors.push('LiFi transaction request has invalid "data" field');
      }
      if (txReq.value !== undefined && typeof txReq.value !== 'string' && typeof txReq.value !== 'number') {
        errors.push('LiFi transaction request has invalid "value" field');
      }
    }
    
    // Validate raw quote structure for LiFi - it should be the processed LiFi quote object
    if (quote.rawQuote) {
      // Check for processed LiFi quote structure
      if (!quote.rawQuote.fromToken || !quote.rawQuote.toToken) {
        errors.push('LiFi raw quote missing token information');
      }
      if (!quote.rawQuote.fromAmount || !quote.rawQuote.toAmount) {
        errors.push('LiFi raw quote missing amount information');
      }
      if (!quote.rawQuote.fees) {
        errors.push('LiFi raw quote missing fees information');
      }
    }
  }
  
  /**
   * Validates a batch of quotes and filters out invalid ones
   */
  static validateAndSanitizeBatch(quotes: UnifiedQuote[]): {
    validQuotes: UnifiedQuote[];
    invalidQuotes: Array<{ quote: UnifiedQuote; errors: string[] }>;
  } {
    const validQuotes: UnifiedQuote[] = [];
    const invalidQuotes: Array<{ quote: UnifiedQuote; errors: string[] }> = [];
    
    for (const quote of quotes) {
      const validation = this.validateAndSanitize(quote);
      if (validation.isValid && validation.sanitizedQuote) {
        validQuotes.push(validation.sanitizedQuote);
      } else {
        invalidQuotes.push({ quote, errors: validation.errors });
        logger.warn({ 
          quoteId: quote.id, 
          provider: quote.provider, 
          errors: validation.errors 
        }, 'Quote validation failed');
      }
    }
    
    return { validQuotes, invalidQuotes };
  }
  
  /**
   * Validates quote compatibility for swapping
   */
  static validateQuoteForSwap(quote: UnifiedQuote): QuoteValidationResult {
    const baseValidation = this.validateAndSanitize(quote);
    if (!baseValidation.isValid) {
      return baseValidation;
    }
    
    const errors: string[] = [];
    const sanitizedQuote = baseValidation.sanitizedQuote!;
    
    // Additional swap-specific validations
    if (sanitizedQuote.provider === 'sideshift') {
      // Check if SideShift quote hasn't expired
      if (sanitizedQuote.expiresAt) {
        const expirationDate = new Date(sanitizedQuote.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expirationDate.getTime() - now.getTime();
        
        if (timeUntilExpiry < 60000) { // Less than 1 minute
          errors.push('SideShift quote expires too soon for safe execution');
        }
      }
      
      // For SideShift, we only need the raw quote ID to create a shift
      // Deposit and settle addresses are created during shift creation
      if (!sanitizedQuote.rawQuote || !sanitizedQuote.rawQuote.id) {
        errors.push('SideShift quote missing raw quote ID for shift creation');
      }
      
      // Validate basic quote information is still present
      if (!sanitizedQuote.depositCoin) {
        errors.push('SideShift quote missing deposit coin');
      }
      
      if (!sanitizedQuote.settleCoin) {
        errors.push('SideShift quote missing settle coin');
      }
      
      if (!sanitizedQuote.depositAmount) {
        errors.push('SideShift quote missing deposit amount');
      }
      
      if (!sanitizedQuote.settleAmount) {
        errors.push('SideShift quote missing settle amount');
      }
    } else if (sanitizedQuote.provider === 'lifi') {
      // For LiFi, we need a transaction request object but don't require specific fields
      // The transaction request will be sent to frontend for signing
      if (!sanitizedQuote.transactionRequest) {
        errors.push('LiFi quote missing transaction request for frontend execution');
      } else {
        // Basic validation of transaction request structure
        const txReq = sanitizedQuote.transactionRequest;
        
        // Check that essential transaction fields are present
        if (txReq.data === undefined && txReq.value === undefined) {
          errors.push('LiFi transaction request missing both data and value fields');
        }
        
        // Validate data field if present
        if (txReq.data !== undefined && typeof txReq.data !== 'string') {
          errors.push('LiFi transaction request has invalid data field type');
        }
        
        // Validate value field if present
        if (txReq.value !== undefined && typeof txReq.value !== 'string' && typeof txReq.value !== 'number') {
          errors.push('LiFi transaction request has invalid value field type');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedQuote: errors.length === 0 ? sanitizedQuote : undefined
    };
  }
}
