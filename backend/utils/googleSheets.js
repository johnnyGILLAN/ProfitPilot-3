const { google } = require('googleapis');
const sheets = google.sheets('v4');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Fetch data from a Google Sheet
 * @param {string} spreadsheetId - The ID of the Google Sheet
 * @param {string} sheetName - Optional name of the specific sheet to fetch
 * @returns {Promise<Array>} - The sheet data as a 2D array
 */
exports.fetchGoogleSheetData = async (spreadsheetId, sheetName = '') => {
  try {
    // Check if we're in development mode or missing API key
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey || process.env.NODE_ENV === 'development') {
      console.log(`Simulating Google Sheets fetch for spreadsheet: ${spreadsheetId}, Sheet: ${sheetName || 'default'}`);
      
      // Generate sample data based on sheet name or default to transactions
      let sampleData;
      
      if (sheetName.toLowerCase().includes('client')) {
        sampleData = [
          ['Name', 'Email', 'Phone', 'Address', 'Company', 'Notes'],
          ['John Doe', 'john@example.com', '555-123-4567', '123 Main St, City, State, 12345', 'ABC Corp', 'Regular client'],
          ['Jane Smith', 'jane@example.com', '555-987-6543', '456 Oak Ave, Town, State, 67890', 'XYZ Inc', 'New client'],
          ['Bob Johnson', 'bob@example.com', '555-555-5555', '789 Pine Rd, Village, State, 54321', 'LMN LLC', 'Potential client']
        ];
      } else if (sheetName.toLowerCase().includes('invoice')) {
        sampleData = [
          ['InvoiceNumber', 'Date', 'DueDate', 'Amount', 'ClientEmail', 'Status', 'Notes', 'Items'],
          ['INV-001', '2023-06-01', '2023-07-01', 1500, 'john@example.com', 'PENDING', 'Web development services', '[{"description":"Web Design","quantity":1,"unitPrice":1000},{"description":"Hosting Setup","quantity":1,"unitPrice":500}]'],
          ['INV-002', '2023-06-15', '2023-07-15', 800, 'jane@example.com', 'PAID', 'Logo design', '[{"description":"Logo Design","quantity":1,"unitPrice":800}]']
        ];
      } else if (sheetName.toLowerCase().includes('goal')) {
        sampleData = [
          ['Name', 'TargetAmount', 'CurrentAmount', 'Deadline', 'Category', 'Description'],
          ['Emergency Fund', 10000, 2500, '2023-12-31', 'SAVINGS', 'Build emergency fund for unexpected expenses'],
          ['New Equipment', 5000, 1000, '2023-09-30', 'BUSINESS', 'Purchase new computer and software'],
          ['Office Expansion', 20000, 0, '2024-06-30', 'BUSINESS', 'Expand office space']
        ];
      } else {
        // Default to transactions
        sampleData = [
          ['Date', 'Type', 'Category', 'Amount', 'Description', 'Tags', 'Receipt URL'],
          ['2023-05-01', 'Income', 'Salary', 3000, 'Monthly salary', 'regular,income', ''],
          ['2023-05-05', 'Expense', 'Groceries', 150.75, 'Weekly groceries', 'food,regular', ''],
          ['2023-05-10', 'Expense', 'Rent', 1200, 'Monthly rent', 'housing,regular', ''],
          ['2023-05-15', 'Expense', 'Utilities', 85.50, 'Electricity bill', 'utilities,regular', ''],
          ['2023-05-20', 'Income', 'Freelance', 500, 'Website design project', 'freelance,project', ''],
          ['2023-05-25', 'Expense', 'Dining', 45.80, 'Dinner with friends', 'food,social', ''],
          ['2023-05-28', 'Expense', 'Transportation', 30, 'Gas', 'car,regular', ''],
          ['2023-05-30', 'Expense', 'Subscription', 15.99, 'Netflix monthly', 'entertainment,regular', '']
        ];
      }
      
      return sampleData;
    }
    
    // In a production environment with API key
    const range = sheetName ? `${sheetName}!A1:Z1000` : 'A1:Z1000';
    
    const request = {
      spreadsheetId,
      range,
      key: apiKey
    };
    
    const response = await sheets.spreadsheets.values.get(request);
    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching Google Sheet data:', error);
    throw new Error(`Failed to fetch Google Sheet data: ${error.message}`);
  }
};

/**
 * Get metadata about a Google Sheet
 * @param {string} spreadsheetId - The ID of the Google Sheet
 * @returns {Promise<Object>} - Metadata about the spreadsheet
 */
exports.getGoogleSheetMetadata = async (spreadsheetId) => {
  try {
    // Check if we're in development mode or missing API key
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey || process.env.NODE_ENV === 'development') {
      console.log(`Simulating Google Sheets metadata fetch for spreadsheet: ${spreadsheetId}`);
      
      // Return simulated metadata
      return {
        title: 'Sample Spreadsheet',
        sheets: [
          { title: 'Transactions', index: 0 },
          { title: 'Clients', index: 1 },
          { title: 'Invoices', index: 2 },
          { title: 'Goals', index: 3 }
        ]
      };
    }
    
    // In a production environment with API key
    const request = {
      spreadsheetId,
      key: apiKey
    };
    
    const response = await sheets.spreadsheets.get(request);
    
    // Extract relevant metadata
    const metadata = {
      title: response.data.properties.title,
      sheets: response.data.sheets.map((sheet, index) => ({
        title: sheet.properties.title,
        index: index
      }))
    };
    
    return metadata;
  } catch (error) {
    console.error('Error fetching Google Sheet metadata:', error);
    throw new Error(`Failed to fetch Google Sheet metadata: ${error.message}`);
  }
};