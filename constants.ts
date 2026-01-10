import { Platform, Service, ServiceType, Order, OrderStatus, UserStats } from './types';

// ===========================================================================
// ⚙️ GLOBAL APP CONFIGURATION
// ===========================================================================
export const APP_CONFIG = {
  // Your Brand Name
  APP_NAME: "SocialBoost IN", 
  
  // Your WhatsApp Number
  WHATSAPP_NUMBER: "917494019807", 
  
  // Security PIN (Backup access for Local Settings only)
  ADMIN_PIN: "jokr", 

  // Default mode
  CLIENT_MODE_DEFAULT: true,

  // Provider API Key (SMMDevil)
  PROVIDER_API_KEY: "" 
};

// ===========================================================================
// 📦 PUBLIC CATALOG
// ===========================================================================
export const MOCK_SERVICES: Service[] = [
  {
    "id": 1296,
    "platform": "TikTok",
    "type": "Likes",
    "name": "Tiktok Likes | HQ Real Accounts | 20K Per Day | %0-5 Drop | Cancel Button | 30 Days Refill ♻️",
    "rate": 30.12865,
    "min": 10,
    "max": 1000000,
    "description": "NEW SERVICES",
    "category": "NEW SERVICES"
  },
  {
    "id": 1345,
    "platform": "TikTok",
    "type": "Followers",
    "name": "Tiktok Followers | ~10K per day | 365 days ♻️",
    "rate": 71.27208,
    "min": 10,
    "max": 500000,
    "description": "Tiktok Followers (real accounts)",
    "category": "Tiktok Followers (real accounts)"
  }
];