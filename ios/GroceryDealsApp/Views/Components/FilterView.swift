import SwiftUI

struct FilterView: View {
    @Binding var selectedCategory: String
    @Binding var selectedStore: StoreChain?
    let availableCategories: [String]
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 24) {
                // Category Filter Section
                categoryFilterSection
                
                // Store Filter Section
                storeFilterSection
                
                Spacer()
                
                // Action Buttons
                actionButtons
            }
            .padding()
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Clear All") {
                        selectedCategory = "All"
                        selectedStore = nil
                    }
                    .foregroundColor(.red)
                }
            }
        }
    }
    
    // MARK: - Category Filter Section
    private var categoryFilterSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Category")
                .font(.headline)
                .fontWeight(.semibold)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 8) {
                ForEach(availableCategories, id: \.self) { category in
                    FilterButton(
                        title: category,
                        isSelected: selectedCategory == category
                    ) {
                        selectedCategory = category
                    }
                }
            }
        }
    }
    
    // MARK: - Store Filter Section
    private var storeFilterSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Store")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(spacing: 8) {
                FilterButton(
                    title: "All Stores",
                    isSelected: selectedStore == nil
                ) {
                    selectedStore = nil
                }
                
                ForEach(StoreChain.allCases, id: \.self) { store in
                    FilterButton(
                        title: store.rawValue.capitalized,
                        isSelected: selectedStore == store
                    ) {
                        selectedStore = store
                    }
                }
            }
        }
    }
    
    // MARK: - Action Buttons
    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: {
                dismiss()
            }) {
                Text("Apply Filters")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .cornerRadius(12)
            }
        }
    }
}

struct FilterButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .padding(.horizontal, 16)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(isSelected ? Color.accentColor : Color(.systemGray6))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct FilterChip: View {
    let title: String
    let onRemove: () -> Void
    
    var body: some View {
        HStack(spacing: 6) {
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
            
            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.caption2)
                    .fontWeight(.bold)
            }
        }
        .foregroundColor(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.accentColor)
        .cornerRadius(16)
    }
}

#Preview {
    FilterView(
        selectedCategory: .constant("All"),
        selectedStore: .constant(nil),
        availableCategories: ["All", "Breakfast", "Produce", "Dairy", "Meat"]
    )
}