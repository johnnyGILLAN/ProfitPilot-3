const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const User = require('../models/User');

// @desc    Generate PDF for invoice
// @route   GET /api/invoices/:id/pdf
// @access  Private
exports.generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const user = await User.findById(req.user.id);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);

    // Pipe to response
    doc.pipe(res);

    // Header
    doc.fontSize(28).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
    doc.moveDown(0.5);

    // Company info (from user)
    doc.fontSize(12).font('Helvetica-Bold').text(user.name || 'Your Business');
    if (user.preferences?.companyName) {
      doc.fontSize(10).font('Helvetica').text(user.preferences.companyName);
    }
    doc.text(user.email);
    doc.moveDown();

    // Invoice details
    doc.fontSize(10).font('Helvetica');
    const invoiceDetailsY = doc.y;
    
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
    doc.text(`Status: ${invoice.status}`);
    doc.moveDown();

    // Bill To
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:');
    doc.fontSize(10).font('Helvetica').text(invoice.clientEmail);
    doc.moveDown(2);

    // Items table header
    const tableTop = doc.y;
    const tableLeft = 50;
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', tableLeft, tableTop);
    doc.text('Qty', 350, tableTop, { width: 50, align: 'right' });
    doc.text('Price', 410, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', 480, tableTop, { width: 70, align: 'right' });

    // Draw line under header
    doc.moveTo(tableLeft, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Items
    let itemY = tableTop + 25;
    doc.font('Helvetica');
    
    invoice.items.forEach((item) => {
      const amount = item.quantity * item.unitPrice;
      
      doc.text(item.description, tableLeft, itemY, { width: 280 });
      doc.text(item.quantity.toString(), 350, itemY, { width: 50, align: 'right' });
      doc.text(`$${item.unitPrice.toFixed(2)}`, 410, itemY, { width: 70, align: 'right' });
      doc.text(`$${amount.toFixed(2)}`, 480, itemY, { width: 70, align: 'right' });
      
      itemY += 20;
    });

    // Total line
    doc.moveTo(350, itemY + 5).lineTo(550, itemY + 5).stroke();
    
    // Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 410, itemY + 15, { width: 70, align: 'right' });
    doc.text(`$${invoice.amount.toFixed(2)}`, 480, itemY + 15, { width: 70, align: 'right' });

    // Notes
    if (invoice.notes) {
      doc.moveDown(3);
      doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(invoice.notes);
    }

    // Footer
    doc.fontSize(8).font('Helvetica').text(
      'Thank you for your business!',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    // Finalize
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
