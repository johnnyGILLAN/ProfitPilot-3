const bcrypt = require('bcryptjs');
const { firestore } = require('../lib/firebase');

async function seed() {
  try {
    const email = process.env.SEED_EMAIL || 'tester@profitpilot.com';
    const password = process.env.SEED_PASSWORD || 'Test1234';
    const name = process.env.SEED_NAME || 'Local Tester';

    const existing = await firestore.collection('users').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      console.log('Test user already exists. Skipping creation.');
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const user = { name, email, passwordHash: hash, role: 'FREE', profile: {}, createdAt };
    const docRef = await firestore.collection('users').add(user);
    console.log('Created test user:', { id: docRef.id, email, password });
    process.exit(0);
  } catch (err) {
    console.error('Failed to create test user:', err);
    process.exit(1);
  }
}

seed();
