import { SwapUrlParams, validateSwapUrl } from '@/lib/hooks/useUrlParams'
import { StandardizedAsset } from '@/types/asset'

export interface UrlTestCase {
  name: string
  url: string
  expectedParams: SwapUrlParams
  shouldBeValid: boolean
  description: string
}

export interface UrlTestResult {
  testCase: UrlTestCase
  passed: boolean
  actualParams: SwapUrlParams
  errors: string[]
  issues: string[]
}

/**
 * URL Parameter Testing Utility
 * Provides comprehensive testing for URL parameter functionality
 */
export class UrlParamTester {
  private testCases: UrlTestCase[] = []
  private tokens: StandardizedAsset[] = []

  constructor(tokens: StandardizedAsset[]) {
    this.tokens = tokens
    this.initializeTestCases()
  }

  /**
   * Run all test cases
   */
  runAllTests(): UrlTestResult[] {
    return this.testCases.map(testCase => this.runSingleTest(testCase))
  }

  /**
   * Run tests for a specific category
   */
  runCategoryTests(category: string): UrlTestResult[] {
    const categoryTests = this.testCases.filter(test => test.name.includes(category))
    return categoryTests.map(testCase => this.runSingleTest(testCase))
  }

  /**
   * Test URL parameter parsing and validation
   */
  testUrlParsing(url: string): UrlTestResult {
    const testCase: UrlTestCase = {
      name: 'Custom URL Test',
      url,
      expectedParams: {},
      shouldBeValid: true,
      description: 'Testing custom URL'
    }
    
    return this.runSingleTest(testCase)
  }

