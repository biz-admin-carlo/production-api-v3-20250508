const Biz = require('./model');
const yelpService = require('../../config.js/yelpServices');

const getBizFromBizModel = async (state, category) => {
  const stateRegex = new RegExp(state, 'i');
  const categoryRegex = new RegExp(category, 'i');

  const results = await Biz.find({
    isArchived: false,
    subscriptionName: { $exists: true, $ne: null },
    $and: [
      {
        $or: [
          { 'location.city': stateRegex },
          { 'location.state': stateRegex },
          { 'location.country': stateRegex },
          { 'location.display_address': stateRegex }
        ]
      },
      {
        $or: [
          { 'categories.title': categoryRegex },
          { 'categories.alias': categoryRegex }
        ]
      }
    ]
  });

  return results.map(biz => ({ ...biz.toObject(), source: 'Paid' }));
};

const getBizFromBizModelFree = async (state, category) => {
  const stateRegex = new RegExp(state, 'i');
  const categoryRegex = new RegExp(category, 'i');

  const results = await Biz.find({
    isArchived: false,
    $or: [
      { subscriptionName: { $exists: false } },
      { subscriptionName: null }
    ],
    $and: [
      {
        $or: [
          { 'location.city': stateRegex },
          { 'location.state': stateRegex },
          { 'location.country': stateRegex },
          { 'location.display_address': stateRegex }
        ]
      },
      {
        $or: [
          { 'categories.title': categoryRegex },
          { 'categories.alias': categoryRegex }
        ]
      }
    ]
  });

  // Optional: Tag as free
  return results.map(biz => ({ ...biz.toObject(), source: 'Free' }));
};

const getCombinedBusinessResults = async (state, category) => {
  let resultSearch1 = [];
  let resultSearch2 = [];
  let resultSearch3 = [];

  try {
    resultSearch1 = await getBizFromBizModel(state, category);
  } catch (e) {
    console.error('❌ Error from Paid Listings:', e);
  }

  try {
    resultSearch2 = await getBizFromBizModelFree(state, category);
  } catch (e) {
    console.error('❌ Error from Free Listings:', e);
  }

  try {
    const yelpResults = await yelpService.searchBusinessViaCategory(state, category);
    resultSearch3 = yelpResults.businesses.map(biz => ({ ...biz, source: 'Yelp' }));
  } catch (e) {
    console.error('❌ Error from Yelp:', e);
  }

  // Start combining
  let businesses = resultSearch1;
  const count1 = resultSearch1.length;

  if (businesses.length < 50) {
    businesses = businesses.concat(resultSearch2.slice(0, 50 - businesses.length));
  }
  const count2 = businesses.length - count1;

  if (businesses.length < 50) {
    businesses = businesses.concat(resultSearch3.slice(0, 50 - businesses.length));
  }
  const count3 = businesses.length - count1 - count2;

  const totalBeforeLimit = businesses.length;

  if (businesses.length < 50) {
    const fallback = await getRandomFallbackBiz(50 - businesses.length);
    businesses = businesses.concat(fallback);
  }

  // 🔒 Enforce strict limit
  businesses = businesses.slice(0, 50);
  const finalCount = businesses.length;

  return {
    businesses,
    counts: {
      resultSearch1: count1,
      resultSearch2: count2,
      resultSearch3: count3,
      totalBeforeLimit,
      total: finalCount
    }
  };
};

const getBusinessesByLatLong = async (latitude, longitude, category) => {
  const categoryRegex = new RegExp(category, 'i');
  const coords = [parseFloat(longitude), parseFloat(latitude)];

  // 1. Paid businesses nearby
  let resultSearch1 = await Biz.find({
    isArchived: false,
    subscriptionName: { $exists: true, $ne: null },
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coords
        },
        $maxDistance: 8000 // meters (5 miles)
      }
    },
    $or: [
      { 'categories.title': categoryRegex },
      { 'categories.alias': categoryRegex }
    ]
  }).lean().exec();

  resultSearch1 = resultSearch1.map(b => ({ ...b, source: 'Paid' }));

  // 2. Free businesses nearby
  let resultSearch2 = await Biz.find({
    isArchived: false,
    $or: [
      { subscriptionName: { $exists: false } },
      { subscriptionName: null }
    ],
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coords
        },
        $maxDistance: 8000
      }
    },
    $or: [
      { 'categories.title': categoryRegex },
      { 'categories.alias': categoryRegex }
    ]
  }).lean().exec();

  resultSearch2 = resultSearch2.map(b => ({ ...b, source: 'Free' }));

  // 3. Yelp fallback
  let resultSearch3 = [];
  try {
    const res = await yelpService.searchBusinesses(latitude, longitude, category);
    resultSearch3 = res.businesses.map(b => ({ ...b, source: 'Yelp' }));
  } catch (e) {
    console.error('Error from Yelp:', e);
  }

  // Merge results
  let businesses = resultSearch1;
  const count1 = resultSearch1.length;

  if (businesses.length < 50) {
    businesses = businesses.concat(resultSearch2.slice(0, 50 - businesses.length));
  }
  const count2 = businesses.length - count1;

  if (businesses.length < 50) {
    businesses = businesses.concat(resultSearch3.slice(0, 50 - businesses.length));
  }
  const count3 = businesses.length - count1 - count2;

  if (businesses.length < 50) {
    const fallback = await getRandomFallbackBiz(50 - businesses.length);
    businesses = businesses.concat(fallback);
  }
  
  return {
    businesses: businesses.slice(0, 50),
    counts: {
      resultSearch1: count1,
      resultSearch2: count2,
      resultSearch3: count3,
      total: businesses.length
    }
  };
};

const getRandomFallbackBiz = async (limit = 10) => {
  const count = await Biz.countDocuments({
    isArchived: false,
    subscriptionName: { $exists: true, $ne: null }
  });

  const skip = Math.max(0, Math.floor(Math.random() * (count - limit)));
  
  const fallback = await Biz.find({
    isArchived: false,
    subscriptionName: { $exists: true, $ne: null }
  }).skip(skip).limit(limit).lean();

  return fallback.map(b => ({ ...b, source: 'Fallback' }));
};

const findBizByName = async (bizName) => {
  const nameRegex = new RegExp(bizName, 'i');

  let found = await Biz.findOne({
    isArchived: false,
    name: nameRegex
  }).lean();

  if (!found) {
    found = await Biz.findOne({
      isArchived: false,
      subscriptionName: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 }).lean();
  }

  return found;
};

const getRecentFeaturedBiz = async () => {
  try {
    const businesses = await Biz.find({
      isArchived: false,
      subscriptionName: { $exists: true, $ne: null }
    })
      .sort({ createdAt: -1 }) 
      .limit(10)
      .lean();
    
    return businesses;
  } catch (err) {
    console.error('❌ Error fetching featured businesses:', err);
    throw err;
  }
};





module.exports = {
  getCombinedBusinessResults,
  getBusinessesByLatLong,
  findBizByName,
  getRecentFeaturedBiz
};
