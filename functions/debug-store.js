// Debug function to check the current state of the store
// Used only for debugging and monitoring, not for production data generation
const store = require('./shared-store');

exports.handler = async function(event, context) {
  // CORS headers
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

  try {
    // Log the current state of the store
    console.log('Current store state:', JSON.stringify(store.getDebugInfo(), null, 2));
    
    // Query parameters
    const params = event.queryStringParameters || {};
    const action = params.action || '';
    
    let result = {};
    
    // Handle different actions - only debug info in production
    switch (action) {
      case 'get_attendees':
        // Get attendees for a specific conference
        const conferenceId = params.conferenceId || '';
        const currentUserId = params.currentUserId;
        
        if (!conferenceId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Missing conferenceId parameter',
              action
            })
          };
        }
        
        const attendees = store.getAttendees(conferenceId, currentUserId);
        
        result = {
          action: 'get_attendees',
          conferenceId,
          currentUserId,
          attendees,
          count: attendees.length
        };
        break;
        
      default:
        // Just get debug info
        result = {
          action: 'get_debug_info',
          debugInfo: store.getDebugInfo()
        };
    }

    // Return the current state
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };
  } catch (error) {
    console.error('Error in debug-store function:', error);
    
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