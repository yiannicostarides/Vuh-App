import SwiftUI

struct DealListCard: View {
    let deal: Deal
    let onAddToList: () -> Void
    
    @State private var showingAddedFeedback = false
    
    var body: some View {
        HStack(spacing: 12) {
            // Deal Image
            dealImageView
            
            // Deal Content
            VStack(alignment: .leading, spacing: 6) {
                // Store and expiration info
                HStack {
                    storeBadge
                    
                    Spacer()
                    
                    if isExpiringSoon {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.caption2)
                            Text("Expires soon")
                                .font(.caption2)
                        }
                        .foregroundColor(.orange)
                    }
                }
                
                // Deal Title
                Text(deal.title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                
                // Deal Description
                Text(deal.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                // Price and discount info
                HStack {
                    priceView
                    
                    Spacer()
                    
                    dealTypeBadge
                }
            }
            
            // Add to list button
            addToListButton
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.systemGray6), lineWidth: 1)
        )
        .contextMenu {
            contextMenuItems
        }
        .scaleEffect(showingAddedFeedback ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: showingAddedFeedback)
    }
    
    // MARK: - Deal Image View
    private var dealImageView: some View {
        ZStack {
            Rectangle()
                .fill(Color(.systemGray6))
                .frame(width: 80, height: 80)
            
            if let imageUrl = deal.imageUrl, !imageUrl.isEmpty {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ProgressView()
                        .scaleEffect(0.6)
                }
            } else {
                Image(systemName: "tag.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.secondary)
            }
        }
        .frame(width: 80, height: 80)
        .clipped()
        .cornerRadius(8)
    }
    
    // MARK: - Store Badge
    private var storeBadge: some View {
        Text(deal.storeName.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(storeColor)
            .cornerRadius(8)
    }
    
    // MARK: - Price View
    private var priceView: some View {
        VStack(alignment: .leading, spacing: 2) {
            if deal.originalPrice != deal.salePrice {
                Text("$\(deal.originalPrice, specifier: "%.2f")")
                    .font(.caption)
                    .strikethrough()
                    .foregroundColor(.secondary)
            }
            
            HStack(spacing: 6) {
                Text("$\(deal.salePrice, specifier: "%.2f")")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                if deal.discountPercentage > 0 {
                    Text("\(Int(deal.discountPercentage))% OFF")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .cornerRadius(4)
                }
            }
        }
    }
    
    // MARK: - Deal Type Badge
    private var dealTypeBadge: some View {
        Text(deal.dealType.rawValue.uppercased())
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(dealTypeColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(dealTypeColor.opacity(0.1))
            .cornerRadius(6)
    }
    
    // MARK: - Add to List Button
    private var addToListButton: some View {
        Button(action: {
            addToListWithFeedback()
        }) {
            Image(systemName: "plus.circle.fill")
                .font(.title2)
                .foregroundColor(.accentColor)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Context Menu Items
    private var contextMenuItems: some View {
        Group {
            Button(action: {
                addToListWithFeedback()
            }) {
                Label("Add to Shopping List", systemImage: "plus.circle")
            }
            
            Button(action: {
                shareDeals()
            }) {
                Label("Share Deal", systemImage: "square.and.arrow.up")
            }
        }
    }
    
    // MARK: - Computed Properties
    private var storeColor: Color {
        switch deal.storeName {
        case .publix:
            return Color.green
        case .kroger:
            return Color.blue
        }
    }
    
    private var dealTypeColor: Color {
        switch deal.dealType {
        case .bogo:
            return Color.purple
        case .discount:
            return Color.orange
        case .coupon:
            return Color.blue
        }
    }
    
    private var isExpiringSoon: Bool {
        let timeInterval = deal.validUntil.timeIntervalSinceNow
        return timeInterval < 86400 * 2 // 2 days
    }
    
    // MARK: - Actions
    private func addToListWithFeedback() {
        showingAddedFeedback = true
        onAddToList()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            showingAddedFeedback = false
        }
    }
    
    private func shareDeals() {
        let shareText = "\(deal.title) - \(deal.storeName.rawValue.capitalized)\n$\(deal.salePrice, specifier: "%.2f")"
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else { return }
        
        let activityVC = UIActivityViewController(activityItems: [shareText], applicationActivities: nil)
        window.rootViewController?.present(activityVC, animated: true)
    }
}

#Preview {
    DealListCard(deal: Deal.sampleDeals[0]) {
        print("Added to shopping list")
    }
    .padding()
}