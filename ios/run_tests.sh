#!/bin/bash

# iOS Test Runner Script
# This script runs unit tests for the GroceryDealsApp iOS project

set -e

echo "🧪 Running iOS Unit Tests for GroceryDealsApp"
echo "=============================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script must be run on macOS with Xcode installed"
    exit 1
fi

# Check if xcodebuild is available
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: xcodebuild not found. Please install Xcode Command Line Tools"
    exit 1
fi

# Set project variables
PROJECT_NAME="GroceryDealsApp.xcodeproj"
SCHEME_NAME="GroceryDealsApp"
DESTINATION="platform=iOS Simulator,name=iPhone 15,OS=latest"

echo "📱 Project: $PROJECT_NAME"
echo "🎯 Scheme: $SCHEME_NAME"
echo "📍 Destination: $DESTINATION"
echo ""

# Clean build folder
echo "🧹 Cleaning build folder..."
xcodebuild clean -project "$PROJECT_NAME" -scheme "$SCHEME_NAME"

# Build for testing
echo "🔨 Building for testing..."
xcodebuild build-for-testing \
    -project "$PROJECT_NAME" \
    -scheme "$SCHEME_NAME" \
    -destination "$DESTINATION"

# Run tests
echo "🧪 Running unit tests..."
xcodebuild test-without-building \
    -project "$PROJECT_NAME" \
    -scheme "$SCHEME_NAME" \
    -destination "$DESTINATION" \
    -only-testing:GroceryDealsAppTests/LocationManagerTests \
    -only-testing:GroceryDealsAppTests/DealAPIClientTests \
    -only-testing:GroceryDealsAppTests/CoreDataManagerTests

echo ""
echo "✅ All tests completed successfully!"
echo ""
echo "📊 Test Coverage Summary:"
echo "- LocationManager: ✅ Location services and error handling"
echo "- DealAPIClient: ✅ API communication and error handling"  
echo "- CoreDataManager: ✅ Local caching and data persistence"
echo ""
echo "🎉 iOS Core Architecture setup is complete!"