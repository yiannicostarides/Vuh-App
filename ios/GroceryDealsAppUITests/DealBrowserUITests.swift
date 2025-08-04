import XCTest

final class DealBrowserUITests: XCTestCase {
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    override func tearDownWithError() throws {
        app = nil
    }
    
    // MARK: - Deal Browser Navigation Tests
    
    func testDealBrowserTabIsAccessible() throws {
        // Test that the Deals tab is accessible and can be tapped
        let dealsTab = app.tabBars.buttons["Deals"]
        XCTAssertTrue(dealsTab.exists, "Deals tab should exist")
        XCTAssertTrue(dealsTab.isHittable, "Deals tab should be tappable")
        
        dealsTab.tap()
        
        // Verify we're on the deals screen
        let dealsNavigationTitle = app.navigationBars["Deals"]
        XCTAssertTrue(dealsNavigationTitle.exists, "Deals navigation title should exist")
    }
    
    // MARK: - Search Functionality Tests
    
    func testSearchFieldExists() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        let searchField = app.textFields["Search deals..."]
        XCTAssertTrue(searchField.exists, "Search field should exist")
        XCTAssertTrue(searchField.isHittable, "Search field should be tappable")
    }
    
    func testSearchFunctionality() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        let searchField = app.textFields["Search deals..."]
        searchField.tap()
        searchField.typeText("cereal")
        
        // Wait for search results to update
        let expectation = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == true"),
            object: app.staticTexts["cereal"].firstMatch
        )
        wait(for: [expectation], timeout: 3.0)
    }
    
    func testClearSearchResults() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        let searchField = app.textFields["Search deals..."]
        searchField.tap()
        searchField.typeText("nonexistent")
        
        // Should show empty state
        let emptyStateText = app.staticTexts["No deals found"]
        XCTAssertTrue(emptyStateText.waitForExistence(timeout: 3.0), "Empty state should appear")
        
        let clearFiltersButton = app.buttons["Clear Filters"]
        XCTAssertTrue(clearFiltersButton.exists, "Clear filters button should exist")
        clearFiltersButton.tap()
        
        // Search field should be cleared
        XCTAssertEqual(searchField.value as? String, "", "Search field should be empty")
    }
    
    // MARK: - Filter Tests
    
    func testFilterButtonExists() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        let filterButton = app.buttons.matching(identifier: "line.3.horizontal.decrease.circle").firstMatch
        XCTAssertTrue(filterButton.exists, "Filter button should exist")
        XCTAssertTrue(filterButton.isHittable, "Filter button should be tappable")
    }
    
    func testFilterSheetOpens() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        let filterButton = app.buttons.matching(identifier: "line.3.horizontal.decrease.circle").firstMatch
        filterButton.tap()
        
        // Filter sheet should appear
        let filterNavigationTitle = app.navigationBars["Filters"]
        XCTAssertTrue(filterNavigationTitle.waitForExistence(timeout: 2.0), "Filter sheet should open")
        
        // Test filter options exist
        let categorySection = app.staticTexts["Category"]
        XCTAssertTrue(categorySection.exists, "Category section should exist")
        
        let storeSection = app.staticTexts["Store"]
        XCTAssertTrue(storeSection.exists, "Store section should exist")
    }
    
    func testApplyFilters() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        let filterButton = app.buttons.matching(identifier: "line.3.horizontal.decrease.circle").firstMatch
        filterButton.tap()
        
        // Select a category filter
        let breakfastFilter = app.buttons["Breakfast"]
        if breakfastFilter.exists {
            breakfastFilter.tap()
        }
        
        // Apply filters
        let applyButton = app.buttons["Apply Filters"]
        XCTAssertTrue(applyButton.exists, "Apply filters button should exist")
        applyButton.tap()
        
        // Filter sheet should dismiss
        let filterNavigationTitle = app.navigationBars["Filters"]
        XCTAssertFalse(filterNavigationTitle.waitForExistence(timeout: 1.0), "Filter sheet should dismiss")
    }
    
    func testClearAllFilters() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        let filterButton = app.buttons.matching(identifier: "line.3.horizontal.decrease.circle").firstMatch
        filterButton.tap()
        
        // Select filters
        let breakfastFilter = app.buttons["Breakfast"]
        if breakfastFilter.exists {
            breakfastFilter.tap()
        }
        
        let publixFilter = app.buttons["Publix"]
        if publixFilter.exists {
            publixFilter.tap()
        }
        
        // Clear all filters
        let clearAllButton = app.buttons["Clear All"]
        XCTAssertTrue(clearAllButton.exists, "Clear all button should exist")
        clearAllButton.tap()
        
        // Verify filters are cleared (All should be selected)
        let allCategoryButton = app.buttons["All"]
        XCTAssertTrue(allCategoryButton.isSelected, "All category should be selected after clearing")
        
        let allStoresButton = app.buttons["All Stores"]
        XCTAssertTrue(allStoresButton.isSelected, "All stores should be selected after clearing")
    }
    
    // MARK: - View Mode Toggle Tests
    
    func testViewModeToggle() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        // Find view mode toggle button
        let viewModeToggle = app.buttons.matching(identifier: "square.grid.2x2").firstMatch
        if !viewModeToggle.exists {
            // Try the list view icon
            let listViewToggle = app.buttons.matching(identifier: "list.bullet").firstMatch
            XCTAssertTrue(listViewToggle.exists, "View mode toggle should exist")
            listViewToggle.tap()
        } else {
            viewModeToggle.tap()
        }
        
        // Wait for view to update
        sleep(1)
        
        // Toggle back
        let newToggle = app.buttons.matching(identifier: "list.bullet").firstMatch
        if !newToggle.exists {
            let gridToggle = app.buttons.matching(identifier: "square.grid.2x2").firstMatch
            XCTAssertTrue(gridToggle.exists, "View mode toggle should exist after switching")
        }
    }
    
    // MARK: - Deal Interaction Tests
    
    func testDealCardTap() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        // Wait for deals to load
        sleep(2)
        
        // Find first deal card (this might need adjustment based on actual implementation)
        let firstDealCard = app.buttons.firstMatch
        if firstDealCard.exists && firstDealCard.label.contains("$") {
            firstDealCard.tap()
            
            // Should navigate to deal detail
            let dealDetailTitle = app.navigationBars["Deal Details"]
            XCTAssertTrue(dealDetailTitle.waitForExistence(timeout: 3.0), "Should navigate to deal details")
        }
    }
    
    func testAddToShoppingListFromBrowser() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        // Wait for deals to load
        sleep(2)
        
        // Look for add to list button (plus icon)
        let addToListButton = app.buttons.matching(identifier: "plus.circle.fill").firstMatch
        if addToListButton.exists {
            addToListButton.tap()
            
            // Should provide haptic feedback (can't test directly, but no crash is good)
            // Wait a moment for the action to complete
            sleep(1)
        }
    }
    
    // MARK: - Deal Detail View Tests
    
    func testDealDetailViewElements() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        // Wait for deals to load and tap first deal
        sleep(2)
        let firstDealCard = app.buttons.firstMatch
        if firstDealCard.exists && firstDealCard.label.contains("$") {
            firstDealCard.tap()
            
            // Verify deal detail elements exist
            let addToListButton = app.buttons["Add to Shopping List"]
            XCTAssertTrue(addToListButton.waitForExistence(timeout: 3.0), "Add to shopping list button should exist")
            
            let setReminderButton = app.buttons["Set Reminder"]
            XCTAssertTrue(setReminderButton.exists, "Set reminder button should exist")
            
            let shareButton = app.buttons["Share"]
            XCTAssertTrue(shareButton.exists, "Share button should exist")
        }
    }
    
    func testDealDetailAddToShoppingList() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        // Navigate to deal detail
        sleep(2)
        let firstDealCard = app.buttons.firstMatch
        if firstDealCard.exists && firstDealCard.label.contains("$") {
            firstDealCard.tap()
            
            let addToListButton = app.buttons["Add to Shopping List"]
            if addToListButton.waitForExistence(timeout: 3.0) {
                addToListButton.tap()
                
                // Button should be disabled briefly while adding
                sleep(1)
                
                // Should still exist after adding
                XCTAssertTrue(addToListButton.exists, "Add to list button should still exist")
            }
        }
    }
    
    // MARK: - Swipe Actions Tests
    
    func testSwipeActionsOnDealCards() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        // Wait for deals to load
        sleep(2)
        
        // This test would need to be implemented based on the specific swipe gesture implementation
        // For now, we'll test that context menus work (long press)
        let firstDealCard = app.buttons.firstMatch
        if firstDealCard.exists && firstDealCard.label.contains("$") {
            firstDealCard.press(forDuration: 1.0)
            
            // Context menu should appear
            let addToListMenuItem = app.buttons["Add to Shopping List"]
            XCTAssertTrue(addToListMenuItem.waitForExistence(timeout: 2.0), "Context menu should appear with add to list option")
            
            let shareMenuItem = app.buttons["Share Deal"]
            XCTAssertTrue(shareMenuItem.exists, "Context menu should have share option")
        }
    }
    
    // MARK: - Performance Tests
    
    func testDealBrowserLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }
    
    func testScrollPerformance() throws {
        let dealsTab = app.tabBars.buttons["Deals"]
        dealsTab.tap()
        
        // Wait for content to load
        sleep(2)
        
        measure(metrics: [XCTOSSignpostMetric.scrollingAndDecelerationMetric]) {
            let scrollView = app.scrollViews.firstMatch
            if scrollView.exists {
                scrollView.swipeUp()
                scrollView.swipeDown()
            }
        }
    }
}