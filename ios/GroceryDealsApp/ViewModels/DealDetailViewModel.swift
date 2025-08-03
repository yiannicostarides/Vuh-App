import SwiftUI
import UserNotifications

@MainActor
class DealDetailViewModel: ObservableObject {
    @Published var isAddingToList = false
    @Published var showingSuccessMessage = false
    
    private let coreDataManager = CoreDataManager.shared
    
    func addToShoppingList(_ deal: Deal) {
        isAddingToList = true
        
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
        
        isAddingToList = false
    }
    
    func setReminder(for deal: Deal) {
        // Request notification permission
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                self.scheduleReminderNotification(for: deal)
            }
        }
    }
    
    private func scheduleReminderNotification(for deal: Deal) {
        let content = UNMutableNotificationContent()
        content.title = "Deal Expiring Soon!"
        content.body = "\(deal.title) expires tomorrow. Don't miss out on this deal!"
        content.sound = .default
        
        // Schedule notification for 1 day before expiration
        let expirationDate = deal.validUntil
        let reminderDate = Calendar.current.date(byAdding: .day, value: -1, to: expirationDate) ?? expirationDate
        
        // Only schedule if reminder date is in the future
        if reminderDate > Date() {
            let dateComponents = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: reminderDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)
            
            let request = UNNotificationRequest(
                identifier: "deal-reminder-\(deal.id)",
                content: content,
                trigger: trigger
            )
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("Error scheduling notification: \(error)")
                } else {
                    DispatchQueue.main.async {
                        self.showReminderSetFeedback()
                    }
                }
            }
        }
    }
    
    private func showSuccessFeedback() {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()
        
        // Visual feedback
        showingSuccessMessage = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.showingSuccessMessage = false
        }
    }
    
    private func showReminderSetFeedback() {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
        
        // TODO: Show toast or alert confirming reminder was set
    }
}