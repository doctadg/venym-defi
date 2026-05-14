import { useState, useEffect, useCallback, useRef } from 'react'
import { StandardizedAsset } from '@/types/asset'

export interface SwapUrlParams {
  mode?: 'swap' | 'buy' | 'sell'
  from?: string
  fromChain?: string
  to?: string
  toChain?: string
  amount?: string
  wallet?: string
  fiat?: string
  fiatAmount?: string
  paymentMethod?: string
  provider?: string
}

export interface UseUrlParamsOptions {
  debounceMs?: number
  updateOnChange?: boolean
  enableBrowserHistory?: boolean
}

export interface UrlParamsState {
  params: SwapUrlParams
  isInitialized: boolean
  hasValidParams: boolean
  errors: string[]
}

export function useUrlParams(options: UseUrlParamsOptions = {}) {
  const { 
    debounceMs = 500, 
    updateOnChange = true, 
    enableBrowserHistory = true 
  } = options
  
  const [state, setState] = useState<UrlParamsState>({
    params: {},
    isInitialized: false,
    hasValidParams: false,
    errors: []
  })
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<string>('')
  const isUpdatingRef = useRef(false)
  const mountedRef = useRef(true)

  // Validation functions
  const validateParams = useCallback((params: SwapUrlParams): string[] => {
    const errors: string[] = []
    
    // Validate amount if present
    if (params.amount) {
      const amount = parseFloat(params.amount)
      if (isNaN(amount) || amount <= 0) {
        errors.push('Invalid amount: must be a positive number')
      }
    }
    
    // Validate wallet address format if present
    if (params.wallet) {
      const address = params.wallet.trim()
      const ethRegex = /^0x[a-fA-F0-9]{40}$/
      const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
      const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/
      const suiRegex = /^0x[a-fA-F0-9]{64}$/
      
      if (!ethRegex.test(address) && !solanaRegex.test(address) && 
          !btcRegex.test(address) && !suiRegex.test(address)) {
        errors.push('Invalid wallet address format')
      }
    }
    
    return errors
  }, [])

  // Parse URL parameters with validation
  const parseUrlParams = useCallback((): { params: SwapUrlParams; errors: string[] } => {
    if (typeof window === 'undefined') {
      return { params: {}, errors: [] }
    }
    
    try {
      const urlParams = new URLSearchParams(window.location.search)
      
      // Check for hash-based mode (#buy, #sell)
      const hash = window.location.hash.replace('#', '')
      let mode: 'swap' | 'buy' | 'sell' | undefined
      if (hash === 'buy') mode = 'buy'
      else if (hash === 'sell') mode = 'sell'
      else mode = urlParams.get('mode') as 'swap' | 'buy' | 'sell' || undefined
      
      const params: SwapUrlParams = {
        mode,
        from: urlParams.get('from') || undefined,
        fromChain: urlParams.get('fromChain') || undefined,
        to: urlParams.get('to') || undefined,
        toChain: urlParams.get('toChain') || undefined,
        amount: urlParams.get('amount') || undefined,
        wallet: urlParams.get('wallet') || undefined,
        fiat: urlParams.get('fiat') || undefined,
        fiatAmount: urlParams.get('fiatAmount') || undefined,
        paymentMethod: urlParams.get('paymentMethod') || undefined,
        provider: urlParams.get('provider') || undefined,
      }
      
      // Remove empty string values
      Object.keys(params).forEach(key => {
        if (params[key as keyof SwapUrlParams] === '') {
          delete params[key as keyof SwapUrlParams]
        }
      })
      
      const errors = validateParams(params)
      return { params, errors }
    } catch (error) {
      console.error('Error parsing URL parameters:', error)
      return { params: {}, errors: ['Failed to parse URL parameters'] }
    }
  }, [validateParams])

  // Update URL without triggering navigation
  const updateUrl = useCallback((newParams: SwapUrlParams, options: { replace?: boolean } = {}) => {
    if (typeof window === 'undefined' || !mountedRef.current) return
    
    try {
      isUpdatingRef.current = true
      
      const url = new URL(window.location.href)
      const searchParams = url.searchParams
      
      // Clear existing swap-related params
      const swapParamKeys = ['mode', 'from', 'fromChain', 'to', 'toChain', 'amount', 'wallet', 'fiat', 'fiatAmount', 'paymentMethod', 'provider']
      swapParamKeys.forEach(key => searchParams.delete(key))
      
      // Set new params if they exist and are valid
      Object.entries(newParams).forEach(([key, value]) => {
        if (value && value.trim()) {
          searchParams.set(key, value.trim())
        }
      })
      
      const newUrl = url.toString()
      
      // Only update if URL actually changed
      if (newUrl !== window.location.href && newUrl !== lastUpdateRef.current) {
        if (enableBrowserHistory && !options.replace) {
          window.history.pushState({ swapParams: newParams }, '', newUrl)
        } else {
          window.history.replaceState({ swapParams: newParams }, '', newUrl)
        }
        lastUpdateRef.current = newUrl
      }
    } catch (error) {
      console.error('Error updating URL:', error)
    } finally {
      isUpdatingRef.current = false
    }
  }, [enableBrowserHistory])

  // Debounced URL update
  const debouncedUpdateUrl = useCallback((newParams: SwapUrlParams) => {
    if (!updateOnChange || !mountedRef.current) return
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        updateUrl(newParams)
      }
    }, debounceMs)
  }, [updateUrl, debounceMs, updateOnChange])

  // Handle browser navigation (back/forward)
  const handlePopState = useCallback((event: PopStateEvent) => {
    if (isUpdatingRef.current || !mountedRef.current) return
    
    const { params, errors } = parseUrlParams()
    setState(prev => ({
      ...prev,
      params,
      errors,
      hasValidParams: errors.length === 0 && Object.keys(params).length > 0
    }))
  }, [parseUrlParams])

  // Initialize from URL on mount
  useEffect(() => {
    if (!mountedRef.current) return
    
    const { params, errors } = parseUrlParams()
    setState({
      params,
      isInitialized: true,
      hasValidParams: errors.length === 0 && Object.keys(params).length > 0,
      errors
    })
    
    // Add popstate listener for browser navigation
    if (enableBrowserHistory) {
      window.addEventListener('popstate', handlePopState)
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [parseUrlParams, handlePopState, enableBrowserHistory])

  // Update params and URL
  const updateParams = useCallback((newParams: Partial<SwapUrlParams>, options: { immediate?: boolean; replace?: boolean } = {}) => {
    if (!mountedRef.current) return
    
    setState(prev => {
      const updated = { ...prev.params, ...newParams }
      const errors = validateParams(updated)
      
      // Only update URL if we're initialized and not during initial load
      if (prev.isInitialized) {
        if (options.immediate) {
          updateUrl(updated, { replace: options.replace })
        } else {
          debouncedUpdateUrl(updated)
        }
      }
      
      return {
        ...prev,
        params: updated,
        errors,
        hasValidParams: errors.length === 0 && Object.keys(updated).length > 0
      }
    })
  }, [validateParams, updateUrl, debouncedUpdateUrl])

  // Force immediate URL update
  const updateUrlImmediate = useCallback((newParams: SwapUrlParams, options: { replace?: boolean } = {}) => {
    if (!mountedRef.current) return
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    updateUrl(newParams, options)
    
    setState(prev => ({
      ...prev,
      params: newParams,
      errors: validateParams(newParams),
      hasValidParams: validateParams(newParams).length === 0 && Object.keys(newParams).length > 0
    }))
  }, [updateUrl, validateParams])

  // Clear all params
  const clearParams = useCallback((options: { replace?: boolean } = {}) => {
    if (!mountedRef.current) return
    
    updateUrl({}, options)
    setState(prev => ({
      ...prev,
      params: {},
      errors: [],
      hasValidParams: false
    }))
  }, [updateUrl])

  // Reset to specific params (useful for error recovery)
  const resetParams = useCallback((params: SwapUrlParams, options: { replace?: boolean } = {}) => {
    if (!mountedRef.current) return
    
    const errors = validateParams(params)
    updateUrl(params, options)
    setState(prev => ({
      ...prev,
      params,
      errors,
      hasValidParams: errors.length === 0 && Object.keys(params).length > 0
    }))
  }, [updateUrl, validateParams])

  // Cleanup
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    ...state,
    updateParams,
    updateUrlImmediate,
    clearParams,
    resetParams,
    parseUrlParams,
    validateParams
  }
}

