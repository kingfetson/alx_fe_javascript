 <script>
        // Script.js

        // Initialize quotes array
        let quotes = [];
        let lastViewedQuote = null;
        
        // Function to save quotes to local storage
        function saveQuotes() {
            localStorage.setItem('quotes', JSON.stringify(quotes));
            sessionStorage.setItem('lastViewedQuote', JSON.stringify(lastViewedQuote));
            
            // Update stats
            updateStats();
        }
        
        // Function to load quotes from local storage
        function loadQuotes() {
            const storedQuotes = localStorage.getItem('quotes');
            if (storedQuotes) {
                quotes = JSON.parse(storedQuotes);
            }
            
            // Load last viewed quote from session storage
            const storedLastViewedQuote = sessionStorage.getItem('lastViewedQuote');
            if (storedLastViewedQuote) {
                lastViewedQuote = JSON.parse(storedLastViewedQuote);
            }
            
            // Load last selected filter
            const lastSelectedFilter = localStorage.getItem('lastSelectedFilter');
            if (lastSelectedFilter) {
                document.getElementById('categoryFilter').value = lastSelectedFilter;
            }
        }
        
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
                    <span class="quote-category">Try a different category</span>
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
            
            // Store the last viewed quote in session storage
            lastViewedQuote = randomQuote;
            sessionStorage.setItem('lastViewedQuote', JSON.stringify(lastViewedQuote));
            
            // Update stats
            document.getElementById('lastViewed').textContent = randomQuote.category;
        }
        
        // Function to populate categories in the dropdown
        function populateCategories() {
            const categoryFilter = document.getElementById('categoryFilter');
            
            // Clear existing options except the "All Categories" option
            while (categoryFilter.options.length > 1) {
                categoryFilter.remove(1);
            }
            
            // Get unique categories
            const categories = [...new Set(quotes.map(quote => quote.category))];
            
            // Add category options
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
            
            // Save the current filter selection
            const currentFilter = categoryFilter.value;
            localStorage.setItem('lastSelectedFilter', currentFilter);
        }
        
        // Function to filter quotes based on selected category
        function filterQuotes() {
            const categoryFilter = document.getElementById('categoryFilter');
            const selectedCategory = categoryFilter.value;
            
            // Save the selected category to local storage
            localStorage.setItem('lastSelectedFilter', selectedCategory);
            
            // Show a notification
            if (selectedCategory === 'all') {
                showNotification('Showing all quotes');
            } else {
                showNotification(`Filtering by category: ${selectedCategory}`);
            }
        }
        
        // Function to create the add quote form
        function createAddQuoteForm() {
            const form = document.getElementById('addQuoteForm');
            
            form.addEventListener('submit', function(event) {
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
                    category: newQuoteCategory
                };
                
                // Add to quotes array
                quotes.push(newQuote);
                
                // Clear form inputs
                document.getElementById('newQuoteText').value = '';
                document.getElementById('newQuoteCategory').value = '';
                
                // Update categories dropdown
                populateCategories();
                
                // Save to local storage
                saveQuotes();
                
                // Show the new quote
                showRandomQuote();
                
                // Show notification
                showNotification('Quote added successfully!');
            });
            
            return form;
        }
        
        // Function to export quotes to a JSON file
        function exportQuotes() {
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
            const fileReader = new FileReader();
            
            fileReader.onload = function(event) {
                try {
                    const importedQuotes = JSON.parse(event.target.result);
                    
                    if (!Array.isArray(importedQuotes)) {
                        throw new Error('Invalid JSON format. Expected an array of quotes.');
                    }
                    
                    // Validate the imported quotes
                    const validQuotes = importedQuotes.filter(quote => {
                        return quote === 'object' && 
                               quote.text && typeof quote.text === 'string' && 
                               quote.category && typeof quote.category === 'string';
                    });
                    
                    if (validQuotes.length === 0) {
                        showNotification('No valid quotes found in the file.', true);
                        return;
                    }
                    
                    // Add the valid quotes to the quotes array
                    quotes = [...quotes, ...validQuotes];
                    
                    // Save to local storage
                    saveQuotes();
                    
                    // Update categories dropdown
                    populateCategories();
                    
                    // Show the new quote
                    showRandomQuote();
                    
                    // Show notification
                    showNotification(`Imported ${validQuotes.length} quotes successfully!`);
                    
                    // Reset the file input
                    document.getElementById('importFile').value = '';
                    
                } catch (error) {
                    showNotification(`Error importing quotes: ${error.message}`, true);
                }
            };
            
            fileReader.readAsText(event.target.files[0]);
        }
        
        // Function to clear all quotes from storage
        function clearAllQuotes() {
            if (confirm('Are you sure you want to delete all quotes? This action cannot be undone.')) {
                quotes = [];
                lastViewedQuote = null;
                saveQuotes();
                populateCategories();
                showRandomQuote();
                showNotification('All quotes have been cleared.');
            }
        }
        
        // Function to update stats
        function updateStats() {
            document.getElementById('totalQuotes').textContent = quotes.length;
            
            // Get unique categories count
            const categories = [...new Set(quotes.map(quote => quote.category))];
            document.getElementById('totalCategories').textContent = categories.length;
            
            // Update last viewed if available
            if (lastViewedQuote) {
                document.getElementById('lastViewed').textContent = lastViewedQuote.category;
            }
        }
        
        // Initialize the application
        function init() {
            // Load quotes from storage
            loadQuotes();
            
            // Add event listener to the "Show New Quote" button
            document.getElementById('newQuote').addEventListener('click', showRandomQuote);
            
            // Add event listener to the "Export Quotes" button
            document.getElementById('exportQuotes').addEventListener('click', exportQuotes);
            
            // Add event listener to the "Clear All Quotes" button
            document.getElementById('clearStorage').addEventListener('click', clearAllQuotes);
            
            // Add event listener to the category filter
            document.getElementById('categoryFilter').addEventListener('change', filterQuotes);
            
            // Create the add quote form
            createAddQuoteForm();
            
            // Populate categories
            populateCategories();
            
            // Show a random quote on page load if available
            if (quotes.length > 0) {
                showRandomQuote();
            } else {
                document.querySelector('.quote-display').innerHTML = `
                    <p class="quote-text">No quotes available. Add your first quote below!</p>
                    <span class="quote-category">Start by adding a quote</span>
                `;
            }
            
            // Update stats
            updateStats();
        }
        
        // Call init when the DOM is fully loaded
        document.addEventListener('DOMContentLoaded', init);
    </script>
