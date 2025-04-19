// Conference visibility update function
const axios = require('axios');

// Import the shared store for conference data
const store = require('./shared-store');

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
    
    // First ensure the user is registered
    if (userData) {
      store.registerAttendee(conferenceId, userId, userData, isVisible === true);
    }
    
    // Update the visibility
    const success = store.updateVisibility(conferenceId, userId, isVisible === true);
    
    if (!success) {
      console.log('User not found in conference, registering now');
      // Try to register the user
      store.registerAttendee(conferenceId, userId, userData, isVisible === true);
    }
    
    // Log the current state
    console.log('Debug info:', store.getDebugInfo());

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Visibility updated successfully',
        data: {
          userId,
          conferenceId,
          isVisible: isVisible === true,
          timestamp: new Date().toISOString()
        }
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
