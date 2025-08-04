import SwiftUI

struct ShoppingListView: View {
    @StateObject private var viewModel = ShoppingListViewModel()
    @State private var showingAddItemSheet = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter chips section
                if viewModel.hasActiveFilters {
                    activeFiltersSection
                }
                
                // Main content
                if viewModel.isLoading && viewModel.filteredItems.isEmpty {
                    loadingView
                } else if viewModel.filteredItems.isEmpty {
                    emptyStateView
                } else {
                    shoppingListContent
                }
            }
            .navigationTitle("Shopping List")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { viewModel.showingFilters = true }) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                            .foregroundColor(viewModel.hasActiveFilters ? .accentColor : .primary)
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddItemSheet = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                viewModel.refreshData()
            }
            .sheet(isPresented: $viewModel.showingFilters) {
                FilterView(
                    selectedCategory: $viewModel.selectedCategory,
                    selectedStore: $viewModel.selectedStore,
                    availableCategories: viewModel.availableCategories
                )
            }
            .sheet(isPresented: $showingAddItemSheet) {
                AddItemToListSheet(viewModel: viewModel)
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                }
            }
        }
    }
    
    // MARK: - Active Filters Section
    private var activeFiltersSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Text("Filters:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if viewModel.selectedCategory != "All" {
                    FilterChip(title: viewModel.selectedCategory) {
                        viewModel.selectedCategory = "All"
                    }
                }
                
                if let selectedStore = viewModel.selectedStore {
                    FilterChip(title: selectedStore.rawValue.capitalized) {
                        viewModel.selectedStore = nil
                    }
                }
                
                Button("Clear All") {
                    viewModel.clearFilters()
                }
                .font(.caption)
                .foregroundColor(.red)
                
                Spacer()
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading your shopping list...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "cart")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                Text(viewModel.hasActiveFilters ? "No items match your filters" : "Your shopping list is empty")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text(viewModel.hasActiveFilters ? 
                     "Try adjusting your filters or add new items to your list." :
                     "Start adding deals to your shopping list to keep track of great offers.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            if viewModel.hasActiveFilters {
                Button("Clear Filters") {
                    viewModel.clearFilters()
                }
                .buttonStyle(.borderedProminent)
            } else {
                Button("Browse Deals") {
                    showingAddItemSheet = true
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    // MARK: - Shopping List Content
    private var shoppingListContent: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                // Summary section
                summarySection
                
                // Shopping list items
                ForEach(viewModel.filteredItems) { item in
                    ShoppingListItemCard(
                        item: item,
                        deal: getDeal(for: item.dealId),
                        hasUpcomingSale: viewModel.itemsWithUpcomingSales.contains(item.id),
                        onQuantityChange: { quantity in
                            viewModel.updateItemQuantity(item, quantity: quantity)
                        },
                        onPriorityChange: { priority in
                            viewModel.updateItemPriority(item, priority: priority)
                        },
                        onRemove: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                viewModel.removeItemFromShoppingList(item)
                            }
                        }
                    )
                    .transition(.asymmetric(
                        insertion: .scale.combined(with: .opacity),
                        removal: .scale.combined(with: .opacity)
                    ))
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
    }
    
    // MARK: - Summary Section
    private var summarySection: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(viewModel.filteredItems.count) Items")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    if viewModel.hasActiveFilters {
                        Text("Filtered from \(viewModel.shoppingListItems.count) total")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                if !viewModel.itemsWithUpcomingSales.isEmpty {
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.caption)
                                .foregroundColor(.red)
                            
                            Text("\(viewModel.itemsWithUpcomingSales.count) Expiring Soon")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.red)
                        }
                        
                        Text("Check these deals first!")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Priority breakdown
            if !viewModel.filteredItems.isEmpty {
                priorityBreakdownSection
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Priority Breakdown Section
    private var priorityBreakdownSection: some View {
        HStack(spacing: 16) {
            ForEach(Priority.allCases, id: \.self) { priority in
                let count = viewModel.filteredItems.filter { $0.priority == priority }.count
                
                VStack(spacing: 4) {
                    Text("\(count)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(colorForPriority(priority))
                    
                    Text(priority.rawValue.capitalized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 8)
    }
    
    // MARK: - Helper Methods
    private func getDeal(for dealId: String) -> Deal? {
        // In a real implementation, this would fetch from Core Data or cache
        return Deal.sampleDeals.first { $0.id == dealId }
    }
    
    private func colorForPriority(_ priority: Priority) -> Color {
        switch priority {
        case .high: return .red
        case .medium: return .orange
        case .low: return .gray
        }
    }
}

// MARK: - Add Item to List Sheet
struct AddItemToListSheet: View {
    let viewModel: ShoppingListViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedDeal: Deal?
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Add items from the Deal Browser")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
                
                // In a real implementation, this would show available deals
                // For now, we'll show sample deals
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(Deal.sampleDeals) { deal in
                            DealRowForSelection(deal: deal) {
                                viewModel.addItemToShoppingList(deal)
                                dismiss()
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Add to Shopping List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Deal Row for Selection
struct DealRowForSelection: View {
    let deal: Deal
    let onAdd: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(deal.title)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(deal.storeName.rawValue.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("$\(deal.salePrice, specifier: "%.2f")")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)
            }
            
            Spacer()
            
            Button(action: onAdd) {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundColor(.accentColor)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
}

#Preview {
    ShoppingListView()
}