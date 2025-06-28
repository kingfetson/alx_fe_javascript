// Initialize quotes array
let quotes = [];
let lastViewedQuote = null;
let lastSyncTime = null;
let isOnline = false;
let isSyncing = false;
let isConflictDetected = false;
let currentConflict = null;
let serverQuotes = [];
let syncInterval = null;

// Function to show notification
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');

    notificationMessage.textContent = message;

    if (isError) {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Function to fetch quotes from the server using a mock API
async function fetchQuotesFromServer() {
    const syncStatus = document.getElementById('syncStatusText');
    const syncStatusElement = document.querySelector('.sync-status');

    syncStatus.textContent = 'Fetching quotes from server...';
    syncStatusElement.classList.add('syncing');

    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts');

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const serverData = await response.json();

        const serverQuotes = serverData.map(item => ({
            text: item.title,
            category: item.body.substring(0, 20) + (item.body.length > 20 ? '...' : ''),
            id: item.id.toString(),
            lastUpdated: new Date().toISOString()
        }));

        await syncQuotes(serverQuotes);

        syncStatus.textContent = 'Quotes fetched from server successfully!';
        syncStatusElement.classList.remove('syncing');
        lastSyncTime = new Date();
        updateStats();

        showNotification('Quotes synced with server!');
    } catch (error) {
        syncStatus.textContent = 'Failed to fetch quotes from server.';
        syncStatusElement.classList.remove('syncing');
        alert(`Sync failed: ${error.message}`);
        showNotification(`Error fetching quotes: ${error.message}`, true);
    }
}

// Function to sync quotes with server
async function syncQuotes(serverQuotes) {
    if (!isOnline) {
        showNotification('Cannot sync while offline. Try again when online.', true);
        return;
    }

    const conflicts = [];

    quotes.forEach(localQuote => {
        const serverQuote = serverQuotes.find(serverQuote =>
            serverQuote.text === localQuote.text &&
            serverQuote.category === localQuote.category
        );

        if (serverQuote) {
            if (serverQuote.lastUpdated > localQuote.lastUpdated) {
                conflicts.push({ local: localQuote, server: serverQuote });
            }
        }
    });

    if (conflicts.length > 0) {
        alert('Data conflict detected! Opening resolution UI...');
        isConflictDetected = true;
        currentConflict = conflicts[0];
        showConflictResolution();
    } else {
        const newQuotes = serverQuotes.filter(serverQuote =>
            !quotes.some(localQuote =>
                localQuote.text === serverQuote.text &&
                localQuote.category === serverQuote.category
            )
        );

        quotes = [...quotes, ...newQuotes];
        saveQuotes();
        updateCategoryFilter();
        showRandomQuote();
        updateStats();
        await postQuotesToServer();
    }
}

// Function to post quotes to the server
async function postQuotesToServer() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Synced quotes',
                body: JSON.stringify(quotes),
                userId: 1
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Quotes posted to server:', result);
    } catch (error) {
        console.error('Error posting quotes to server:', error);
        showNotification('Failed to post quotes to server.', true);
    }
}

// Periodic sync
function startPeriodicSync() {
    if (syncInterval) clearInterval(syncInterval);

    syncInterval = setInterval(async () => {
        if (isOnline && !isSyncing) {
            isSyncing = true;
            await fetchQuotesFromServer();
            isSyncing = false;
        }
    }, 30000);
}

function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Update local storage with server data
function updateLocalStorageWithServerData(serverQuotes) {
    const conflicts = [];

    quotes.forEach(localQuote => {
        const serverQuote = serverQuotes.find(serverQuote =>
            serverQuote.text === localQuote.text &&
            serverQuote.category === localQuote.category
        );

        if (serverQuote && serverQuote.lastUpdated > localQuote.lastUpdated) {
            conflicts.push({ local: localQuote, server: serverQuote });
        }
    });

    if (conflicts.length > 0) {
        isConflictDetected = true;
        currentConflict = conflicts[0];
        showConflictResolution();
        return false;
    }

    quotes = serverQuotes;
    saveQuotes();
    updateCategoryFilter();
    showRandomQuote();
    updateStats();

    return true;
}

