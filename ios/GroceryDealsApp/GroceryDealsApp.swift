import SwiftUI

@main
struct GroceryDealsApp: App {
    let coreDataManager = CoreDataManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, coreDataManager.viewContext)
                .environmentObject(coreDataManager)
        }
    }
}