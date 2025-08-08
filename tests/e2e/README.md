# CareCycle E2E Test Suite

This directory contains comprehensive End-to-End (E2E) tests for the CareCycle application using Playwright. The tests cover critical user journeys and ensure the application works correctly from a user's perspective.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Dependencies installed (`npm install`)
- Development server running on `http://localhost:3000`

### Running Tests
```bash
# Run all E2E tests
npx playwright test tests/e2e/

# Run specific test suite
npx playwright test tests/e2e/login-journey.spec.ts

# Run tests in headed mode (see browser)
npx playwright test tests/e2e/ --headed

# Run tests with specific browser
npx playwright test tests/e2e/ --project=chromium

# Generate test report
npx playwright show-report
```

## 📁 Test Structure

### Page Object Models (`/tests/pages/`)
Following the Page Object Model pattern for maintainable and reusable test code:

- **`base-page.ts`** - Common functionality shared across all pages
- **`home-page.ts`** - Homepage interactions and assertions
- **`login-page.ts`** - Login form and authentication testing
- **`dashboard-page.ts`** - Dashboard components and data verification
- **`patient-registration-page.ts`** - Patient registration form testing

### Test Suites (`/tests/e2e/`)

#### 🔐 Login Journey (`login-journey.spec.ts`)
- **Complete login flow** with valid/invalid credentials
- **Form validation** testing
- **Accessibility** compliance
- **Responsive design** verification
- **Loading states** and error handling
- **Session persistence** testing

#### 👥 Patient Registration Journey (`patient-registration-journey.spec.ts`)
- **End-to-end registration** workflow
- **Form validation** with various data combinations
- **Management item selection** and date configuration
- **Multi-step form** navigation
- **Error recovery** scenarios
- **Data persistence** validation

#### 📊 Dashboard Journey (`dashboard-journey.spec.ts`)
- **Statistics cards** functionality
- **Charts and visualizations** verification
- **Recent activity** and upcoming schedules
- **Quick actions** testing
- **Real-time data updates**
- **Responsive layout** across devices

#### 🔔 Notification Journey (`notification-journey.spec.ts`)
- **Notification bell** display and interaction
- **Real-time notifications** with test data
- **Badge counts** and visual indicators
- **Mark as read** functionality
- **Notification settings** (when available)
- **Database synchronization** verification

#### 🔄 Full Workflow Journey (`full-workflow-journey.spec.ts`)
- **Complete user workflow**: Login → Register Patient → View Dashboard → Check Notifications
- **Multi-user scenarios**
- **Error recovery** workflows
- **Accessibility** throughout the entire journey
- **Responsive design** testing
- **Performance monitoring**
- **Data consistency** verification

### Utilities (`/tests/utils/`)

#### Enhanced Test Helpers (`test-helpers.ts`)
Comprehensive utility functions with improved error handling and retry logic:

- **Element Interaction**: Enhanced click, fill, and visibility checks
- **Network Handling**: API call monitoring and network idle detection
- **Screenshot Management**: Flexible screenshot options and comparison tools
- **Console Error Monitoring**: Detailed error categorization and filtering
- **Toast Notifications**: Advanced toast detection and interaction
- **Accessibility Testing**: Automated accessibility checks
- **Keyboard Navigation**: Focus management and navigation testing
- **Performance Monitoring**: Action timing and resource usage tracking
- **Responsive Testing**: Multi-viewport validation
- **Form Testing**: Comprehensive form validation testing
- **Data Persistence**: Cross-session data verification

#### Database Test Client (`supabase-test-client.ts`)
- Test data creation and cleanup
- Patient and schedule management
- Notification settings configuration
- Database state verification

## 🎯 Test Coverage

### Critical User Journeys
✅ **Authentication Flow**
- Login with valid/invalid credentials
- Session management and persistence
- Logout functionality

✅ **Patient Management**
- New patient registration
- Form validation and error handling
- Management item selection

✅ **Dashboard Operations**  
- Real-time data display
- Statistics and charts
- Quick actions and navigation

✅ **Notification System**
- Real-time notifications
- Interaction and marking as read
- Settings management

### Cross-Cutting Concerns
✅ **Accessibility**
- WCAG compliance testing
- Keyboard navigation
- Screen reader compatibility
- ARIA attributes validation

✅ **Responsive Design**
- Mobile (320px+)
- Tablet (768px+)  
- Desktop (1440px+)
- Touch interactions

