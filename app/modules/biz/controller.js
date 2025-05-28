const { getCombinedBusinessResults, getBusinessesByLatLong, findBizByName, getRecentFeaturedBiz } = require('./service');

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
    let { bizName } = req.params;

    if (!bizName) {
      return res.status(400).json({ success: false, message: 'Business name is required' });
    }

    // Decode the URL and convert to title-case with symbols
    const decoded = decodeURIComponent(bizName);
    const humanReadableName = decoded
      .replace(/-/g, ' ')                        // Replace dashes with spaces
      .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word

    const business = await findBizByName(humanReadableName);

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

module.exports = { searchByLocation, searchByGeoCoordinates, getBizByName, getFeaturedBiz };
