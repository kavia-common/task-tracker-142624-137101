# Task Tracker React Frontend Test Suite

## Running Tests

Install and run with:

```
npm install
npm test
```

This runs all tests in `src/__tests__/*` with Jest and React Testing Library.

- Major user flows simulated: login, logout, dashboard, add/complete/delete task
- All backend API calls are fully mocked for frontend tests (integration only at UI level)
- Accessibility (aXe) and responsive layout checks included

Test files:
- `App.integration.test.js`: Simulates end-user flows in the app
- `App.accessibility.test.js`: Ensures accessibility and mobile/desktop responsiveness
