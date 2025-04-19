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
    
    // Ensure the conference exists in our store
    const exists = store.conferenceExists(conferenceId);
    console.log(`Conference ${conferenceId} exists in store: ${exists}`);
    
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
    
    // List all conferences for debug
    console.log('All conferences in store:', Object.keys(store.conferenceAttendees));
    
    // Get the current state of the conference
    const allAttendees = Object.values(store.conferenceAttendees[conferenceId] || {});
    const visibleAttendees = allAttendees.filter(a => a.isVisible === true);
    
    // Log info about all attendees in this conference
    console.log(`Conference ${conferenceId} now has ${allAttendees.length} total attendees, ${visibleAttendees.length} visible`);
    allAttendees.forEach(attendee => {
      console.log(`- Attendee: ${attendee.id}, name: ${attendee.profile?.name || 'unnamed'}, visible: ${attendee.isVisible}`);
    });
    
    // Return success response with attendee info
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
          timestamp: new Date().toISOString(),
          attendeeCount: allAttendees.length,
          visibleAttendeeCount: visibleAttendees.length
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
