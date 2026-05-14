import { NextRequest } from 'next/server';
import { getDefaultCurrency, type GeolocationData } from '@/lib/services/currencyDefaults';

/**
 * Extracts the client's IP address from a Next.js request
 * Handles various proxy configurations and load balancers
 */
export function getClientIP(request: NextRequest): string {
  // Check for forwarded IPs (most common with load balancers/proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one (original client)
    const firstIP = forwardedFor.split(',')[0].trim();
    if (firstIP && isValidIP(firstIP)) {
      return firstIP;
    }
  }

  // Check for real IP (some proxies use this)
  const realIP = request.headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Check for CloudFlare IP
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP;
  }

  // Check for other common proxy headers
  const clientIP = request.headers.get('x-client-ip');
  if (clientIP && isValidIP(clientIP)) {
    return clientIP;
  }

  // Check for cluster client IP
  const clusterClientIP = request.headers.get('x-cluster-client-ip');
  if (clusterClientIP && isValidIP(clusterClientIP)) {
    return clusterClientIP;
  }

  // Fallback to request IP (may be proxy IP)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestIP = (request as any).ip;
  if (requestIP && isValidIP(requestIP)) {
    return requestIP;
  }

  // Ultimate fallback - return your actual IP for development testing
  return '58.8.116.145';
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
function isValidIP(ip: string): boolean {
  // Remove any port numbers
  const cleanIP = ip.split(':')[0];
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  // Check for private/local IPs that we don't want to use
  if (cleanIP === '127.0.0.1' || 
      cleanIP === '::1' || 
      cleanIP === 'localhost' ||
      cleanIP.startsWith('192.168.') ||
      cleanIP.startsWith('10.') ||
      (cleanIP.startsWith('172.') && 
       parseInt(cleanIP.split('.')[1]) >= 16 && 
       parseInt(cleanIP.split('.')[1]) <= 31)) {
    return false;
  }

  return ipv4Regex.test(cleanIP) || ipv6Regex.test(cleanIP);
}

/**
 * Gets the country code from an IP address using a free geolocation service
 * This is a fallback for when Onramper needs country info
 */
export async function getCountryFromIP(ip: string): Promise<string> {
  try {
    // Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await response.json();
    
    if (data.countryCode) {
      return data.countryCode.toLowerCase();
    }
  } catch (error) {
    console.warn('Failed to get country from IP:', error);
  }
  
  // Default fallback to US
  return 'us';
}

/**
 * Gets comprehensive geolocation data including suggested currency from an IP address
 * Uses ip-api.com to fetch location data and maps to appropriate currency
 */
export async function getGeolocationFromIP(ip: string): Promise<GeolocationData> {
  // Check if we're in development with localhost IP
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    console.log('Development environment detected (localhost IP), using your actual IP for testing');
    ip = '58.8.116.145'; // Use your actual IP for development testing
  }

  try {
    // Use ip-api.com with extended fields for comprehensive geolocation data
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,timezone,query`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.countryCode) {
      const countryCode = data.countryCode.toUpperCase();
      const defaultCurrency = getDefaultCurrency(countryCode);
      
      console.log(`Geolocation success: ${data.country} (${countryCode}) -> ${defaultCurrency}`);
      
      return {
        country: data.country || 'Unknown',
        countryCode: countryCode,
        currency: defaultCurrency,
        region: data.regionName || undefined,
        city: data.city || undefined,
        timezone: data.timezone || undefined,
      };
    } else {
      console.warn('ip-api.com returned unsuccessful status or missing countryCode:', data);
      throw new Error(`Invalid response from geolocation service: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.warn('Failed to get geolocation from IP:', error);
    
    // Return fallback data for US
    return {
      country: 'United States',
      countryCode: 'US',
      currency: 'USD',
      region: undefined,
      city: undefined,
      timezone: undefined,
    };
  }
}