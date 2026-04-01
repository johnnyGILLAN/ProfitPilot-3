/**
 * Seed script to populate ProfitPilot with sample data for investor demos
 * Run with: node scripts/seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/profitpilot';

// Sample data
const sampleCategories = [
  { name: 'Salary', type: 'INCOME', color: '#22c55e', budget: 0 },
  { name: 'Freelance', type: 'INCOME', color: '#3b82f6', budget: 0 },
  { name: 'Consulting', type: 'INCOME', color: '#8b5cf6', budget: 0 },
  { name: 'Product Sales', type: 'INCOME', color: '#06b6d4', budget: 0 },
  { name: 'Software', type: 'EXPENSE', color: '#ef4444', budget: 500 },
  { name: 'Marketing', type: 'EXPENSE', color: '#f97316', budget: 1000 },
  { name: 'Office Supplies', type: 'EXPENSE', color: '#eab308', budget: 200 },
  { name: 'Travel', type: 'EXPENSE', color: '#ec4899', budget: 800 },
  { name: 'Meals', type: 'EXPENSE', color: '#6b7280', budget: 300 },
  { name: 'Professional Services', type: 'EXPENSE', color: '#8b5cf6', budget: 500 },
];

const sampleClients = [
  { name: 'Acme Corporation', email: 'billing@acme.com', phone: '+1 (555) 123-4567', company: 'Acme Corp', address: '123 Business Ave, New York, NY' },
  { name: 'TechStart Inc', email: 'accounts@techstart.io', phone: '+1 (555) 234-5678', company: 'TechStart Inc', address: '456 Innovation Blvd, San Francisco, CA' },
  { name: 'Global Solutions', email: 'finance@globalsolutions.com', phone: '+1 (555) 345-6789', company: 'Global Solutions LLC', address: '789 Commerce St, Chicago, IL' },
  { name: 'Creative Agency', email: 'hello@creativeagency.co', phone: '+1 (555) 456-7890', company: 'Creative Agency', address: '321 Design Lane, Austin, TX' },
  { name: 'Digital Ventures', email: 'ap@digitalventures.net', phone: '+1 (555) 567-8901', company: 'Digital Ventures', address: '654 Tech Park, Seattle, WA' },
];

const generateTransactions = (userId) => {
  const transactions = [];
  const now = new Date();
  
  // Generate 3 months of data
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    
    // Income transactions
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
      type: 'INCOME',
      category: 'Salary',
      amount: 8500,
      description: 'Monthly salary',
      tags: ['recurring', 'primary-income']
    });
    
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
      type: 'INCOME',
      category: 'Freelance',
      amount: Math.floor(Math.random() * 3000) + 1500,
      description: 'Website development project',
      tags: ['client-work', 'web-dev']
    });
    
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
      type: 'INCOME',
      category: 'Consulting',
      amount: Math.floor(Math.random() * 2000) + 1000,
      description: 'Business consulting session',
      tags: ['consulting', 'hourly']
    });
    
    // Expense transactions
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 3),
      type: 'EXPENSE',
      category: 'Software',
      amount: 149.99,
      description: 'Adobe Creative Suite subscription',
      tags: ['subscription', 'tools']
    });
    
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 7),
      type: 'EXPENSE',
      category: 'Marketing',
      amount: Math.floor(Math.random() * 500) + 200,
      description: 'Google Ads campaign',
      tags: ['advertising', 'digital']
    });
    
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 12),
      type: 'EXPENSE',
      category: 'Office Supplies',
      amount: Math.floor(Math.random() * 100) + 50,
      description: 'Office supplies and stationery',
      tags: ['office']
    });
    
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 20),
      type: 'EXPENSE',
      category: 'Meals',
      amount: Math.floor(Math.random() * 150) + 80,
      description: 'Client lunch meeting',
      tags: ['client-meeting', 'business']
    });
    
    transactions.push({
      user: userId,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 25),
      type: 'EXPENSE',
      category: 'Professional Services',
      amount: 250,
      description: 'Accountant consultation',
      tags: ['accounting', 'professional']
    });
  }
  
  return transactions;
};

const generateInvoices = (userId, clients) => {
  const invoices = [];
  const now = new Date();
  
  invoices.push({
    user: userId,
    clientEmail: clients[0].email,
    invoiceNumber: 'INV-2026-001',
    date: new Date(now.getFullYear(), now.getMonth(), 1),
    dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    items: [
      { description: 'Website Development - Phase 1', quantity: 1, unitPrice: 3500 },
      { description: 'UI/UX Design', quantity: 1, unitPrice: 1500 },
    ],
    amount: 5000,
    status: 'PAID',
    notes: 'Thank you for your business!'
  });
  
  invoices.push({
    user: userId,
    clientEmail: clients[1].email,
    invoiceNumber: 'INV-2026-002',
    date: new Date(now.getFullYear(), now.getMonth(), 10),
    dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
    items: [
      { description: 'Mobile App Consultation', quantity: 4, unitPrice: 200 },
      { description: 'Technical Documentation', quantity: 1, unitPrice: 500 },
    ],
    amount: 1300,
    status: 'PENDING',
    notes: 'Net 30 payment terms'
  });
  
  invoices.push({
    user: userId,
    clientEmail: clients[2].email,
    invoiceNumber: 'INV-2026-003',
    date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
    dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
    items: [
      { description: 'Marketing Strategy Workshop', quantity: 1, unitPrice: 2000 },
    ],
    amount: 2000,
    status: 'OVERDUE',
    notes: 'Please remit payment ASAP'
  });
  
  invoices.push({
    user: userId,
    clientEmail: clients[3].email,
    invoiceNumber: 'INV-2026-004',
    date: new Date(now.getFullYear(), now.getMonth(), 20),
    dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 20),
    items: [
      { description: 'Brand Identity Package', quantity: 1, unitPrice: 4000 },
      { description: 'Logo Design Revisions', quantity: 2, unitPrice: 250 },
    ],
    amount: 4500,
    status: 'PENDING',
    notes: '50% deposit received'
  });
  
  return invoices;
};

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get or create demo user
    let user = await User.findOne({ email: 'demo@profitpilot.com' });
    
    if (!user) {
      // Let the User model handle password hashing via pre-save hook
      user = await User.create({
        name: 'Demo User',
        email: 'demo@profitpilot.com',
        password: 'demo123',  // Will be hashed by pre-save hook
        role: 'user',
        preferences: {
          currency: 'USD',
          theme: 'light',
          notifications: true
        }
      });
      console.log('Created demo user: demo@profitpilot.com / demo123');
    } else {
      console.log('Demo user already exists');
    }

    // Clear existing data for this user
    await Transaction.deleteMany({ user: user._id });
    await Category.deleteMany({ user: user._id });
    await Client.deleteMany({ user: user._id });
    await Invoice.deleteMany({ user: user._id });
    console.log('Cleared existing data');

    // Seed categories
    const categories = await Category.insertMany(
      sampleCategories.map(cat => ({ ...cat, user: user._id }))
    );
    console.log(`Created ${categories.length} categories`);

    // Seed clients
    const clients = await Client.insertMany(
      sampleClients.map(client => ({ ...client, user: user._id }))
    );
    console.log(`Created ${clients.length} clients`);

    // Seed transactions
    const transactions = generateTransactions(user._id);
    await Transaction.insertMany(transactions);
    console.log(`Created ${transactions.length} transactions`);

    // Seed invoices
    const invoices = generateInvoices(user._id, clients);
    await Invoice.insertMany(invoices);
    console.log(`Created ${invoices.length} invoices`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('  Email: demo@profitpilot.com');
    console.log('  Password: demo123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
