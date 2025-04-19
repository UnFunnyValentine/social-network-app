// Conference attendees function
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
            // Log all the attendees for this conference
            const allAttendees = store.getAttendees(data.conferenceId);
            console.log(`After registration, conference ${data.conferenceId} has ${allAttendees.length} attendees`);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                status: 'success',
                message: 'User registered for conference',
                conferenceId: data.conferenceId,
                userId: userId,
                attendeeCount: allAttendees.length + 1 // +1 to include the current user
              })
            };
          }
        }
      } catch (parseError) {
        console.error('Error parsing registration data:', parseError);
      }
    }
    
    // DIRECT IMPLEMENTATION: Get all attendees for this conference except current user
    // This simplified approach ensures we're directly accessing the raw data
    let attendees = [];
    
    if (store.conferenceAttendees[conferenceId]) {
      // Get all attendees as an array
      const allAttendees = Object.values(store.conferenceAttendees[conferenceId]);
      console.log(`Found ${allAttendees.length} total attendees in conference ${conferenceId}`);
      
      // Filter out non-visible attendees and current user
      attendees = allAttendees.filter(attendee => {
        // Skip current user
        if (currentUserId && attendee.id === currentUserId) {
          return false;
        }
        
        // Only include visible attendees
        return attendee.isVisible === true;
      });
      
      console.log(`Returning ${attendees.length} visible attendees (excluding current user)`);
      
      // Log each attendee for debugging
      attendees.forEach((attendee, index) => {
        console.log(`Attendee #${index + 1}: ${attendee.profile?.name || attendee.id} (visible: ${attendee.isVisible})`);
      });
    } else {
      console.log(`No conference found with ID: ${conferenceId}`);
    }

    // Return the filtered attendees
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conferenceId,
        attendees,
        totalCount: attendees.length,
        timestamp: new Date().toISOString()
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
