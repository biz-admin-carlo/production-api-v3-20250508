const mongoose = require('mongoose');
require('dotenv').config();

const createSearchIndexes = async () => {
  try {
    console.log('🚀 Starting index creation...');
    console.log(`📍 Connecting to: ${process.env.MONGO_URI}`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('bizs'); // Make sure this matches your collection name

    // Check current indexes
    console.log('\n📋 Current indexes:');
    const existingIndexes = await collection.indexes();
    console.log(JSON.stringify(existingIndexes, null, 2));

    // Create text index for search suggestions
    console.log('\n🔨 Creating text search index...');
    await collection.createIndex(
      {
        name: 'text',
        'categories.title': 'text',
        'location.city': 'text',
        'location.state': 'text',
        'keywords': 'text'
      },
      {
        weights: {
          name: 10,
          'categories.title': 5,
          'location.city': 3,
          'location.state': 2,
          'keywords': 4
        },
        name: 'search_suggestions_text_index'
      }
    );
    console.log('✅ Text search index created');

    // Create single field indexes
    console.log('\n🔨 Creating single field indexes...');
    
    await collection.createIndex({ name: 1 }, { name: 'name_1' });
    console.log('✅ Index on "name" created');

    await collection.createIndex({ 'location.city': 1 }, { name: 'location_city_1' });
    console.log('✅ Index on "location.city" created');

    await collection.createIndex({ 'location.state': 1 }, { name: 'location_state_1' });
    console.log('✅ Index on "location.state" created');

    await collection.createIndex({ 'categories.title': 1 }, { name: 'categories_title_1' });
    console.log('✅ Index on "categories.title" created');

    // Create compound indexes for filtering
    console.log('\n🔨 Creating compound indexes...');
    
    await collection.createIndex(
      { isArchived: 1, is_closed: 1 },
      { name: 'active_business_filter' }
    );
    console.log('✅ Index on "isArchived + is_closed" created');

    await collection.createIndex(
      { subscriptionName: 1, isArchived: 1 },
      { name: 'paid_business_filter' }
    );
    console.log('✅ Index on "subscriptionName + isArchived" created');

    // Create sorting index
    await collection.createIndex(
      { rating: -1, review_count: -1 },
      { name: 'quality_sorting' }
    );
    console.log('✅ Index on "rating + review_count" created');

    // Verify all indexes
    console.log('\n📋 Final index list:');
    const finalIndexes = await collection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log('\n🎉 All indexes created successfully!');
    console.log('\n💡 Test your search endpoint: GET /api/biz/search-suggestions?q=test');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the migration
createSearchIndexes();