// Helper functions for token handling with improved error handling
export function findTokenByParams(
  tokens: StandardizedAsset[], 
  symbol?: string, 
  chainIdentifier?: string
): StandardizedAsset | undefined {
  if (!symbol || !tokens.length) return undefined
  
  try {
    const normalizedSymbol = symbol.toLowerCase().trim()
    
    // If no chain specified, find first token with matching symbol
    if (!chainIdentifier) {
      return tokens.find(token => 
        token.symbol.toLowerCase() === normalizedSymbol
      )
    }
    
    const normalizedChain = chainIdentifier.toLowerCase().trim()
    
    // Try to find by chain name first (more user-friendly)
    let matchingToken = tokens.find(token => 
      token.symbol.toLowerCase() === normalizedSymbol &&
      token.chainName?.toLowerCase().replace(/\s+/g, '') === normalizedChain
    )
    
    // If not found by chain name, try by chain ID
    if (!matchingToken) {
      matchingToken = tokens.find(token => 
        token.symbol.toLowerCase() === normalizedSymbol &&
        String(token.chainId).toLowerCase() === normalizedChain
      )
    }
    
    return matchingToken
  } catch (error) {
    console.error('Error finding token by params:', error)
    return undefined
  }
}

export function getChainIdentifierFromToken(token: StandardizedAsset): string {
  try {
    // Prefer chain name for readability, fallback to chainId
    return token.chainName?.toLowerCase().replace(/\s+/g, '') || String(token.chainId)
  } catch (error) {
    console.error('Error getting chain identifier:', error)
    return String(token.chainId || 'unknown')
  }
}

