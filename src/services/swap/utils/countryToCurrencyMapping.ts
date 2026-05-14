/**
 * Maps country codes to their supported P2P currencies
 * If a country's native currency is not in the supported list, defaults to USD
 */

// Map of country codes to their native currency codes
export const COUNTRY_TO_NATIVE_CURRENCY: Record<string, string> = {
  // North America
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  
  // Europe
  GB: 'GBP',
  UK: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  IE: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  CH: 'CHF',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  HR: 'HRK',
  DK: 'DKK',
  SE: 'SEK',
  NO: 'NOK',
  IS: 'ISK',
  
  // Asia
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  SG: 'SGD',
  MY: 'MYR',
  ID: 'IDR',
  TH: 'THB',
  VN: 'VND',
  PH: 'PHP',
  KR: 'KRW',
  TW: 'TWD',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  MM: 'MMK',
  KH: 'KHR',
  LA: 'LAK',
  MN: 'MNT',
  NP: 'NPR',
  AF: 'AFN',
  
  // Middle East
  IL: 'ILS',
  SA: 'SAR',
  AE: 'AED',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  YE: 'YER',
  JO: 'JOD',
  LB: 'LBP',
  SY: 'SYP',
  IQ: 'IQD',
  IR: 'IRR',
  TR: 'TRY',
  
  // Africa
  ZA: 'ZAR',
  NG: 'NGN',
  EG: 'EGP',
  KE: 'KES',
  UG: 'UGX',
  GH: 'GHS',
  TZ: 'TZS',
  ET: 'ETB',
  MG: 'MGA',
  MZ: 'MZN',
  ZM: 'ZMW',
  ZW: 'ZWL',
  BW: 'BWP',
  NA: 'NAD',
  AO: 'AOA',
  CM: 'XAF',
  CI: 'XOF',
  SN: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
  NE: 'XOF',
  TD: 'XAF',
  CF: 'XAF',
  CG: 'XAF',
  GA: 'XAF',
  GQ: 'XAF',
  RW: 'RWF',
  BI: 'BIF',
  DJ: 'DJF',
  SO: 'SOS',
  SD: 'SDG',
  SS: 'SSP',
  ER: 'ERN',
  LY: 'LYD',
  TN: 'TND',
  DZ: 'DZD',
  MA: 'MAD',
  MR: 'MRU',
  CV: 'CVE',
  GM: 'GMD',
  GW: 'XOF',
  SL: 'SLL',
  LR: 'LRD',
  ST: 'STN',
  SC: 'SCR',
  KM: 'KMF',
  MW: 'MWK',
  LS: 'LSL',
  SZ: 'SZL',
  
  // Oceania
  AU: 'AUD',
  NZ: 'NZD',
  FJ: 'FJD',
  PG: 'PGK',
  SB: 'SBD',
  VU: 'VUV',
  NC: 'XPF',
  PF: 'XPF',
  WS: 'WST',
  TO: 'TOP',
  KI: 'AUD',
  NR: 'AUD',
  TV: 'AUD',
  PW: 'USD',
  MH: 'USD',
  FM: 'USD',
  
  // South America
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  VE: 'VES',
  EC: 'USD',
  BO: 'BOB',
  PY: 'PYG',
  UY: 'UYU',
  GY: 'GYD',
  SR: 'SRD',
  GF: 'EUR',
  FK: 'FKP',
  
  // Central America & Caribbean
  GT: 'GTQ',
  SV: 'USD',
  HN: 'HNL',
  NI: 'NIO',
  CR: 'CRC',
  PA: 'PAB',
  BZ: 'BZD',
  JM: 'JMD',
  HT: 'HTG',
  DO: 'DOP',
  CU: 'CUP',
  BS: 'BSD',
  BB: 'BBD',
  TT: 'TTD',
  AG: 'XCD',
  DM: 'XCD',
  GD: 'XCD',
  KN: 'XCD',
  LC: 'XCD',
  VC: 'XCD',
  AI: 'XCD',
  AW: 'AWG',
  CW: 'ANG',
  SX: 'ANG',
  BQ: 'USD',
  KY: 'KYD',
  VG: 'USD',
  VI: 'USD',
  PR: 'USD',
  TC: 'USD',
  BM: 'BMD',
  MS: 'XCD',
  MQ: 'EUR',
  GP: 'EUR',
  MF: 'EUR',
  BL: 'EUR',
};

// List of supported P2P currencies
export const SUPPORTED_P2P_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'HKD', 'JPY', 
  'CNY', 'MXN', 'ARS', 'CHF', 'NZD', 'THB', 'PLN', 'ZAR',
  'MYR', 'IDR', 'TRY', 'VND', 'ILS', 'SAR', 'AED', 'KES', 'UGX'
];

/**
 * Gets the P2P currency for a country code
 * Returns the native currency if supported, otherwise USD
 */
export function getP2PCurrencyForCountry(countryCode: string): string {
  const upperCountryCode = countryCode.toUpperCase();
  const nativeCurrency = COUNTRY_TO_NATIVE_CURRENCY[upperCountryCode];
  
  if (!nativeCurrency) {
    // Unknown country, default to USD
    return 'USD';
  }
  
  // Check if the native currency is supported for P2P
  if (SUPPORTED_P2P_CURRENCIES.includes(nativeCurrency)) {
    return nativeCurrency;
  }
  
  // Native currency not supported, default to USD
  return 'USD';
}

/**
 * Checks if a currency is supported for P2P transactions
 */
export function isCurrencySupportedForP2P(currencyCode: string): boolean {
  return SUPPORTED_P2P_CURRENCIES.includes(currencyCode.toUpperCase());
}