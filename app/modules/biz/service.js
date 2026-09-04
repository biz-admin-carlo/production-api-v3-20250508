const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const Biz = require('./model');
const yelpService = require('../../config.js/yelpServices');
const { transformS3UrlToCDN } = require("../../utils/s3Uploader");

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

const normalizePostgresToMongoShape = (pgData) => {
  const slugify = (name = "") =>
    encodeURIComponent(name.trim().replace(/\s+/g, "-").toLowerCase());

  return {
    alias: pgData.bizAlias || '',
    name: pgData.bizName,
    slugBizName: slugify(pgData.bizName),
    email: pgData.emailAddress,
    coordinates: {
      type: 'Point',
      coordinates: [pgData.longitude || 0, pgData.latitude || 0],
    },
    location: {
      address1: pgData.fullAddress,
      state: pgData.state,
      display_address: [pgData.fullAddress],
    },
    phone: pgData.contactNumber,
    display_phone: pgData.contactNumber,
    categories: pgData.categories.map(cat => ({ alias: cat.toLowerCase(), title: cat })),
    biz_images: pgData.images.map(img => ({ url: img, uploadedAt: new Date(), userId: null })),
    isArchived: false,
    is_closed: false,
    rating: null,
    review_count: 0,
    url: '',
    isBizDB: true,
    bizStatus: 'active',
    paymentStatus: 'active',
    subscriptionName: '',
    paymentGateway: '',
    customerEmail: '',
    amountTransacted: 0,
    keywords: pgData.keywords,
    description: pgData.description || '',
    agentName: '',
    agentId: '',
    officeHours: pgData.officeHours || null,
    servicesOffered: pgData.servicesOffered,
    iconUrl: pgData.iconUrl,
    userID: null,
  };
};

const findBizByNameUnified = async (bizName) => {
  const pgMatch = await prisma.businessDetails.findFirst({
    where: {
      OR: [
        { bizAlias: bizName },
        { bizName: { equals: bizName, mode: 'insensitive' } },
      ],
    },
    orderBy: {
      version: 'desc',
    },
  });

  if (pgMatch) {
    return normalizePostgresToMongoShape(pgMatch);
  }

  const nameRegex = new RegExp(bizName, 'i');

  let mongoMatch = await Biz.findOne({
    isArchived: false,
    name: nameRegex,
  }).lean();

  if (!mongoMatch) {
    mongoMatch = await Biz.findOne({
      isArchived: false,
      subscriptionName: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 }).lean();
  }

  return mongoMatch;
};

/**
 * Find search suggestions based on user query
 * PRIORITIZES BUSINESS NAMES FIRST
 * Returns: 7 businesses (max) + 3 categories (max) = 10 total items
 * @param {string} query - Search query (min 2 characters)
 * @returns {Object} - { businesses: [], categories: [] }
 */
