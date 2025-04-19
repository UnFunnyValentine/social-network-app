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

    console.log('Updating visibility for user:', { 
      userId, 
      conferenceId, 
      isVisible, 
      userData: userData ? `${userData.name || 'Unknown'} (${userId})` : 'None provided'
    });
    
    // Ensure the conference exists in our store
    const exists = store.conferenceExists(conferenceId);
    console.log(`Conference ${conferenceId} exists in store: ${exists}`);
    
    // List all conferences for debug
    console.log('All conferences in store:', Object.keys(store.conferenceAttendees));
    
    // Check if conference exists before we try to update
    if (!store.conferenceAttendees[conferenceId]) {
      console.log(`Conference ${conferenceId} doesn't exist yet, creating it`);
      // This will be handled by registerAttendee
    }
    
    // Get current state before changes
    const beforeAttendees = Object.keys(store.conferenceAttendees[conferenceId] || {}).length;
    console.log(`Conference ${conferenceId} has ${beforeAttendees} attendees before update`);
    
    // First ensure the user is registered
    let registerResult = false;
    if (userData) {
      registerResult = store.registerAttendee(conferenceId, userId, userData, isVisible === true);
      console.log(`Registration result for ${userId}: ${registerResult ? 'success' : 'failed'}`);
    }
    
    // Update the visibility
    const updateResult = store.updateVisibility(conferenceId, userId, isVisible === true);
    console.log(`Visibility update result for ${userId}: ${updateResult ? 'success' : 'failed'}`);
    
    // If update failed but registration worked, we're good
    const success = updateResult || registerResult;
    
    if (!success) {
      console.log('Failed to update visibility, attempting fallback registration');
      // Try explicit registration as fallback
      if (userData) {
        store.registerAttendee(conferenceId, userId, userData, isVisible === true);
      }
    }
    
    // Get current state after update
    const allAttendees = Object.values(store.conferenceAttendees[conferenceId] || {});
    const visibleAttendees = allAttendees.filter(a => a.isVisible === true);
    
    console.log(`After update: Conference ${conferenceId} has ${allAttendees.length} total attendees, ${visibleAttendees.length} visible`);
    
    // Debug log all attendees
    allAttendees.forEach(attendee => {
      console.log(`- Attendee: ${attendee.id}, name: ${attendee.profile?.name || 'unnamed'}, visible: ${attendee.isVisible}`);
    });

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
          timestamp: new Date().toISOString(),
          attendeeCount: allAttendees.length,
          visibleAttendeeCount: visibleAttendees.length
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
