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
    
    // Get attendees from the shared store
    const attendees = store.getAttendees(conferenceId, currentUserId);
    
    // Log full debug info to help diagnose issues
    const debugInfo = store.getDebugInfo();
    console.log('Server debug info:', JSON.stringify(debugInfo, null, 2));
    
    // Detailed logging about each attendee
    if (attendees.length > 0) {
      console.log(`Found ${attendees.length} attendees for conference ${conferenceId}:`);
      attendees.forEach((attendee, index) => {
        console.log(`Attendee #${index + 1}: ${attendee.profile.name || attendee.id}`);
      });
    } else {
      // Log info about why no attendees were returned
      const allForConference = store.conferenceAttendees[conferenceId] || {};
      const allAttendeeCount = Object.keys(allForConference).length;
      console.log(`No attendees returned for ${conferenceId}. Total in db: ${allAttendeeCount}`);
      
      if (allAttendeeCount > 0) {
        console.log('Existing attendees:');
        Object.values(allForConference).forEach(a => {
          console.log(`- ${a.id}: visibility=${a.isVisible}, name=${a.profile.name || 'unnamed'}`);
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conferenceId,
        attendees,
        totalCount: attendees.length,
        timestamp: new Date().toISOString() // Add timestamp to help debug caching issues
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