// Utility function to create shareable URLs
export function createShareableUrl(params: SwapUrlParams, baseUrl?: string): string {
  try {
    const url = new URL(baseUrl || window.location.origin + window.location.pathname)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim()) {
        url.searchParams.set(key, value.trim())
      }
    })
    
    return url.toString()
  } catch (error) {
    console.error('Error creating shareable URL:', error)
    return window.location.href
  }
}

// Utility function to validate a complete URL with swap parameters
export function validateSwapUrl(url: string): { isValid: boolean; errors: string[]; params: SwapUrlParams } {
  try {
    const urlObj = new URL(url)
    const searchParams = urlObj.searchParams
    
    const params: SwapUrlParams = {
      from: searchParams.get('from') || undefined,
      fromChain: searchParams.get('fromChain') || undefined,
      to: searchParams.get('to') || undefined,
      toChain: searchParams.get('toChain') || undefined,
      amount: searchParams.get('amount') || undefined,
      wallet: searchParams.get('wallet') || undefined,
    }
    
    // Remove empty values
    Object.keys(params).forEach(key => {
      if (params[key as keyof SwapUrlParams] === '') {
        delete params[key as keyof SwapUrlParams]
      }
    })
    
    const errors: string[] = []
    
    // Validate amount
    if (params.amount) {
      const amount = parseFloat(params.amount)
      if (isNaN(amount) || amount <= 0) {
        errors.push('Invalid amount parameter')
      }
    }
    
    // Validate wallet address
    if (params.wallet) {
      const address = params.wallet.trim()
      const ethRegex = /^0x[a-fA-F0-9]{40}$/
      const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
      const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/
      const suiRegex = /^0x[a-fA-F0-9]{64}$/
      
      if (!ethRegex.test(address) && !solanaRegex.test(address) && 
          !btcRegex.test(address) && !suiRegex.test(address)) {
        errors.push('Invalid wallet address format')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      params
    }
  } catch (error) {
    return {
      isValid: false,
      errors: ['Invalid URL format'],
      params: {}
    }
  }
}
