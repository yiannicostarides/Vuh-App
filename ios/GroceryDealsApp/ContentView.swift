import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            DealBrowserView()
                .tabItem {
                    Image(systemName: "tag.fill")
                    Text("Deals")
                }
            
            ShoppingListView()
                .tabItem {
                    Image(systemName: "list.bullet")
                    Text("Shopping List")
                }
            
            PriceComparisonView()
                .tabItem {
                    Image(systemName: "chart.bar.fill")
                    Text("Compare")
                }
        }
    }
}

// Placeholder views for other app components
struct ShoppingListView: View {
    var body: some View {
        NavigationView {
            Text("Shopping List")
                .navigationTitle("My List")
        }
    }
}

struct PriceComparisonView: View {
    var body: some View {
        NavigationView {
            Text("Price Comparison")
                .navigationTitle("Compare Prices")
        }
    }
}

#Preview {
    ContentView()
}