import SwiftUI
import Combine

@MainActor
class DealBrowserViewModel: ObservableObject {
    @Published var deals: [Deal] = []
    @Published var filteredDeals: [Deal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let dealAPIClient = DealAPIClient.shared
    private let coreDataManager = CoreDataManager.shared
    private var cancellables = Set<AnyCancellable>()
    
    var availableCategories: [String] {
        let categories = Set(deals.map { $0.category })
        return ["All"] + Array(categories).sorted()
    }
    
    init() {
        // Load cached deals initially
        loadCachedDeals()
    }
    
    func loadDeals() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let fetchedDeals = try await dealAPIClient.fetchNearbyDeals()
                await MainActor.run {
                    self.deals = fetchedDeals
                    self.filteredDeals = fetchedDeals
                    self.isLoading = false
                    
                    // Cache deals locally
                    self.cacheDeals(fetchedDeals)
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                    
                    // Fallback to cached deals if network fails
                    self.loadCachedDeals()
                }
            }
        }
    }
    
    func refreshDeals() async {
        do {
            let fetchedDeals = try await dealAPIClient.fetchNearbyDeals()
            await MainActor.run {
                self.deals = fetchedDeals
                self.filteredDeals = fetchedDeals
                
                // Cache refreshed deals
                self.cacheDeals(fetchedDeals)
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    func filterDeals(searchText: String, category: String, store: StoreChain?) {
        var filtered = deals
        
        // Filter by search text
        if !searchText.isEmpty {
            filtered = filtered.filter { deal in
                deal.title.localizedCaseInsensitiveContains(searchText) ||
                deal.description.localizedCaseInsensitiveContains(searchText) ||
                deal.category.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        // Filter by category
        if category != "All" {
            filtered = filtered.filter { $0.category == category }
        }
        
        // Filter by store
        if let store = store {
            filtered = filtered.filter { $0.storeName == store }
        }
        
        filteredDeals = filtered
    }
    
    func addToShoppingList(_ deal: Deal) {
        // Create shopping list item
        let shoppingListItem = ShoppingListItem(
            id: UUID().uuidString,
            userId: "current-user", // TODO: Get from user session
            dealId: deal.id,
            itemName: deal.title,
            quantity: 1,
            priority: .medium,
            addedAt: Date(),
            category: deal.category,
            notes: nil
        )
        
        // Save to Core Data
        coreDataManager.saveShoppingListItem(shoppingListItem)
        
        // Show success feedback
        showSuccessFeedback()
    }
    
    private func loadCachedDeals() {
        let cachedDeals = coreDataManager.fetchCachedDeals()
        self.deals = cachedDeals
        self.filteredDeals = cachedDeals
    }
    
    private func cacheDeals(_ deals: [Deal]) {
        coreDataManager.cacheDeals(deals)
    }
    
    private func showSuccessFeedback() {
        // TODO: Implement haptic feedback and/or toast notification
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()
    }
}