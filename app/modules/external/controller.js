const {
  fetchInitialListings,
  fetchListingById,
  fetchSearchListings,
} = require('./service');

const getClientInitialListings = async (req, res, next) => {
  try {
    const listings = await fetchInitialListings();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: listings,
    });
  } catch (err) {
    next(err);
  }
};

const getSingleListing = async (req, res, next) => {
  const { ID } = req.params;

  try {
    const listing = await fetchListingById(ID);
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: listing,
    });
  } catch (err) {
    next(err);
  }
};

const searchListings = async (req, res, next) => {
  const mode = req.query.mode === 'lease' ? 'lease' : 'sale';
  const term = (req.query.query || '').trim();

  try {
    const results = await fetchSearchListings({ mode, term });
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      count: results.length,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getClientInitialListings, getSingleListing, searchListings };
