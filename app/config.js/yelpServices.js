const sdk = require('api')('@yelp-developers/v1.0#8e0h2zlqcimwm0');

const YELP_API_KEY = process.env.YELP_API_KEY;

sdk.auth(`Bearer ${YELP_API_KEY}`);

const searchBusinesses = async (latitude, longitude, term) => {
  try {
    if (latitude == null || longitude == null) {
      throw new Error('Latitude and Longitude are required.');
    }

    const response = await sdk.v3_business_search({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      term: term,
      radius: '8046',
      sort_by: 'distance',
      limit: '50'
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // Request made and server responded
      throw new Error(`HTTP error! status: ${error.response.status}`);
    } else {
      console.log(error);
      throw new Error('Error fetching data from Yelp');
    }
  }
};

const searchBusinessViaCategory = async (state, category) => {
  try {
    const response = await sdk.v3_business_search({
      location: state,
      term: category,
      sort_by: 'rating',
      limit: '50'
    });

    return response.data
  } catch (error) {
    
    if (error.response) {
      // Request made and server responded
      throw new Error(`HTTP error! status: ${error.response.status}`);
    } else {
      console.log(error);
      throw new Error('Error fetching data from Yelp');
    }
  }
};

module.exports = { searchBusinesses, searchBusinessViaCategory };