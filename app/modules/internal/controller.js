const { 
  fetchAllUsers, 
  updateUserCode, 
  deactivateUser, 
  fetchUserById, 
  fetchAllBiz,
  fetchAllTransactionsWithUserAndPayment,
  fetchAllPayments, 
  deletePaymentById, 
  fetchAllDisputes,
  fetchAllSubscriberBillingDetails,
  updateBizInMongo,
  getBizStats,
  fetchAllBizWithPaymentTracking
} = require('./service');
const {
  getBillingDetails
} = require('../../modules/subscribers/service');
const AppError = require('../../utils/AppError');
const Customer = require('../../webhooks/CustomerModel');
const Biz = require('../biz/model');
const cacheService = require('../services/cacheService');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await fetchAllUsers();
    res.status(200).json({
      success: true,
      data: users,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

const updateAccountType = async (req, res, next) => {
  try {
    const { userId, userCode } = req.body;
    if (!userId || !userCode) {
      throw new AppError('userId and userCode are required.', 400);
    }

    const updated = await updateUserCode(userId, userCode);
    res.status(200).json({
      success: true,
      message: 'User type updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

const deleteUserAccount = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError('userId is required', 400);
    const result = await deactivateUser(userId);
    res.status(200).json({ success: true, message: 'User deactivated', data: result });
  } catch (err) {
    next(err);
  }
};

const getAllDisputes = async (req, res, next) => {
  try {
    const disputes = await fetchAllDisputes();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: disputes
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { userID } = req.params;
    const user = await fetchUserById(userID);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

const getAllBiz = async (req, res, next) => {
  try {
    const businesses = await fetchAllBiz();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: businesses
    });
  } catch (err) {
    next(err);
  }
};

const getAllBizSuper = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const searchTerm = req.query.search || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    
    // Build query params for cache key
    const queryParams = { page, limit, search: searchTerm, status, sortBy, sortOrder };
    
    // ===================================
    // 1. TRY CACHE FIRST
    // ===================================
    const cachedResponse = cacheService.getBizList(queryParams);
    if (cachedResponse) {
      return res.status(200).json({
        ...cachedResponse,
        fromCache: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // ===================================
    // 2. BUILD MATCH CRITERIA
    // ===================================
    const matchCriteria = {};
    if (searchTerm) {
      matchCriteria.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { alias: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    if (status) {
      matchCriteria.bizStatus = status;
    }

    // ===================================
    // 3. GET STATS (with cache)
    // ===================================
    let stats = cacheService.getBizStats();
    if (!stats) {
      stats = await getBizStats();
      cacheService.setBizStats(stats, 300); // Cache for 5 min
    }
    
    // ===================================
    // 4. GET TOTAL COUNT
    // ===================================
    const totalCount = await Biz.countDocuments(matchCriteria);
    
    // ===================================
    // 5. SMART PAGINATION WITH CACHE
    // ===================================
    let businesses;
    const isFirstFourPages = page <= 4 && !searchTerm && !status;
    
    if (isFirstFourPages) {
      // Try to get first 40 from cache
      let first40 = cacheService.getFirst40Biz();
      
      if (!first40) {
        // Load and cache first 40
        console.log('📥 Loading first 40 businesses...');
        first40 = await fetchAllBizWithPaymentTracking(
          {},
          0,
          40,
          sortBy,
          sortOrder === 'asc' ? 1 : -1
        );
        cacheService.setFirst40Biz(first40, 300); // Cache for 5 min
      }
      
      // Return slice from cached data
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + limit;
      businesses = first40.slice(startIdx, endIdx);
      
      console.log(`✨ Page ${page} from cached first 40`);
      
    } else {
      // Fetch from database (pages 5+, or with filters)
      console.log(`🔍 Fetching page ${page} from database...`);
      businesses = await fetchAllBizWithPaymentTracking(
        matchCriteria,
        skip,
        limit,
        sortBy,
        sortOrder === 'asc' ? 1 : -1
      );
    }
    
    // ===================================
    // 6. BUILD RESPONSE
    // ===================================
    const response = {
      success: true,
      stats: {
        total: stats.total,
        paid: stats.paid,
        free: stats.free,
        overdue: stats.overdue
      },
      data: businesses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
        from: skip + 1,
        to: Math.min(skip + limit, totalCount)
      },
      fromCache: false,
      timestamp: new Date().toISOString()
    };
    
    // ===================================
    // 7. CACHE THE RESPONSE
    // ===================================
    cacheService.setBizList(queryParams, response, 300); // 5 minutes
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ getAllBizSuper error:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

const clearBizCache = () => {
  cacheService.clearAllBizCache();
};

const getAllPayments = async (req, res, next) => {
  try {
    const payments = await fetchAllPayments();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: payments
    });
  } catch (err) {
    next(err);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const businesses = await fetchAllTransactionsWithUserAndPayment();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: businesses,
    });
  } catch (err) {
    next(err);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) throw new AppError('paymentId is required', 400);

    const result = await deletePaymentById(paymentId);

    cacheService.clearAllBizCache(); // Use shared cache
    
    res.status(200).json({
      success: true,
      message: 'Payment record deleted',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getCheckPayment = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Customer email is required', 400);

    const payments = await Customer.find({ 'paymentDetails.receiptEmail': email })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (err) {
    next(err);
  }
};

const getUpdatedCardDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    let data;

    if (userId) {
      data = await getBillingDetails(userId);
      console.log(data);
      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'No billing details found for this user.',
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    }

    if (String(latestPerUser).toLowerCase() === 'true') {
      data = await fetchAllLatestSubscriberBillingDetailsPerUser();
    } else {
      data = await fetchAllSubscriberBillingDetails(); // ALL rows
    }

    res.status(200).json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

const pickAllowedFields = (p = {}) => {
  const allowed = {
    bizId: p.bizId, 
    alias: p.alias,
    name: p.name,
    image_url: p.image_url,
    is_closed: p.is_closed,
    url: p.url,
    review_count: p.review_count,
    categories: p.categories,                
    rating: p.rating,
    email: p.email,
    coordinates: p.coordinates,              
    transactions: p.transactions,            
    location: p.location,                    
    phone: p.phone,
    display_phone: p.display_phone,
    isArchived: p.isArchived,
    isArchivedId: p.isArchivedId,            
    isBizDB: p.isBizDB,
    userID: p.userID,                        
    bizStatus: p.bizStatus,  // ← This field now handles "overdue", "active", "pending"
    paymentStatus: p.paymentStatus,
    subscriptionName: p.subscriptionName,
    paymentGateway: p.paymentGateway,
    customerEmail: p.customerEmail,
    amountTransacted: p.amountTransacted,
    keywords: p.keywords,                    
    agentName: p.agentName,
    agentId: p.agentId
  };

  Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);
  return allowed;
};

async function editBizDetails(req, res, next) {
  try {
    const body = pickAllowedFields(req.body || {});
    if (!body.bizId) {
      return res.status(400).json({ success: false, message: 'bizId is required' });
    }

    const validStatuses = ['pending', 'active', 'overdue', 'suspended', 'cancelled'];
    if (body.bizStatus && !validStatuses.includes(body.bizStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid bizStatus. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const updated = await updateBizInMongo(body, {
      actorUserId: req.user?.userId ?? null,
      actorEmail:  req.user?.email  ?? null
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    if (body.bizStatus) {
      console.log(
        `Business ${updated.name} (${updated._id}) status changed to ${body.bizStatus} by ${req.user?.email || 'system'}`
      );
    }
    
    cacheService.clearAllBizCache(); // Use shared cache

    return res.status(200).json({
      success: true,
      message: 'Business details updated successfully',
      data: {
        _id: updated._id,
        alias: updated.alias,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        location: updated.location,
        categories: updated.categories,
        rating: updated.rating,
        isArchived: updated.isArchived,
        bizStatus: updated.bizStatus,
        paymentStatus: updated.paymentStatus,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}


async function toggleOverdueStatus(req, res, next) {
  try {
    const { bizId } = req.params;
    const { bizStatus } = req.body;

    if (!bizId) {
      return res.status(400).json({ 
        success: false, 
        message: 'bizId is required' 
      });
    }

    if (!bizStatus || !['active', 'overdue'].includes(bizStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'bizStatus must be either "active" or "overdue"' 
      });
    }

    // Use existing updateBizInMongo function
    const updated = await updateBizInMongo(
      { bizId, bizStatus },
      {
        actorUserId: req.user?.userId ?? null,
        actorEmail: req.user?.email ?? null
      }
    );

    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    // Log the change
    console.log(
      `Business ${updated.name} (${updated._id}) marked as ${bizStatus.toUpperCase()} by ${req.user?.email || 'system'}`
    );

    return res.status(200).json({
      success: true,
      message: `Business marked as ${bizStatus.toUpperCase()}`,
      data: {
        _id: updated._id,
        name: updated.name,
        bizStatus: updated.bizStatus,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

async function bulkUpdateBizStatus(req, res, next) {
  try {
    const { bizIds, bizStatus } = req.body;

    if (!Array.isArray(bizIds) || bizIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'bizIds must be a non-empty array'
      });
    }

    if (!bizStatus || !['pending', 'active', 'overdue', 'suspended', 'cancelled'].includes(bizStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bizStatus value'
      });
    }

    // Bulk update
    const result = await Biz.updateMany(
      { _id: { $in: bizIds } },
      { 
        $set: { 
          bizStatus,
          updatedAt: new Date()
        }
      }
    );

    console.log(
      `Bulk update: ${result.modifiedCount} businesses marked as ${bizStatus.toUpperCase()} by ${req.user?.email || 'system'}`
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} businesses updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        bizStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  getAllUsers, 
  updateAccountType, 
  deleteUserAccount, 
  getUserById, 
  getAllBiz, 
  getAllTransactions, 
  getAllPayments, 
  deletePayment, 
  getAllDisputes, 
  getCheckPayment,
  getUpdatedCardDetails,
  editBizDetails,
  toggleOverdueStatus,    
  bulkUpdateBizStatus,
  getAllBizSuper,
  clearBizCache   
};
