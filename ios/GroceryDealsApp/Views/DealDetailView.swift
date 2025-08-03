import SwiftUI
import MapKit

struct DealDetailView: View {
    let deal: Deal
    @StateObject private var viewModel = DealDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Deal Image
                dealImageView
                
                // Deal Information
                dealInfoSection
                
                // Price Information
                priceSection
                
                // Deal Details
                dealDetailsSection
                
                // Store Locations
                if !deal.storeLocations.isEmpty {
                    storeLocationsSection
                }
                
                // Action Buttons
                actionButtonsSection
            }
            .padding()
        }
        .navigationTitle("Deal Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                shareButton
            }
        }
    }
    
    // MARK: - Deal Image View
    private var dealImageView: some View {
        ZStack {
            Rectangle()
                .fill(Color(.systemGray6))
                .frame(height: 200)
            
            if let imageUrl = deal.imageUrl, !imageUrl.isEmpty {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ProgressView()
                        .scaleEffect(1.2)
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "tag.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary)
                    
                    Text("No Image Available")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .frame(height: 200)
        .clipped()
        .cornerRadius(12)
    }
    
    // MARK: - Deal Info Section
    private var dealInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Store Badge
            HStack {
                Text(deal.storeName.rawValue.capitalized)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(storeColor)
                    .cornerRadius(8)
                
                Spacer()
                
                // Deal Type Badge
                Text(deal.dealType.rawValue.uppercased())
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(dealTypeColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(dealTypeColor.opacity(0.1))
                    .cornerRadius(6)
            }
            
            // Deal Title
            Text(deal.title)
                .font(.title2)
                .fontWeight(.bold)
                .lineLimit(nil)
            
            // Deal Description
            Text(deal.description)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(nil)
            
            // Category
            HStack {
                Image(systemName: "tag")
                    .foregroundColor(.secondary)
                Text(deal.category)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // MARK: - Price Section
    private var priceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Pricing")
                .font(.headline)
                .fontWeight(.semibold)
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    if deal.originalPrice != deal.salePrice {
                        Text("Original Price")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("$\(deal.originalPrice, specifier: "%.2f")")
                            .font(.title3)
                            .strikethrough()
                            .foregroundColor(.secondary)
                    }
                    
                    Text("Sale Price")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("$\(deal.salePrice, specifier: "%.2f")")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                if deal.discountPercentage > 0 {
                    VStack {
                        Text("SAVE")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        Text("\(Int(deal.discountPercentage))%")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }
                    .padding()
                    .background(Color.red)
                    .cornerRadius(12)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Deal Details Section
    private var dealDetailsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Deal Details")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(alignment: .leading, spacing: 8) {
                DetailRow(
                    icon: "calendar",
                    title: "Valid From",
                    value: DateFormatter.shortDate.string(from: deal.validFrom)
                )
                
                DetailRow(
                    icon: "calendar.badge.clock",
                    title: "Valid Until",
                    value: DateFormatter.shortDate.string(from: deal.validUntil),
                    isExpiring: isExpiringSoon
                )
                
                if let restrictions = deal.restrictions, !restrictions.isEmpty {
                    DetailRow(
                        icon: "exclamationmark.triangle",
                        title: "Restrictions",
                        value: restrictions
                    )
                }
            }
        }
    }
    
    // MARK: - Store Locations Section
    private var storeLocationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Store Locations")
                .font(.headline)
                .fontWeight(.semibold)
            
            ForEach(deal.storeLocations.prefix(3)) { location in
                StoreLocationCard(location: location)
            }
            
            if deal.storeLocations.count > 3 {
                Button("View All \(deal.storeLocations.count) Locations") {
                    // TODO: Show all locations view
                }
                .font(.subheadline)
                .foregroundColor(.accentColor)
            }
        }
    }
    
    // MARK: - Action Buttons Section
    private var actionButtonsSection: some View {
        VStack(spacing: 12) {
            // Add to Shopping List Button
            Button(action: {
                viewModel.addToShoppingList(deal)
            }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                    Text("Add to Shopping List")
                        .font(.headline)
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .cornerRadius(12)
            }
            .disabled(viewModel.isAddingToList)
            
            // Secondary Actions
            HStack(spacing: 12) {
                Button(action: {
                    viewModel.setReminder(for: deal)
                }) {
                    HStack {
                        Image(systemName: "bell")
                        Text("Set Reminder")
                    }
                    .font(.subheadline)
                    .foregroundColor(.accentColor)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor.opacity(0.1))
                    .cornerRadius(8)
                }
                
                Button(action: {
                    shareDeals()
                }) {
                    HStack {
                        Image(systemName: "square.and.arrow.up")
                        Text("Share")
                    }
                    .font(.subheadline)
                    .foregroundColor(.accentColor)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor.opacity(0.1))
                    .cornerRadius(8)
                }
            }
        }
    }
    
    // MARK: - Share Button
    private var shareButton: some View {
        Button(action: shareDeals) {
            Image(systemName: "square.and.arrow.up")
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
    private func shareDeals() {
        let shareText = """
        \(deal.title)
        \(deal.storeName.rawValue.capitalized)
        
        Sale Price: $\(deal.salePrice, specifier: "%.2f")
        \(deal.originalPrice != deal.salePrice ? "Original: $\(deal.originalPrice, specifier: "%.2f")" : "")
        
        Valid until: \(DateFormatter.shortDate.string(from: deal.validUntil))
        """
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else { return }
        
        let activityVC = UIActivityViewController(activityItems: [shareText], applicationActivities: nil)
        window.rootViewController?.present(activityVC, animated: true)
    }
}

// MARK: - Supporting Views
struct DetailRow: View {
    let icon: String
    let title: String
    let value: String
    var isExpiring: Bool = false
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(isExpiring ? .orange : .secondary)
                .frame(width: 20)
            
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isExpiring ? .orange : .primary)
        }
        .padding(.vertical, 4)
    }
}

struct StoreLocationCard: View {
    let location: StoreLocation
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(location.name)
                .font(.subheadline)
                .fontWeight(.semibold)
            
            Text(location.address)
                .font(.caption)
                .foregroundColor(.secondary)
            
            if let phone = location.phoneNumber {
                Text(phone)
                    .font(.caption)
                    .foregroundColor(.accentColor)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Date Formatter Extension
extension DateFormatter {
    static let shortDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()
}

#Preview {
    NavigationView {
        DealDetailView(deal: Deal.sampleDeals[0])
    }
}