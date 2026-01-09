import { Platform, Service, ServiceType } from '../types';

// DEFAULT SETTINGS
const DEFAULT_API_URL = 'https://smmdevil.com/api/v2';
// Default to our internal Vercel serverless proxy
const INTERNAL_PROXY_URL = '/api/proxy'; 

// STORAGE KEYS
const STORAGE_KEY_API = 'smm_api_key';
const STORAGE_KEY_PROXY = 'smm_proxy_url';
const STORAGE_KEY_USE_PROXY = 'smm_use_proxy';

export const getStoredSettings = () => {
  // Default useProxy to TRUE because we now have a reliable internal proxy
  const useProxy = localStorage.getItem(STORAGE_KEY_USE_PROXY) !== 'false'; 
  
  return {
    apiKey: localStorage.getItem(STORAGE_KEY_API) || '',
    // Default to internal proxy if not set
    proxyUrl: localStorage.getItem(STORAGE_KEY_PROXY) || INTERNAL_PROXY_URL,
    useProxy: useProxy,
    apiUrl: DEFAULT_API_URL
  };
};

export const saveSettings = (apiKey: string, proxyUrl: string, useProxy: boolean) => {
  localStorage.setItem(STORAGE_KEY_API, apiKey.trim());
  localStorage.setItem(STORAGE_KEY_PROXY, proxyUrl.trim());
  localStorage.setItem(STORAGE_KEY_USE_PROXY, String(useProxy));
};

// Helper to determine platform from service name/category
const getPlatform = (name: string, category: string): Platform => {
  const text = (name + ' ' + category).toLowerCase();
  
  if (text.includes('instagram') || text.includes(' ig ') || text.startsWith('ig') || text.includes('reels')) return Platform.INSTAGRAM;
  if (text.includes('facebook') || text.includes(' fb ') || text.startsWith('fb')) return Platform.FACEBOOK;
  if (text.includes('tiktok') || text.includes('tt')) return Platform.TIKTOK;
  if (text.includes('youtube') || text.includes('yt') || text.includes('shorts')) return Platform.YOUTUBE;
  
  return Platform.OTHER;
};

// Helper to determine service type
const getType = (name: string): ServiceType => {
  const text = name.toLowerCase();
  if (text.includes('follower') || text.includes('subscriber') || text.includes('sub')) return ServiceType.FOLLOWERS;
  if (text.includes('like')) return ServiceType.LIKES;
  if (text.includes('view') || text.includes('watch')) return ServiceType.VIEWS;
  if (text.includes('comment')) return ServiceType.COMMENTS;
  return ServiceType.OTHER;
};

export interface ProviderService {
  service: string; // ID
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
}

const buildTargetUrl = (apiUrl: string, proxyUrl: string, useProxy: boolean) => {
  if (useProxy) {
    // If using our internal proxy, we ignore the external API URL in the string 
    // because the internal proxy has it hardcoded or handles it.
    if (proxyUrl === INTERNAL_PROXY_URL || proxyUrl.includes('/api/proxy')) {
        return proxyUrl;
    }
    // Fallback for external proxies like corsproxy.io
    return proxyUrl + encodeURIComponent(apiUrl);
  }
  // Direct connection
  return apiUrl;
};

export const fetchProviderServices = async (): Promise<Service[]> => {
  const { apiKey, proxyUrl, useProxy, apiUrl } = getStoredSettings();

  if (!apiKey) {
    throw new Error("API Key is missing. Please go to Settings to configure your SMMDevil API Key.");
  }

  try {
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', 'services');

    const targetUrl = buildTargetUrl(apiUrl, proxyUrl, useProxy);
    console.log("Fetching from:", targetUrl);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    
    // Handle cases where proxy returns HTML error
    if (text.trim().startsWith('<') || text.trim().toLowerCase().includes('cloudflare')) {
        throw new Error("Proxy Error: The request was blocked. Try switching connection modes in Settings.");
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Raw response:", text);
      throw new Error("Invalid JSON response.");
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!Array.isArray(data)) {
        throw new Error("Invalid response format from provider");
    }

    // Transform Provider Data
    // MARGIN: 30% (Selling Price = Provider Cost * 1.3)
    return data.map((item: ProviderService) => {
      const originalRate = parseFloat(item.rate);
      const sellingRate = originalRate * 1.3; // 30% Margin

      return {
        id: parseInt(item.service),
        platform: getPlatform(item.name, item.category),
        type: getType(item.name),
        name: item.name,
        category: item.category,
        rate: parseFloat(sellingRate.toFixed(2)),
        originalRate: originalRate,
        min: parseInt(item.min),
        max: parseInt(item.max),
        description: item.category
      };
    });
  } catch (error) {
    console.error("Failed to fetch from SMMDevil:", error);
    throw error;
  }
};

export const placeProviderOrder = async (serviceId: number, link: string, quantity: number) => {
  const { apiKey, proxyUrl, useProxy, apiUrl } = getStoredSettings();

  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  try {
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', 'add');
    params.append('service', serviceId.toString());
    params.append('link', link);
    params.append('quantity', quantity.toString());

    const targetUrl = buildTargetUrl(apiUrl, proxyUrl, useProxy);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const text = await response.text();
    
    if (text.trim().startsWith('<') || text.toLowerCase().includes('cloudflare')) {
        throw new Error("Proxy Blocked: Received HTML instead of JSON. Try the Internal Proxy.");
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response format. Response start: ${text.substring(0, 50)}...`);
    }

    return data;
  } catch (error) {
    console.error("Failed to place order:", error);
    throw error;
  }
};

export const getBalance = async () => {
   const { apiKey, proxyUrl, useProxy, apiUrl } = getStoredSettings();
   if (!apiKey) return null;

   try {
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', 'balance');

    const targetUrl = buildTargetUrl(apiUrl, proxyUrl, useProxy);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    
    const text = await response.text();
    if (text.startsWith('<')) return null;

    const data = JSON.parse(text);
    return data;
   } catch (e) {
     console.error("Failed to fetch balance", e);
     return null;
   }
}