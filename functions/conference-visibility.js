// Conference visibility update function
const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS headers for cross-origin requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { userId, conferenceId, isVisible, userData } = data;
    
    // Validate required fields
    if (!userId || !conferenceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'UserId and conferenceId are required',
          received: { userId, conferenceId }
        })
      };
    }

    console.log('Updating visibility for user:', { userId, conferenceId, isVisible });
    
    // In a real app, you would update the user's visibility in a database:
    // const response = await axios.put('https://your-api.com/visibility', data);

    // Return success response
    const visibilityData = {
      userId,
      conferenceId,
      isVisible: isVisible === true, // Explicitly convert to boolean
      timestamp: new Date().toISOString(),
      userData: userData || {}
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Visibility updated successfully',
        data: visibilityData
      })
    };
  } catch (error) {
    console.error('Error in conference-visibility function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}; 