// Conference attendees function
const faunaQueries = require('./fauna-db');

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
    // Get parameters from query
    const { conferenceId, currentUserId } = event.queryStringParameters || {};
    
    if (!conferenceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Conference ID is required' })
      };
    }
    
    // Get attendees from FaunaDB
    const allAttendees = await faunaQueries.getConferenceAttendees(conferenceId);
    
    // Filter out attendees who have set visibility to false
    // Current user should always see themselves
    const visibleAttendees = allAttendees.filter(attendee => 
      attendee.isVisible !== false || (currentUserId && attendee.userId === currentUserId)
    );
    
    // Update last active time for current user if available
    if (currentUserId) {
      try {
        await faunaQueries.updateLastActive(currentUserId, conferenceId);
      } catch (updateError) {
        console.warn('Failed to update last active time:', updateError);
      }
    }
    
    // Format attendees for response
    const formattedAttendees = visibleAttendees.map(attendee => {
      // Calculate minutes since last active
      const lastActive = attendee.lastActive ? 
        Math.floor((Date.now() - new Date(attendee.lastActive).getTime()) / 60000) : 
        0;
      
      return {
        id: attendee.userId,
        name: attendee.name,
        title: attendee.role,
        company: attendee.company || '',
        pictureUrl: attendee.profilePicture,
        profileUrl: attendee.linkedinUrl,
        lastActive: lastActive,
        isVisible: attendee.isVisible !== false
      };
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        attendees: formattedAttendees,
        count: formattedAttendees.length,
        conference: conferenceId
      })
    };
  } catch (error) {
    console.error('Error fetching attendees:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch conference attendees',
        details: error.message
      })
    };
  }
}; 
