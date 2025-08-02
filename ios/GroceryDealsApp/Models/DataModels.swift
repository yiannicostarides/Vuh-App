import Foundation

// MARK: - Deal Model
struct Deal: Identifiable, Codable {
    let id: String
    let storeId: String
    let storeName: StoreChain
    let title: String
    let description: String
    let originalPrice: Double
    let salePrice: Double
    let discountPercentage: Double
    let dealType: DealType
    let validFrom: Date
    let validUntil: Date
    let category: String
    let itemIds: [String]
    let restrictions: String?
    let imageUrl: String?
    let storeLocations: [StoreLocation]
    
    static let sampleDeals: [Deal] = [
        Deal(
            id: "1",
            storeId: "publix-001",
            storeName: .publix,
            title: "Buy One Get One Free Cereal",
            description: "Select Kellogg's cereals",
            originalPrice: 4.99,
            salePrice: 2.50,
            discountPercentage: 50.0,
            dealType: .bogo,
            validFrom: Date(),
            validUntil: Calendar.current.date(byAdding: .day, value: 7, to: Date())!,
            category: "Breakfast",
            itemIds: ["cereal-001"],
            restrictions: "Limit 2 per customer",
            imageUrl: nil,
            storeLocations: []
        ),
        Deal(
            id: "2",
            storeId: "kroger-001",
            storeName: .kroger,
            title: "30% Off Fresh Produce",
            description: "All organic vegetables",
            originalPrice: 3.99,
            salePrice: 2.79,
            discountPercentage: 30.0,
            dealType: .discount,
            validFrom: Date(),
            validUntil: Calendar.current.date(byAdding: .day, value: 3, to: Date())!,
            category: "Produce",
            itemIds: ["produce-001"],
            restrictions: nil,
            imageUrl: nil,
            storeLocations: []
        )
    ]
}

// MARK: - Store Location Model
struct StoreLocation: Identifiable, Codable {
    let id: String
    let storeChain: StoreChain
    let name: String
    let address: String
    let latitude: Double
    let longitude: Double
    let phoneNumber: String?
    let hours: StoreHours
}

// MARK: - Store Hours Model
struct StoreHours: Codable {
    let monday: DayHours
    let tuesday: DayHours
    let wednesday: DayHours
    let thursday: DayHours
    let friday: DayHours
    let saturday: DayHours
    let sunday: DayHours
}

struct DayHours: Codable {
    let open: String
    let close: String
    let isClosed: Bool
}

// MARK: - Shopping List Item Model
struct ShoppingListItem: Identifiable, Codable {
    let id: String
    let userId: String
    let dealId: String
    let itemName: String
    let quantity: Int
    let priority: Priority
    let addedAt: Date
    let category: String
    let notes: String?
}

// MARK: - User Model
struct User: Identifiable, Codable {
    let id: String
    let deviceId: String
    let preferences: UserPreferences
    let location: UserLocation?
}

struct UserPreferences: Codable {
    let maxRadius: Double
    let preferredStores: [String]
    let categories: [String]
    let notificationSettings: NotificationSettings
}

struct UserLocation: Codable {
    let latitude: Double
    let longitude: Double
    let lastUpdated: Date
}

struct NotificationSettings: Codable {
    let dealExpirationReminders: Bool
    let newDealAlerts: Bool
    let priceDropAlerts: Bool
    let pushNotificationsEnabled: Bool
}

// MARK: - Enums
enum StoreChain: String, Codable, CaseIterable {
    case publix = "publix"
    case kroger = "kroger"
}

enum DealType: String, Codable, CaseIterable {
    case bogo = "bogo"
    case discount = "discount"
    case coupon = "coupon"
}

enum Priority: String, Codable, CaseIterable {
    case low = "low"
    case medium = "medium"
    case high = "high"
}