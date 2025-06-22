const express = require('express');
const {
  getClientInitialListings,
  getSingleListing,
} = require('./controller');

const router = express.Router();

router.get('/mls/initial-listings/', getClientInitialListings);
router.get('/mls/detailed-listings/:ID', getSingleListing);

module.exports = router;