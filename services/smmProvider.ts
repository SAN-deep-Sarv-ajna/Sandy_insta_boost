import { Platform, Service, ServiceType } from '../types';
import { APP_CONFIG } from '../constants';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// DEFAULT SETTINGS
const DEFAULT_API_URL = 'https://smmdevil.com/api/v2';
const INTERNAL_PROXY_URL = '/api/proxy'; 

export const SETTINGS_UPDATED_EVENT = 'settings_updated';

// --- FIRESTORE SETTINGS MANAGERS ---

export interface PublicSettings {
    upiId: string;
    exchangeRate: number;
    globalDiscount: number;
    autoExchangeRate: boolean;
}

export interface PrivateSettings {
    apiKey: string;
    proxyUrl: string;
    useProxy: boolean;
    apiUrl: string;
}

export const fetchPublicSettings = async (): Promise<PublicSettings | null> => {
    if (!db) return null;
    try {
        const snap = await getDoc(doc(db, 'settings', 'public'));
        if (snap.exists()) return snap.data() as PublicSettings;
        return null;
    } catch (e) {
        console.error("Error fetching public settings:", e);
        return null;
    }
};

export const fetchPrivateSettings = async (): Promise<PrivateSettings | null> => {
    if (!db) return null;
    try {
        const snap = await getDoc(doc(db, 'settings', 'private'));
        if (snap.exists()) return snap.data() as PrivateSettings;
        return null;
    } catch (e) {
        console.error("Error fetching private settings:", e);
        return null;
    }
};

export const saveSystemSettings = async (
    pub: PublicSettings, 
    priv: PrivateSettings
) => {
    if (!db) throw new Error("Database not connected");
    
    // Save Public Data
    await setDoc(doc(db, 'settings', 'public'), pub, { merge: true });
    
    // Save Private Data
    await setDoc(doc(db, 'settings', 'private'), priv, { merge: true });
};

// --- HELPER FUNCTIONS ---

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

// Updated: Accepts explicit configuration to avoid relying on localStorage for keys
export const fetchProviderServices = async (
    apiKey?: string, 
    proxyUrl: string = INTERNAL_PROXY_URL, 
    useProxy: boolean = false, 
    exchangeRate: number = 1,
    globalDiscount: number = 0
): Promise<Service[]> => {
  
  if (!apiKey) {
    throw new Error("API Key is missing. Admin must configure it in Settings.");
  }

  const apiUrl = DEFAULT_API_URL;

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
      const costInLocalCurrency = (isNaN(rawRate) ? 0 : rawRate) * exchangeRate;
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
    console.error("Failed to fetch from Provider:", error);
    throw error;
  }
};

export const placeProviderOrder = async (serviceId: number, link: string, quantity: number) => {
  // To place an order, we currently need the API Key.
  // In a fully secure app, this function would be a Server-Side API route.
  // For now, since this is called by AdminOrders, we will fetch the key from Firestore (Private) first.
  
  const settings = await fetchPrivateSettings();
  if (!settings || !settings.apiKey) throw new Error("System Error: API Key not configured in Database.");

  const { apiKey, proxyUrl, useProxy, apiUrl } = settings;

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
    if (text.trim().startsWith('<')) throw new Error("Proxy Connection Error");

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid provider response.`);
    }
    return data;
  } catch (error) {
    console.error("Order Error:", error);
    throw error;
  }
};

export const fetchOrderStatus = async (orderId: string | number) => {
  try {
    const response = await fetch(`/api/status?order=${orderId}`, {
      method: 'GET',
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
        throw new Error(data.error || "Server Error");
    }
    return data;
  } catch (e: any) {
    console.error("Secure Status Check Failed:", e);
    return { error: e.message || "Failed to fetch status" };
  }
}

export const getBalance = async () => {
   const settings = await fetchPrivateSettings();
   if (!settings || !settings.apiKey) return null;
   
   const { apiKey, proxyUrl, useProxy, apiUrl } = settings;

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

// LEGACY SUPPORT (To prevent crashes in existing components, but should be phased out)
export const getStoredSettings = () => {
    return { 
        apiKey: '', 
        proxyUrl: INTERNAL_PROXY_URL, 
        useProxy: false, 
        exchangeRate: 1, 
        upiId: 'sandeep@okaxis' 
    }; 
};
export const isAdminUnlocked = () => false; // Deprecated