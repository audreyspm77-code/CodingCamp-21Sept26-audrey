// Expense Visualizer — app.js

// =============================================================================
// TransactionService — pure functions (no DOM, no storage side effects)
// =============================================================================

/**
 * @typedef {Object} Transaction
 * @property {string} id         — UUID-style unique identifier
 * @property {string} name       — Item name, 1–100 characters (stored trimmed)
 * @property {number} amount     — Positive float, 0.01–999999999.99
 * @property {string} category   — One of: 'Food' | 'Transport' | 'Fun'
 * @property {number} createdAt  — Unix timestamp in milliseconds (Date.now())
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {Object}  errors
 * @property {string}  [errors.name]
 * @property {string}  [errors.amount]
 * @property {string}  [errors.category]
 */

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Generates a unique ID for a new transaction.
 * Uses crypto.randomUUID() when available, falls back to a timestamp-based ID.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random hex
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Validates raw form data.
 * @param {{ name: string, amount: string, category: string }} formData
 * @returns {ValidationResult}
 */
function validateForm(formData) {
  const errors = {};

  // Validate name: required, 1–100 characters after trimming
  const trimmedName = (formData.name || '').trim();
  if (trimmedName.length === 0) {
    errors.name = 'Item name is required.';
  } else if (trimmedName.length > 100) {
    errors.name = 'Item name must be 100 characters or fewer.';
  }

  // Validate amount: required, numeric, within 0.01–999999999.99
  const rawAmount = (formData.amount || '').toString().trim();
  if (rawAmount.length === 0) {
    errors.amount = 'Amount is required.';
  } else {
    const parsedAmount = parseFloat(rawAmount);
    if (isNaN(parsedAmount)) {
      errors.amount = 'Amount must be a number.';
    } else if (parsedAmount < 0.01) {
      errors.amount = 'Amount must be at least 0.01.';
    } else if (parsedAmount > 999999999.99) {
      errors.amount = 'Amount must be 999,999,999.99 or less.';
    }
  }

  // Validate category: required, must be one of the valid options
  const category = (formData.category || '').trim();
  if (category.length === 0) {
    errors.category = 'Category is required.';
  } else if (!VALID_CATEGORIES.includes(category)) {
    errors.category = 'Category must be Food, Transport, or Fun.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Creates a Transaction object from valid form data. Does not validate.
 * @param {{ name: string, amount: string, category: string }} formData
 * @returns {Transaction}
 */
function createTransaction(formData) {
  return {
    id: generateId(),
    name: formData.name.trim(),
    amount: parseFloat(formData.amount),
    category: formData.category,
    createdAt: Date.now(),
  };
}

/**
 * Returns the sum of all transaction amounts, rounded to 2 decimal places.
 * Returns 0 for an empty array.
 * @param {Transaction[]} transactions
 * @returns {number}
 */
function computeTotal(transactions) {
  if (!transactions || transactions.length === 0) return 0;
  const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Returns an object mapping each category to its summed amount.
 * Always includes all three categories; missing ones default to 0.
 * @param {Transaction[]} transactions
 * @returns {{ Food: number, Transport: number, Fun: number }}
 */
function aggregateByCategory(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  if (!transactions || transactions.length === 0) return totals;
  for (const t of transactions) {
    if (totals.hasOwnProperty(t.category)) {
      totals[t.category] = Math.round((totals[t.category] + t.amount) * 100) / 100;
    }
  }
  return totals;
}

/**
 * Formats a numeric amount to a string with exactly 2 decimal places.
 * @param {number} amount
 * @returns {string}
 */
function formatAmount(amount) {
  return Number(amount).toFixed(2);
}

/**
 * Sorts transactions by createdAt descending (newest first).
 * Returns a new array — does not mutate the original.
 * @param {Transaction[]} transactions
 * @returns {Transaction[]}
 */
function sortByNewest(transactions) {
  return transactions.slice().sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Truncates a string to maxLen characters.
 * Returns the string unchanged if it is within the limit.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen);
}

// =============================================================================
// StorageService — localStorage wrapper
// =============================================================================

/** Typed error thrown when a localStorage write operation fails. */
class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}

/** The single consistent key used for all localStorage reads and writes. */
const STORAGE_KEY = 'expense-visualizer-transactions';

/**
 * Returns true when an object has the correct shape to be a Transaction.
 * @param {unknown} entry
 * @returns {boolean}
 */
function isValidTransaction(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.amount === 'number' &&
    VALID_CATEGORIES.includes(entry.category) &&
    typeof entry.createdAt === 'number'
  );
}

