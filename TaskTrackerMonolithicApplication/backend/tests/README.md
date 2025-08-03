# Task Tracker Express Backend Test Suite

## Running Tests

1. Ensure your environment has MongoDB running (the test DB: `tasktracker_test_auth` and `tasktracker_test_tasks` used).
2. Install all dev dependencies:
   ```
   npm install
   ```
3. Run Jest using:
   ```
   npm test
   ```

Tests cover:
- Auth routes: registration, login, guarded endpoints, logout, edge cases
- Task CRUD (create, fetch, update, delete), marking complete, filter, error cases
- Email notification endpoint (skips actual emails if SMTP not set)
