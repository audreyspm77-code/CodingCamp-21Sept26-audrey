# Implementation Plan: Expense Visualizer

## Overview

Build a purely client-side single-page expense tracker using vanilla HTML, CSS, and JavaScript. The app persists data in `localStorage`, renders a Chart.js v4 pie chart, and exposes pure-function modules (`TransactionService`, `StorageService`) that are independently testable with fast-check property-based tests.

---

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create the `expense-visualizer/` directory with `css/` and `js/` subdirectories
  - Create `index.html` with all required element IDs and classes: `#expense-form`, `#item-name`, `#item-amount`, `#item-category`, `#submit-btn`, `.field-error[data-for]` containers, `#transaction-list`, `#balance-amount`, `#spending-chart`
  - Add the Chart.js v4 CDN script tag: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>`
  - Add a `<link>` for `css/styles.css` and a `<script defer>` for `js/app.js`
  - _Requirements: 1.1, 4.5, 6.1, 6.2, 6.3, 6.4_

- [x] 2. Implement `TransactionService` pure functions
  - [x] 2.1 Implement `generateId`, `createTransaction`, `validateForm`
    - `generateId`: use `crypto.randomUUID()` with a timestamp-based fallback
    - `validateForm`: enforce name 1–100 chars (trimmed), amount 0.01–999999999.99, category one of `['Food','Transport','Fun']`; return `{ valid, errors }`
    - `createTransaction`: build a `Transaction` object from valid form data (trim name, parse amount as float, set `createdAt: Date.now()`)
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ]* 2.2 Write property test — P2: empty/whitespace fields are always rejected
    - **Property 2: Empty or whitespace fields are always rejected**
    - Use `fc.record` with one or more fields set to `fc.constant('')` or `fc.stringMatching(/^\s+$/)`
    - Assert `validateForm` returns `valid: false` with an error for each empty/whitespace field and that no transaction is created
    - **Validates: Requirements 1.3**

  - [ ]* 2.3 Write property test — P3: out-of-range inputs are always rejected
    - **Property 3: Out-of-range inputs are always rejected**
    - Use `fc.oneof(fc.float({max: 0}), fc.float({min: 1000000000}))` for amount; `fc.string({minLength: 101})` for name
    - Assert `validateForm` returns `valid: false` with the appropriate field error
    - **Validates: Requirements 1.4**

  - [x] 2.4 Implement `computeTotal`, `aggregateByCategory`, `formatAmount`, `sortByNewest`, `truncate`
    - `computeTotal`: sum all `amount` fields rounded to 2 decimal places; return `0` for empty array
    - `aggregateByCategory`: return `{ Food, Transport, Fun }` with missing categories defaulting to `0`
    - `formatAmount`: return string with exactly 2 decimal places
    - `sortByNewest`: sort by `createdAt` descending, return new array
    - `truncate(str, maxLen)`: return string unchanged if within limit
    - _Requirements: 2.1, 3.1, 3.4, 4.1, 4.4_

  - [ ]* 2.5 Write property test — P8: `computeTotal` is always the rounded sum
    - **Property 8: Total balance is always the rounded sum of all amounts**
    - Use `fc.array(fc.record({ amount: fc.float({min: 0.01, max: 999999999.99}) }))` including the empty array case
    - Assert the result equals `Math.round(sum * 100) / 100`
    - **Validates: Requirements 3.1, 3.4**

  - [ ]* 2.6 Write property test — P9: `aggregateByCategory` sums to overall total
    - **Property 9: Category aggregation sums to the overall total**
    - Use `fc.array` of transactions with random categories from `fc.constantFrom('Food','Transport','Fun')`
    - Assert `Food + Transport + Fun === computeTotal(transactions)` and all three keys are always present
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 2.7 Write property test — P5: `sortByNewest` and `formatAmount` are always correct
    - **Property 5: Transaction list is always sorted newest-first with correct formatting**
    - Use `fc.array(fc.record({...}), {minLength: 1})` with varying `createdAt` values
    - Assert adjacent pair invariant `transactions[i].createdAt >= transactions[i+1].createdAt`, `formatAmount` always produces 2 decimal places, and names over 100 chars are truncated by `truncate`
    - **Validates: Requirements 2.1**

- [x] 3. Checkpoint — Validate pure functions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `StorageService`
  - [x] 4.1 Implement `loadTransactions` and `saveTransactions`
    - `loadTransactions`: wrap `localStorage.getItem` + `JSON.parse` in `try/catch`; filter out malformed entries (missing id, name, amount, category, or createdAt fields with wrong types); return `[]` on any error
    - `saveTransactions`: wrap `localStorage.setItem` in `try/catch`; throw a typed `StorageError` on failure
    - Use constant `STORAGE_KEY = 'expense-visualizer-transactions'`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.2 Write property test — P7: `localStorage` round-trip restores full transaction list
    - **Property 7: localStorage round-trip restores the full transaction list**
    - Use `fc.array` of valid `Transaction` objects (mocking `localStorage` with an in-memory store)
    - Assert `loadTransactions(saveTransactions(arr))` returns an array equal in length and field values to the original
    - **Validates: Requirements 2.4, 5.3**

  - [ ]* 4.3 Write unit tests for `StorageService` error handling
    - Test `loadTransactions` returns `[]` when `localStorage` throws on read
    - Test `loadTransactions` returns `[]` when stored value is invalid JSON
    - Test `loadTransactions` discards malformed entries but preserves valid ones
    - Test `saveTransactions` throws `StorageError` when `localStorage.setItem` throws
    - _Requirements: 5.4_

- [x] 5. Implement `ChartService`
  - [x] 5.1 Implement `initChart` and `updateChart`
    - `initChart(canvasId)`: instantiate a `Chart.js` pie chart on the canvas; guard with `if (!window.Chart) { /* hide canvas, show fallback message */ }`; show "Chart unavailable — could not load charting library." if CDN failed
    - `updateChart(categoryTotals)`: call `chart.data.datasets[0].data = [...]` and `chart.update()`; when all values are `0`, show an empty/placeholder state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Implement `UIController` and wire the application
  - [x] 6.1 Implement form submission handler
    - Attach `submit` listener to `#expense-form`
    - Call `validateForm`; on failure display errors via `.field-error[data-for="field-name"]` and return early
    - On success: call `createTransaction`, push to `transactions`, call `saveTransactions`; if `StorageError` is thrown, show a non-inline error and keep in-memory state unchanged
    - Call `renderList`, `renderBalance`, `updateChart`, and `resetForm` on success
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 6.2 Write property test — P1: valid transaction addition is reflected in state and storage
    - **Property 1: Valid transaction addition is reflected in state and storage**
    - Use `fc.record({ name: fc.string({minLength:1,maxLength:100}), amount: fc.float({min:0.01,max:999999999.99}), category: fc.constantFrom('Food','Transport','Fun') })`
    - Mock `localStorage`; simulate form submit; assert the transaction exists in both the in-memory array and the mock storage
    - **Validates: Requirements 1.2, 5.1**

  - [ ]* 6.3 Write property test — P4: form resets after every successful addition
    - **Property 4: Form resets after every successful addition**
    - Use valid `fc.record` inputs; simulate form submit; assert `#item-name`, `#item-amount` are empty and `#item-category` is at default
    - **Validates: Requirements 1.5**

  - [x] 6.4 Implement transaction list rendering and delete handler
    - `renderList(transactions)`: clear `#transaction-list`; for empty array show placeholder "No expenses recorded yet."; otherwise render `<li>` elements with `truncate`d name, `formatAmount`ed amount, category, and a delete button (`data-id`)
    - Attach delegated `click` listener on `#transaction-list`; on delete button click: remove by `id`, call `saveTransactions`, call `renderList`, `renderBalance`, `updateChart`
    - Handle `StorageError` on delete (show error, revert in-memory state)
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ]* 6.5 Write property test — P6: deletion removes transaction from state and storage
    - **Property 6: Deletion removes a transaction from state and storage**
    - Use `fc.array(validTransaction, {minLength:1})` + `fc.nat` to pick a random index; simulate delete click; assert the deleted `id` is absent from the in-memory array and from mock `localStorage`
    - **Validates: Requirements 2.3, 5.2**

  - [x] 6.6 Implement `renderBalance` and page-load initialization
    - `renderBalance(total)`: set `#balance-amount` text to `formatAmount(total)`; show `0.00` when list is empty
    - On `DOMContentLoaded`: call `loadTransactions`, `renderList`, `renderBalance`, `initChart`, `updateChart`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3_

- [ ] 7. Checkpoint — Validate full application wiring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Style with CSS
  - [x] 8.1 Create `css/styles.css` with responsive layout
    - Style the overall page layout (centered, max-width container)
    - Style `#expense-form` with clear field labels and spacing
    - Style `.field-error` elements (visible in red, hidden when empty)
    - Style `#transaction-list` with `overflow-y: auto` or `scroll` to satisfy scrollability requirement
    - Style `#balance-amount` prominently
    - Style `#spending-chart` canvas container
    - Apply responsive breakpoints to keep layout readable at 320px, 768px, 1280px, and 1920px
    - _Requirements: 2.2, 7.3_

- [ ] 9. Final checkpoint — Full end-to-end validation
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) — import via CDN or npm depending on test runner choice
- Each property test is tagged with a comment: `// Feature: expense-visualizer, Property N: <title>`
- `StorageService` tests should mock `localStorage` (e.g., via a simple in-memory object or `jest-localstorage-mock`)
- The entire app opens as a `file://` URL — no build step or dev server is needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5", "2.6", "2.7", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["6.1", "6.4", "6.6"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.5", "8.1"] }
  ]
}
```
