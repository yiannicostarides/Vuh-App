import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Deal, DealType, StoreChain } from '../types/models';
import { logger } from '../utils/logger';

// Kroger API response interfaces
interface KrogerAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

interface KrogerCoupon {
    couponId: string;
    categoryId: string;
    categoryName: string;
    brandName: string;
    description: string;
    shortDescription: string;
    value: number;
    valueType: 'DOLLAR_OFF' | 'PERCENT_OFF' | 'BOGO';
    minimumPurchase?: number;
    maximumValue?: number;
    startDate: string;
    endDate: string;
    images?: Array<{
        id: string;
        perspective: string;
        featured: boolean;
        sizes: Array<{
            id: string;
            size: string;
            url: string;
        }>;
    }>;
    items?: Array<{
        upc: string;
        description: string;
        brand: string;
        size: string;
    }>;
}

interface KrogerPromotion {
    promotionId: string;
    description: string;
    shortDescription: string;
    startDate: string;
    endDate: string;
    promotionType: 'SALE' | 'BOGO' | 'DISCOUNT';
    value?: number;
    valueType?: 'DOLLAR_OFF' | 'PERCENT_OFF';
    items: Array<{
        upc: string;
        description: string;
        brand: string;
        size: string;
        price: {
            regular: number;
            promo: number;
        };
    }>;
}

interface KrogerAPIResponse<T> {
    data: T[];
    meta?: {
        pagination?: {
            start: number;
            limit: number;
            total: number;
        };
    };
}

export class KrogerAPIClient {
    private axiosInstance: AxiosInstance;
    private accessToken: string | null = null;
    private tokenExpiresAt: Date | null = null;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly baseURL = 'https://api.kroger.com/v1';
    private readonly authURL = 'https://api.kroger.com/v1/connect/oauth2/token';

    // Rate limiting properties
    private requestCount = 0;
    private requestWindow = Date.now();
    private readonly maxRequestsPerMinute = 100; // Kroger API limit
    private readonly rateLimitWindow = 60 * 1000; // 1 minute in milliseconds

    constructor() {
        this.clientId = process.env.KROGER_CLIENT_ID || '';
        this.clientSecret = process.env.KROGER_CLIENT_SECRET || '';

        if (!this.clientId || !this.clientSecret) {
            throw new Error('Kroger API credentials not found in environment variables');
        }

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Add request interceptor for rate limiting
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                await this.enforceRateLimit();
                await this.ensureValidToken();

                if (this.accessToken) {
                    config.headers.Authorization = `Bearer ${this.accessToken}`;
                }

                return config;
            },
            (error) => {
                logger.error('Kroger API request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for error handling
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    logger.warn('Kroger API token expired, refreshing...');
                    this.accessToken = null;
                    this.tokenExpiresAt = null;

                    // Retry the request once with new token
                    if (!error.config._retry) {
                        error.config._retry = true;
                        await this.ensureValidToken();
                        error.config.headers.Authorization = `Bearer ${this.accessToken}`;
                        return this.axiosInstance.request(error.config);
                    }
                }

                logger.error('Kroger API error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    url: error.config?.url,
                });

