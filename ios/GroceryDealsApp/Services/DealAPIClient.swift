import Foundation
import Combine

@MainActor
class DealAPIClient: ObservableObject {
    private let baseURL = "http://localhost:3000/api"
    private let session = URLSession.shared
    private var cancellables = Set<AnyCancellable>()
    
    @Published var isLoading = false
    @Published var lastError: APIError?
    
    // MARK: - Deal Endpoints
    
    func fetchNearbyDeals(latitude: Double, longitude: Double, radius: Double = 10.0) async throws -> [Deal] {
        isLoading = true
        defer { isLoading = false }
        
        let url = URL(string: "\(baseURL)/deals/nearby")!
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "lat", value: String(latitude)),
            URLQueryItem(name: "lng", value: String(longitude)),
            URLQueryItem(name: "radius", value: String(radius))
        ]
        
        guard let finalURL = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: finalURL)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            guard 200...299 ~= httpResponse.statusCode else {
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let deals = try decoder.decode([Deal].self, from: data)
            
            lastError = nil
            return deals
            
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.networkError(error)
            lastError = apiError
            throw apiError
        }
    }
    
    func fetchDealById(_ id: String) async throws -> Deal {
        isLoading = true
        defer { isLoading = false }
        
        guard let url = URL(string: "\(baseURL)/deals/\(id)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            guard 200...299 ~= httpResponse.statusCode else {
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let deal = try decoder.decode(Deal.self, from: data)
            
            lastError = nil
            return deal
            
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.networkError(error)
            lastError = apiError
            throw apiError
        }
    }
    
    // MARK: - Shopping List Endpoints
    
    func addToShoppingList(dealId: String, quantity: Int = 1, notes: String? = nil) async throws -> ShoppingListItem {
        isLoading = true
        defer { isLoading = false }
        
        guard let url = URL(string: "\(baseURL)/shopping-list/items") else {
            throw APIError.invalidURL
        }
        
        let requestBody = AddToShoppingListRequest(
            dealId: dealId,
            quantity: quantity,
            notes: notes
        )
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(requestBody)
            
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            guard 200...299 ~= httpResponse.statusCode else {
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let item = try decoder.decode(ShoppingListItem.self, from: data)
            
            lastError = nil
            return item
            
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.networkError(error)
            lastError = apiError
            throw apiError
        }
    }
    
    func fetchShoppingList() async throws -> [ShoppingListItem] {
        isLoading = true
        defer { isLoading = false }
        
        guard let url = URL(string: "\(baseURL)/shopping-list/items") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            guard 200...299 ~= httpResponse.statusCode else {
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let items = try decoder.decode([ShoppingListItem].self, from: data)
            
            lastError = nil
            return items
            
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.networkError(error)
            lastError = apiError
            throw apiError
        }
    }
    
    // MARK: - Price Comparison Endpoints
    
    func fetchPriceComparison(for itemId: String) async throws -> PriceComparisonResult {
        isLoading = true
        defer { isLoading = false }
        
        guard let url = URL(string: "\(baseURL)/price-comparison/\(itemId)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            guard 200...299 ~= httpResponse.statusCode else {
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let result = try decoder.decode(PriceComparisonResult.self, from: data)
            
            lastError = nil
            return result
            
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.networkError(error)
            lastError = apiError
            throw apiError
        }
    }
}

// MARK: - Request Models
private struct AddToShoppingListRequest: Codable {
    let dealId: String
    let quantity: Int
    let notes: String?
}

// MARK: - Response Models
struct PriceComparisonResult: Codable {
    let itemId: String
    let itemName: String
    let stores: [StorePrice]
    let bestValue: StorePrice
    let lastUpdated: Date
}

struct StorePrice: Codable {
    let storeId: String
    let storeName: String
    let price: Double
    let distance: Double
    let isAvailable: Bool
}

// MARK: - API Error Types
enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case networkError(Error)
    case serverError(Int)
    case decodingError(Error)
    case noData
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .serverError(let statusCode):
            return "Server error with status code: \(statusCode)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .noData:
            return "No data received from server"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .networkError:
            return "Please check your internet connection and try again."
        case .serverError(let statusCode) where statusCode >= 500:
            return "Server is temporarily unavailable. Please try again later."
        case .serverError(let statusCode) where statusCode == 404:
            return "The requested resource was not found."
        default:
            return "Please try again later."
        }
    }
}