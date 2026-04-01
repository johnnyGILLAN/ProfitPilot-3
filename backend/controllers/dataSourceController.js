const DataSource = require('../models/DataSource');
const SyncHistory = require('../models/SyncHistory');
const Transaction = require('../models/Transaction');
const { processExcelImport } = require('../utils/importExport');
const { fetchGoogleSheetData } = require('../utils/googleSheets');

// @desc    Create a new data source
// @route   POST /api/data-sources
// @access  Private
exports.createDataSource = async (req, res) => {
  try {
    const { name, type, url, sheetName, syncFrequency, columnMapping } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and type for the data source'
      });
    }

    // For Google Sheets, URL is required
    if (type === 'google_sheet' && !url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required for Google Sheet data sources'
      });
    }

    // Extract sheet ID from Google Sheets URL if provided
    let sheetId = null;
    if (type === 'google_sheet' && url) {
      const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        sheetId = match[1];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google Sheets URL'
        });
      }
    }

    // Create the data source
    const dataSource = await DataSource.create({
      user: req.user.id,
      name,
      type,
      url,
      sheetId,
      sheetName,
      syncFrequency: syncFrequency || 'manual',
      columnMapping: columnMapping || undefined,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    res.status(201).json({
      success: true,
      data: dataSource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all data sources for a user
// @route   GET /api/data-sources
// @access  Private
exports.getDataSources = async (req, res) => {
  try {
    const dataSources = await DataSource.find({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: dataSources.length,
      data: dataSources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get a single data source
// @route   GET /api/data-sources/:id
// @access  Private
exports.getDataSource = async (req, res) => {
  try {
    const dataSource = await DataSource.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        message: 'Data source not found'
      });
    }

    res.status(200).json({
      success: true,
      data: dataSource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update a data source
// @route   PUT /api/data-sources/:id
// @access  Private
exports.updateDataSource = async (req, res) => {
  try {
    const { name, url, sheetName, syncFrequency, columnMapping, status } = req.body;

    let dataSource = await DataSource.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        message: 'Data source not found'
      });
    }

    // Update sheet ID if URL is changed
    let sheetId = dataSource.sheetId;
    if (url && url !== dataSource.url && dataSource.type === 'google_sheet') {
      const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        sheetId = match[1];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google Sheets URL'
        });
      }
    }

    // Update the data source
    dataSource = await DataSource.findByIdAndUpdate(
      req.params.id,
      {
        name: name || dataSource.name,
        url: url || dataSource.url,
        sheetId: sheetId,
        sheetName: sheetName || dataSource.sheetName,
        syncFrequency: syncFrequency || dataSource.syncFrequency,
        columnMapping: columnMapping || dataSource.columnMapping,
        status: status || dataSource.status,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: dataSource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete a data source
// @route   DELETE /api/data-sources/:id
// @access  Private
exports.deleteDataSource = async (req, res) => {
  try {
    const dataSource = await DataSource.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        message: 'Data source not found'
      });
    }

    await dataSource.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Sync data from a data source
// @route   POST /api/data-sources/:id/sync
// @access  Private
exports.syncDataSource = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dataSource = await DataSource.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        message: 'Data source not found'
      });
    }

    // Update data source status to pending
    await DataSource.findByIdAndUpdate(
      dataSource._id,
      { status: 'pending', updatedAt: Date.now() },
      { session }
    );

    let transactions = [];
    let syncResult = {
      status: 'success',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errorMessage: null
    };

    // Fetch data based on the data source type
    if (dataSource.type === 'google_sheet') {
      try {
        const data = await fetchGoogleSheetData(dataSource.sheetId, dataSource.sheetName);
        transactions = processGoogleSheetData(data, dataSource.columnMapping);
        syncResult.recordsProcessed = transactions.length;
      } catch (error) {
        syncResult.status = 'error';
        syncResult.errorMessage = `Error fetching Google Sheet data: ${error.message}`;
        throw error;
      }
    } else {
      syncResult.status = 'error';
      syncResult.errorMessage = `Sync not supported for data source type: ${dataSource.type}`;
      throw new Error(syncResult.errorMessage);
    }

    // Process the transactions
    if (transactions.length > 0) {
      // Prepare transactions with user ID
      const transactionsToInsert = transactions.map(transaction => ({
        ...transaction,
        user: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Insert all transactions
      const result = await Transaction.insertMany(transactionsToInsert, { session });
      syncResult.recordsCreated = result.length;
    }

    // Create sync history record
    await SyncHistory.create(
      [{
        user: req.user.id,
        dataSource: dataSource._id,
        timestamp: Date.now(),
        status: syncResult.status,
        recordsProcessed: syncResult.recordsProcessed,
        recordsCreated: syncResult.recordsCreated,
        recordsUpdated: syncResult.recordsUpdated,
        recordsSkipped: syncResult.recordsSkipped,
        errorMessage: syncResult.errorMessage
      }],
      { session }
    );

    // Update data source with sync results
    await DataSource.findByIdAndUpdate(
      dataSource._id,
      {
        status: syncResult.status === 'success' ? 'active' : 'error',
        lastSynced: Date.now(),
        errorMessage: syncResult.errorMessage,
        updatedAt: Date.now()
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: syncResult
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Update data source status to error
    await DataSource.findByIdAndUpdate(
      req.params.id,
      {
        status: 'error',
        errorMessage: error.message,
        updatedAt: Date.now()
      }
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get sync history for a data source
// @route   GET /api/data-sources/:id/history
// @access  Private
exports.getSyncHistory = async (req, res) => {
  try {
    const dataSource = await DataSource.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        message: 'Data source not found'
      });
    }

    const history = await SyncHistory.find({
      dataSource: dataSource._id,
      user: req.user.id
    }).sort('-timestamp');

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all sync history for a user
// @route   GET /api/sync-history
// @access  Private
exports.getAllSyncHistory = async (req, res) => {
  try {
    const history = await SyncHistory.find({
      user: req.user.id
    })
    .populate('dataSource', 'name type')
    .sort('-timestamp');

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to process Google Sheet data
const processGoogleSheetData = (data, columnMapping) => {
  const transactions = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip empty rows
    if (!row || row.length === 0) continue;

    // Get column indices based on mapping
    const dateCol = columnMapping?.date ? getColumnIndex(columnMapping.date) : 0;
    const typeCol = columnMapping?.type ? getColumnIndex(columnMapping.type) : 1;
    const categoryCol = columnMapping?.category ? getColumnIndex(columnMapping.category) : 2;
    const amountCol = columnMapping?.amount ? getColumnIndex(columnMapping.amount) : 3;
    const descriptionCol = columnMapping?.description ? getColumnIndex(columnMapping.description) : 4;
    const tagsCol = columnMapping?.tags ? getColumnIndex(columnMapping.tags) : 5;
    const receiptImageCol = columnMapping?.receiptImage ? getColumnIndex(columnMapping.receiptImage) : 6;

    // Skip if required fields are missing
    if (!row[dateCol] || !row[typeCol] || !row[categoryCol] || !row[amountCol]) continue;

    // Parse date
    let dateISO = "";
    try {
      const parsed = new Date(row[dateCol]);
      if (isNaN(parsed.getTime())) {
        console.warn(`Invalid date at row ${i + 1}:`, row[dateCol]);
        continue;
      }
      dateISO = parsed.toISOString();
    } catch (error) {
      console.warn(`Error parsing date at row ${i + 1}:`, error);
      continue;
    }

    // Determine transaction type
    let transactionType = "EXPENSE";
    if (typeof row[typeCol] === 'string') {
      const typeValue = row[typeCol].toUpperCase();
      transactionType = typeValue.includes('INCOME') || typeValue.includes('REVENUE') ? "INCOME" : "EXPENSE";
    }

    // Parse amount
    let amount = 0;
    if (typeof row[amountCol] === 'number') {
      amount = Math.abs(row[amountCol]);
    } else if (typeof row[amountCol] === 'string') {
      // Remove currency symbols and commas
      const cleanedAmount = row[amountCol].replace(/[$,£€]/g, '');
      amount = Math.abs(parseFloat(cleanedAmount));
    }

    // Parse tags
    let tags = [];
    if (row[tagsCol]) {
      if (typeof row[tagsCol] === 'string') {
        tags = row[tagsCol].split(/[,;]/).map(tag => tag.trim()).filter(Boolean);
      } else if (Array.isArray(row[tagsCol])) {
        tags = row[tagsCol].map(String);
      }
    }

    transactions.push({
      date: dateISO,
      type: transactionType,
      category: String(row[categoryCol] || "Uncategorized"),
      amount: amount || 0,
      description: row[descriptionCol] ? String(row[descriptionCol]) : "",
      tags: tags,
      receiptImage: row[receiptImageCol] ? String(row[receiptImageCol]) : undefined,
    });
  }

  return transactions;
};

// Helper function to convert column letter to index
const getColumnIndex = (column) => {
  if (!column) return 0;
  
  // If it's already a number, return it
  if (!isNaN(column)) return parseInt(column);
  
  // Convert column letter to index (A=0, B=1, etc.)
  column = column.toUpperCase();
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + column.charCodeAt(i) - 64;
  }
  return index - 1;
};

// Add mongoose for transactions
const mongoose = require('mongoose');