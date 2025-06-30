const express = require('express');
const {
  getClientInitialListings,
  getSingleListing,
  searchListings,
} = require('./controller');

const router = express.Router();

router.get('/mls/initial-listings/', getClientInitialListings);
router.get('/mls/detailed-listings/:ID', getSingleListing);
router.get('/mls/search-listings', searchListings);

module.exports = router;
