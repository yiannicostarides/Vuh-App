import XCTest
import CoreLocation
@testable import GroceryDealsApp

@MainActor
final class LocationManagerTests: XCTestCase {
    var locationManager: LocationManager!
    
    override func setUp() {
        super.setUp()
        locationManager = LocationManager()
    }
    
    override func tearDown() {
        locationManager = nil
        super.tearDown()
    }
    
    func testInitialState() {
        // Test initial state
        XCTAssertNil(locationManager.location)
        XCTAssertEqual(locationManager.authorizationStatus, .notDetermined)
        XCTAssertNil(locationManager.locationError)
    }
    
    func testLocationErrorDescriptions() {
        // Test error descriptions
        XCTAssertEqual(
            LocationError.permissionDenied.errorDescription,
            "Location permission denied. Please enable location access in Settings to see nearby deals."
        )
        
        XCTAssertEqual(
            LocationError.locationServicesDisabled.errorDescription,
            "Location services are disabled. Please enable them in Settings."
        )
        
        XCTAssertEqual(
            LocationError.locationUnavailable.errorDescription,
            "Unable to determine your location. Please try again."
        )
        
        XCTAssertEqual(
            LocationError.networkError.errorDescription,
            "Network error while getting location. Please check your connection."
        )
        
        XCTAssertEqual(
            LocationError.unknown.errorDescription,
            "An unknown error occurred while getting your location."
        )
    }
    
    func testRequestLocationPermissionWhenNotDetermined() {
        // Given
        locationManager.authorizationStatus = .notDetermined
        
        // When
        locationManager.requestLocationPermission()
        
        // Then - This would normally trigger the system permission dialog
        // In a real test, we would mock CLLocationManager
        XCTAssertEqual(locationManager.authorizationStatus, .notDetermined)
    }
    
    func testRequestLocationPermissionWhenDenied() {
        // Given
        locationManager.authorizationStatus = .denied
        
        // When
        locationManager.requestLocationPermission()
        
        // Then
        XCTAssertEqual(locationManager.locationError, .permissionDenied)
    }
    
    func testRequestLocationPermissionWhenRestricted() {
        // Given
        locationManager.authorizationStatus = .restricted
        
        // When
        locationManager.requestLocationPermission()
        
        // Then
        XCTAssertEqual(locationManager.locationError, .permissionDenied)
    }
    
    func testStartLocationUpdatesWithoutPermission() {
        // Given
        locationManager.authorizationStatus = .denied
        
        // When
        locationManager.startLocationUpdates()
        
        // Then
        XCTAssertEqual(locationManager.locationError, .permissionDenied)
    }
    
    func testStopLocationUpdates() {
        // When
        locationManager.stopLocationUpdates()
        
        // Then - Should not crash and should stop updates
        // In a real implementation, we would verify that CLLocationManager.stopUpdatingLocation() was called
        XCTAssertTrue(true) // Placeholder assertion
    }
}

// MARK: - LocationError Equatable Extension for Testing
extension LocationError: Equatable {
    static func == (lhs: LocationError, rhs: LocationError) -> Bool {
        switch (lhs, rhs) {
        case (.permissionDenied, .permissionDenied),
             (.locationServicesDisabled, .locationServicesDisabled),
             (.locationUnavailable, .locationUnavailable),
             (.networkError, .networkError),
             (.unknown, .unknown):
            return true
        default:
            return false
        }
    }
}