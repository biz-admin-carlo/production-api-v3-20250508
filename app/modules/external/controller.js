const { fetchInitialListings, fetchListingById } = require('./service');
const AppError = require('../../utils/AppError');

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

module.exports = { getClientInitialListings, getSingleListing };