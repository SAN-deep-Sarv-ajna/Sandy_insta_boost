import { Platform, Service, ServiceType } from '../types';

// DEFAULT SETTINGS
const DEFAULT_API_URL = 'https://smmdevil.com/api/v2';
// Default to our internal Vercel serverless proxy
const INTERNAL_PROXY_URL = '/api/proxy'; 

// STORAGE KEYS
const STORAGE_KEY_API = 'smm_api_key';
const STORAGE_KEY_PROXY = 'smm_proxy_url';
const STORAGE_KEY_USE_PROXY = 'smm_use_proxy';
const STORAGE_KEY_EXCHANGE_RATE = 'smm_exchange_rate';
const STORAGE_KEY_AUTO_RATE = 'smm_auto_rate';
const STORAGE_KEY_GLOBAL_DISCOUNT = 'smm_global_discount';
const STORAGE_KEY_HIDE_SETTINGS = 'smm_hide_settings';
const STORAGE_KEY_UPI_ID = 'smm_upi_id';

// Event constant for real-time updates
export const SETTINGS_UPDATED_EVENT = 'smm_settings_updated';

export const getStoredSettings = () => {
  // CRITICAL FIX: Default useProxy to FALSE (Direct Connection).
  // This ensures the app works immediately on static hosting (GitHub Pages, etc.)
  // Users can opt-in to Proxy if they need it, but Direct + Extension is safest default.
  const storedProxy = localStorage.getItem(STORAGE_KEY_USE_PROXY);
  const useProxy = storedProxy === 'true'; // Defaults to false if null or anything else

  const exchangeRate = parseFloat(localStorage.getItem(STORAGE_KEY_EXCHANGE_RATE) || '1');
  const autoExchangeRate = localStorage.getItem(STORAGE_KEY_AUTO_RATE) === 'true';
  const globalDiscount = parseFloat(localStorage.getItem(STORAGE_KEY_GLOBAL_DISCOUNT) || '0');
  const hideSettings = localStorage.getItem(STORAGE_KEY_HIDE_SETTINGS) === 'true';
  const upiId = localStorage.getItem(STORAGE_KEY_UPI_ID) || '';

  return {
    apiKey: localStorage.getItem(STORAGE_KEY_API) || '',
    // Default to internal proxy if not set, but only used if useProxy is true
    proxyUrl: localStorage.getItem(STORAGE_KEY_PROXY) || INTERNAL_PROXY_URL,
    useProxy: useProxy,
    apiUrl: DEFAULT_API_URL,
    exchangeRate: isNaN(exchangeRate) || exchangeRate <= 0 ? 1 : exchangeRate,
    autoExchangeRate,
    globalDiscount: isNaN(globalDiscount) ? 0 : globalDiscount,
    hideSettings,
    upiId
  };
};

export const saveSettings = (
    apiKey: string, 
    proxyUrl: string, 
    useProxy: boolean, 
    exchangeRate: number, 
    autoExchangeRate: boolean, 
    globalDiscount: number,
    hideSettings: boolean,
    upiId: string
) => {
  localStorage.setItem(STORAGE_KEY_API, apiKey.trim());
  localStorage.setItem(STORAGE_KEY_PROXY, proxyUrl.trim());
  localStorage.setItem(STORAGE_KEY_USE_PROXY, String(useProxy));
  localStorage.setItem(STORAGE_KEY_EXCHANGE_RATE, String(exchangeRate));
  localStorage.setItem(STORAGE_KEY_AUTO_RATE, String(autoExchangeRate));
  localStorage.setItem(STORAGE_KEY_GLOBAL_DISCOUNT, String(globalDiscount));
  localStorage.setItem(STORAGE_KEY_HIDE_SETTINGS, String(hideSettings));
  localStorage.setItem(STORAGE_KEY_UPI_ID, upiId.trim());

  // Dispatch custom event to notify components (like Sidebar) to re-render
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
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
  description?: string; // Standard field
  desc?: string; // Alternative field
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

// FETCH LIVE RATE (USD -> INR)
export const fetchLiveRate = async (): Promise<number | null> => {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!res.ok) throw new Error("Failed to fetch rates");
        const data = await res.json();
        const inr = data.rates.INR;
        if (inr) return inr;
        return null;
    } catch (e) {
        console.error("Rate fetch failed", e);
        return null;
    }
};

export const fetchProviderServices = async (): Promise<Service[]> => {
  const { apiKey, proxyUrl, useProxy, apiUrl, exchangeRate, autoExchangeRate, globalDiscount } = getStoredSettings();

  if (!apiKey) {
    throw new Error("API Key is missing. Please go to Settings to configure your Sandyinsta API Key.");
  }

  // Handle Automatic Rate Update
  let effectiveExchangeRate = exchangeRate;
  if (autoExchangeRate) {
      const liveRate = await fetchLiveRate();
      if (liveRate) {
          effectiveExchangeRate = liveRate;
          // Update storage seamlessly so other components know
          localStorage.setItem(STORAGE_KEY_EXCHANGE_RATE, String(liveRate));
          console.log(`Auto-updated Exchange Rate to: ${liveRate}`);
      }
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
    
    // Handle cases where proxy returns HTML error (common in static hosting 404s)
    if (text.trim().startsWith('<') || text.trim().toLowerCase().includes('cloudflare')) {
        throw new Error("Connection Error: The Proxy connection failed. Go to Settings and ensure 'Connection Mode' is set to 'Direct Connection' and you have the CORS Extension installed.");
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
    // FORMULA: (Raw Rate * Exchange Rate) * 1.5 Margin
    return data.map((item: ProviderService) => {
      const rawRate = parseFloat(item.rate); // Usually in USD
      const costInLocalCurrency = (isNaN(rawRate) ? 0 : rawRate) * effectiveExchangeRate;
      
      const standardSellingRate = costInLocalCurrency * 1.5; // 50% Margin
      
      // Apply Global Discount if set
      const finalSellingRate = globalDiscount > 0 
         ? standardSellingRate * (1 - globalDiscount / 100)
         : standardSellingRate;

      return {
        id: parseInt(item.service),
        platform: getPlatform(item.name, item.category),
        type: getType(item.name),
        name: item.name,
        category: item.category,
        // Use 5 decimal places to avoid losing precision
        rate: parseFloat(finalSellingRate.toFixed(5)),
        originalRate: parseFloat(costInLocalCurrency.toFixed(5)),
        min: parseInt(item.min),
        max: parseInt(item.max),
        // Robust description check: looks for 'description', 'desc', then category fallback
        description: item.description || item.desc || item.category || 'Premium SMM Service'
      };
    });
  } catch (error) {
    console.error("Failed to fetch from Sandyinsta:", error);
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

export const fetchOrderStatus = async (orderId: string | number) => {
  const { apiKey, proxyUrl, useProxy, apiUrl } = getStoredSettings();
  if (!apiKey) throw new Error("API Key is missing.");

  try {
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', 'status');
    params.append('order', orderId.toString());

    const targetUrl = buildTargetUrl(apiUrl, proxyUrl, useProxy);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    
    const text = await response.text();
    if (text.trim().startsWith('<')) throw new Error("Proxy Error");

    const data = JSON.parse(text);
    return data;
  } catch (e) {
    console.error("Failed to fetch order status", e);
    throw e;
  }
}

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