  /**
   * Generate test URLs for manual testing
   */
  generateTestUrls(baseUrl: string = 'http://localhost:3000/swap-v2'): string[] {
    return this.testCases.map(testCase => {
      const url = new URL(baseUrl)
      Object.entries(testCase.expectedParams).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value)
        }
      })
      return url.toString()
    })
  }

  /**
   * Validate deeplink functionality
   */
  validateDeeplinks(): { valid: number; invalid: number; results: UrlTestResult[] } {
    const results = this.runAllTests()
    const valid = results.filter(r => r.passed).length
    const invalid = results.filter(r => !r.passed).length
    
    return { valid, invalid, results }
  }

  private runSingleTest(testCase: UrlTestCase): UrlTestResult {
    try {
      const validation = validateSwapUrl(testCase.url)
      const issues: string[] = []

      // Check if validation result matches expectation
      const validationPassed = validation.isValid === testCase.shouldBeValid

      // Compare actual params with expected params
      const paramsMatch = this.compareParams(validation.params, testCase.expectedParams)

      // Check for common issues
      if (validation.params.amount && parseFloat(validation.params.amount) <= 0) {
        issues.push('Amount is not positive')
      }

      if (validation.params.from && validation.params.fromChain) {
        const token = this.findToken(validation.params.from, validation.params.fromChain)
        if (!token) {
          issues.push(`Token ${validation.params.from} not found on chain ${validation.params.fromChain}`)
        }
      }

      if (validation.params.to && validation.params.toChain) {
        const token = this.findToken(validation.params.to, validation.params.toChain)
        if (!token) {
          issues.push(`Token ${validation.params.to} not found on chain ${validation.params.toChain}`)
        }
      }

      const passed = validationPassed && paramsMatch && issues.length === 0

      return {
        testCase,
        passed,
        actualParams: validation.params,
        errors: validation.errors,
        issues
      }
    } catch (error) {
      return {
        testCase,
        passed: false,
        actualParams: {},
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        issues: ['Test execution failed']
      }
    }
  }

  private compareParams(actual: SwapUrlParams, expected: SwapUrlParams): boolean {
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)])
    
    for (const key of keys) {
      const actualValue = actual[key as keyof SwapUrlParams]
      const expectedValue = expected[key as keyof SwapUrlParams]
      
      if (actualValue !== expectedValue) {
        return false
      }
    }
    
    return true
  }

  private findToken(symbol: string, chainIdentifier: string): StandardizedAsset | undefined {
    const normalizedSymbol = symbol.toLowerCase()
    const normalizedChain = chainIdentifier.toLowerCase()
    
    return this.tokens.find(token => 
      token.symbol.toLowerCase() === normalizedSymbol &&
      (token.chainName?.toLowerCase().replace(/\s+/g, '') === normalizedChain ||
       String(token.chainId).toLowerCase() === normalizedChain)
    )
  }

  private initializeTestCases(): void {
    this.testCases = [
      // Basic valid cases
      {
        name: 'Basic ETH to USDC',
        url: 'http://localhost:3000/swap-v2?from=ETH&fromChain=ethereum&to=USDC&toChain=ethereum&amount=1.0',
        expectedParams: {
          from: 'ETH',
          fromChain: 'ethereum',
          to: 'USDC',
          toChain: 'ethereum',
          amount: '1.0'
        },
        shouldBeValid: true,
        description: 'Basic same-chain swap'
      },
      
      {
        name: 'Cross-chain BTC to ETH',
        url: 'http://localhost:3000/swap-v2?from=BTC&fromChain=bitcoin&to=ETH&toChain=ethereum&amount=0.1',
        expectedParams: {
          from: 'BTC',
          fromChain: 'bitcoin',
          to: 'ETH',
          toChain: 'ethereum',
          amount: '0.1'
        },
        shouldBeValid: true,
        description: 'Cross-chain swap'
      },

      {
        name: 'With wallet address',
        url: 'http://localhost:3000/swap-v2?from=SOL&fromChain=solana&to=USDC&toChain=solana&amount=10&wallet=9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        expectedParams: {
          from: 'SOL',
          fromChain: 'solana',
          to: 'USDC',
          toChain: 'solana',
          amount: '10',
          wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        },
        shouldBeValid: true,
        description: 'Swap with Solana wallet address'
      },

      // Edge cases
      {
        name: 'Empty URL',
        url: 'http://localhost:3000/swap-v2',
        expectedParams: {},
        shouldBeValid: true,
        description: 'URL with no parameters'
      },

      {
        name: 'Only from token',
        url: 'http://localhost:3000/swap-v2?from=ETH&fromChain=ethereum',
        expectedParams: {
          from: 'ETH',
          fromChain: 'ethereum'
        },
        shouldBeValid: true,
        description: 'Partial parameters - only from token'
      },

      {
        name: 'Only amount',
        url: 'http://localhost:3000/swap-v2?amount=5.5',
        expectedParams: {
          amount: '5.5'
        },
        shouldBeValid: true,
        description: 'Only amount parameter'
      },

      // Invalid cases
      {
        name: 'Invalid amount - negative',
        url: 'http://localhost:3000/swap-v2?from=ETH&to=USDC&amount=-1',
        expectedParams: {
          from: 'ETH',
          to: 'USDC',
          amount: '-1'
        },
        shouldBeValid: false,
        description: 'Negative amount should be invalid'
      },

      {
        name: 'Invalid amount - zero',
        url: 'http://localhost:3000/swap-v2?from=ETH&to=USDC&amount=0',
        expectedParams: {
          from: 'ETH',
          to: 'USDC',
          amount: '0'
        },
        shouldBeValid: false,
        description: 'Zero amount should be invalid'
      },

      {
        name: 'Invalid amount - not a number',
        url: 'http://localhost:3000/swap-v2?from=ETH&to=USDC&amount=abc',
        expectedParams: {
          from: 'ETH',
          to: 'USDC',
          amount: 'abc'
        },
        shouldBeValid: false,
        description: 'Non-numeric amount should be invalid'
      },

      {
        name: 'Invalid wallet address',
        url: 'http://localhost:3000/swap-v2?wallet=invalid-address',
        expectedParams: {
          wallet: 'invalid-address'
        },
        shouldBeValid: false,
        description: 'Invalid wallet address format'
      },

      // Special characters and encoding
      {
        name: 'URL encoded parameters',
        url: 'http://localhost:3000/swap-v2?from=ETH&to=USDC&amount=1%2E5',
        expectedParams: {
          from: 'ETH',
          to: 'USDC',
          amount: '1.5'
        },
        shouldBeValid: true,
        description: 'URL encoded decimal point'
      },

      {
        name: 'Case sensitivity test',
        url: 'http://localhost:3000/swap-v2?from=eth&fromChain=ETHEREUM&to=usdc&toChain=ethereum',
        expectedParams: {
          from: 'eth',
          fromChain: 'ETHEREUM',
          to: 'usdc',
          toChain: 'ethereum'
        },
        shouldBeValid: true,
        description: 'Mixed case parameters'
      },

      // Real-world scenarios
      {
        name: 'DeFi arbitrage scenario',
        url: 'http://localhost:3000/swap-v2?from=USDC&fromChain=ethereum&to=USDC&toChain=arbitrum&amount=1000&wallet=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        expectedParams: {
          from: 'USDC',
          fromChain: 'ethereum',
          to: 'USDC',
          toChain: 'arbitrum',
          amount: '1000',
          wallet: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        },
        shouldBeValid: true,
        description: 'Cross-chain USDC transfer'
      },

      {
        name: 'Large amount test',
        url: 'http://localhost:3000/swap-v2?from=ETH&to=USDC&amount=999999.123456789',
        expectedParams: {
          from: 'ETH',
          to: 'USDC',
          amount: '999999.123456789'
        },
        shouldBeValid: true,
        description: 'Large amount with many decimal places'
      },

      // Browser compatibility tests
      {
        name: 'Multiple same parameters',
        url: 'http://localhost:3000/swap-v2?from=ETH&from=BTC&to=USDC',
        expectedParams: {
          from: 'BTC', // Should take the last value
          to: 'USDC'
        },
        shouldBeValid: true,
        description: 'Duplicate parameter handling'
      },

      {
        name: 'Empty parameter values',
        url: 'http://localhost:3000/swap-v2?from=&to=USDC&amount=',
        expectedParams: {
          to: 'USDC'
        },
        shouldBeValid: true,
        description: 'Empty parameter values should be ignored'
      }
    ]
  }

  /**
   * Generate a comprehensive test report
   */
  generateTestReport(): string {
    const results = this.runAllTests()
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length
    
    let report = `URL Parameter Test Report\n`
    report += `========================\n\n`
    report += `Total Tests: ${results.length}\n`
    report += `Passed: ${passed}\n`
    report += `Failed: ${failed}\n`
    report += `Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n\n`
    
    if (failed > 0) {
      report += `Failed Tests:\n`
      report += `-------------\n`
      results.filter(r => !r.passed).forEach(result => {
        report += `\n${result.testCase.name}:\n`
        report += `  URL: ${result.testCase.url}\n`
        report += `  Description: ${result.testCase.description}\n`
        report += `  Errors: ${result.errors.join(', ')}\n`
        report += `  Issues: ${result.issues.join(', ')}\n`
      })
    }
    
    return report
  }
}

