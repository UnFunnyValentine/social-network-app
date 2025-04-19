// Conference attendees function
const axios = require('axios');

// In-memory storage for demonstration (in production, use a database)
const attendeesStore = {};

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
    
    // Handle both /conference/:id/attendees and /conference?id=:id formats
    const pathParts = event.path.split('/');
    if (pathParts.includes('conference') && pathParts.length > 2) {
      const conferenceIndex = pathParts.indexOf('conference');
      if (conferenceIndex >= 0 && conferenceIndex + 1 < pathParts.length) {
        conferenceId = pathParts[conferenceIndex + 1];
      }
    }
    
    // If not in path, try to get from query params
    if (!conferenceId) {
      const params = new URLSearchParams(event.queryStringParameters || {});
      conferenceId = params.get('conferenceId') || params.get('id');
      currentUserId = params.get('currentUserId') || params.get('userId');
    } else {
      // If in path, get currentUserId from query params
      const params = new URLSearchParams(event.queryStringParameters || {});
      currentUserId = params.get('currentUserId') || params.get('userId');
    }
    
    // Handle if conferenceId is still not found
    if (!conferenceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Conference ID is required',
          path: event.path,
          queryParams: event.queryStringParameters
        })
      };
    }

    console.log('Getting attendees for conference:', { conferenceId, currentUserId });
    
    // In a real app, you would fetch attendees from a database:
    // const response = await axios.get(`https://your-api.com/conferences/${conferenceId}/attendees`);
    
    // Generate some basic attendees list if none exists
    if (!attendeesStore[conferenceId]) {
      // Create an initial set of attendees including the current user
      attendeesStore[conferenceId] = [
        {
          id: currentUserId || `user_${Date.now()}_1`,
          profile: {
            id: currentUserId || `user_${Date.now()}_1`,
            firstName: 'Current',
            lastName: 'User',
            headline: 'Software Engineer',
            profilePicture: 'https://randomuser.me/api/portraits/people/1.jpg',
            currentPosition: {
              title: 'Software Engineer',
              companyName: 'Tech Company'
            }
          },
          isVisible: true
        }
      ];
      
      // Add another user for demo purposes
      if (currentUserId) {
        attendeesStore[conferenceId].push({
          id: `user_${Date.now()}_2`,
          profile: {
            id: `user_${Date.now()}_2`,
            firstName: 'Another',
            lastName: 'Attendee',
            headline: 'Product Manager',
            profilePicture: 'https://randomuser.me/api/portraits/people/2.jpg',
            currentPosition: {
              title: 'Product Manager',
              companyName: 'Tech Company'
            }
          },
          isVisible: true
        });
      }
    }
    
    // Filter attendees based on visibility and current user
    let attendees = attendeesStore[conferenceId] || [];
    
    // Only return visible attendees and exclude current user if specified
    attendees = attendees.filter(attendee => {
      // Skip hidden attendees
      if (attendee.isVisible === false) {
        return false;
      }
      
      // Skip current user if currentUserId is provided
      if (currentUserId && attendee.id === currentUserId) {
        return false;
      }
      
      return true;
    });

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