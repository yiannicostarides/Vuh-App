import SwiftUI

struct DealGridCard: View {
    let deal: Deal
    let onAddToList: () -> Void
    
    @State private var showingAddedFeedback = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Deal Image or Placeholder
            dealImageView
            
            // Deal Content
            VStack(alignment: .leading, spacing: 4) {
                // Store Badge
                storeBadge
                
                // Deal Title
                Text(deal.title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                
                // Deal Description
                Text(deal.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                // Price Information
                priceView
                
                // Deal Type Badge
                dealTypeBadge
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.systemGray5), lineWidth: 1)
        )
        .contextMenu {
            contextMenuItems
        }
        .scaleEffect(showingAddedFeedback ? 0.95 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: showingAddedFeedback)
    }
    
    // MARK: - Deal Image View
    private var dealImageView: some View {
        ZStack {
            Rectangle()
                .fill(Color(.systemGray6))
                .frame(height: 120)
            
            if let imageUrl = deal.imageUrl, !imageUrl.isEmpty {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            } else {
                Image(systemName: "tag.fill")
                    .font(.system(size: 30))
                    .foregroundColor(.secondary)
            }
        }
        .frame(height: 120)
        .clipped()
        .cornerRadius(12, corners: [.topLeft, .topRight])
    }
    
    // MARK: - Store Badge
    private var storeBadge: some View {
        HStack {
            Text(deal.storeName.rawValue.capitalized)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(storeColor)
                .cornerRadius(8)
            
            Spacer()
            
            // Expiration indicator
            if isExpiringSoon {
                Image(systemName: "clock.fill")
                    .font(.caption2)
                    .foregroundColor(.orange)
            }
        }
    }
    
    // MARK: - Price View
    private var priceView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                if deal.originalPrice != deal.salePrice {
                    Text("$\(deal.originalPrice, specifier: "%.2f")")
                        .font(.caption)
                        .strikethrough()
                        .foregroundColor(.secondary)
                }
                
                Text("$\(deal.salePrice, specifier: "%.2f")")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
            }
            
            Spacer()
            
            if deal.discountPercentage > 0 {
                Text("\(Int(deal.discountPercentage))% OFF")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.red)
                    .cornerRadius(6)
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

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

#Preview {
    DealGridCard(deal: Deal.sampleDeals[0]) {
        print("Added to shopping list")
    }
    .frame(width: 180)
    .padding()
}