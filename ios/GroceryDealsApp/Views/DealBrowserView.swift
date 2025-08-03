import SwiftUI

struct DealBrowserView: View {
    @StateObject private var viewModel = DealBrowserViewModel()
    @State private var searchText = ""
    @State private var selectedCategory: String = "All"
    @State private var selectedStore: StoreChain? = nil
    @State private var showingFilters = false
    @State private var viewMode: ViewMode = .grid
    
    enum ViewMode {
        case grid, list
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search and Filter Bar
                searchAndFilterBar
                
                // Deals Content
                if viewModel.isLoading {
                    loadingView
                } else if viewModel.deals.isEmpty {
                    emptyStateView
                } else {
                    dealsContentView
                }
            }
            .navigationTitle("Deals")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    viewModeToggle
                }
            }
            .sheet(isPresented: $showingFilters) {
                FilterView(
                    selectedCategory: $selectedCategory,
                    selectedStore: $selectedStore,
                    availableCategories: viewModel.availableCategories
                )
            }
        }
        .onAppear {
            viewModel.loadDeals()
        }
        .onChange(of: searchText) { _ in
            viewModel.filterDeals(
                searchText: searchText,
                category: selectedCategory,
                store: selectedStore
            )
        }
        .onChange(of: selectedCategory) { _ in
            viewModel.filterDeals(
                searchText: searchText,
                category: selectedCategory,
                store: selectedStore
            )
        }
        .onChange(of: selectedStore) { _ in
            viewModel.filterDeals(
                searchText: searchText,
                category: selectedCategory,
                store: selectedStore
            )
        }
    }
    
    // MARK: - Search and Filter Bar
    private var searchAndFilterBar: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search deals...", text: $searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                Button(action: { showingFilters = true }) {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .font(.title2)
                        .foregroundColor(.accentColor)
                }
            }
            .padding(.horizontal)
            
            // Active Filters Display
            if selectedCategory != "All" || selectedStore != nil {
                activeFiltersView
            }
        }
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }
    
    private var activeFiltersView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                if selectedCategory != "All" {
                    FilterChip(
                        title: selectedCategory,
                        onRemove: { selectedCategory = "All" }
                    )
                }
                
                if let store = selectedStore {
                    FilterChip(
                        title: store.rawValue.capitalized,
                        onRemove: { selectedStore = nil }
                    )
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - View Mode Toggle
    private var viewModeToggle: some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                viewMode = viewMode == .grid ? .list : .grid
            }
        }) {
            Image(systemName: viewMode == .grid ? "list.bullet" : "square.grid.2x2")
                .font(.title2)
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView("Loading deals...")
                .scaleEffect(1.2)
            Spacer()
        }
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "tag.slash")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No deals found")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Try adjusting your search or filters")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Clear Filters") {
                searchText = ""
                selectedCategory = "All"
                selectedStore = nil
            }
            .buttonStyle(.bordered)
            
            Spacer()
        }
        .padding()
    }
    
    // MARK: - Deals Content View
    private var dealsContentView: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                if viewMode == .grid {
                    dealGridView
                } else {
                    dealListView
                }
            }
        }
        .refreshable {
            await viewModel.refreshDeals()
        }
    }
    
    private var dealGridView: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8)
        ], spacing: 12) {
            ForEach(viewModel.filteredDeals) { deal in
                NavigationLink(destination: DealDetailView(deal: deal)) {
                    DealGridCard(deal: deal) {
                        viewModel.addToShoppingList(deal)
                    }
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding()
    }
    
    private var dealListView: some View {
        LazyVStack(spacing: 8) {
            ForEach(viewModel.filteredDeals) { deal in
                NavigationLink(destination: DealDetailView(deal: deal)) {
                    DealListCard(deal: deal) {
                        viewModel.addToShoppingList(deal)
                    }
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding()
    }
}

#Preview {
    DealBrowserView()
}