/**
 * Reads and parses transactions from localStorage.
 * Returns [] if the key is absent, localStorage is unavailable, or the JSON
 * is invalid. Malformed entries are silently discarded; valid ones are kept.
 * Never throws.
 * @returns {Transaction[]}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTransaction);
  } catch (_err) {
    return [];
  }
}

/**
 * Serializes and writes the transactions array to localStorage under STORAGE_KEY.
 * Throws StorageError if the write fails (e.g. storage full, private browsing).
 * @param {Transaction[]} transactions
 */
function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    throw new StorageError(
      'Your expense could not be saved. Please check your browser settings.'
    );
  }
}

// =============================================================================
// ChartService — Chart.js wrapper
// =============================================================================

/** Module-level reference to the Chart.js instance. */
let chartInstance = null;

/**
 * Initializes the Chart.js pie chart on the given canvas element.
 * Must be called once after the DOM is ready.
 * If window.Chart is undefined (CDN failed to load), hides the canvas and
 * shows a fallback message "Chart unavailable — could not load charting library."
 * @param {string} canvasId — The id of the <canvas> element to render into.
 */
function initChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Guard against CDN load failure
  if (typeof window.Chart === 'undefined') {
    canvas.style.display = 'none';
    // Use the existing #chart-unavailable element in the HTML if present;
    // otherwise create one so the app still works without the HTML stub.
    let fallback = document.getElementById('chart-unavailable');
    if (!fallback) {
      fallback = document.createElement('p');
      fallback.id = 'chart-unavailable';
      fallback.style.textAlign = 'center';
      fallback.style.color = '#888';
      canvas.parentNode.insertBefore(fallback, canvas.nextSibling);
    }
    fallback.textContent = 'Chart unavailable — could not load charting library.';
    fallback.classList.remove('hidden');
    return;
  }

  chartInstance = new window.Chart(canvas, {
    type: 'pie',
    data: {
      labels: ['Food', 'Transport', 'Fun'],
      datasets: [
        {
          data: [0, 0, 0],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
          borderColor: ['#FF6384', '#36A2EB', '#FFCE56'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 14 },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${label}: $${formatAmount(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Updates the pie chart with new category totals.
 * When all values are 0 (empty state), the chart renders with zero data and
 * a "No data" center note is shown via the chart subtitle plugin options.
 * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
 */
function updateChart(categoryTotals) {
  if (!chartInstance) return;

  const values = [
    categoryTotals.Food || 0,
    categoryTotals.Transport || 0,
    categoryTotals.Fun || 0,
  ];

  const allZero = values.every((v) => v === 0);

  chartInstance.data.datasets[0].data = values;

  // Show/hide a "No data" subtitle based on whether all values are zero
  if (!chartInstance.options.plugins.subtitle) {
    chartInstance.options.plugins.subtitle = {};
  }
  chartInstance.options.plugins.subtitle.display = allZero;
  chartInstance.options.plugins.subtitle.text = 'No expense data yet.';
  chartInstance.options.plugins.subtitle.color = '#888';
  chartInstance.options.plugins.subtitle.font = { size: 14 };
  chartInstance.options.plugins.subtitle.padding = { bottom: 8 };

  chartInstance.update();
}

// =============================================================================
// UIController — DOM wiring and rendering (implemented in task 6)
// =============================================================================

/** In-memory store — single source of truth for all transactions in this session. */
let transactions = [];

// -----------------------------------------------------------------------------
// 6.4 — Transaction list rendering and delete handler
// -----------------------------------------------------------------------------

/**
 * Renders the transaction list into #transaction-list.
 * - Empty array: shows a placeholder paragraph.
 * - Non-empty: renders sorted <li> elements with name, amount, category, and a
 *   delete button carrying data-id.
 * @param {Transaction[]} txns
 */
function renderList(txns) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  // Clear existing content
  list.innerHTML = '';

  if (txns.length === 0) {
    const placeholder = document.createElement('li');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'No expenses recorded yet.';
    list.appendChild(placeholder);
    return;
  }

  const sorted = sortByNewest(txns);
  for (const tx of sorted) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', tx.id);

    const info = document.createElement('span');
    info.className = 'transaction-info';
    info.innerHTML =
      `<span class="tx-name">${escapeHtml(truncate(tx.name, 100))}</span>` +
      `<span class="tx-category">${escapeHtml(tx.category)}</span>` +
      `<span class="tx-amount">$${formatAmount(tx.amount)}</span>`;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('data-id', tx.id);
    deleteBtn.setAttribute('aria-label', `Delete ${truncate(tx.name, 100)}`);
    deleteBtn.textContent = 'Delete';

    li.appendChild(info);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  }
}

/**
 * Minimal HTML-escaping to prevent XSS when inserting user text into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Delegated click handler on the transaction list for delete buttons
document.addEventListener('DOMContentLoaded', function () {
  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', function (event) {
      const btn = event.target.closest('.delete-btn');
      if (!btn) return;

      const id = btn.getAttribute('data-id');
      if (!id) return;

      // Capture current state in case we need to revert
      const previous = transactions.slice();
      transactions = transactions.filter((tx) => tx.id !== id);

      try {
        saveTransactions(transactions);
      } catch (err) {
        // Revert in-memory state and show error
        transactions = previous;
        showStorageError(err.message);
        return;
      }

      clearStorageError();
      renderList(transactions);
      renderBalance(computeTotal(transactions));
      updateChart(aggregateByCategory(transactions));
    });
  }
});

// -----------------------------------------------------------------------------
// 6.6 — renderBalance
// -----------------------------------------------------------------------------

/**
 * Updates #balance-amount to show the formatted total.
 * Displays "0.00" when the transaction list is empty.
 * @param {number} total
 */
function renderBalance(total) {
  const el = document.getElementById('balance-amount');
  if (!el) return;
  el.textContent = formatAmount(total);
}

// -----------------------------------------------------------------------------
// Shared error-display helpers
// -----------------------------------------------------------------------------

/**
 * Displays a non-inline storage error in the #storage-error element.
 * @param {string} message
 */
function showStorageError(message) {
  const el = document.getElementById('storage-error');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

/** Clears any visible storage error. */
function clearStorageError() {
  const el = document.getElementById('storage-error');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

// -----------------------------------------------------------------------------
// 6.1 — Form submission handler
// -----------------------------------------------------------------------------

/**
 * Displays inline validation errors next to each field.
 * @param {{ name?: string, amount?: string, category?: string }} errors
 */
function showFieldErrors(errors) {
  // Map of field key → data-for attribute value on the .field-error span
  const fieldMap = {
    name: 'item-name',
    amount: 'item-amount',
    category: 'item-category',
  };

  for (const [key, dataFor] of Object.entries(fieldMap)) {
    const span = document.querySelector(`.field-error[data-for="${dataFor}"]`);
    if (!span) continue;
    span.textContent = errors[key] || '';
  }
}

/** Clears all inline field errors. */
function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach((span) => {
    span.textContent = '';
  });
}

/** Resets the expense form to its default empty/unselected state. */
function resetForm() {
  const form = document.getElementById('expense-form');
  if (form) form.reset();
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('expense-form');
  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // Clear previous errors
    clearFieldErrors();
    clearStorageError();

    const formData = {
      name: document.getElementById('item-name').value,
      amount: document.getElementById('item-amount').value,
      category: document.getElementById('item-category').value,
    };

    // Validate
    const result = validateForm(formData);
    if (!result.valid) {
      showFieldErrors(result.errors);
      return;
    }

    // Create transaction
    const tx = createTransaction(formData);

    // Attempt to persist before mutating in-memory state
    const snapshot = transactions.slice();
    const updated = [...snapshot, tx];

    try {
      saveTransactions(updated);
    } catch (err) {
      // Keep in-memory state unchanged; show error
      showStorageError(err.message);
      return;
    }

    // Commit to in-memory state only after successful save
    transactions = updated;

    renderList(transactions);
    renderBalance(computeTotal(transactions));
    updateChart(aggregateByCategory(transactions));
    resetForm();
  });
});

// -----------------------------------------------------------------------------
// 6.6 — Page-load initialization (DOMContentLoaded)
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  // Load persisted transactions (returns [] on any error — never throws)
  transactions = loadTransactions();

  // Render initial state
  renderList(transactions);
  renderBalance(computeTotal(transactions));

  // Initialize chart (guards against missing Chart.js CDN)
  initChart('spending-chart');
  updateChart(aggregateByCategory(transactions));
});
