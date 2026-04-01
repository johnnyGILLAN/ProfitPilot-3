const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Client = require('../models/Client');
const Goal = require('../models/Goal');
const Invoice = require('../models/Invoice');
const { 
  processExcelImport, 
  generateExcelExport, 
  generateTemplateFile,
  validateImportData
} = require('../utils/importExport');
const { fetchGoogleSheetData } = require('../utils/googleSheets');

// @desc    Import data from Excel/CSV/Google Sheets
// @route   POST /api/import/sheet
// @access  Private
exports.importSheet = async (req, res) => {
  try {
    let data;
    let importSource = 'file';
    let skippedRows = [];
    let validationErrors = [];
    
    // Check if it's a Google Sheet URL or a file upload
    if (req.body.url && req.body.source === 'google_sheets') {
      // Extract spreadsheet ID from Google Sheets URL
      const url = req.body.url;
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google Sheets URL'
        });
      }
      
      const spreadsheetId = match[1];
      const sheetName = req.body.sheetName || '';
      
      // Fetch data from Google Sheets
      const sheetData = await fetchGoogleSheetData(spreadsheetId, sheetName);
      data = sheetData;
      importSource = 'google_sheets';
    } else if (req.file) {
      // Process the uploaded file
      data = processExcelImport(req.file.buffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file or provide a Google Sheets URL'
      });
    }
    
    // Validate the imported data
    const { valid, errors, processedData, skipped } = validateImportData(data, req.body.mapping || {});
    
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format',
        errors
      });
    }
    
    skippedRows = skipped;
    
    // Check if this is a dry run
    if (req.body.dryRun) {
      return res.status(200).json({
        success: true,
        message: 'Dry run completed successfully',
        data: {
          preview: processedData.slice(0, 5), // Return first 5 rows as preview
          totalRows: processedData.length,
          skippedRows: skippedRows.length,
          skippedRowDetails: skippedRows
        }
      });
    }
    
    // Process different data types based on the module
    const module = req.body.module || 'transactions';
    let insertedCount = 0;
    let newEntities = [];
    
    switch (module) {
      case 'transactions':
        // Get all categories for this user
        const userCategories = await Category.find({ user: req.user.id });
        const categoryMap = {};
        userCategories.forEach(cat => {
          categoryMap[cat.name.toLowerCase()] = cat._id;
        });
        
        // Prepare transactions for database insertion
        const transactionsToInsert = processedData.map(transaction => {
          // Check if category exists, if not, use 'Other'
          const categoryName = transaction.category.toLowerCase();
          const categoryId = categoryMap[categoryName] || 
                           (transaction.type === 'INCOME' ? categoryMap['other income'] : categoryMap['miscellaneous']);
          
          return {
            user: req.user.id,
            date: transaction.date,
            type: transaction.type,
            category: transaction.category,
            amount: transaction.amount,
            description: transaction.description,
            tags: transaction.tags || [],
            receiptImage: transaction.receiptImage || ''
          };
        });
        
        // Insert transactions
        newEntities = await Transaction.insertMany(transactionsToInsert);
        insertedCount = newEntities.length;
        break;
        
      case 'clients':
        // Prepare clients for database insertion
        const clientsToInsert = processedData.map(client => {
          return {
            user: req.user.id,
            name: client.name,
            email: client.email,
            phone: client.phone || '',
            address: client.address || '',
            company: client.company || '',
            notes: client.notes || ''
          };
        });
        
        // Insert clients
        newEntities = await Client.insertMany(clientsToInsert);
        insertedCount = newEntities.length;
        break;
        
      case 'invoices':
        // Prepare invoices for database insertion
        const invoicesToInsert = processedData.map(invoice => {
          return {
            user: req.user.id,
            client: invoice.clientId,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            dueDate: invoice.dueDate,
            items: invoice.items || [],
            amount: invoice.amount,
            status: invoice.status || 'PENDING',
            notes: invoice.notes || ''
          };
        });
        
        // Insert invoices
        newEntities = await Invoice.insertMany(invoicesToInsert);
        insertedCount = newEntities.length;
        break;
        
      case 'goals':
        // Prepare goals for database insertion
        const goalsToInsert = processedData.map(goal => {
          return {
            user: req.user.id,
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount || 0,
            deadline: goal.deadline,
            category: goal.category || 'SAVINGS',
            description: goal.description || ''
          };
        });
        
        // Insert goals
        newEntities = await Goal.insertMany(goalsToInsert);
        insertedCount = newEntities.length;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported module: ${module}`
        });
    }
    
    // Generate data quality report
    const dataQualityReport = {
      totalRows: processedData.length,
      importedRows: insertedCount,
      skippedRows: skippedRows.length,
      skippedRowDetails: skippedRows,
      importSource,
      importDate: new Date(),
      module
    };
    
    res.status(201).json({
      success: true,
      count: insertedCount,
      message: `${insertedCount} ${module} imported successfully`,
      skipped: skippedRows.length,
      report: dataQualityReport,
      newEntities: newEntities.map(entity => entity._id) // Return IDs of new entities
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: `Error importing data: ${error.message}`
    });
  }
};

// @desc    Get import templates
// @route   GET /api/import/templates
// @access  Private
exports.getImportTemplates = async (req, res) => {
  try {
    const module = req.query.module || 'transactions';
    
    // Generate template file
    const buffer = generateTemplateFile(module);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${module}_template.xlsx`);
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error generating template: ${error.message}`
    });
  }
};

// @desc    Import transactions from Excel (legacy endpoint)
// @route   POST /api/import
// @access  Private
exports.importTransactions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // Process the Excel file
    const transactions = processExcelImport(req.file.buffer);

    if (transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid transactions found in the file'
      });
    }

    // Get all categories for this user
    const userCategories = await Category.find({ user: req.user.id });
    const categoryMap = {};
    userCategories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    // Prepare transactions for database insertion
    const transactionsToInsert = transactions.map(transaction => {
      // Check if category exists, if not, use 'Other'
      const categoryName = transaction.category.toLowerCase();
      const categoryId = categoryMap[categoryName] || 
                         (transaction.type === 'INCOME' ? categoryMap['other income'] : categoryMap['miscellaneous']);

      return {
        user: req.user.id,
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        description: transaction.description,
        tags: transaction.tags,
        receiptImage: transaction.receiptImage
      };
    });

    // Insert transactions
    const insertedTransactions = await Transaction.insertMany(transactionsToInsert);

    res.status(201).json({
      success: true,
      count: insertedTransactions.length,
      message: `${insertedTransactions.length} transactions imported successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error importing transactions: ${error.message}`
    });
  }
};

// @desc    Export transactions to Excel
// @route   GET /api/export
// @access  Private
exports.exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    // Add filters if provided
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    if (type) {
      query.type = type;
    }
    
    // Get transactions
    const transactions = await Transaction.find(query).sort('-date');
    
    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found to export'
      });
    }
    
    // Generate Excel file
    const buffer = generateExcelExport(transactions);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error exporting transactions: ${error.message}`
    });
  }
};