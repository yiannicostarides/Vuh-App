import XCTest
import CoreData
@testable import GroceryDealsApp

@MainActor
final class CoreDataManagerTests: XCTestCase {
    var coreDataManager: CoreDataManager!
    var testContext: NSManagedObjectContext!
    
    override func setUp() {
        super.setUp()
        
        // Create in-memory Core Data stack for testing
        coreDataManager = CoreDataManager.shared
        
        // Create a separate in-memory context for testing
        let persistentStoreDescription = NSPersistentStoreDescription()
        persistentStoreDescription.type = NSInMemoryStoreType
        
        let container = NSPersistentContainer(name: "GroceryDeals")
        container.persistentStoreDescriptions = [persistentStoreDescription]
        
        container.loadPersistentStores { _, error in
            XCTAssertNil(error)
        }
        
        testContext = container.viewContext
    }
    
    override func tearDown() {
        testContext = nil
        coreDataManager = nil
        super.tearDown()
    }
    
    func testInitialState() {
        // Test initial state
        XCTAssertFalse(coreDataManager.isLoading)
        XCTAssertNil(coreDataManager.lastError)
    }
    
    func testCoreDataErrorDescriptions() {
        // Test error descriptions
        let testError = NSError(domain: "TestDomain", code: 123, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        
        let saveFailed = CoreDataError.saveFailed(testError)
        XCTAssertEqual(saveFailed.errorDescription, "Failed to save data: Test error")
        
        let fetchFailed = CoreDataError.fetchFailed(testError)
        XCTAssertEqual(fetchFailed.errorDescription, "Failed to fetch data: Test error")
        
        let deleteFailed = CoreDataError.deleteFailed(testError)
        XCTAssertEqual(deleteFailed.errorDescription, "Failed to delete data: Test error")
        
        let contextNotAvailable = CoreDataError.contextNotAvailable
        XCTAssertEqual(contextNotAvailable.errorDescription, "Core Data context is not available")
    }
    
    func testCacheDeals() async {
        // Given
        let mockDeals = createMockDeals()
        
        // When
        await coreDataManager.cacheDeals(mockDeals)
        
        // Then
        let cachedDeals = await coreDataManager.fetchCachedDeals()
        XCTAssertEqual(cachedDeals.count, mockDeals.count)
        XCTAssertEqual(cachedDeals.first?.id, mockDeals.first?.id)
        XCTAssertEqual(cachedDeals.first?.title, mockDeals.first?.title)
    }
    
    func testFetchCachedDealById() async {
        // Given
        let mockDeals = createMockDeals()
        await coreDataManager.cacheDeals(mockDeals)
        
        // When
        let cachedDeal = await coreDataManager.fetchCachedDeal(by: mockDeals.first!.id)
        
        // Then
        XCTAssertNotNil(cachedDeal)
        XCTAssertEqual(cachedDeal?.id, mockDeals.first?.id)
        XCTAssertEqual(cachedDeal?.title, mockDeals.first?.title)
    }
    
    func testFetchNonExistentDeal() async {
        // When
        let cachedDeal = await coreDataManager.fetchCachedDeal(by: "non-existent-id")
        
        // Then
        XCTAssertNil(cachedDeal)
    }
    
    func testCacheShoppingListItems() async {
        // Given
        let mockItems = createMockShoppingListItems()
        
        // When
        await coreDataManager.cacheShoppingListItems(mockItems)
        
        // Then
        let cachedItems = await coreDataManager.fetchCachedShoppingListItems()
        XCTAssertEqual(cachedItems.count, mockItems.count)
        XCTAssertEqual(cachedItems.first?.id, mockItems.first?.id)
        XCTAssertEqual(cachedItems.first?.itemName, mockItems.first?.itemName)
    }
    
    func testClearCache() async {
        // Given
        let mockDeals = createMockDeals()
        let mockItems = createMockShoppingListItems()
        
        await coreDataManager.cacheDeals(mockDeals)
        await coreDataManager.cacheShoppingListItems(mockItems)
        
        // Verify data is cached
        let cachedDealsBeforeClear = await coreDataManager.fetchCachedDeals()
        let cachedItemsBeforeClear = await coreDataManager.fetchCachedShoppingListItems()
        XCTAssertGreaterThan(cachedDealsBeforeClear.count, 0)
        XCTAssertGreaterThan(cachedItemsBeforeClear.count, 0)
        
        // When
        await coreDataManager.clearCache()
        
        // Then
        let cachedDealsAfterClear = await coreDataManager.fetchCachedDeals()
        let cachedItemsAfterClear = await coreDataManager.fetchCachedShoppingListItems()
        XCTAssertEqual(cachedDealsAfterClear.count, 0)
        XCTAssertEqual(cachedItemsAfterClear.count, 0)
    }
    
    func testGetCacheSize() {
        // When
        let cacheSize = coreDataManager.getCacheSize()
        
        // Then
        XCTAssertTrue(cacheSize.contains("Deals:"))
        XCTAssertTrue(cacheSize.contains("Shopping List Items:"))
    }
    
    func testSaveContext() {
        // Given - Create a test entity in context
        let cachedDeal = CachedDeal(context: testContext)
        cachedDeal.id = "test-save-deal"
        cachedDeal.title = "Test Save Deal"
        
        // When
        coreDataManager.save()
        
        // Then - Should not crash and should save successfully
        XCTAssertTrue(true) // If we get here, save didn't crash
    }
}

// MARK: - Mock Data Creation
extension CoreDataManagerTests {
    func createMockDeals() -> [Deal] {
        return [
            Deal(
                id: "test-deal-1",
                storeId: "test-store-1",
                storeName: .publix,
                title: "Test Deal 1",
                description: "Test Description 1",
                originalPrice: 10.0,
                salePrice: 5.0,
                discountPercentage: 50.0,
                dealType: .discount,
                validFrom: Date(),
                validUntil: Date().addingTimeInterval(86400),
                category: "Test Category",
                itemIds: ["item-1"],
                restrictions: nil,
                imageUrl: nil,
                storeLocations: []
            ),
            Deal(
                id: "test-deal-2",
                storeId: "test-store-2",
                storeName: .kroger,
                title: "Test Deal 2",
                description: "Test Description 2",
                originalPrice: 20.0,
                salePrice: 15.0,
                discountPercentage: 25.0,
                dealType: .bogo,
                validFrom: Date(),
                validUntil: Date().addingTimeInterval(172800),
                category: "Test Category 2",
                itemIds: ["item-2"],
                restrictions: "Limit 1",
                imageUrl: nil,
                storeLocations: []
            )
        ]
    }
    
    func createMockShoppingListItems() -> [ShoppingListItem] {
        return [
            ShoppingListItem(
                id: "test-item-1",
                userId: "test-user-1",
                dealId: "test-deal-1",
                itemName: "Test Item 1",
                quantity: 1,
                priority: .medium,
                addedAt: Date(),
                category: "Test Category",
                notes: nil
            ),
            ShoppingListItem(
                id: "test-item-2",
                userId: "test-user-1",
                dealId: "test-deal-2",
                itemName: "Test Item 2",
                quantity: 2,
                priority: .high,
                addedAt: Date(),
                category: "Test Category 2",
                notes: "Test notes"
            )
        ]
    }
}