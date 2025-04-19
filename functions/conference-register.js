// Conference registration function
const axios = require('axios');

// Import the shared store for conference data
const store = require('./shared-store');

exports.handler = async function(event, context) {
  // CORS headers for cross-origin requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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

    console.log('Registering user for conference:', { 
      userId, 
      conferenceId, 
      isVisible,
      userData: userData ? `${userData.name || 'Unknown'} (${userId})` : 'None' 
    });
    
    // Register user with the conference using shared store
    const success = store.registerAttendee(conferenceId, userId, userData, isVisible !== false);
    
    if (!success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to register user for conference',
          userId,
          conferenceId
        })
      };
    }
    
    // Log the current state
    console.log('Debug info:', store.getDebugInfo());

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'User registered successfully',
        data: {
          id: userId,
          conferenceId,
          isVisible: isVisible !== false,
          timestamp: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    console.error('Error in conference-register function:', error);
    
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
