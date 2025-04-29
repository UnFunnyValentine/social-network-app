// Conference history function
const supabaseQueries = require('./supabase-db');

exports.handler = async (event, context) => {
  // CORS headers for cross-origin requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get all conferences from Supabase
    const conferences = await supabaseQueries.getAllConferences();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        data: conferences
      })
    };
  } catch (error) {
    console.error('Error fetching conference history:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch conference history',
        details: error.message
      })
    };
  }
}; 