const axios = require('axios');
const mlsSecret = process.env.MLS_GRID_API_KEY;
const AppError = require('../../utils/AppError');

const fetchInitialListings = async () => {
  const baseUrl = `https://api.mlsgrid.com/v2/Property?$filter=OriginatingSystemName eq 'mfrmls' and ListOfficeMlsId eq 'MFR55171C' and MlgCanView eq true&$expand=Media`;

  let allListings = [];
  let nextUrl = baseUrl;

  try {
    while (nextUrl) {
      const { data } = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${mlsSecret}`,
          Accept: 'application/json',
        },
      });

      allListings.push(...data.value);
      nextUrl = data['@odata.nextLink'] || null;
    }

    // Filter & map needed fields
    const filteredListings = allListings
      .filter(listing => listing.ListAgentFullName?.toLowerCase() === 'debbie bergeron')
      .map(listing => ({
        city: listing.City || '',
        address: listing.UnparsedAddress || '',
        bedrooms: listing.BedroomsTotal || 0,
        bathrooms: listing.BathroomsTotalInteger || 0,
        sqft: listing.LivingArea || 0,
        listingId: listing.ListingId || '',
        price: listing.ListPrice || 0,
        image: listing.Media?.[0]?.MediaURL || '',
        agent: listing.ListAgentFullName,
        mlsId: listing.ListAgentMlsId
      }));

    return filteredListings;
  } catch (error) {
    console.error('Error fetching MLS Grid listings:', error.response?.data || error.message);
    throw new AppError('Failed to fetch MLS listings from external service', 500);
  }
};

const fetchListingById = async (propertyId) => {
  const listingId = `MFR${propertyId}`;
  const url = `https://api.mlsgrid.com/v2/Property?$filter=OriginatingSystemName eq 'mfrmls' and ListingId eq '${listingId}' and MlgCanView eq true&$expand=Media`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${mlsSecret}`,
        Accept: 'application/json',
      },
    });

    if (!data.value || data.value.length === 0) {
      throw new AppError(`No listing found for ID ${propertyId}`, 404);
    }

    return data.value[0];
  } catch (error) {
    console.error('Error fetching listing by ID:', error.response?.data || error.message);
    throw new AppError('Failed to fetch listing details', 500);
  }
};

module.exports = { fetchInitialListings, fetchListingById };
