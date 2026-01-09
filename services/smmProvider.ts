import { Platform, Service, ServiceType } from '../types';
import { APP_CONFIG } from '../constants';

// DEFAULT SETTINGS
const DEFAULT_API_URL = 'https://smmdevil.com/api/v2';
const INTERNAL_PROXY_URL = '/api/proxy'; 

// STORAGE KEYS
const STORAGE_KEY_API = 'smm_api_key';
const STORAGE_KEY_PROXY = 'smm_proxy_url';
const STORAGE_KEY_USE_PROXY = 'smm_use_proxy';
const STORAGE_KEY_EXCHANGE_RATE = 'smm_exchange_rate';
const STORAGE_KEY_AUTO_RATE = 'smm_auto_rate';
const STORAGE_KEY_GLOBAL_DISCOUNT = 'smm_global_discount';
const STORAGE_KEY_UPI_ID = 'smm_upi_id';
const STORAGE_KEY_IS_ADMIN = 'smm_is_admin_unlocked';

// Event constant for real-time updates
export const SETTINGS_UPDATED_EVENT = 'smm_settings_updated';

// AUTHENTICATION CHECK
export const isAdminUnlocked = (): boolean => {
  const unlocked = localStorage.getItem(STORAGE_KEY_IS_ADMIN);
  return unlocked === 'true';
};

export const setAdminUnlocked = (status: boolean) => {
  localStorage.setItem(STORAGE_KEY_IS_ADMIN, String(status));
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
};

