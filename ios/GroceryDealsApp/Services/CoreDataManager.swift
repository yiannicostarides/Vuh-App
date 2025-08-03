import Foundation
import CoreData
import Combine

@MainActor
class CoreDataManager: ObservableObject {
    static let shared = CoreDataManager()
    
    @Published var isLoading = false
    @Published var lastError: CoreDataError?
    
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "GroceryDeals")
        container.loadPersistentStores { _, error in
            if let error = error as NSError? {
                // In production, you should handle this error appropriately
                fatalError("Core Data error: \(error), \(error.userInfo)")
            }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
        return container
    }()
    
    var viewContext: NSManagedObjectContext {
        return persistentContainer.viewContext
    }
    
    private init() {}
    
    // MARK: - Save Context
    
    func save() {
        let context = persistentContainer.viewContext
        
        if context.hasChanges {
            do {
                try context.save()
                lastError = nil
            } catch {
                lastError = .saveFailed(error)
                print("Core Data save error: \(error)")
            }
        }
    }
    
    // MARK: - Deal Caching
    
    func cacheDeals(_ deals: [Deal]) async {
        isLoading = true
        defer { isLoading = false }
        
        let context = persistentContainer.newBackgroundContext()
        
        await context.perform {
            // Clear existing deals older than 1 hour
            let oneHourAgo = Date().addingTimeInterval(-3600)
            let fetchRequest: NSFetchRequest<CachedDeal> = CachedDeal.fetchRequest()
            fetchRequest.predicate = NSPredicate(format: "lastUpdated < %@", oneHourAgo as NSDate)
            
            do {
                let oldDeals = try context.fetch(fetchRequest)
                for deal in oldDeals {
                    context.delete(deal)
                }
            } catch {
                self.lastError = .fetchFailed(error)
                return
            }
            
            // Cache new deals
            for deal in deals {
                let cachedDeal = CachedDeal(context: context)
                cachedDeal.id = deal.id
                cachedDeal.storeId = deal.storeId
                cachedDeal.storeName = deal.storeName.rawValue
                cachedDeal.title = deal.title
                cachedDeal.dealDescription = deal.description
                cachedDeal.originalPrice = deal.originalPrice
                cachedDeal.salePrice = deal.salePrice
                cachedDeal.discountPercentage = deal.discountPercentage
                cachedDeal.dealType = deal.dealType.rawValue
                cachedDeal.validFrom = deal.validFrom
                cachedDeal.validUntil = deal.validUntil
                cachedDeal.category = deal.category
                cachedDeal.itemIds = deal.itemIds
                cachedDeal.restrictions = deal.restrictions
                cachedDeal.imageUrl = deal.imageUrl
                cachedDeal.lastUpdated = Date()
                
                // Cache store locations
                for location in deal.storeLocations {
                    let cachedLocation = CachedStoreLocation(context: context)
                    cachedLocation.id = location.id
                    cachedLocation.storeChain = location.storeChain.rawValue
                    cachedLocation.name = location.name
                    cachedLocation.address = location.address
                    cachedLocation.latitude = location.latitude
                    cachedLocation.longitude = location.longitude
                    cachedLocation.phoneNumber = location.phoneNumber
                    cachedLocation.deal = cachedDeal
                }
            }
            
            do {
                try context.save()
                self.lastError = nil
            } catch {
                self.lastError = .saveFailed(error)
            }
        }
    }
    
    func fetchCachedDeals() async -> [Deal] {
        isLoading = true
        defer { isLoading = false }
        
        let context = persistentContainer.viewContext
        let fetchRequest: NSFetchRequest<CachedDeal> = CachedDeal.fetchRequest()
        fetchRequest.sortDescriptors = [NSSortDescriptor(keyPath: \CachedDeal.lastUpdated, ascending: false)]
        
        do {
            let cachedDeals = try context.fetch(fetchRequest)
            let deals = cachedDeals.compactMap { cachedDeal -> Deal? in
                return convertCachedDealToDeal(cachedDeal)
            }
            lastError = nil
            return deals
        } catch {
            lastError = .fetchFailed(error)
            return []
        }
    }
    
    func fetchCachedDeal(by id: String) async -> Deal? {
        let context = persistentContainer.viewContext
        let fetchRequest: NSFetchRequest<CachedDeal> = CachedDeal.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", id)
        fetchRequest.fetchLimit = 1
        
        do {
            let cachedDeals = try context.fetch(fetchRequest)
            guard let cachedDeal = cachedDeals.first else { return nil }
            return convertCachedDealToDeal(cachedDeal)
        } catch {
            lastError = .fetchFailed(error)
            return nil
        }
    }
    
    // MARK: - Shopping List Caching
    
    func cacheShoppingListItems(_ items: [ShoppingListItem]) async {
        isLoading = true
        defer { isLoading = false }
        
        let context = persistentContainer.newBackgroundContext()
        
        await context.perform {
            // Clear existing items
            let fetchRequest: NSFetchRequest<CachedShoppingListItem> = CachedShoppingListItem.fetchRequest()
            
            do {
                let existingItems = try context.fetch(fetchRequest)
                for item in existingItems {
                    context.delete(item)
                }
            } catch {
                self.lastError = .fetchFailed(error)
                return
            }
            
            // Cache new items
            for item in items {
                let cachedItem = CachedShoppingListItem(context: context)
                cachedItem.id = item.id
                cachedItem.userId = item.userId
                cachedItem.dealId = item.dealId
                cachedItem.itemName = item.itemName
                cachedItem.quantity = Int32(item.quantity)
                cachedItem.priority = item.priority.rawValue
                cachedItem.addedAt = item.addedAt
                cachedItem.category = item.category
                cachedItem.notes = item.notes
                cachedItem.lastUpdated = Date()
            }
            
            do {
                try context.save()
                self.lastError = nil
            } catch {
                self.lastError = .saveFailed(error)
            }
        }
    }
    
    func fetchCachedShoppingListItems() async -> [ShoppingListItem] {
        isLoading = true
        defer { isLoading = false }
        
        let context = persistentContainer.viewContext
        let fetchRequest: NSFetchRequest<CachedShoppingListItem> = CachedShoppingListItem.fetchRequest()
        fetchRequest.sortDescriptors = [NSSortDescriptor(keyPath: \CachedShoppingListItem.addedAt, ascending: false)]
        
        do {
            let cachedItems = try context.fetch(fetchRequest)
            let items = cachedItems.compactMap { cachedItem -> ShoppingListItem? in
                return convertCachedShoppingListItemToShoppingListItem(cachedItem)
            }
            lastError = nil
            return items
        } catch {
            lastError = .fetchFailed(error)
            return []
        }
    }
    
    // MARK: - Helper Methods
    
    private func convertCachedDealToDeal(_ cachedDeal: CachedDeal) -> Deal? {
        guard let id = cachedDeal.id,
              let storeId = cachedDeal.storeId,
              let storeNameString = cachedDeal.storeName,
              let storeName = StoreChain(rawValue: storeNameString),
              let title = cachedDeal.title,
              let description = cachedDeal.dealDescription,
              let dealTypeString = cachedDeal.dealType,
              let dealType = DealType(rawValue: dealTypeString),
              let validFrom = cachedDeal.validFrom,
              let validUntil = cachedDeal.validUntil,
              let category = cachedDeal.category else {
            return nil
        }
        
        let storeLocations = (cachedDeal.storeLocations?.allObjects as? [CachedStoreLocation])?.compactMap { cachedLocation -> StoreLocation? in
            guard let locationId = cachedLocation.id,
                  let storeChainString = cachedLocation.storeChain,
                  let storeChain = StoreChain(rawValue: storeChainString),
                  let name = cachedLocation.name,
                  let address = cachedLocation.address else {
                return nil
            }
            
            return StoreLocation(
                id: locationId,
                storeChain: storeChain,
                name: name,
                address: address,
                latitude: cachedLocation.latitude,
                longitude: cachedLocation.longitude,
                phoneNumber: cachedLocation.phoneNumber,
                hours: StoreHours(
                    monday: DayHours(open: "8:00", close: "22:00", isClosed: false),
                    tuesday: DayHours(open: "8:00", close: "22:00", isClosed: false),
                    wednesday: DayHours(open: "8:00", close: "22:00", isClosed: false),
                    thursday: DayHours(open: "8:00", close: "22:00", isClosed: false),
                    friday: DayHours(open: "8:00", close: "22:00", isClosed: false),
                    saturday: DayHours(open: "8:00", close: "22:00", isClosed: false),
                    sunday: DayHours(open: "8:00", close: "21:00", isClosed: false)
                )
            )
        } ?? []
        
        return Deal(
            id: id,
            storeId: storeId,
            storeName: storeName,
            title: title,
            description: description,
            originalPrice: cachedDeal.originalPrice,
            salePrice: cachedDeal.salePrice,
            discountPercentage: cachedDeal.discountPercentage,
            dealType: dealType,
            validFrom: validFrom,
            validUntil: validUntil,
            category: category,
            itemIds: cachedDeal.itemIds ?? [],
            restrictions: cachedDeal.restrictions,
            imageUrl: cachedDeal.imageUrl,
            storeLocations: storeLocations
        )
    }
    
    private func convertCachedShoppingListItemToShoppingListItem(_ cachedItem: CachedShoppingListItem) -> ShoppingListItem? {
        guard let id = cachedItem.id,
              let userId = cachedItem.userId,
              let dealId = cachedItem.dealId,
              let itemName = cachedItem.itemName,
              let priorityString = cachedItem.priority,
              let priority = Priority(rawValue: priorityString),
              let addedAt = cachedItem.addedAt,
              let category = cachedItem.category else {
            return nil
        }
        
        return ShoppingListItem(
            id: id,
            userId: userId,
            dealId: dealId,
            itemName: itemName,
            quantity: Int(cachedItem.quantity),
            priority: priority,
            addedAt: addedAt,
            category: category,
            notes: cachedItem.notes
        )
    }
    
    // MARK: - Cache Management
    
    func clearCache() async {
        isLoading = true
        defer { isLoading = false }
        
        let context = persistentContainer.newBackgroundContext()
        
        await context.perform {
            // Clear deals
            let dealsFetchRequest: NSFetchRequest<NSFetchRequestResult> = CachedDeal.fetchRequest()
            let dealsDeleteRequest = NSBatchDeleteRequest(fetchRequest: dealsFetchRequest)
            
            // Clear shopping list items
            let itemsFetchRequest: NSFetchRequest<NSFetchRequestResult> = CachedShoppingListItem.fetchRequest()
            let itemsDeleteRequest = NSBatchDeleteRequest(fetchRequest: itemsFetchRequest)
            
            do {
                try context.execute(dealsDeleteRequest)
                try context.execute(itemsDeleteRequest)
                try context.save()
                self.lastError = nil
            } catch {
                self.lastError = .deleteFailed(error)
            }
        }
    }
    
    func getCacheSize() -> String {
        let context = persistentContainer.viewContext
        
        do {
            let dealCount = try context.count(for: CachedDeal.fetchRequest())
            let itemCount = try context.count(for: CachedShoppingListItem.fetchRequest())
            return "Deals: \(dealCount), Shopping List Items: \(itemCount)"
        } catch {
            return "Unable to calculate cache size"
        }
    }
}

// MARK: - Core Data Error Types
enum CoreDataError: Error, LocalizedError {
    case saveFailed(Error)
    case fetchFailed(Error)
    case deleteFailed(Error)
    case contextNotAvailable
    
    var errorDescription: String? {
        switch self {
        case .saveFailed(let error):
            return "Failed to save data: \(error.localizedDescription)"
        case .fetchFailed(let error):
            return "Failed to fetch data: \(error.localizedDescription)"
        case .deleteFailed(let error):
            return "Failed to delete data: \(error.localizedDescription)"
        case .contextNotAvailable:
            return "Core Data context is not available"
        }
    }
}