// Display a random quote
function showRandomQuote() {
    const quoteDisplay = document.getElementById('quote-display');
    const categoryFilter = document.getElementById('categoryFilter').value;
    let filteredQuotes = quotes;

    if (categoryFilter !== 'all') {
        filteredQuotes = quotes.filter(quote => quote.category === categoryFilter);
    }

    if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = `
            <p class="quote-text">No quotes available in this category.</p>
            <span class="quote-value">Try a different category</span>
        `;
        return;
    }

    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const randomQuote = filteredQuotes[randomIndex];

    quoteDisplay.innerHTML = `
        <p class="quote-text">"${randomQuote.text}"</p>
        <span class="quote-category">${randomQuote.category}</span>
    `;

    lastViewedQuote = randomQuote;
    sessionStorage.setItem('lastViewedQuote', JSON.stringify(lastViewedQuote));
}

// Add quote form
function createAddQuoteForm() {
    const form = document.getElementById('addQuoteForm');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const newQuoteText = document.getElementById('newQuoteText').value.trim();
        const newQuoteCategory = document.getElementById('newQuoteCategory').value.trim();

        if (!newQuoteText || !newQuoteCategory) {
            showNotification('Please enter both quote text and category.', true);
            return;
        }

        const newQuote = {
            text: newQuoteText,
            category: newQuoteCategory,
            lastUpdated: new Date().toISOString()
        };

        quotes.push(newQuote);

        if (isOnline) {
            await syncWithServer(newQuote);
        } else {
            saveQuotes();
            updateStats();
            showRandomQuote();
            showNotification('Quote added successfully!');
        }

        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteCategory').value = '';
        updateStats();
    });

    return form;
}

// Sync a single quote
async function syncWithServer(quote) {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quote)
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const serverQuote = await response.json();
        const index = quotes.findIndex(q => q.text === quote.text && q.category === quote.category);

        if (index !== -1) {
            quotes[index] = serverQuote;
        }

        saveQuotes();
        updateCategoryFilter();
        showRandomQuote();
        updateStats();

        showNotification('Quote synced with server!');
    } catch (error) {
        showNotification(`Error syncing quote: ${error.message}`, true);
    }
}

// Category filter dropdown
function updateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = [...new Set(quotes.map(quote => quote.category))];

    while (categoryFilter.options.length > 1) {
        categoryFilter.remove(1);
    }

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    const currentFilter = categoryFilter.value;
    categoryFilter.value = currentFilter;
}

// Conflict resolution UI
function showConflictResolution() {
    const conflictResolution = document.getElementById('conflict-resolution');
    document.getElementById('localQuoteText').textContent = currentConflict.local.text;
    document.getElementById('localCategory').textContent = currentConflict.local.category;
    document.getElementById('serverQuoteText').textContent = currentConflict.server.text;
    document.getElementById('serverCategory').textContent = currentConflict.server.category;

    document.getElementById('keepLocal').onclick = function () {
        conflictResolution.classList.remove('show');
        showNotification('Local quote kept and conflict resolved.');
    };

    document.getElementById('keepServer').onclick = function () {
        const index = quotes.findIndex(q =>
            q.text === currentConflict.local.text &&
            q.category === currentConflict.local.category
        );

        if (index !== -1) {
            quotes[index] = currentConflict.server;
            saveQuotes();
            updateCategoryFilter();
            showRandomQuote();
            updateStats();
        }

        conflictResolution.classList.remove('show');
        showNotification('Server quote kept and conflict resolved.');
    };

    document.getElementById('mergeQuotes').onclick = function () {
        quotes.push(currentConflict.server);
        saveQuotes();
        updateCategoryFilter();
        showRandomQuote();
        updateStats();
        conflictResolution.classList.remove('show');
        showNotification('Quotes merged and conflict resolved.');
    };

    conflictResolution.classList.add('show');
}