export const getStoredSettings = () => {
  const storedProxy = localStorage.getItem(STORAGE_KEY_USE_PROXY);
  const useProxy = storedProxy === 'true'; 

  const exchangeRate = parseFloat(localStorage.getItem(STORAGE_KEY_EXCHANGE_RATE) || '1');
  const autoExchangeRate = localStorage.getItem(STORAGE_KEY_AUTO_RATE) === 'true';
  const globalDiscount = parseFloat(localStorage.getItem(STORAGE_KEY_GLOBAL_DISCOUNT) || '0');
  const upiId = localStorage.getItem(STORAGE_KEY_UPI_ID) || '';

  // SECURITY: Only return the API Key if Admin is Unlocked
  const rawApiKey = localStorage.getItem(STORAGE_KEY_API) || '';
  const apiKey = isAdminUnlocked() ? rawApiKey : '';

  return {
    apiKey,
    proxyUrl: localStorage.getItem(STORAGE_KEY_PROXY) || INTERNAL_PROXY_URL,
    useProxy: useProxy,
    apiUrl: DEFAULT_API_URL,
    exchangeRate: isNaN(exchangeRate) || exchangeRate <= 0 ? 1 : exchangeRate,
    autoExchangeRate,
    globalDiscount: isNaN(globalDiscount) ? 0 : globalDiscount,
    // Hide settings if NOT admin
    hideSettings: !isAdminUnlocked(),
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
    hideSettings: boolean, // This parameter is now largely ignored in favor of PIN auth
    upiId: string
) => {
  localStorage.setItem(STORAGE_KEY_API, apiKey.trim());
  localStorage.setItem(STORAGE_KEY_PROXY, proxyUrl.trim());
  localStorage.setItem(STORAGE_KEY_USE_PROXY, String(useProxy));
  localStorage.setItem(STORAGE_KEY_EXCHANGE_RATE, String(exchangeRate));
  localStorage.setItem(STORAGE_KEY_AUTO_RATE, String(autoExchangeRate));
  localStorage.setItem(STORAGE_KEY_GLOBAL_DISCOUNT, String(globalDiscount));
  localStorage.setItem(STORAGE_KEY_UPI_ID, upiId.trim());

  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
};

// ... (Rest of helper functions getPlatform, getType stay the same) ...
const getPlatform = (name: string, category: string): Platform => {
  const text = (name + ' ' + category).toLowerCase();
  if (text.includes('instagram') || text.includes(' ig ') || text.startsWith('ig') || text.includes('reels')) return Platform.INSTAGRAM;
  if (text.includes('facebook') || text.includes(' fb ') || text.startsWith('fb')) return Platform.FACEBOOK;
  if (text.includes('tiktok') || text.includes('tt')) return Platform.TIKTOK;
  if (text.includes('youtube') || text.includes('yt') || text.includes('shorts')) return Platform.YOUTUBE;
  return Platform.OTHER;
};

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
    if (proxyUrl === INTERNAL_PROXY_URL || proxyUrl.includes('/api/proxy')) {
        return proxyUrl;
    }
    return proxyUrl + encodeURIComponent(apiUrl);
  }
  return apiUrl;
};

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
  // 1. Check if Admin is authenticated. If not, throw error or return empty to force Mock usage
  if (!isAdminUnlocked()) {
      throw new Error("Admin Access Required to fetch live services.");
  }

  const { apiKey, proxyUrl, useProxy, apiUrl, exchangeRate, autoExchangeRate, globalDiscount } = getStoredSettings();

  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  let effectiveExchangeRate = exchangeRate;
  if (autoExchangeRate) {
      const liveRate = await fetchLiveRate();
      if (liveRate) {
          effectiveExchangeRate = liveRate;
          localStorage.setItem(STORAGE_KEY_EXCHANGE_RATE, String(liveRate));
      }
  }

  try {
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', 'services');

    const targetUrl = buildTargetUrl(apiUrl, proxyUrl, useProxy);
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    if (text.trim().startsWith('<') || text.trim().toLowerCase().includes('cloudflare')) {
        throw new Error("Proxy connection failed.");
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid JSON response.");
    }
    
    if (data.error) throw new Error(data.error);
    if (!Array.isArray(data)) throw new Error("Invalid response format");

    return data.map((item: ProviderService) => {
      const rawRate = parseFloat(item.rate); 
      const costInLocalCurrency = (isNaN(rawRate) ? 0 : rawRate) * effectiveExchangeRate;
      const standardSellingRate = costInLocalCurrency * 1.5; 
      const finalSellingRate = globalDiscount > 0 
         ? standardSellingRate * (1 - globalDiscount / 100)
         : standardSellingRate;

      return {
        id: parseInt(item.service),
        platform: getPlatform(item.name, item.category),
        type: getType(item.name),
        name: item.name,
        category: item.category,
        rate: parseFloat(finalSellingRate.toFixed(5)),
        originalRate: parseFloat(costInLocalCurrency.toFixed(5)),
        min: parseInt(item.min),
        max: parseInt(item.max),
        description: item.description || item.desc || item.category || 'Premium SMM Service'
      };
    });
  } catch (error) {
    console.error("Failed to fetch from Sandyinsta:", error);
    throw error;
  }
};

export const placeProviderOrder = async (serviceId: number, link: string, quantity: number) => {
  // Block if not admin
  if (!isAdminUnlocked()) throw new Error("Unauthorized: Client mode cannot place API orders.");

  const { apiKey, proxyUrl, useProxy, apiUrl } = getStoredSettings();
  if (!apiKey) throw new Error("API Key is missing.");

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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const text = await response.text();
    if (text.trim().startsWith('<')) throw new Error("Proxy Error");

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response.`);
    }
    return data;
  } catch (error) {
    console.error("Order Error:", error);
    throw error;
  }
};

export const fetchOrderStatus = async (orderId: string | number) => {
  // Tracking is allowed for public (usually), but SMMDevil needs key.
  // Limitation: If client doesn't have key, they can't track via API directly.
  // We can only allow tracking if Admin Key is present.
  if (!isAdminUnlocked()) {
      return { error: "Login as Admin to track live API orders, or ask support." };
  }
  
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
    return JSON.parse(text);
  } catch (e) {
    throw e;
  }
}

export const getBalance = async () => {
   if (!isAdminUnlocked()) return null;
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
    return JSON.parse(text);
   } catch (e) {
     return null;
   }
}
