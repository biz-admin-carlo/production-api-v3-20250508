const axios = require('axios');
const AppError = require('../../utils/AppError');

const mlsSecret = process.env.MLS_GRID_API_KEY;
const BASE_HEADERS = {
  Authorization: `Bearer ${mlsSecret}`,
  Accept: 'application/json',
};

const MAX_RESULTS = 30;
const POLL_INTERVAL_MS = 15 * 60 * 1000; 
let cache = [];       
let lastSync = null;

const syncFeed = async () => {
  const timestampFilter = lastSync
    ? ` and ModificationTimestamp gt ${lastSync.toISOString()}`
    : '';

  const url =
    `https://api.mlsgrid.com/v2/Property` +
    `?$filter=OriginatingSystemName eq 'mfrmls'` +
    ` and PropertyType eq 'Residential'` +
    timestampFilter +
    ` and MlgCanView eq true` +
    `&$top=1000` +
    `&$select=ListingId,City,PostalCode,UnparsedAddress,` +
    `BedroomsTotal,BathroomsTotalInteger,LivingArea,ListPrice,` +
    `StandardStatus,ModificationTimestamp`;

  let next = url;
  try {
    while (next) {
      const { data } = await axios.get(next, { headers: BASE_HEADERS });
      data.value.forEach((row) => {
        const idx = cache.findIndex((c) => c.ListingId === row.ListingId);
        if (idx === -1) cache.push(row);
        else cache[idx] = row;
      });
      next = data['@odata.nextLink'] || null;
    }
    lastSync = new Date();
  } catch (err) {
    console.error('MLS sync failed:', err.response?.data || err.message);
  }
};

setInterval(syncFeed, POLL_INTERVAL_MS);
syncFeed();

const fetchInitialListings = async () => {
  return cache.slice(0, MAX_RESULTS).map(mapPublic);
};

const fetchListingById = async (propertyId) => {
  const id = propertyId.startsWith('MFR') ? propertyId : `MFR${propertyId}`;
  const url =
    `https://api.mlsgrid.com/v2/Property` +
    `?$filter=OriginatingSystemName eq 'mfrmls'` +
    ` and ListingId eq '${id}'` +
    ` and MlgCanView eq true` +
    `&$expand=Media`;

  try {
    const { data } = await axios.get(url, { headers: BASE_HEADERS });
    if (!data.value?.length) {
      throw new AppError(`No listing found for ID ${propertyId}`, 404);
    }
    return data.value[0];
  } catch (err) {
    console.error('Error fetching listing by ID:', err.response?.data || err.message);
    throw new AppError('Failed to fetch listing details', 500);
  }
};

const fetchSearchListings = async ({ mode = 'buying', term = '' } = {}) => {
  // 1️⃣  make sure the cache is populated at least once
  if (!cache.length) await syncFeed();
  console.log(mode, term);

  const needle = term.trim().toLowerCase();

  // 2️⃣  canonicalise status strings to lower-case without spaces
  const canonical = (s = '') => s.toLowerCase().replace(/\s+/g, '');

  // allowed sets
  const ALIVE  = new Set(['active', 'activeundercontract', 'pending']);
  const SOLD   = new Set(['closed', 'sold']);

  const allow  = mode === 'selling' ? SOLD : ALIVE;

  // 3️⃣  filter cache
  const matched = cache.filter((l) => {
    const st = canonical(l.StandardStatus);
    if (!allow.has(st)) return false;

    if (!needle) return true;          // no search term ⇒ keep

    return (
      (l.City || '').toLowerCase().includes(needle)            ||
      (l.PostalCode || '').toLowerCase().includes(needle)      ||
      (l.UnparsedAddress || '').toLowerCase().includes(needle)
    );
  });

  // 4️⃣  cap to 30 for the UI and map fields
  return matched.slice(0, MAX_RESULTS).map(mapPublic);
};

function mapPublic(l) {
  return {
    city:       l.City || '',
    address:    l.UnparsedAddress || '',
    bedrooms:   l.BedroomsTotal || 0,
    bathrooms:  l.BathroomsTotalInteger || 0,
    sqft:       l.LivingArea || 0,
    listingId:  (l.ListingId || '').replace(/^MFR/, ''),
    price:      l.ListPrice || 0,
    status:     l.StandardStatus,
  };
}

module.exports = {
  fetchInitialListings,
  fetchListingById,
  fetchSearchListings,
};
