// Conference attendees function
const axios = require('axios');

// Import the shared store for conference data
const store = require('./shared-store');

// Global in-memory storage for conference attendees (in production, use a database)
// This will persist between function calls as long as the function instance stays warm
const conferenceAttendees = {};

// Function to register a user for a conference
function registerUserForConference(conferenceId, userData) {
  if (!conferenceId || !userData || !userData.id) {
    console.error('Invalid data for registration');
    return false;
  }

  // Initialize conference if it doesn't exist
  if (!conferenceAttendees[conferenceId]) {
    conferenceAttendees[conferenceId] = {};
  }

  // Store user data keyed by user ID
  conferenceAttendees[conferenceId][userData.id] = {
    id: userData.id,
    profile: userData,
    isVisible: userData.isVisible !== false, // Default to visible
    joinedAt: new Date().toISOString()
  };

  console.log(`User ${userData.id} registered for conference ${conferenceId}`);
  console.log(`Conference ${conferenceId} now has ${Object.keys(conferenceAttendees[conferenceId]).length} attendees`);
  
  return true;
}

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

  try {
    // Get conference ID from path or query params
    let conferenceId;
    let currentUserId;
    
    // Parse query parameters
    const params = event.queryStringParameters || {};
    
    // Handle different parameter formats
    conferenceId = params.conferenceId || params.id;
    currentUserId = params.currentUserId || params.userId;
    
    // If parameters are not in query, try to extract from path
    if (!conferenceId) {
      const pathParts = event.path.split('/');
      const conferenceIndex = pathParts.indexOf('conference');
      if (conferenceIndex >= 0 && conferenceIndex + 1 < pathParts.length) {
        conferenceId = pathParts[conferenceIndex + 1];
      }
    }
    
    // Handle if conferenceId is still not found
    if (!conferenceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Conference ID is required',
          path: event.path,
          params
        })
      };
    }

    console.log('Getting attendees for conference:', { conferenceId, currentUserId });
    
    // Check if this is a POST request with registration data
    if (event.httpMethod === 'POST') {
      try {
        const data = JSON.parse(event.body);
        if (data.userData && data.conferenceId) {
          // Register user with the conference using the shared store
          const userId = data.userData.id;
          const isVisible = data.isVisible !== false;
          
          if (store.registerAttendee(data.conferenceId, userId, data.userData, isVisible)) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                status: 'success',
                message: 'User registered for conference',
                conferenceId: data.conferenceId,
                userId: userId
              })
            };
          }
        }
      } catch (parseError) {
        console.error('Error parsing registration data:', parseError);
      }
    }
    
    // Get attendees from the shared store
    const attendees = store.getAttendees(conferenceId, currentUserId);
    
    // Log debug info
    console.log('Debug info:', store.getDebugInfo());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conferenceId,
        attendees,
        totalCount: attendees.length
      })
    };
  } catch (error) {
    console.error('Error in conference-attendees function:', error);
    
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
