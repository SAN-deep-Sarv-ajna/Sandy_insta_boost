
import { Platform, Service, ServiceType, Order, OrderStatus, UserStats } from './types';

// ===========================================================================
// ⚙️ GLOBAL APP CONFIGURATION (EDIT THIS FOR DISTRIBUTION)
// ===========================================================================
export const APP_CONFIG = {
  // Your Brand Name
  APP_NAME: "SocialBoost IN", 
  
  // Your WhatsApp Number (Format: CountryCode+Number, e.g., 919876543210)
  WHATSAPP_NUMBER: "917494019807", 
  
  // Security PIN to access Admin Settings/API Features
  // ⚠️ CHANGE THIS BEFORE SHARING!
  ADMIN_PIN: "jokr", 

  // If true, the app acts as a Catalog/WhatsApp Order bot by default.
  // You must enter the PIN in Settings to unlock API features.
  CLIENT_MODE_DEFAULT: true,

  // ⚠️ CRITICAL FOR AUTOMATION:
  // Paste your SMMDevil (or Provider) API Key here.
  // This allows clients to place orders automatically using their Wallet Balance.
  // If empty, clients can only order via WhatsApp.
  PROVIDER_API_KEY: "" 
};

// ===========================================================================
// 📦 PUBLIC CATALOG (SERVICES VISIBLE TO CLIENTS)
// ===========================================================================
// HOW TO UPDATE PRICES:
// 1. Go to Settings > Admin Unlocked
// 2. Click "Generate Public Catalog"
// 3. Copy the output and paste it below, replacing MOCK_SERVICES.
// This ensures your clients see the Safe Price (Cost + 50% Margin).

// Paste this into constants.ts replacing MOCK_SERVICES
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
  // ... (Keeping existing services to save space, assuming they are unchanged)
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