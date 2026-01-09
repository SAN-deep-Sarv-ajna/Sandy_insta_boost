import { Platform, Service, ServiceType, Order, OrderStatus, UserStats } from './types';

export const MOCK_SERVICES: Service[] = [
  // ==================== INSTAGRAM FOLLOWERS ====================
  { 
    id: 101, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.FOLLOWERS, 
    name: 'Instagram Followers [Guaranteed 30 Days Refill] [HQ]', 
    rate: 90.00, 
    min: 100, 
    max: 100000, 
    description: 'High quality mixed followers with 30-day auto-refill guarantee.' 
  },
  { 
    id: 102, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.FOLLOWERS, 
    name: 'Instagram Followers [Indian Real Active] [Best for Growth]', 
    rate: 280.00, 
    min: 100, 
    max: 20000, 
    description: '100% Real Indian active profiles. Best for organic growth and engagement.' 
  },
  { 
    id: 107, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.FOLLOWERS, 
    name: 'Instagram Followers [LifeTime Guaranteed] [Non-Drop]', 
    rate: 150.00, 
    min: 50, 
    max: 500000, 
    description: 'Premium non-drop followers with lifetime warranty.' 
  },
  { 
    id: 108, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.FOLLOWERS, 
    name: 'Instagram Followers [Bot/Cheap] [No Refill]', 
    rate: 35.00, 
    min: 100, 
    max: 20000, 
    description: 'Cheap bot followers for count increase only. No guarantee.' 
  },

  // ==================== INSTAGRAM LIKES ====================
  { 
    id: 103, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.LIKES, 
    name: 'Instagram Likes [Fast Speed] [Non-Drop]', 
    rate: 15.00, 
    min: 50, 
    max: 50000, 
    description: 'Instant start. Best for ranking posts on hashtags.' 
  },
  { 
    id: 104, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.LIKES, 
    name: 'Instagram Likes [Indian Real] [Active Users]', 
    rate: 60.00, 
    min: 50, 
    max: 10000, 
    description: 'High quality likes from real Indian users.' 
  },
  { 
    id: 109, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.LIKES, 
    name: 'Instagram Likes [Power Likes] [Explore Page]', 
    rate: 45.00, 
    min: 100, 
    max: 50000, 
    description: 'Power likes from high authority accounts to trigger algorithm.' 
  },

  // ==================== INSTAGRAM VIEWS & REELS ====================
  { 
    id: 105, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.VIEWS, 
    name: 'Instagram Reels Views [Viral High Speed] [Instant]', 
    rate: 6.00, 
    min: 500, 
    max: 10000000, 
    description: 'Instant delivery. Helps Reels reach the explore page.' 
  },
  { 
    id: 110, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.VIEWS, 
    name: 'Instagram Story Views [Instant]', 
    rate: 12.00, 
    min: 100, 
    max: 50000, 
    description: 'Views for your active story.' 
  },
  { 
    id: 111, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.VIEWS, 
    name: 'Instagram Live Video Views [30 Minutes]', 
    rate: 450.00, 
    min: 50, 
    max: 5000, 
    description: 'Keep viewers on your live stream for 30 minutes.' 
  },

  // ==================== INSTAGRAM ENGAGEMENT (NEW) ====================
  { 
    id: 113, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.OTHER, 
    name: 'Instagram Saves [Ranking Service]', 
    rate: 20.00, 
    min: 50, 
    max: 10000, 
    description: 'Saves help your post rank on the Explore page.' 
  },
  { 
    id: 114, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.OTHER, 
    name: 'Instagram Reach + Impressions [Package]', 
    rate: 40.00, 
    min: 100, 
    max: 100000, 
    description: 'Increase your account statistics and analytics.' 
  },
  { 
    id: 115, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.OTHER, 
    name: 'Instagram Profile Visits', 
    rate: 55.00, 
    min: 100, 
    max: 50000, 
    description: 'Real users visiting your profile.' 
  },

  // ==================== INSTAGRAM COMMENTS ====================
  { 
    id: 106, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.COMMENTS, 
    name: 'Instagram Custom Comments [Indian]', 
    rate: 900.00, 
    min: 10, 
    max: 1000, 
    description: 'Real Indian comments. You provide the text.' 
  },
  { 
    id: 112, 
    platform: Platform.INSTAGRAM, 
    type: ServiceType.COMMENTS, 
    name: 'Instagram Random Comments [Emoji/Positive]', 
    rate: 400.00, 
    min: 10, 
    max: 5000, 
    description: 'Random positive comments or emojis.' 
  },

  // ==================== FACEBOOK SERVICES ====================
  { 
    id: 201, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.FOLLOWERS, 
    name: 'Facebook Page Likes + Followers [Guaranteed]', 
    rate: 450.00, 
    min: 100, 
    max: 100000, 
    description: 'Classic page likes. Non-drop high retention.' 
  },
  { 
    id: 204, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.FOLLOWERS, 
    name: 'Facebook Profile Followers [Non-Drop]', 
    rate: 350.00, 
    min: 100, 
    max: 50000, 
    description: 'Followers for personal profiles (Turn on professional mode).' 
  },
  { 
    id: 202, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.LIKES, 
    name: 'Facebook Post/Photo Likes [Indian]', 
    rate: 120.00, 
    min: 50, 
    max: 5000, 
    description: 'Likes from Indian profiles on posts or photos.' 
  },
  { 
    id: 205, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.LIKES, 
    name: 'Facebook Post Likes [Global Mixed] [Cheap]', 
    rate: 60.00, 
    min: 50, 
    max: 10000, 
    description: 'Cheap mixed likes for posts.' 
  },
  { 
    id: 203, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.VIEWS, 
    name: 'Facebook Video Views [Monetizable]', 
    rate: 150.00, 
    min: 1000, 
    max: 5000000, 
    description: 'Safe for monetization. 1 minute retention.' 
  },
  { 
    id: 206, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.VIEWS, 
    name: 'Facebook Reels Views [Fast]', 
    rate: 80.00, 
    min: 1000, 
    max: 1000000, 
    description: 'Views specifically for Facebook Reels.' 
  },
  { 
    id: 207, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.OTHER, 
    name: 'Facebook Group Members [Real Accounts]', 
    rate: 600.00, 
    min: 100, 
    max: 20000, 
    description: 'Grow your Facebook Group with real looking profiles.' 
  },
  { 
    id: 208, 
    platform: Platform.FACEBOOK, 
    type: ServiceType.OTHER, 
    name: 'Facebook Event Attendees / Interested', 
    rate: 300.00, 
    min: 50, 
    max: 5000, 
    description: 'Increase interest in your Facebook Events.' 
  },

  // ==================== OTHER PLATFORMS ====================
  { 
    id: 301, 
    platform: Platform.TIKTOK, 
    type: ServiceType.VIEWS, 
    name: 'TikTok Views [Global Instant]', 
    rate: 1.50, 
    min: 1000, 
    max: 10000000, 
    description: 'Instant delivery for TikTok videos.' 
  },
  { 
    id: 302, 
    platform: Platform.TIKTOK, 
    type: ServiceType.FOLLOWERS, 
    name: 'TikTok Followers [Real]', 
    rate: 400.00, 
    min: 100, 
    max: 50000, 
    description: 'Real TikTok followers.' 
  },
  { 
    id: 401, 
    platform: Platform.YOUTUBE, 
    type: ServiceType.VIEWS, 
    name: 'YouTube Views [Non-Drop Lifetime]', 
    rate: 180.00, 
    min: 500, 
    max: 100000, 
    description: 'Lifetime guarantee. Good for ranking.' 
  },
  { 
    id: 402, 
    platform: Platform.YOUTUBE, 
    type: ServiceType.FOLLOWERS, 
    name: 'YouTube Subscribers [Monetization Safe]', 
    rate: 2500.00, 
    min: 50, 
    max: 5000, 
    description: 'Real subscribers for monetization.' 
  },
];

export const MOCK_ORDERS: Order[] = [
  { id: 4592, serviceId: 102, serviceName: 'Instagram Followers [Indian Real Active]', link: 'https://instagram.com/user1', quantity: 1000, charge: 280.00, status: OrderStatus.COMPLETED, date: '2023-10-25' },
  { id: 4593, serviceId: 103, serviceName: 'Instagram Likes [Fast Speed]', link: 'https://instagram.com/p/Cx9...', quantity: 500, charge: 7.50, status: OrderStatus.PROCESSING, date: '2023-10-26' },
  { id: 4594, serviceId: 201, serviceName: 'Facebook Page Likes + Followers', link: 'https://facebook.com/page...', quantity: 200, charge: 90.00, status: OrderStatus.PENDING, date: '2023-10-27' },
];

export const INITIAL_STATS: UserStats = {
  balance: 12500.00,
  spent: 85000.00,
  orders: 342,
  tickets: 2
};