                return Promise.reject(error);
            }
        );
    }

    /**
     * Enforce rate limiting to stay within Kroger API limits
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();

        // Reset counter if window has passed
        if (now - this.requestWindow >= this.rateLimitWindow) {
            this.requestCount = 0;
            this.requestWindow = now;
        }

        // If we've hit the limit, wait until the window resets
        if (this.requestCount >= this.maxRequestsPerMinute) {
            const waitTime = this.rateLimitWindow - (now - this.requestWindow);
            logger.info(`Rate limit reached, waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.requestWindow = Date.now();
        }

        this.requestCount++;
    }

    /**
     * Authenticate with Kroger API using OAuth2 client credentials flow
     */
    private async authenticate(): Promise<void> {
        try {
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

            const response: AxiosResponse<KrogerAuthResponse> = await axios.post(
                this.authURL,
                'grant_type=client_credentials&scope=product.compact',
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 10000,
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiresAt = new Date(Date.now() + (response.data.expires_in * 1000) - 60000); // 1 minute buffer

            logger.info('Successfully authenticated with Kroger API');
        } catch (error) {
            logger.error('Failed to authenticate with Kroger API:', error);
            throw new Error('Kroger API authentication failed');
        }
    }

    /**
     * Ensure we have a valid access token
     */
    private async ensureValidToken(): Promise<void> {
        if (!this.accessToken || !this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
            await this.authenticate();
        }
    }

    /**
     * Fetch digital coupons from Kroger API
     */
    async fetchDigitalCoupons(locationId?: string): Promise<Deal[]> {
        try {
            const params: any = {
                'filter.limit': 50,
            };

            if (locationId) {
                params['filter.locationId'] = locationId;
            }

            const response: AxiosResponse<KrogerAPIResponse<KrogerCoupon>> = await this.axiosInstance.get(
                '/coupons',
                { params }
            );

            const deals = response.data.data.map(coupon => this.transformCouponToDeal(coupon));

            logger.info(`Fetched ${deals.length} digital coupons from Kroger API`);
            return deals;
        } catch (error) {
            logger.error('Failed to fetch Kroger digital coupons:', error);
            throw new Error('Failed to fetch Kroger digital coupons');
        }
    }

    /**
     * Fetch promotional data from Kroger API
     */
    async fetchPromotions(locationId?: string): Promise<Deal[]> {
        try {
            const params: any = {
                'filter.limit': 50,
            };

            if (locationId) {
                params['filter.locationId'] = locationId;
            }

            const response: AxiosResponse<KrogerAPIResponse<KrogerPromotion>> = await this.axiosInstance.get(
                '/promotions',
                { params }
            );

            const deals = response.data.data.flatMap(promotion => this.transformPromotionToDeals(promotion));

            logger.info(`Fetched ${deals.length} promotions from Kroger API`);
            return deals;
        } catch (error) {
            logger.error('Failed to fetch Kroger promotions:', error);
            throw new Error('Failed to fetch Kroger promotions');
        }
    }

    /**
     * Fetch all deals (coupons and promotions) for a location
     */
    async fetchAllDeals(locationId?: string): Promise<Deal[]> {
        try {
            const [coupons, promotions] = await Promise.allSettled([
                this.fetchDigitalCoupons(locationId),
                this.fetchPromotions(locationId),
            ]);

            const allDeals: Deal[] = [];

            if (coupons.status === 'fulfilled') {
                allDeals.push(...coupons.value);
            } else {
                logger.error('Failed to fetch coupons:', coupons.reason);
            }

            if (promotions.status === 'fulfilled') {
                allDeals.push(...promotions.value);
            } else {
                logger.error('Failed to fetch promotions:', promotions.reason);
            }

            logger.info(`Fetched total of ${allDeals.length} deals from Kroger API`);
            return allDeals;
        } catch (error) {
            logger.error('Failed to fetch all Kroger deals:', error);
            throw new Error('Failed to fetch Kroger deals');
        }
    }

    /**
     * Transform Kroger coupon to internal Deal model
     */
    private transformCouponToDeal(coupon: KrogerCoupon): Deal {
        const now = new Date();
        const validFrom = new Date(coupon.startDate);
        const validUntil = new Date(coupon.endDate);

        // Calculate prices based on coupon value and type
        let originalPrice = coupon.minimumPurchase || 0;
        let salePrice = originalPrice;
        let discountPercentage = 0;
        let dealType: DealType = DealType.COUPON;

        if (coupon.valueType === 'DOLLAR_OFF') {
            salePrice = Math.max(0, originalPrice - coupon.value);
            discountPercentage = originalPrice > 0 ? (coupon.value / originalPrice) * 100 : 0;
        } else if (coupon.valueType === 'PERCENT_OFF') {
            discountPercentage = coupon.value;
            salePrice = originalPrice * (1 - coupon.value / 100);
        } else if (coupon.valueType === 'BOGO') {
            dealType = DealType.BOGO;
            discountPercentage = 50; // Assume 50% savings for BOGO
            salePrice = originalPrice * 0.5;
        }

        // Extract item IDs from UPCs
        const itemIds = coupon.items?.map(item => item.upc) || [];

        // Get image URL
        const imageUrl = coupon.images?.[0]?.sizes?.find(size => size.size === 'medium')?.url;

        return {
            id: `kroger-coupon-${coupon.couponId}`,
            storeId: 'kroger-default', // Will be updated with actual store location
            storeName: StoreChain.KROGER,
            title: coupon.shortDescription || coupon.description,
            description: coupon.description,
            originalPrice,
            salePrice,
            discountPercentage: Math.round(discountPercentage * 100) / 100,
            dealType,
            validFrom,
            validUntil,
            category: coupon.categoryName || 'General',
            itemIds,
            restrictions: coupon.minimumPurchase ? `Minimum purchase: $${coupon.minimumPurchase}` : undefined,
            imageUrl,
            storeLocations: [], // Will be populated by the aggregation service
            createdAt: now,
            updatedAt: now,
        };
    }

    /**
     * Transform Kroger promotion to internal Deal models
     */
    private transformPromotionToDeals(promotion: KrogerPromotion): Deal[] {
        const now = new Date();
        const validFrom = new Date(promotion.startDate);
        const validUntil = new Date(promotion.endDate);

        let dealType: DealType = DealType.DISCOUNT;
        if (promotion.promotionType === 'BOGO') {
            dealType = DealType.BOGO;
        }

        return promotion.items.map(item => {
            const originalPrice = item.price.regular;
            const salePrice = item.price.promo;
            const discountPercentage = originalPrice > 0 ?
                ((originalPrice - salePrice) / originalPrice) * 100 : 0;

            return {
                id: `kroger-promo-${promotion.promotionId}-${item.upc}`,
                storeId: 'kroger-default', // Will be updated with actual store location
                storeName: StoreChain.KROGER,
                title: item.description,
                description: `${promotion.shortDescription || promotion.description} - ${item.brand} ${item.size}`,
                originalPrice,
                salePrice,
                discountPercentage: Math.round(discountPercentage * 100) / 100,
                dealType,
                validFrom,
                validUntil,
                category: 'General', // Kroger promotions don't always include category
                itemIds: [item.upc],
                restrictions: undefined,
                imageUrl: undefined,
                storeLocations: [], // Will be populated by the aggregation service
                createdAt: now,
                updatedAt: now,
            };
        });
    }

    /**
     * Test the API connection and authentication
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.ensureValidToken();

            // Make a simple test request
            await this.axiosInstance.get('/coupons', {
                params: { 'filter.limit': 1 }
            });

            logger.info('Kroger API connection test successful');
            return true;
        } catch (error) {
            logger.error('Kroger API connection test failed:', error);
            return false;
        }
    }

    /**
     * Get current rate limit status
     */
    getRateLimitStatus(): { requestCount: number; windowStart: Date; maxRequests: number } {
        return {
            requestCount: this.requestCount,
            windowStart: new Date(this.requestWindow),
            maxRequests: this.maxRequestsPerMinute,
        };
    }
}