export enum Platform {
  INSTAGRAM = 'Instagram',
  FACEBOOK = 'Facebook',
  TIKTOK = 'TikTok',
  YOUTUBE = 'YouTube',
  OTHER = 'Other'
}

export enum ServiceType {
  FOLLOWERS = 'Followers',
  LIKES = 'Likes',
  VIEWS = 'Views',
  COMMENTS = 'Comments',
  OTHER = 'Other'
}

export interface Service {
  id: number;
  platform: string;
  type: string;
  name: string;
  rate: number; // Your Selling Price
  originalRate?: number; // Provider Cost (Hidden from client usually, visible to you)
  min: number;
  max: number;
  description?: string;
  category?: string;
}

export enum OrderStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
  PARTIAL = 'Partial',
  CANCELED = 'Canceled',
  FAIL = 'Fail'
}

export interface Order {
  id: number;
  serviceId: number;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number;
  status: OrderStatus;
  date: string;
}

export interface UserStats {
  balance: number;
  spent: number;
  orders: number;
  tickets: number;
}