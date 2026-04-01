const XLSX = require('xlsx');
const Transaction = require('../models/Transaction');

// Process Excel file for import
const processExcelImport = (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Return the raw data for further processing
    return rows;
  } catch (error) {
    throw new Error(`Error processing Excel file: ${error.message}`);
  }
};

// Validate and process imported data
const validateImportData = (rows, mapping = {}) => {
  try {
    // Ensure we have header row and data
    if (!rows || rows.length < 2) {
      return {
        valid: false,
        errors: ['File contains no data or is missing headers'],
        processedData: [],
        skipped: []
      };
    }
    
    const headers = rows[0];
    const headerMap = {};
    
    // Create a map of column indices to field names
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.trim()] = index;
      }
    });
    
    // Apply custom mapping if provided
    const fieldMapping = { ...headerMap };
    if (mapping && Object.keys(mapping).length > 0) {
      Object.entries(mapping).forEach(([sourceField, targetField]) => {
        if (headerMap[sourceField] !== undefined) {
          fieldMapping[targetField] = headerMap[sourceField];
          // Keep the original mapping too for flexibility
          fieldMapping[sourceField] = headerMap[sourceField];
        }
      });
    }
    
    // Check for required fields based on standard schema
    const requiredFields = {
      transactions: ['Date', 'Amount', 'Category'],
      clients: ['Name', 'Email'],
      invoices: ['InvoiceNumber', 'Date', 'Amount', 'ClientEmail'],
      goals: ['Name', 'TargetAmount', 'Deadline']
    };
    
    // Determine the data type based on headers
    let dataType = 'transactions'; // Default
    
    if (headerMap['InvoiceNumber'] !== undefined) {
      dataType = 'invoices';
    } else if (headerMap['Name'] !== undefined && headerMap['Email'] !== undefined) {
      dataType = 'clients';
    } else if (headerMap['TargetAmount'] !== undefined) {
      dataType = 'goals';
    }
    
    // Check if required fields are present
    const missingFields = [];
    requiredFields[dataType].forEach(field => {
      const normalizedField = field.toLowerCase();
      const hasField = Object.keys(headerMap).some(header => 
        header.toLowerCase() === normalizedField || 
        (mapping[header] && mapping[header].toLowerCase() === normalizedField)
      );
      
      if (!hasField) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        errors: [`Missing required fields: ${missingFields.join(', ')}`],
        processedData: [],
        skipped: []
      };
    }
    
    // Process data rows
    const processedData = [];
    const skippedRows = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData = {};
      let skipRow = false;
      const skipReason = { row: i + 1, reason: '' };
      
      // Process based on data type
      switch (dataType) {
        case 'transactions':
          // Check required fields
          if (!row[headerMap['Date']] || !row[headerMap['Amount']] || !row[headerMap['Category']]) {
            skipReason.reason = 'Missing required fields (Date, Amount, or Category)';
            skipRow = true;
            break;
          }
          
          // Process date
          let dateISO = "";
          if (typeof row[headerMap['Date']] === "number") {
            const parsed = XLSX.SSF.parse_date_code(row[headerMap['Date']]);
            if (parsed && parsed.y && parsed.m && parsed.d) {
              dateISO = new Date(parsed.y, parsed.m - 1, parsed.d).toISOString();
            } else {
              skipReason.reason = `Invalid Excel date format: ${row[headerMap['Date']]}`;
              skipRow = true;
              break;
            }
          } else {
            const parsed = new Date(row[headerMap['Date']]);
            if (isNaN(parsed.getTime())) {
              skipReason.reason = `Invalid date format: ${row[headerMap['Date']]}`;
              skipRow = true;
              break;
            }
            dateISO = parsed.toISOString();
          }
          
          // Process amount
          const amount = parseFloat(row[headerMap['Amount']]);
          if (isNaN(amount)) {
            skipReason.reason = `Invalid amount: ${row[headerMap['Amount']]}`;
            skipRow = true;
            break;
          }
          
          // Determine transaction type
          let type = 'EXPENSE';
          if (headerMap['Type'] !== undefined) {
            type = row[headerMap['Type']]?.toString().toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE';
          } else if (amount > 0) {
            type = 'INCOME';
          }
          
          rowData.date = dateISO;
          rowData.type = type;
          rowData.category = row[headerMap['Category']];
          rowData.amount = Math.abs(amount);
          rowData.description = row[headerMap['Description']] || '';
          
          // Process tags if present
          if (headerMap['Tags'] !== undefined) {
            rowData.tags = row[headerMap['Tags']]?.toString().split(',').map(tag => tag.trim()) || [];
          }
          
          // Process receipt image if present
          if (headerMap['ReceiptImage'] !== undefined) {
            rowData.receiptImage = row[headerMap['ReceiptImage']] || '';
          }
          break;
          
        case 'clients':
          // Check required fields
          if (!row[headerMap['Name']] || !row[headerMap['Email']]) {
            skipReason.reason = 'Missing required fields (Name or Email)';
            skipRow = true;
            break;
          }
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row[headerMap['Email']])) {
            skipReason.reason = `Invalid email format: ${row[headerMap['Email']]}`;
            skipRow = true;
            break;
          }
          
          rowData.name = row[headerMap['Name']];
          rowData.email = row[headerMap['Email']];
          rowData.phone = row[headerMap['Phone']] || '';
          rowData.address = row[headerMap['Address']] || '';
          rowData.company = row[headerMap['Company']] || '';
          rowData.notes = row[headerMap['Notes']] || '';
          break;
          
        case 'invoices':
          // Check required fields
          if (!row[headerMap['InvoiceNumber']] || !row[headerMap['Date']] || 
              !row[headerMap['Amount']] || !row[headerMap['ClientEmail']]) {
            skipReason.reason = 'Missing required fields (InvoiceNumber, Date, Amount, or ClientEmail)';
            skipRow = true;
            break;
          }
          
          // Process date
          let invoiceDateISO = "";
          if (typeof row[headerMap['Date']] === "number") {
            const parsed = XLSX.SSF.parse_date_code(row[headerMap['Date']]);
            if (parsed && parsed.y && parsed.m && parsed.d) {
              invoiceDateISO = new Date(parsed.y, parsed.m - 1, parsed.d).toISOString();
            } else {
              skipReason.reason = `Invalid Excel date format: ${row[headerMap['Date']]}`;
              skipRow = true;
              break;
            }
          } else {
            const parsed = new Date(row[headerMap['Date']]);
            if (isNaN(parsed.getTime())) {
              skipReason.reason = `Invalid date format: ${row[headerMap['Date']]}`;
              skipRow = true;
              break;
            }
            invoiceDateISO = parsed.toISOString();
          }
          
          // Process due date if present
          let dueDateISO = "";
          if (headerMap['DueDate'] !== undefined && row[headerMap['DueDate']]) {
            if (typeof row[headerMap['DueDate']] === "number") {
              const parsed = XLSX.SSF.parse_date_code(row[headerMap['DueDate']]);
              if (parsed && parsed.y && parsed.m && parsed.d) {
                dueDateISO = new Date(parsed.y, parsed.m - 1, parsed.d).toISOString();
              } else {
                skipReason.reason = `Invalid Excel due date format: ${row[headerMap['DueDate']]}`;
                skipRow = true;
                break;
              }
            } else {
              const parsed = new Date(row[headerMap['DueDate']]);
              if (isNaN(parsed.getTime())) {
                skipReason.reason = `Invalid due date format: ${row[headerMap['DueDate']]}`;
                skipRow = true;
                break;
              }
              dueDateISO = parsed.toISOString();
            }
          } else {
            // Default due date to 30 days after invoice date
            const dueDate = new Date(invoiceDateISO);
            dueDate.setDate(dueDate.getDate() + 30);
            dueDateISO = dueDate.toISOString();
          }
          
          // Process amount
          const invoiceAmount = parseFloat(row[headerMap['Amount']]);
          if (isNaN(invoiceAmount)) {
            skipReason.reason = `Invalid amount: ${row[headerMap['Amount']]}`;
            skipRow = true;
            break;
          }
          
          rowData.invoiceNumber = row[headerMap['InvoiceNumber']];
          rowData.date = invoiceDateISO;
          rowData.dueDate = dueDateISO;
          rowData.amount = Math.abs(invoiceAmount);
          rowData.clientEmail = row[headerMap['ClientEmail']];
          rowData.status = row[headerMap['Status']] || 'PENDING';
          rowData.notes = row[headerMap['Notes']] || '';
          
          // Process items if present
          if (headerMap['Items'] !== undefined) {
            try {
              rowData.items = JSON.parse(row[headerMap['Items']]) || [];
            } catch (e) {
              rowData.items = [];
            }
          }
          break;
          
        case 'goals':
          // Check required fields
          if (!row[headerMap['Name']] || !row[headerMap['TargetAmount']] || !row[headerMap['Deadline']]) {
            skipReason.reason = 'Missing required fields (Name, TargetAmount, or Deadline)';
            skipRow = true;
            break;
          }
          
          // Process deadline
          let deadlineISO = "";
          if (typeof row[headerMap['Deadline']] === "number") {
            const parsed = XLSX.SSF.parse_date_code(row[headerMap['Deadline']]);
            if (parsed && parsed.y && parsed.m && parsed.d) {
              deadlineISO = new Date(parsed.y, parsed.m - 1, parsed.d).toISOString();
            } else {
              skipReason.reason = `Invalid Excel deadline format: ${row[headerMap['Deadline']]}`;
              skipRow = true;
              break;
            }
          } else {
            const parsed = new Date(row[headerMap['Deadline']]);
            if (isNaN(parsed.getTime())) {
              skipReason.reason = `Invalid deadline format: ${row[headerMap['Deadline']]}`;
              skipRow = true;
              break;
            }
            deadlineISO = parsed.toISOString();
          }
          
          // Process target amount
          const targetAmount = parseFloat(row[headerMap['TargetAmount']]);
          if (isNaN(targetAmount)) {
            skipReason.reason = `Invalid target amount: ${row[headerMap['TargetAmount']]}`;
            skipRow = true;
            break;
          }
          
          // Process current amount if present
          let currentAmount = 0;
          if (headerMap['CurrentAmount'] !== undefined && row[headerMap['CurrentAmount']]) {
            currentAmount = parseFloat(row[headerMap['CurrentAmount']]);
            if (isNaN(currentAmount)) {
              skipReason.reason = `Invalid current amount: ${row[headerMap['CurrentAmount']]}`;
              skipRow = true;
              break;
            }
          }
          
          rowData.name = row[headerMap['Name']];
          rowData.targetAmount = targetAmount;
          rowData.currentAmount = currentAmount;
          rowData.deadline = deadlineISO;
          rowData.category = row[headerMap['Category']] || 'SAVINGS';
          rowData.description = row[headerMap['Description']] || '';
          break;
      }
      
      if (skipRow) {
        skippedRows.push(skipReason);
      } else {
        processedData.push(rowData);
      }
    }
    
    return {
      valid: true,
      errors: [],
      processedData,
      skipped: skippedRows
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Error validating data: ${error.message}`],
      processedData: [],
      skipped: []
    };
  }
};

// Generate Excel export from transactions
const generateExcelExport = (transactions) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(
      transactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Type: t.type,
        Category: t.category,
        Amount: t.amount,
        Description: t.description || '',
        Tags: (t.tags || []).join(', '),
        ReceiptImage: t.receiptImage || ''
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  } catch (error) {
    throw new Error(`Error generating Excel export: ${error.message}`);
  }
};

// Generate template files for different modules
const generateTemplateFile = (module) => {
  try {
    let templateData = [];
    let sheetName = '';
    
    switch (module) {
      case 'transactions':
        templateData = [
          {
            Date: new Date().toLocaleDateString(),
            Type: 'EXPENSE',
            Category: 'Groceries',
            Amount: 150.75,
            Description: 'Weekly groceries',
            Tags: 'food,regular',
            ReceiptImage: ''
          },
          {
            Date: new Date().toLocaleDateString(),
            Type: 'INCOME',
            Category: 'Salary',
            Amount: 3000,
            Description: 'Monthly salary',
            Tags: 'regular,income',
            ReceiptImage: ''
          }
        ];
        sheetName = 'Transactions Template';
        break;
        
      case 'clients':
        templateData = [
          {
            Name: 'John Doe',
            Email: 'john@example.com',
            Phone: '555-123-4567',
            Address: '123 Main St, City, State, 12345',
            Company: 'ABC Corp',
            Notes: 'Regular client'
          },
          {
            Name: 'Jane Smith',
            Email: 'jane@example.com',
            Phone: '555-987-6543',
            Address: '456 Oak Ave, Town, State, 67890',
            Company: 'XYZ Inc',
            Notes: 'New client'
          }
        ];
        sheetName = 'Clients Template';
        break;
        
      case 'invoices':
        templateData = [
          {
            InvoiceNumber: 'INV-001',
            Date: new Date().toLocaleDateString(),
            DueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString(),
            Amount: 1500,
            ClientEmail: 'client@example.com',
            Status: 'PENDING',
            Notes: 'Web development services',
            Items: JSON.stringify([
              { description: 'Web Design', quantity: 1, unitPrice: 1000 },
              { description: 'Hosting Setup', quantity: 1, unitPrice: 500 }
            ])
          }
        ];
        sheetName = 'Invoices Template';
        break;
        
      case 'goals':
        templateData = [
          {
            Name: 'Emergency Fund',
            TargetAmount: 10000,
            CurrentAmount: 2500,
            Deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)).toLocaleDateString(),
            Category: 'SAVINGS',
            Description: 'Build emergency fund for unexpected expenses'
          },
          {
            Name: 'New Equipment',
            TargetAmount: 5000,
            CurrentAmount: 1000,
            Deadline: new Date(new Date().setMonth(new Date().getMonth() + 3)).toLocaleDateString(),
            Category: 'BUSINESS',
            Description: 'Purchase new computer and software'
          }
        ];
        sheetName = 'Goals Template';
        break;
        
      default:
        templateData = [
          { Note: 'Invalid module specified. Please use one of: transactions, clients, invoices, goals' }
        ];
        sheetName = 'Error';
    }
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  } catch (error) {
    throw new Error(`Error generating template file: ${error.message}`);
  }
};

module.exports = {
  processExcelImport,
  generateExcelExport,
  generateTemplateFile,
  validateImportData
};