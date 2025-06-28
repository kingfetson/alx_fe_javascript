// Script.js
// Initialize quotes array
let quotes = [];
let lastViewedQuote = null;
let lastSyncTime = null;
let isOnline = false;
let isSyncing = false;
let isConflictDetected = false;
let currentConflict = null;
let serverQuotes = [];

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

// Function to fetch quotes from the server
async function fetchQuotesFromServer() {
    const syncStatus = document.getElementById('syncStatusText');
    const syncStatusElement = document.querySelector('.sync-status');
    
    // Set sync status to syncing
    syncStatus.textContent = 'Fetching quotes from server...';
    syncStatusElement.classList.add('syncing');
    
    try {
        // Make the API call to fetch quotes
        const response = await fetch('https://your-api-endpoint.com/quotes');
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const serverQuotes = await response.json();
        
        // Process the server quotes (e.g., merge with local quotes)
        processServerQuotes(serverQuotes);
        
        // Update sync status
        syncStatus.textContent = 'Quotes fetched from server successfully!';
        syncStatusElement.classList.remove('syncing');
        
        // Update last sync time
        lastSyncTime = new Date();
        updateStats();
        
        showNotification('Quotes synced with server!');
    } catch (error) {
        // Handle errors
        syncStatus.textContent = 'Failed to fetch quotes from server.';
        syncStatusElement.classList.remove('syncing');
        showNotification(`Error fetching quotes: ${error.message}`, true);
    }
}

// Function to process server quotes and handle conflicts
function processServerQuotes(serverQuotes) {
    // Store the server quotes for reference
    serverQuotes = serverQuotes;
    
    // Check for conflicts between local and server quotes
    const conflicts = [];
    
    // Compare each local quote with server quotes
    quotes.forEach(localQuote => {
        const serverQuote = serverQuotes.find(serverQuote => 
            serverQuote.text === localQuote.text && 
            serverQuote.category === localQuote.category
        );
        
        if (serverQuote) {
            // Check if there are differences
            if (serverQuote.lastUpdated > localQuote.lastUpdated) {
                // Server version is newer
                conflicts.push({
                    local: localQuote,
                    server: serverQuote
                });
            }
        }
    });
    
    // Handle conflicts
    if (conflicts.length > 0) {
        isConflictDetected = true;
        currentConflict = conflicts[0]; // For simplicity, handle one conflict at a time
        
        // Show conflict resolution UI
        showConflictResolution();
    } else {
        // No conflicts, merge the quotes
        const newQuotes = serverQuotes.filter(serverQuote => 
            !quotes.some(localQuote => 
                localQuote.text === serverQuote.text && 
                localQuote.category === serverQuote.category
            )
        );
        
        // Add new quotes from server
        quotes = [...quotes, ...newQuotes];
        
        // Save to local storage
        saveQuotes();
        
        // Update UI
        updateCategoryFilter();
        showRandomQuote();
        updateStats();
    }
}

// Function to display a random quote
function showRandomQuote() {
    const quoteDisplay = document.querySelector('.quote-display');
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    // Filter quotes if a category is selected
    let filteredQuotes = quotes;
    if (categoryFilter !== 'all') {
        filteredQuotes = quotes.filter(quote => quote.category === categoryFilter);
    }
    
    // Check if there are quotes to display
    if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = `
            <p class="quote-text">No quotes available in this category.</p>
            <span class="quote-value">Try a different category</span>
        `;
        return;
    }
    
    // Get a random quote from the filtered list
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const randomQuote = filteredQuotes[randomIndex];
    
    // Update the DOM
    quoteDisplay.innerHTML = `
        <p class="quote-text">"${randomQuote.text}"</p>
        <span class="quote-category">${randomQuote.category}</span>
    `;
    
    // Store the last viewed quote
    lastViewedQuote = randomQuote;
    sessionStorage.setItem('lastViewedQuote', JSON.stringify(lastViewedQuote));
}

// Function to create the add quote form
function createAddQuoteForm() {
    const form = document.getElementById('addQuoteForm');
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const newQuoteText = document.getElementById('newQuoteText').value.trim();
        const newQuoteCategory = document.getElementById('newQuoteCategory').value.trim();
        
        // Validate input
        if (!newQuoteText || !newQuoteCategory) {
            showNotification('Please enter both quote text and category.', true);
            return;
        }
        
        // Create new quote object
        const newQuote = {
            text: newQuoteText,
            category: newQuoteCategory,
            lastUpdated: new Date().toISOString()
        };
        
        // Add to quotes array
        quotes.push(newQuote);
        
        // If online, sync with server
        if (isOnline) {
            await syncWithServer(newQuote);
        } else {
            // If offline, just save to local storage
            saveQuotes();
            updateStats();
            showRandomQuote();
            showNotification('Quote added successfully!');
        }
        
        // Clear form inputs
        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteCategory').value = '';
        
        // Update stats
        updateStats();
    });
    
    return form;
}

// Function to sync a quote with the server
async function syncWithServer(quote) {
    try {
        const response = await fetch('https://your-api-endpoint.com/quotes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quote)
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const serverQuote = await response.json();
        
        // Update the quote with server data
        const index = quotes.findIndex(q => q.text === quote.text && q.category === quote.category);
        if (index !== -1) {
            quotes[index] = serverQuote;
        }
        
        // Save to local storage
        saveQuotes();
        
        // Update UI
        updateCategoryFilter();
        showRandomQuote();
        updateStats();
        
        showNotification('Quote synced with server!');
    } catch (error) {
        showNotification(`Error syncing quote: ${error.message}`, true);
    }
}

// Function to update the category filter dropdown
function updateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    
    // Get unique categories
    const categories = [...new Set(quotes.map(quote => quote.category))];
    
    // Clear existing options except the "All Categories" option
    while (categoryFilter.options.length > 1) {
        categoryFilter.remove(1);
    }
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Save the current filter selection
    const currentFilter = categoryFilter.value;
    categoryFilter.value = currentFilter;
}

