import XCTest
import Combine
@testable import GroceryDealsApp

@MainActor
final class DealAPIClientTests: XCTestCase {
    var apiClient: DealAPIClient!
    var cancellables: Set<AnyCancellable>!
    
    override func setUp() {
        super.setUp()
        apiClient = DealAPIClient()
        cancellables = Set<AnyCancellable>()
    }
    
    override func tearDown() {
        apiClient = nil
        cancellables = nil
        super.tearDown()
    }
    
    func testInitialState() {
        // Test initial state
        XCTAssertFalse(apiClient.isLoading)
        XCTAssertNil(apiClient.lastError)
    }
    
    func testAPIErrorDescriptions() {
        // Test error descriptions
        XCTAssertEqual(APIError.invalidURL.errorDescription, "Invalid URL")
        XCTAssertEqual(APIError.invalidResponse.errorDescription, "Invalid response from server")
        XCTAssertEqual(APIError.noData.errorDescription, "No data received from server")
        
        let networkError = NSError(domain: "TestDomain", code: 123, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        let apiNetworkError = APIError.networkError(networkError)
        XCTAssertEqual(apiNetworkError.errorDescription, "Network error: Test error")
        
        let serverError = APIError.serverError(404)
        XCTAssertEqual(serverError.errorDescription, "Server error with status code: 404")
    }
    
    func testAPIErrorRecoverySuggestions() {
        // Test recovery suggestions
        let networkError = NSError(domain: "TestDomain", code: 123, userInfo: nil)
        let apiNetworkError = APIError.networkError(networkError)
        XCTAssertEqual(apiNetworkError.recoverySuggestion, "Please check your internet connection and try again.")
        
        let serverError500 = APIError.serverError(500)
        XCTAssertEqual(serverError500.recoverySuggestion, "Server is temporarily unavailable. Please try again later.")
        
        let serverError404 = APIError.serverError(404)
        XCTAssertEqual(serverError404.recoverySuggestion, "The requested resource was not found.")
        
        let invalidURLError = APIError.invalidURL
        XCTAssertEqual(invalidURLError.recoverySuggestion, "Please try again later.")
    }
    
    func testFetchNearbyDealsInvalidCoordinates() async {
        // Test with invalid coordinates (this would normally make a network request)
        // In a real test environment, we would mock the URLSession
        
        do {
            let _ = try await apiClient.fetchNearbyDeals(latitude: 999.0, longitude: 999.0)
            XCTFail("Should have thrown an error")
        } catch {
            // Expected to fail due to invalid coordinates or network issues
            XCTAssertTrue(error is APIError)
        }
    }
    
    func testFetchDealByIdInvalidId() async {
        // Test with invalid deal ID
        do {
            let _ = try await apiClient.fetchDealById("invalid-id")
            XCTFail("Should have thrown an error")
        } catch {
            // Expected to fail due to invalid ID or network issues
            XCTAssertTrue(error is APIError)
        }
    }
    
    func testAddToShoppingListInvalidDealId() async {
        // Test adding invalid deal to shopping list
        do {
            let _ = try await apiClient.addToShoppingList(dealId: "invalid-deal-id")
            XCTFail("Should have thrown an error")
        } catch {
            // Expected to fail due to invalid deal ID or network issues
            XCTAssertTrue(error is APIError)
        }
    }
    
    func testFetchShoppingListNetworkError() async {
        // Test fetching shopping list (would normally make network request)
        do {
            let _ = try await apiClient.fetchShoppingList()
            XCTFail("Should have thrown an error in test environment")
        } catch {
            // Expected to fail due to network issues in test environment
            XCTAssertTrue(error is APIError)
        }
    }
    
    func testFetchPriceComparisonInvalidItemId() async {
        // Test price comparison with invalid item ID
        do {
            let _ = try await apiClient.fetchPriceComparison(for: "invalid-item-id")
            XCTFail("Should have thrown an error")
        } catch {
            // Expected to fail due to invalid item ID or network issues
            XCTAssertTrue(error is APIError)
        }
    }
    
    func testLoadingStateChanges() {
        // Test that loading state changes are published
        let expectation = XCTestExpectation(description: "Loading state should change")
        
        apiClient.$isLoading
            .dropFirst() // Skip initial value
            .sink { isLoading in
                if isLoading {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // Trigger a network request that will change loading state
        Task {
            do {
                let _ = try await apiClient.fetchNearbyDeals(latitude: 0.0, longitude: 0.0)
            } catch {
                // Expected to fail, we're just testing loading state
            }
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
}

// MARK: - Mock Data for Testing
extension DealAPIClientTests {
    func createMockDeal() -> Deal {
        return Deal(
            id: "test-deal-1",
            storeId: "test-store-1",
            storeName: .publix,
            title: "Test Deal",
            description: "Test Description",
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
        )
    }
    
    func createMockShoppingListItem() -> ShoppingListItem {
        return ShoppingListItem(
            id: "test-item-1",
            userId: "test-user-1",
            dealId: "test-deal-1",
            itemName: "Test Item",
            quantity: 1,
            priority: .medium,
            addedAt: Date(),
            category: "Test Category",
            notes: nil
        )
    }
}