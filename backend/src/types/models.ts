// MARK: - Deal Model
export interface Deal {
  id: string;
  storeId: string;
  storeName: StoreChain;
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  discountPercentage: number;
  dealType: DealType;
  validFrom: Date;
  validUntil: Date;
  category: string;
  itemIds: string[];
  restrictions?: string;
  imageUrl?: string;
  storeLocations: StoreLocation[];
  createdAt: Date;
  updatedAt: Date;
}

// MARK: - Store Location Model
export interface StoreLocation {
  id: string;
  storeChain: StoreChain;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
  hours: StoreHours;
  createdAt: Date;
  updatedAt: Date;
}

// MARK: - Store Hours Model
export interface StoreHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  isClosed: boolean;
}

// MARK: - Shopping List Item Model
export interface ShoppingListItem {
  id: string;
  userId: string;
  dealId: string;
  itemName: string;
  quantity: number;
  priority: Priority;
  addedAt: Date;
  category: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// MARK: - User Model
export interface User {
  id: string;
  deviceId: string;
  preferences: UserPreferences;
  location?: UserLocation;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  maxRadius: number;
  preferredStores: string[];
  categories: string[];
  notificationSettings: NotificationSettings;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  lastUpdated: Date;
}

export interface NotificationSettings {
  dealExpirationReminders: boolean;
  newDealAlerts: boolean;
  priceDropAlerts: boolean;
  pushNotificationsEnabled: boolean;
}

// MARK: - Price Comparison Model
export interface PriceComparison {
  itemId: string;
  itemName: string;
  stores: StorePrice[];
  bestValue: {
    storeId: string;
    storeName: string;
    price: number;
    distance?: number;
  };
  lastUpdated: Date;
}

export interface StorePrice {
  storeId: string;
  storeName: StoreChain;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  dealType?: DealType;
  distance?: number;
  validUntil?: Date;
}

// MARK: - API Response Models
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// MARK: - Request Models
export interface LocationQuery {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface DealFilters {
  storeChain?: StoreChain[];
  category?: string[];
  dealType?: DealType[];
  minDiscount?: number;
  maxPrice?: number;
}

export interface CreateShoppingListItemRequest {
  dealId: string;
  itemName: string;
  quantity: number;
  priority: Priority;
  notes?: string;
}

export interface UpdateUserPreferencesRequest {
  maxRadius?: number;
  preferredStores?: string[];
  categories?: string[];
  notificationSettings?: Partial<NotificationSettings>;
}

export interface NotificationSubscriptionRequest {
  deviceToken: string;
  platform: 'ios' | 'android';
  userId: string;
}

// MARK: - Database Models (for internal use)
export interface DealRecord extends Omit<Deal, 'storeLocations'> {
  // Database-specific fields
  isActive: boolean;
  scrapedAt?: Date;
  sourceUrl?: string;
}

export interface StoreLocationRecord extends StoreLocation {
  // Database-specific fields
  isActive: boolean;
}

export interface UserRecord extends User {
  // Database-specific fields
  lastLoginAt?: Date;
  isActive: boolean;
}

// MARK: - Enums
export enum StoreChain {
  PUBLIX = 'publix',
  KROGER = 'kroger'
}

export enum DealType {
  BOGO = 'bogo',
  DISCOUNT = 'discount',
  COUPON = 'coupon'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// MARK: - Validation Schemas (for runtime validation)
export interface DealValidationSchema {
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  validFrom: string;
  validUntil: string;
  category: string;
  storeId: string;
  storeName: StoreChain;
  dealType: DealType;
}

export interface LocationValidationSchema {
  latitude: number;
  longitude: number;
  radius?: number;
}