const findSearchSuggestions = async (query) => {
  try {
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    
    if (normalizedQuery.length < 2) {
      return { businesses: [], categories: [] };
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedQuery = escapeRegex(normalizedQuery);

    const startsWithRegex = new RegExp(`^${escapedQuery}`, 'i');
    const containsRegex = new RegExp(escapedQuery, 'i');
    const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}`, 'i');

    const baseFilter = {
      isArchived: false,
      is_closed: false
    };

    // PHASE 1: SEARCH BUSINESSES (Max 7)
    
    const businessAggregation = await Biz.aggregate([
      {
        $match: baseFilter
      },
      {
        $addFields: {
          nameExactMatch: {
            $cond: [
              { $eq: [{ $toLower: '$name' }, normalizedQuery] },
              1000,
              0
            ]
          },
          nameStartsWith: {
            $cond: [
              { $regexMatch: { input: '$name', regex: startsWithRegex } },
              500,
              0
            ]
          },
          nameWordBoundary: {
            $cond: [
              { $regexMatch: { input: '$name', regex: wordBoundaryRegex } },
              250,
              0
            ]
          },
          nameContains: {
            $cond: [
              { $regexMatch: { input: '$name', regex: containsRegex } },
              100,
              0
            ]
          },
          categoryMatch: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$categories',
                        as: 'cat',
                        cond: { $regexMatch: { input: '$$cat.title', regex: containsRegex } }
                      }
                    }
                  },
                  0
                ]
              },
              50,
              0
            ]
          },
          cityMatch: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ['$location.city', ''] }, regex: containsRegex } },
              25,
              0
            ]
          },
          stateMatch: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ['$location.state', ''] }, regex: containsRegex } },
              15,
              0
            ]
          },
          addressMatch: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ['$location.address1', ''] }, regex: containsRegex } },
              10,
              0
            ]
          },
          zipMatch: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ['$location.zip_code', ''] }, regex: containsRegex } },
              5,
              0
            ]
          },
          keywordMatch: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ['$keywords', []] },
                        as: 'kw',
                        cond: { $regexMatch: { input: '$$kw', regex: containsRegex } }
                      }
                    }
                  },
                  0
                ]
              },
              20,
              0
            ]
          },
          paidBoost: {
            $cond: [
              { $and: [
                { $ne: ['$subscriptionName', null] },
                { $ne: ['$subscriptionName', ''] }
              ]},
              300,
              0
            ]
          },
          qualityBoost: {
            $add: [
              { $multiply: [{ $ifNull: ['$rating', 0] }, 2] },
              { $multiply: [{ $ifNull: ['$review_count', 0] }, 0.1] }
            ]
          }
        }
      },
      {
        $addFields: {
          totalScore: {
            $add: [
              '$nameExactMatch',
              '$nameStartsWith', 
              '$nameWordBoundary',
              '$nameContains',
              '$categoryMatch',
              '$cityMatch',
              '$stateMatch',
              '$addressMatch',
              '$zipMatch',
              '$keywordMatch',
              '$paidBoost',
              '$qualityBoost'
            ]
          }
        }
      },
      {
        $match: {
          totalScore: { $gt: 0 }
        }
      },
      {
        $sort: { totalScore: -1, rating: -1, createdAt: -1 }
      },
      {
        $limit: 4
      },
      {
        $project: {
          name: 1,
          slug: {
            $toLower: {
              $replaceAll: {
                input: { $trim: { input: '$name' } },
                find: ' ',
                replacement: '-'
              }
            }
          },
          city: '$location.city',
          state: '$location.state',
          address: '$location.address1',
          zipCode: '$location.zip_code',
          iconUrl: { $ifNull: ['$iconUrl', '$image_url'] },
          rating: 1,
          review_count: 1,
          categories: {
            $map: {
              input: { $slice: ['$categories', 3] },
              as: 'cat',
              in: '$$cat.title'
            }
          },
          isPaid: {
            $cond: [
              { $and: [
                { $ne: ['$subscriptionName', null] },
                { $ne: ['$subscriptionName', ''] }
              ]},
              true,
              false
            ]
          },
          phone: { $ifNull: ['$display_phone', '$phone'] },
          totalScore: 1,
          matchType: {
            $switch: {
              branches: [
                { case: { $gt: ['$nameExactMatch', 0] }, then: 'exact' },
                { case: { $gt: ['$nameStartsWith', 0] }, then: 'starts' },
                { case: { $gt: ['$nameWordBoundary', 0] }, then: 'word' },
                { case: { $gt: ['$nameContains', 0] }, then: 'contains' },
                { case: { $gt: ['$categoryMatch', 0] }, then: 'category' },
                { case: { $gt: ['$cityMatch', 0] }, then: 'city' },
                { case: { $gt: ['$stateMatch', 0] }, then: 'state' }
              ],
              default: 'other'
            }
          }
        }
      }
    ]);
    
    const categoryAggregation = await Biz.aggregate([
      {
        $match: baseFilter
      },
      {
        $unwind: '$categories'
      },
      {
        $match: {
          'categories.title': containsRegex
        }
      },
      {
        $group: {
          _id: {
            title: '$categories.title',
            alias: '$categories.alias'
          },
          count: { $sum: 1 },
          hasPaidBusiness: {
            $max: {
              $cond: [
                { $and: [
                  { $ne: ['$subscriptionName', null] },
                  { $ne: ['$subscriptionName', ''] }
                ]},
                1,
                0
              ]
            }
          },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $addFields: {
          matchScore: {
            $cond: [
              { $regexMatch: { input: '$_id.title', regex: startsWithRegex } },
              100,
              50
            ]
          }
        }
      },
      {
        $sort: { matchScore: -1, count: -1, avgRating: -1 }
      },
      {
        $limit: 3  
      },
      {
        $project: {
          _id: 0,
          title: '$_id.title',
          alias: '$_id.alias',
          count: 1,
          hasPaidBusiness: { $eq: ['$hasPaidBusiness', 1] },
          matchType: {
            $cond: [
              { $regexMatch: { input: '$_id.title', regex: startsWithRegex } },
              'starts',
              'contains'
            ]
          }
        }
      }
    ]);

    return {
      businesses: businessAggregation,
      categories: categoryAggregation
    };

  } catch (error) {
    console.error('❌ Error in findSearchSuggestions:', error);
    throw error;
  }
};

const findBizById = async (bizId) => {
  if (!bizId) return null;

  const pgMatch = await prisma.businessDetails.findFirst({
    where: {
      OR: [
        { bizId: bizId }
      ],
    },
    orderBy: {
      version: 'desc',
    },
  });

  if (pgMatch) {
    return normalizePostgresToMongoShape(pgMatch);
  }

  const mongoMatch = await Biz.findOne({
    _id: bizId,
    isArchived: false,
  }).lean();

  if (!mongoMatch) {
    mongoMatch = await Biz.findOne({
      isArchived: false,
      subscriptionName: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 }).lean();
  }

  return mongoMatch;
};

const FEATURED_MIN_COUNT = 3;
const FEATURED_FALLBACK_LIMIT = 20;

const getRecentFeaturedBiz = async () => {
  try {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const businesses = await Biz.find({
      isArchived: false,
      subscriptionName: { $exists: true, $ne: null },
      createdAt: { $gte: fourWeeksAgo }
    })
      .sort({ createdAt: -1 })
      .lean();

    if (businesses.length >= FEATURED_MIN_COUNT) return businesses;

    // Fewer than FEATURED_MIN_COUNT created in the last 4 weeks — pad out
    // with the most recent businesses with a paid subscription (not
    // already included) so this endpoint always has a decent list to show.
    const excludeIds = businesses.map((b) => b._id);
    const fallback = await Biz.find({
      isArchived: false,
      paymentStatus: { $in: ['active', 'completed'] },
      _id: { $nin: excludeIds }
    })
      .sort({ createdAt: -1 })
      .limit(FEATURED_FALLBACK_LIMIT - businesses.length)
      .lean();

    return [...businesses, ...fallback];
  } catch (err) {
    console.error('❌ Error fetching featured businesses:', err);
    throw err;
  }
};

const registerBizDetails = async (data) => {
  const { bizId } = data;
  if (!bizId) throw new AppError('bizId is required', 400);

  const last = await prisma.businessDetails.findFirst({
    where: { bizId },
    orderBy: { version: 'desc' },
    select: { version: true }
  });

  const nextVersion = last ? last.version + 1 : 1;

  return await prisma.businessDetails.create({
    data: {
      ...data,
      version: nextVersion
    }
  });
};

const saveBizIcon = async (bizName, s3Url) => {
  const cdnUrl = transformS3UrlToCDN(s3Url);
  return {
    message: `Biz icon for ${bizName} uploaded successfully`,
    imageUrl: cdnUrl,
  };
};

const saveBizGallery = async (bizName, s3Urls) => {
  const cdnUrls = s3Urls.map(transformS3UrlToCDN);
  return {
    message: `Gallery for ${bizName} uploaded successfully`,
    imageUrls: cdnUrls,
  };
};

module.exports = {
  getCombinedBusinessResults,
  getBusinessesByLatLong,
  findBizByName,
  getRecentFeaturedBiz,
  registerBizDetails,
  saveBizIcon,
  saveBizGallery,
  findBizByNameUnified,
  findBizById,
  findSearchSuggestions
};