✅ **Performance**
- Page load times
- Network request monitoring
- Error rate tracking
- Resource usage

✅ **Error Handling**
- Network failures
- Form validation errors
- API error responses
- Recovery scenarios

## 🧪 Test Data Management

### Test Data Lifecycle
1. **Setup**: Create test data before each test
2. **Execution**: Use isolated test data
3. **Cleanup**: Remove test data after tests complete

### Test Data Patterns
- **Unique IDs**: Timestamp-based identifiers to avoid conflicts
- **Isolated Tests**: Each test creates its own data
- **Cleanup Hooks**: Automatic cleanup in `beforeAll`/`afterAll`

### Example Test Data
```typescript
const testPatient = {
  number: `E2E-${Date.now()}`,
  name: 'E2E Test Patient',
  managementItems: [0, 1], // Select first two items
  startDate: tomorrow.toISOString().split('T')[0]
};
```

## 🔧 Configuration

### Playwright Configuration (`playwright.config.ts`)
- **Base URL**: `http://localhost:3000`
- **Timeouts**: 60s test timeout, 10s expect timeout
- **Retries**: 2 retries in CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retain on failure
- **Traces**: Retain on failure

### Environment Setup
Tests automatically handle:
- **Authentication state**: Login when required
- **Database cleanup**: Before and after test runs
- **Error monitoring**: Console and network error tracking
- **Performance metrics**: Automatic timing collection

## 📊 Test Reports

### Generated Reports
- **HTML Report**: Interactive test results with screenshots and traces
- **Screenshots**: Stored in `/tests/screenshots/`
- **Test Traces**: Detailed execution traces for debugging
- **Performance Metrics**: Timing and resource usage data

### Viewing Reports
```bash
# Open HTML report
npx playwright show-report

# View specific test trace  
npx playwright show-trace test-results/path/to/trace.zip
```

## 🐛 Debugging

### Common Issues and Solutions

#### 1. Tests Failing Due to Timing
```typescript
// ❌ Don't rely on fixed timeouts
await page.waitForTimeout(5000);

// ✅ Wait for specific conditions
await expect(element).toBeVisible({ timeout: 10000 });
await page.waitForLoadState('networkidle');
```

#### 2. Element Not Found
```typescript
// ❌ Brittle selectors
await page.click('.button-123');

// ✅ Semantic selectors
await page.click('button:has-text("Submit")');
await page.click('[aria-label="Submit form"]');
```

#### 3. Flaky Tests
- Use `waitForNetworkIdle()` after navigation
- Implement retry logic in page objects
- Check for loading states before interactions

### Debugging Tools
- **VS Code Extension**: Playwright Test for VS Code
- **Debug Mode**: `npx playwright test --debug`
- **Trace Viewer**: Visual debugging with DOM snapshots
- **Screenshots**: Automatic failure screenshots

## 🚀 Best Practices

### Test Structure
1. **Arrange**: Set up test data and navigate to page
2. **Act**: Perform user actions
3. **Assert**: Verify expected outcomes
4. **Cleanup**: Clean up test data

### Naming Conventions
- **Test Files**: `*.spec.ts` for test suites
- **Page Objects**: `*-page.ts` for page models  
- **Test Names**: Descriptive, action-oriented names

### Reliability Tips
- **Wait for conditions**, not fixed timeouts
- **Use semantic selectors** over brittle CSS classes
- **Test happy path first**, then edge cases
- **Isolate test data** to avoid conflicts
- **Clean up after tests** to prevent side effects

## 📈 Continuous Integration

### GitHub Actions Integration
Tests are configured to run in CI with:
- **Parallel execution** across multiple browsers
- **Artifact collection** (screenshots, traces, reports)
- **Failure notifications** with detailed logs
- **Performance regression detection**

### Local Development
- **Pre-commit hooks**: Run smoke tests before commits
- **Local testing**: Fast feedback loop with headed mode
- **Debug mode**: Step-through debugging for complex issues

## 🤝 Contributing

### Adding New Tests
1. Create test in appropriate journey file
2. Use existing Page Object Models where possible
3. Add new page objects for new pages
4. Include accessibility and responsive checks
5. Add appropriate screenshots and assertions

### Test Maintenance
- **Update selectors** when UI changes
- **Add new assertions** for new features  
- **Refactor common patterns** into utilities
- **Keep test data generation** up to date

---

For more detailed information about specific test patterns or debugging techniques, refer to the individual test files and their inline documentation.