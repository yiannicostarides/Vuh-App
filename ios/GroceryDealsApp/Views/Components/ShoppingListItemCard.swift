import SwiftUI

struct ShoppingListItemCard: View {
    let item: ShoppingListItem
    let deal: Deal?
    let hasUpcomingSale: Bool
    let onQuantityChange: (Int) -> Void
    let onPriorityChange: (Priority) -> Void
    let onRemove: () -> Void
    
    @State private var showingQuantityPicker = false
    @State private var showingPriorityPicker = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with item name and priority
            headerSection
            
            // Deal information if available
            if let deal = deal {
                dealInfoSection(deal)
            }
            
            // Item details
            itemDetailsSection
            
            // Action buttons
            actionButtonsSection
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .overlay(
            // Upcoming sale indicator
            upcomingSaleIndicator,
            alignment: .topTrailing
        )
        .sheet(isPresented: $showingQuantityPicker) {
            quantityPickerSheet
        }
        .sheet(isPresented: $showingPriorityPicker) {
            priorityPickerSheet
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.itemName)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                
                Text(item.category)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray6))
                    .cornerRadius(4)
            }
            
            Spacer()
            
            priorityIndicator
        }
    }
    
    // MARK: - Deal Info Section
    private func dealInfoSection(_ deal: Deal) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "tag.fill")
                    .foregroundColor(.green)
                    .font(.caption)
                
                Text(deal.storeName.rawValue.capitalized)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                if deal.discountPercentage > 0 {
                    Text("\(Int(deal.discountPercentage))% OFF")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .cornerRadius(4)
                }
            }
            
            HStack {
                if deal.originalPrice != deal.salePrice {
                    Text("$\(deal.originalPrice, specifier: "%.2f")")
                        .font(.caption)
                        .strikethrough()
                        .foregroundColor(.secondary)
                }
                
                Text("$\(deal.salePrice, specifier: "%.2f")")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Text("Valid until \(deal.validUntil, style: .date)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
    
    // MARK: - Item Details Section
    private var itemDetailsSection: some View {
        HStack {
            Label("Qty: \(item.quantity)", systemImage: "number")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text("Added \(item.addedAt, style: .relative)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Action Buttons Section
    private var actionButtonsSection: some View {
        HStack(spacing: 12) {
            Button(action: { showingQuantityPicker = true }) {
                Label("Quantity", systemImage: "number")
                    .font(.caption)
                    .foregroundColor(.blue)
            }
            .buttonStyle(PlainButtonStyle())
            
            Button(action: { showingPriorityPicker = true }) {
                Label("Priority", systemImage: "flag")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
            .buttonStyle(PlainButtonStyle())
            
            Spacer()
            
            Button(action: onRemove) {
                Label("Remove", systemImage: "trash")
                    .font(.caption)
                    .foregroundColor(.red)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
    
    // MARK: - Priority Indicator
    private var priorityIndicator: some View {
        HStack(spacing: 4) {
            Image(systemName: "flag.fill")
                .font(.caption2)
                .foregroundColor(priorityColor)
            
            Text(item.priority.rawValue.capitalized)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(priorityColor)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(priorityColor.opacity(0.1))
        .cornerRadius(4)
    }
    
    private var priorityColor: Color {
        switch item.priority {
        case .high: return .red
        case .medium: return .orange
        case .low: return .gray
        }
    }
    
    // MARK: - Upcoming Sale Indicator
    private var upcomingSaleIndicator: some View {
        Group {
            if hasUpcomingSale {
                HStack(spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.caption2)
                    Text("Sale Ending Soon")
                        .font(.caption2)
                        .fontWeight(.medium)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.red)
                .cornerRadius(8)
                .offset(x: -8, y: 8)
            }
        }
    }
    
    // MARK: - Quantity Picker Sheet
    private var quantityPickerSheet: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Select Quantity")
                    .font(.headline)
                    .padding(.top)
                
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(1...20, id: \.self) { quantity in
                        Button(action: {
                            onQuantityChange(quantity)
                            showingQuantityPicker = false
                        }) {
                            Text("\(quantity)")
                                .font(.headline)
                                .foregroundColor(quantity == item.quantity ? .white : .primary)
                                .frame(width: 60, height: 60)
                                .background(
                                    Circle()
                                        .fill(quantity == item.quantity ? Color.accentColor : Color(.systemGray6))
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
                
                Spacer()
            }
            .navigationTitle("Quantity")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        showingQuantityPicker = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
    
    // MARK: - Priority Picker Sheet
    private var priorityPickerSheet: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Select Priority")
                    .font(.headline)
                    .padding(.top)
                
                VStack(spacing: 12) {
                    ForEach(Priority.allCases, id: \.self) { priority in
                        Button(action: {
                            onPriorityChange(priority)
                            showingPriorityPicker = false
                        }) {
                            HStack {
                                Image(systemName: "flag.fill")
                                    .foregroundColor(colorForPriority(priority))
                                
                                Text(priority.rawValue.capitalized)
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                Spacer()
                                
                                if priority == item.priority {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.accentColor)
                                        .fontWeight(.bold)
                                }
                            }
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(priority == item.priority ? Color.accentColor.opacity(0.1) : Color(.systemGray6))
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
                
                Spacer()
            }
            .navigationTitle("Priority")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        showingPriorityPicker = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
    
    private func colorForPriority(_ priority: Priority) -> Color {
        switch priority {
        case .high: return .red
        case .medium: return .orange
        case .low: return .gray
        }
    }
}

#Preview {
    let sampleItem = ShoppingListItem(
        id: "1",
        userId: "user1",
        dealId: "deal1",
        itemName: "Buy One Get One Free Cereal",
        quantity: 2,
        priority: .high,
        addedAt: Date(),
        category: "Breakfast",
        notes: "Kellogg's brand preferred"
    )
    
    let sampleDeal = Deal.sampleDeals[0]
    
    return ShoppingListItemCard(
        item: sampleItem,
        deal: sampleDeal,
        hasUpcomingSale: true,
        onQuantityChange: { _ in },
        onPriorityChange: { _ in },
        onRemove: { }
    )
    .padding()
    .background(Color(.systemGroupedBackground))
}