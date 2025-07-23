const { 
  getCombinedBusinessResults, 
  getBusinessesByLatLong, 
  findBizByNameUnified, 
  getRecentFeaturedBiz, 
  registerBizDetails,
  saveBizIcon,
  saveBizGallery
} = require('./service');

const searchByLocation = async (req, res, next) => {
  try {
    const { state, category } = req.query;

    if (!state || !category) {
      return res.status(400).json({ success: false, message: 'State and category are required' });
    }

    const { businesses, counts } = await getCombinedBusinessResults(state, category);

    res.status(200).json({
      success: true,
      message: 'Businesses fetched successfully',
      counts,
      data: businesses
    });
  } catch (error) {
    next(error);
  }
};

const searchByGeoCoordinates = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.params;
    const { category } = req.query;

    if (!latitude || !longitude || !category) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and category are required'
      });
    }

    const { businesses, counts } = await getBusinessesByLatLong(latitude, longitude, category);

    res.status(200).json({
      success: true,
      message: 'Businesses fetched successfully',
      counts,
      data: businesses
    });
  } catch (err) {
    next(err);
  }
};

const getBizByName = async (req, res, next) => {
  try {
    const { bizName } = req.params;
    if (!bizName) {
      return res.status(400).json({ success: false, message: 'Business name is required' });
    }

    const decoded = decodeURIComponent(bizName).toLowerCase();
    const humanReadableName = decoded
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

    const business = await findBizByNameUnified(humanReadableName);

    if (!business) {
      return res.status(404).json({ success: false, message: 'No business found' });
    }

    return res.status(200).json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
};

const getFeaturedBiz = async (req, res, next) => {
  try {
    const featured = await getRecentFeaturedBiz();
    res.status(200).json({
      timestamp: new Date().toISOString(),
      success: true,
      data: featured
    });
  } catch (err) {
    next(err);
  }
};

async function createBizDetails(req, res, next) {
  try {
    const bizDetail = await registerBizDetails({
      bizId: req.body.bizId,
      bizName: req.body.bizName,
      bizAlias: req.body.bizAlias || req.body.alias || '',
      state: req.body.state,
      fullAddress: req.body.fullAddress,
      contactNumber: req.body.contactNumber,
      categories: req.body.categories,
      servicesOffered: req.body.servicesOffered,
      keywords: req.body.keywords || [],
      description: req.body.description,
      emailAddress: req.body.emailAddress,
      otherWebsites: req.body.otherWebsites || [],
      officeHours: req.body.officeHours,
      images: req.body.images,
      iconUrl: req.body.iconUrl,
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null
    });

    res.status(201).json({
      success: true,
      data: {
        id:        bizDetail.id,
        version:   bizDetail.version,
        createdAt: bizDetail.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

const handleBizIconUpload = async (req, res) => {
  try {
    const { bizName } = req.query;
    const imageUrl = req.file.location;
    const result = await saveBizIcon(bizName, imageUrl);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error in handleBizIconUpload:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleBizGalleryUpload = async (req, res) => {
  try {
    const { bizName } = req.query;
    const imageUrls = req.files.map((file) => file.location);
    const result = await saveBizGallery(bizName, imageUrls);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error in handleBizGalleryUpload:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { 
  searchByLocation, 
  searchByGeoCoordinates, 
  getBizByName, 
  getFeaturedBiz, 
  createBizDetails,
  handleBizIconUpload,
  handleBizGalleryUpload
};