// Export quotes to JSON
function exportData() {
    if (quotes.length === 0) {
        showNotification('No quotes to export.', true);
        return;
    }

    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quotes.json';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('Quotes exported successfully!');
}

// Import quotes
function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();

    fileReader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);

            if (!Array.isArray(importedData)) {
                alert('Import failed: Invalid data format. Expected an array.');
                throw new Error('Invalid data format. Expected an array of quotes.');
            }

            const validQuotes = importedData.filter(quote =>
                quote.text && typeof quote.text === 'string' &&
                quote.category && typeof quote.category === 'string'
            );

            if (validQuotes.length === 0) {
                alert('Import failed: No valid quotes found.');
                throw new Error('No valid quotes found in the file.');
            }

            quotes = [...quotes, ...validQuotes];
            saveQuotes();
            updateCategoryFilter();
            showNotification(`Successfully imported ${validQuotes.length} quotes!`);
            updateStats();
        } catch (error) {
            showNotification(`Error importing quotes: ${error.message}`, true);
        }
    };

    fileReader.readAsText(file);
}

// Clear all storage
function clearStorage() {
    if (confirm('Are you sure you want to delete all quotes? This action cannot be undone.')) {
        alert('All quotes will now be deleted.');
        quotes = [];
        lastViewedQuote = null;
        lastSyncTime = null;
        saveQuotes();
        updateCategoryFilter();
        showRandomQuote();
        updateStats();
        showNotification('All quotes have been cleared.');
    }
}

function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
}

function loadQuotes() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
    }
}

function updateStats() {
    document.getElementById('totalQuotes').textContent = quotes.length;
    document.getElementById('totalCategories').textContent = [...new Set(quotes.map(q => q.category))].length;
    document.getElementById('lastSync').textContent = lastSyncTime ? lastSyncTime.toLocaleString() : 'Never';
}

function filterQuotes() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    localStorage.setItem('lastSelectedCategory', categoryFilter);
    showRandomQuote();
}

function init() {
    loadQuotes();

    document.getElementById('newQuote').addEventListener('click', showRandomQuote);
    document.getElementById('clearStorage').addEventListener('click', clearData);
    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', importFromJsonFile);

    document.getElementById('serverToggle').addEventListener('change', async function (e) {
        isOnline = e.target.checked;
        const serverStatus = document.querySelector('.server-status');

        if (isOnline) {
            serverStatus.textContent = 'Online';
            serverStatus.className = 'server-status online';
            document.querySelector('.sync-status').textContent = 'Ready';
            document.querySelector('.sync-status').className = 'sync-status';

            await fetchQuotesFromServer();
            startPeriodicSync();
        } else {
            serverStatus.textContent = 'Offline';
            serverStatus.className = 'server-status offline';
            document.querySelector('.sync-status').textContent = 'Offline';
            document.querySelector('.sync-status').className = 'sync-status';
            stopPeriodicSync();
        }
    });

    document.getElementById('categoryFilter').addEventListener('change', filterQuotes);
    createAddQuoteForm();
    updateStats();

    if (quotes.length > 0) {
        showRandomQuote();
    } else {
        document.querySelector('.quote-display').innerHTML = `
            <p class="quote-text">No quotes available. Add your first quote below!</p>
            <span class="quote-value">Start by adding a quote</span>
        `;
    }

    const storedLastViewedQuote = sessionStorage.getItem('lastViewedQuote');
    if (storedLastViewedQuote) {
        lastViewedQuote = JSON.parse(storedLastViewedQuote);
    }

    const storedCategoryFilter = localStorage.getItem('lastSelectedCategory');
    if (storedCategoryFilter) {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter.querySelector(`option[value="${storedCategoryFilter}"]`)) {
            categoryFilter.value = storedCategoryFilter;
        }
    }
}

function clearData() {
    clearStorage();
}

document.addEventListener('DOMContentLoaded', init);
