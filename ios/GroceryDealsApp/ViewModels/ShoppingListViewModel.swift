import Foundation
import Combine

@MainActor
class ShoppingListViewModel: ObservableObject {
    @Published var shoppingListItems: [ShoppingListItem] = []
    @Published var filteredItems: [ShoppingListItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedCategory = "All"
    @Published var selectedStore: StoreChain?
    @Published var showingFilters = false
    
    private let coreDataManager = CoreDataManager.shared
    private let dealAPIClient = DealAPIClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    // Available categories for filtering
    var availableCategories: [String] {
        let categories = Set(shoppingListItems.map { $0.category })
        return ["All"] + Array(categories).sorted()
    }
    
    // Items with upcoming sales (deals expiring within 3 days)
    var itemsWithUpcomingSales: Set<String> {
        let threeDaysFromNow = Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date()
        return Set(shoppingListItems.compactMap { item in
            // Check if there's a deal for this item that expires within 3 days
            if let deal = getCachedDeal(for: item.dealId),
               deal.validUntil <= threeDaysFromNow {
                return item.id
            }
            return nil
        })
    }
    
    init() {
        setupFilterObservers()
        loadShoppingListItems()
    }
    
    // MARK: - Setup
    
    private func setupFilterObservers() {
        // Observe filter changes and update filtered items
        Publishers.CombineLatest($selectedCategory, $selectedStore)
            .combineLatest($shoppingListItems)
            .map { (filters, items) in
                let (category, store) = filters
                return self.filterItems(items, category: category, store: store)
            }
            .assign(to: &$filteredItems)
    }
    
    // MARK: - Data Loading
    
    func loadShoppingListItems() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                // First load from cache
                let cachedItems = await coreDataManager.fetchCachedShoppingListItems()
                self.shoppingListItems = cachedItems
                
                // Then try to fetch from API
                let apiItems = try await dealAPIClient.fetchShoppingListItems()
                self.shoppingListItems = apiItems
                
                // Cache the API results
                await coreDataManager.cacheShoppingListItems(apiItems)
                
                self.isLoading = false
            } catch {
                // If API fails, use cached data
                let cachedItems = await coreDataManager.fetchCachedShoppingListItems()
                self.shoppingListItems = cachedItems
                self.errorMessage = "Using cached data: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }
    
    // MARK: - Shopping List Operations
    
    func addItemToShoppingList(_ deal: Deal, quantity: Int = 1, priority: Priority = .medium, notes: String? = nil) {
        let newItem = ShoppingListItem(
            id: UUID().uuidString,
            userId: "current-user", // In a real app, this would come from user authentication
            dealId: deal.id,
            itemName: deal.title,
            quantity: quantity,
            priority: priority,
            addedAt: Date(),
            category: deal.category,
            notes: notes
        )
        
        // Add to local array immediately for responsive UI
        shoppingListItems.append(newItem)
        
        // Save to Core Data
        coreDataManager.saveShoppingListItem(newItem)
        
        // Sync with backend
        Task {
            do {
                try await dealAPIClient.addShoppingListItem(newItem)
            } catch {
                // If API call fails, keep the item locally but show error
                errorMessage = "Item saved locally. Sync failed: \(error.localizedDescription)"
            }
        }
    }
    
    func removeItemFromShoppingList(_ item: ShoppingListItem) {
        // Remove from local array immediately
        shoppingListItems.removeAll { $0.id == item.id }
        
        // Remove from Core Data
        Task {
            await removeItemFromCache(item.id)
            
            // Sync with backend
            do {
                try await dealAPIClient.removeShoppingListItem(item.id)
            } catch {
                errorMessage = "Item removed locally. Sync failed: \(error.localizedDescription)"
            }
        }
    }
    
    func updateItemQuantity(_ item: ShoppingListItem, quantity: Int) {
        guard let index = shoppingListItems.firstIndex(where: { $0.id == item.id }) else { return }
        
        let updatedItem = ShoppingListItem(
            id: item.id,
            userId: item.userId,
            dealId: item.dealId,
            itemName: item.itemName,
            quantity: quantity,
            priority: item.priority,
            addedAt: item.addedAt,
            category: item.category,
            notes: item.notes
        )
        
        shoppingListItems[index] = updatedItem
        
        // Save to Core Data
        coreDataManager.saveShoppingListItem(updatedItem)
        
        // Sync with backend
        Task {
            do {
                try await dealAPIClient.updateShoppingListItem(updatedItem)
            } catch {
                errorMessage = "Item updated locally. Sync failed: \(error.localizedDescription)"
            }
        }
    }
    
    func updateItemPriority(_ item: ShoppingListItem, priority: Priority) {
        guard let index = shoppingListItems.firstIndex(where: { $0.id == item.id }) else { return }
        
        let updatedItem = ShoppingListItem(
            id: item.id,
            userId: item.userId,
            dealId: item.dealId,
            itemName: item.itemName,
            quantity: item.quantity,
            priority: priority,
            addedAt: item.addedAt,
            category: item.category,
            notes: item.notes
        )
        
        shoppingListItems[index] = updatedItem
        
        // Save to Core Data
        coreDataManager.saveShoppingListItem(updatedItem)
        
        // Sync with backend
        Task {
            do {
                try await dealAPIClient.updateShoppingListItem(updatedItem)
            } catch {
                errorMessage = "Item updated locally. Sync failed: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - Filtering
    
    private func filterItems(_ items: [ShoppingListItem], category: String, store: StoreChain?) -> [ShoppingListItem] {
        var filtered = items
        
        // Filter by category
        if category != "All" {
            filtered = filtered.filter { $0.category == category }
        }
        
        // Filter by store
        if let store = store {
            filtered = filtered.filter { item in
                if let deal = getCachedDeal(for: item.dealId) {
                    return deal.storeName == store
                }
                return false
            }
        }
        
        // Sort by priority and date added
        return filtered.sorted { item1, item2 in
            if item1.priority != item2.priority {
                return priorityOrder(item1.priority) < priorityOrder(item2.priority)
            }
            return item1.addedAt > item2.addedAt
        }
    }
    
    private func priorityOrder(_ priority: Priority) -> Int {
        switch priority {
        case .high: return 0
        case .medium: return 1
        case .low: return 2
        }
    }
    
    func clearFilters() {
        selectedCategory = "All"
        selectedStore = nil
    }
    
    // MARK: - Helper Methods
    
    private func getCachedDeal(for dealId: String) -> Deal? {
        // In a real implementation, this would fetch from Core Data or cache
        // For now, we'll use the sample deals
        return Deal.sampleDeals.first { $0.id == dealId }
    }
    
    private func removeItemFromCache(_ itemId: String) async {
        // This would remove the item from Core Data
        // Implementation would depend on Core Data setup
    }
    
    func refreshData() {
        loadShoppingListItems()
    }
    
    // MARK: - Computed Properties
    
    var hasActiveFilters: Bool {
        selectedCategory != "All" || selectedStore != nil
    }
    
    var activeFiltersText: String {
        var filters: [String] = []
        
        if selectedCategory != "All" {
            filters.append(selectedCategory)
        }
        
        if let store = selectedStore {
            filters.append(store.rawValue.capitalized)
        }
        
        return filters.joined(separator: ", ")
    }
}