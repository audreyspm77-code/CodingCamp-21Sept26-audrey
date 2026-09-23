# Requirements Document

## Introduction

The Expense Visualizer is a client-side web application that allows users to track personal expenses by category, view a running total balance, and explore spending distribution through an interactive pie chart. The application requires no backend server, runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, and persists data using the browser's Local Storage API. It is designed as a standalone web app or browser extension with a clean, minimal interface.

## Glossary

- **App**: The Expense Visualizer web application running in the browser.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: A classification label for a transaction; one of: Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that renders all stored transactions.
- **Balance_Display**: The UI component at the top of the page that shows the total sum of all transaction amounts.
- **Chart**: The pie chart UI component that visualizes spending distribution across categories.
- **Input_Form**: The UI form component containing fields for item name, amount, and category.
- **Local_Storage**: The browser's built-in Web Storage API used for client-side data persistence.
- **Validator**: The client-side logic responsible for checking form field completeness before submission.

---

## Requirements

### Requirement 1: Expense Input Form

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name accepting 1-100 characters, a numeric field for amount accepting values between 0.01 and 999999999.99, and a dropdown selector for category with exactly the options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled with valid values, THE App SHALL add a new Transaction to the Transaction_List and persist it to Local_Storage within 500 milliseconds.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Validator SHALL prevent submission and display an inline error message adjacent to each empty field indicating it is required.
4. WHEN the user submits the Input_Form with an amount value outside the range 0.01 to 999999999.99 or an item name exceeding 100 characters, THE Validator SHALL prevent submission and display an inline error message adjacent to the invalid field indicating the accepted range or limit.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its default unselected state within 500 milliseconds.
6. IF Local_Storage is unavailable when the user submits the Input_Form, THEN THE App SHALL prevent the Transaction from being added and display an error message indicating that the expense could not be saved.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a list, so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored Transactions sorted with the most recently added entry first, showing item name (truncated at 100 characters), amount formatted to 2 decimal places, and category for each entry.
2. WHILE the number of Transactions in the Transaction_List exceeds the visible area, THE Transaction_List SHALL be scrollable to reveal all entries.
3. WHEN the user clicks the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Local_Storage within 500 milliseconds.
4. WHEN Local_Storage contains previously saved Transactions on page load, THE App SHALL populate the Transaction_List with those Transactions without requiring user action.
5. WHEN the Transaction_List contains no Transactions, THE App SHALL display a placeholder message indicating there are no expenses recorded yet.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending at a glance, so that I can understand how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts currently in the Transaction_List, rounded to 2 decimal places.
2. WHEN a Transaction is added to the Transaction_List, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds without requiring a page reload.
3. WHEN a Transaction is deleted from the Transaction_List, THE Balance_Display SHALL update to reflect the revised total within 500 milliseconds without requiring a page reload.
4. WHEN the Transaction_List is empty, THE Balance_Display SHALL show a total of 0.00.

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart that displays the proportion of total spending for each Category present in the Transaction_List, with each slice labeled by category name and percentage.
2. WHEN a Transaction is added to the Transaction_List, THE Chart SHALL update automatically to reflect the new spending distribution within 500 milliseconds without requiring a page reload.
3. WHEN a Transaction is deleted from the Transaction_List, THE Chart SHALL update automatically to reflect the revised spending distribution within 500 milliseconds without requiring a page reload.
4. WHEN the Transaction_List is empty, THE Chart SHALL display a placeholder or neutral state indicating no data is available.
5. THE App SHALL load the Chart.js library (version 4.x) via a CDN script tag to render the pie chart, with no local copy of the library required.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my expenses to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the complete updated Transaction dataset to Local_Storage using a single consistent key.
2. WHEN a Transaction is deleted, THE App SHALL write the complete updated Transaction dataset to Local_Storage using the same consistent key.
3. WHEN the App initializes on page load, THE App SHALL read all Transactions from Local_Storage and restore the Transaction_List, Balance_Display, and Chart to the state matching the stored data.
4. IF Local_Storage is unavailable or returns a parse error on read, THEN THE App SHALL initialize with an empty Transaction_List without displaying an error to the user.

---

### Requirement 6: Technology and File Structure Constraints

**User Story:** As a developer, I want the codebase to follow a defined structure and technology stack, so that the project remains simple, maintainable, and dependency-free at the server level.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no JavaScript frameworks such as React or Vue.
2. THE App SHALL require no backend server and SHALL be fully functional when opened as a local HTML file in a modern browser.
3. THE App SHALL contain exactly one CSS file located inside a css/ directory.
4. THE App SHALL contain exactly one JavaScript file located inside a js/ directory.
5. THE App SHALL function correctly in current stable versions of Chrome, Firefox, Edge, and Safari.

---

### Requirement 7: UI Performance and Responsiveness

**User Story:** As a user, I want the interface to respond immediately to my interactions, so that using the app feels smooth and effortless.

#### Acceptance Criteria

1. WHEN the user adds or deletes a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 500 milliseconds of the user action completing.
2. THE App SHALL render the initial page view within 3 seconds on a standard broadband connection, inclusive of loading the Chart.js CDN script.
3. WHILE the App is in use, THE App SHALL maintain a layout that remains readable and operable on viewport widths from 320px to 1920px.
