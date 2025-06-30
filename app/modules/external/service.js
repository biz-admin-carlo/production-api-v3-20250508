const axios = require('axios');
const mlsSecret = process.env.MLS_GRID_API_KEY;
const AppError = require('../../utils/AppError');

const BASE_HEADERS = {
  Authorization: `Bearer ${mlsSecret}`,
  Accept: 'application/json',
};

const OFFICE_ID = 'MFR55171C';

const fetchInitialListings = async () => {
  const baseUrl =
    `https://api.mlsgrid.com/v2/Property` +
    `?$filter=OriginatingSystemName eq 'mfrmls'` +
    ` and ListOfficeMlsId eq '${OFFICE_ID}'` +
    ` and MlgCanView eq true` +
    `&$expand=Media`;

  let allListings = [];
  let nextUrl = baseUrl;

  try {
    while (nextUrl) {
      const { data } = await axios.get(nextUrl, { headers: BASE_HEADERS });
      allListings.push(...data.value);
      nextUrl = data['@odata.nextLink'] || null;
    }

    return allListings
      .filter(
        (listing) =>
          listing.ListAgentFullName?.toLowerCase() === 'debbie bergeron'
      )
      .map((listing) => ({
        city: listing.City || '',
        address: listing.UnparsedAddress || '',
        bedrooms: listing.BedroomsTotal || 0,
        bathrooms: listing.BathroomsTotalInteger || 0,
        sqft: listing.LivingArea || 0,
        listingId: listing.ListingId || '',
        price: listing.ListPrice || 0,
        image: listing.Media?.[0]?.MediaURL || '',
        agent: listing.ListAgentFullName,
        mlsId: listing.ListAgentMlsId,
      }));
  } catch (error) {
    console.error(
      'Error fetching MLS Grid listings:',
      error.response?.data || error.message
    );
    throw new AppError('Failed to fetch MLS listings from external service', 500);
  }
};

const fetchListingById = async (propertyId) => {
  const listingId = `MFR${propertyId}`;
  const url =
    `https://api.mlsgrid.com/v2/Property` +
    `?$filter=OriginatingSystemName eq 'mfrmls'` +
    ` and ListingId eq '${listingId}'` +
    ` and MlgCanView eq true` +
    `&$expand=Media`;

  try {
    const { data } = await axios.get(url, { headers: BASE_HEADERS });

    if (!data.value || data.value.length === 0) {
      throw new AppError(`No listing found for ID ${propertyId}`, 404);
    }

    return data.value[0];
  } catch (error) {
    console.error(
      'Error fetching listing by ID:',
      error.response?.data || error.message
    );
    throw new AppError('Failed to fetch listing details', 500);
  }
};

const fetchSearchListings = async ({ mode = 'buying', term = '' }) => {
  const propertyType = 'Residential';
  const statusClause =
    mode === 'selling'
      ? " and StandardStatus eq 'Closed'"
      : " and StandardStatus eq 'Active'";

  const baseUrl =
    `https://api.mlsgrid.com/v2/Property` +
    `?$filter=OriginatingSystemName eq 'mfrmls'` +
    ` and ListOfficeMlsId eq '${OFFICE_ID}'` +
    ` and PropertyType eq '${propertyType}'` +
    statusClause +
    ` and MlgCanView eq true` +
    `&$expand=Media`;

  let listings = [];
  let nextUrl = baseUrl;

  try {
    while (nextUrl) {
      const { data } = await axios.get(nextUrl, { headers: BASE_HEADERS });
      listings.push(...data.value);
      nextUrl = data['@odata.nextLink'] || null;
    }

    const query = term.toLowerCase();

    const filtered = listings.filter((l) => {
      if (!query) return true;
      return (
        (l.City || '').toLowerCase().includes(query) ||
        (l.PostalCode || '').toLowerCase().includes(query) ||
        (l.UnparsedAddress || '').toLowerCase().includes(query)
      );
    });

    return filtered.map((l) => ({
      city: l.City || '',
      address: l.UnparsedAddress || '',
      bedrooms: l.BedroomsTotal || 0,
      bathrooms: l.BathroomsTotalInteger || 0,
      sqft: l.LivingArea || 0,
      listingId: (l.ListingId || '').replace(/^MFR/, ''),
      price: l.ListPrice || 0,
      image: l.Media?.[0]?.MediaURL || '',
      agent: l.ListAgentFullName,
      status: l.StandardStatus,
    }));
  } catch (error) {
    console.error(
      'MLS search failed:',
      error.response?.data || error.message
    );
    throw new AppError('Unable to search MLS listings', 502);
  }
};

module.exports = {
  fetchInitialListings,
  fetchListingById,
  fetchSearchListings,
};
