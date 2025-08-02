import WidgetKit
import SwiftUI

struct DealWidget: Widget {
    let kind: String = "DealWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DealProvider()) { entry in
            DealWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Grocery Deals")
        .description("View nearby grocery deals at a glance")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct DealEntry: TimelineEntry {
    let date: Date
    let deals: [Deal]
    let locationPermissionGranted: Bool
}

struct DealProvider: TimelineProvider {
    func placeholder(in context: Context) -> DealEntry {
        DealEntry(
            date: Date(),
            deals: Deal.sampleDeals,
            locationPermissionGranted: true
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (DealEntry) -> ()) {
        let entry = DealEntry(
            date: Date(),
            deals: Deal.sampleDeals,
            locationPermissionGranted: true
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // For now, provide sample data
        let currentDate = Date()
        let entry = DealEntry(
            date: currentDate,
            deals: Deal.sampleDeals,
            locationPermissionGranted: true
        )
        
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct DealWidgetEntryView: View {
    var entry: DealProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if entry.locationPermissionGranted {
                HStack {
                    Image(systemName: "location.fill")
                        .foregroundColor(.blue)
                    Text("Nearby Deals")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Spacer()
                }
                
                if entry.deals.isEmpty {
                    Text("No deals found nearby")
                        .foregroundColor(.secondary)
                        .font(.caption)
                } else {
                    ForEach(entry.deals.prefix(3)) { deal in
                        DealRowView(deal: deal)
                    }
                }
            } else {
                VStack {
                    Image(systemName: "location.slash")
                        .font(.title2)
                        .foregroundColor(.orange)
                    Text("Location access needed")
                        .font(.headline)
                    Text("Tap to enable location services")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

struct DealRowView: View {
    let deal: Deal
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(deal.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)
                
                Text(deal.storeName.capitalized)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if deal.dealType == .bogo {
                Text("BOGO")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(4)
            } else {
                Text("\(Int(deal.discountPercentage))% OFF")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(4)
            }
        }
    }
}

#Preview(as: .systemMedium) {
    DealWidget()
} timeline: {
    DealEntry(
        date: .now,
        deals: Deal.sampleDeals,
        locationPermissionGranted: true
    )
}