/**
 * Quick test function for development
 */
export function quickUrlTest(tokens: StandardizedAsset[]): void {
  const tester = new UrlParamTester(tokens)
  const results = tester.runAllTests()
  
  console.group('URL Parameter Test Results')
  console.log(`Passed: ${results.filter(r => r.passed).length}/${results.length}`)
  
  const failed = results.filter(r => !r.passed)
  if (failed.length > 0) {
    console.group('Failed Tests')
    failed.forEach(result => {
      console.log(`❌ ${result.testCase.name}:`, {
        errors: result.errors,
        issues: result.issues,
        url: result.testCase.url
      })
    })
    console.groupEnd()
  }
  
  console.groupEnd()
}

/**
 * Test URL parameter reliability in different scenarios
 */
export function testUrlReliability(tokens: StandardizedAsset[]): {
  browserCompatibility: boolean
  deepLinkReliability: boolean
  parameterValidation: boolean
  errorHandling: boolean
} {
  const tester = new UrlParamTester(tokens)
  
  // Test browser compatibility
  const browserTests = tester.runCategoryTests('Multiple same parameters')
  const browserCompatibility = browserTests.every(t => t.passed)
  
  // Test deep link reliability
  const deepLinkTests = tester.runCategoryTests('Cross-chain')
  const deepLinkReliability = deepLinkTests.every(t => t.passed)
  
  // Test parameter validation
  const validationTests = tester.runCategoryTests('Invalid')
  const parameterValidation = validationTests.every(t => !t.passed) // Should fail validation
  
  // Test error handling
  const errorTests = tester.runCategoryTests('Empty')
  const errorHandling = errorTests.every(t => t.passed)
  
  return {
    browserCompatibility,
    deepLinkReliability,
    parameterValidation,
    errorHandling
  }
}
