// Script.js

// Initialize quotes array with some default quotes
let quotes = [
    { text: "The only way to do great work is to love what you do.", category: "Motivation" },
    { text: "Life is what happens when you're busy making other plans.", category: "Life" },
    { text: "The best way to predict the future is to create it.", category: "Future" },
    { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Success" },
    { text: "The journey of a thousand miles begins with one step.", category: "Journey" }
];

// Function to show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Function to display a random quote
function showRandomQuote() {
    const quoteDisplay = document.getElementById('quoteDisplay');
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    // Filter quotes if a category is selected
    let filteredQuotes = quotes;
    if (categoryFilter !== 'all') {
        filteredQuotes = quotes.filter(quote => quote.category === categoryFilter);
    }
    
    // Check if there are quotes to display
    if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = '<p class="quote-text">No quotes available in this category.</p>';
        return;
    }
    
    // Get a random quote from the filtered list
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const randomQuote = filteredQuotes[randomIndex];
    
    // Update the DOM
    quoteDisplay.innerHTML = `
        <p class="quote-text">"${randomQuote.text}"</p>
        <span class="quote-category">Category: ${randomQuote.category}</span>
    `;
}

// Function to add a new quote
function addQuote() {
    const newQuoteText = document.getElementById('newQuoteText').value.trim();
    const newQuoteCategory = document.getElementById('newQuoteCategory').value.trim();
    
    // Validate input
    if (!newQuoteText || !newQuoteCategory) {
        showNotification('Please enter both quote text and category.');
        return;
    }
    
    // Create new quote object
    const newQuote = {
        text: newQuoteText,
        category: newQuoteCategory
    };
    
    // Add to quotes array
    quotes.push(newQuote);
    
    // Clear form inputs
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    // Update category filter dropdown
    updateCategoryFilter();
    
    // Show the new quote
    showRandomQuote();
    
    // Show notification
    showNotification('Quote added successfully!');
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
}

// Initialize the application
function init() {
    // Add event listener to the "Show New Quote" button
    document.getElementById('newQuote').addEventListener('click', showRandomQuote);
    
    // Initialize category filter
    updateCategoryFilter();
    
    // Show a random quote on page load
    showRandomQuote();
}

// Call init when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