// Function to show conflict resolution UI
function showConflictResolution() {
    const conflictResolution = document.getElementById('conflict-resolution');
    document.getElementById('localQuoteText').textContent = currentConflict.local.text;
    document.getElementById('localCategory').textContent = currentConflict.local.category;
    document.getElementById('serverQuoteText').textContent = currentConflict.server.text;
    document.getElementById('serverCategory').textContent = currentConflict.server.category;
    
    document.getElementById('keepLocal').onclick = function() {
        // Keep local version
        conflictResolution.classList.remove('show');
        showNotification('Local quote kept and conflict resolved.');
    };
    
    document.getElementById('keepServer').onclick = function() {
        // Keep server version
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
    
    document.getElementById('mergeQuotes').onclick = function() {
        // Merge both quotes
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

// Function to export quotes to a JSON file
function exportData() {
    if (quotes.length === 0) {
        showNotification('No quotes to export.', true);
        return;
    }
    
    // Create a blob with the quotes data
    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a link element
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quotes.json';
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Quotes exported successfully!');
}

// Function to import quotes from a JSON file
function importFromJsonFile(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            
            if (!Array.isArray(importedData)) {
                throw new Error('Invalid data format. Expected an array of quotes.');
            }
            
            // Validate the imported data
            const validQuotes = importedData.filter(quote => {
                return quote.text && typeof quote.text === 'string' &&
                       quote.category && typeof quote.category === 'string';
            });
            
            if (validQuotes.length === 0) {
                throw new Error('No valid quotes found in the file.');
            }
            
            // Add the valid quotes to the quotes array
            quotes = [...quotes, ...validQuotes];
            
            // Save to local storage
            saveQuotes();
            
            // Update category filter dropdown
            updateCategoryFilter();
            
            // Show a success message
            showNotification(`Successfully imported ${validQuotes.length} quotes!`);
            
            // Update stats
            updateStats();
        } catch (error) {
            showNotification(`Error importing quotes: ${error.message}`, true);
        }
    };
    
    fileReader.readAsText(file);
}

// Function to clear all quotes from storage
function clearStorage() {
    if (confirm('Are you sure you want to delete all quotes? This action cannot be undone.')) {
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

// Function to save quotes to local storage
function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
}

// Function to load quotes from storage
function loadQuotes() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
    }
}

// Function to update stats
function updateStats() {
    document.getElementById('totalQuotes').textContent = quotes.length;
    document.getElementById('totalCategories').textContent = [...new Set(quotes.map(quote => quote.category))].length;
    
    if (lastSyncTime) {
        document.getElementById('lastSync').textContent = lastSyncTime.toLocaleString();
    } else {
        document.getElementById('lastSync').textContent = 'Never';
    }
}

// Function to filter quotes based on selected category
function filterQuotes() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    // Save the selected category to local storage
    localStorage.setItem('lastSelectedCategory', categoryFilter);
    
    // Show quotes based on the filter
    showRandomQuote();
}

// Initialize the application
function init() {
    // Load quotes from storage
    loadQuotes();
    
    // Add event listener to the "Show New Quote" button
    document.getElementById('newQuote').addEventListener('click', showRandomQuote);
    
    // Add event listener to the "Clear All Quotes" button
    document.getElementById('clearStorage').addEventListener('click', clearData);
    
    // Add event listener to the "Export Quotes" button
    document.getElementById('exportData').addEventListener('click', exportData);
    
    // Add event listener to the import file input
    document.getElementById('importFile').addEventListener('change', importFromJsonFile);
    
    // Add event listener to the server toggle
    document.getElementById('serverToggle').addEventListener('change', async function(e) {
        isOnline = e.target.checked;
        const serverStatus = document.querySelector('.server-status');
        
        if (isOnline) {
            serverStatus.textContent = 'Online';
            serverStatus.className = 'server-status online';
            document.querySelector('.sync-status').textContent = 'Ready';
            document.querySelector('.sync-status').className = 'sync-status';
            
            // If we're going online, fetch quotes from server
            await fetchQuotesFromServer();
        } else {
            serverStatus.textContent = 'Offline';
            serverStatus.className = 'server-status offline';
            document.querySelector('.sync-status').textContent = 'Offline';
            document.querySelector('.sync-status').className = 'sync-status';
        }
    });
    
    // Add event listener to the category filter
    document.getElementById('categoryFilter').addEventListener('change', function() {
        filterQuotes();
    });
    
    // Create the add quote form
    createAddQuoteForm();
    
    // Update stats
    updateStats();
    
    // Show a random quote on page load
    if (quotes.length > 0) {
        showRandomQuote();
    } else {
        document.querySelector('.quote-display').innerHTML = `
            <p class="quote-text">No quotes available. Add your first quote below!</p>
            <span class="quote-category">Start by adding a quote</span>
        `;
    }
    
    // Load the last viewed quote from session storage
    const storedLastViewedQuote = sessionStorage.getItem('lastViewedQuote');
    if (storedLastViewedQuote) {
        lastViewedQuote = JSON.parse(storedLastViewedQuote);
    }
    
    // Set the category filter to the last selected category
    const storedCategoryFilter = localStorage.getItem('lastSelectedCategory');
    if (storedCategoryFilter) {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter.querySelector(`option[value="${storedCategoryFilter}"]`)) {
            categoryFilter.value = storedCategoryFilter;
        }
    }
}

// Function to clear all quotes from storage
function clearData() {
    clearStorage();
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
