// Debug function to check the current state of the store
// Used only for debugging and monitoring, not for production data generation
const store = require('./shared-store');
const fs = require('fs');
const path = require('path');

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
    console.log('Store global variable:', global.CONFERENCE_DATA ? 'exists' : 'undefined');
    console.log('All conferences in store:', Object.keys(store.conferenceAttendees));
    
    // Scan tmp directory for conference files
    const tmpFiles = [];
    try {
      const tmpDir = '/tmp';
      if (fs.existsSync(tmpDir)) {
        const files = fs.readdirSync(tmpDir);
        files.forEach(file => {
          if (file.startsWith('conference_') && file.endsWith('.json')) {
            tmpFiles.push(file);
          }
        });
      }
    } catch (fsError) {
      console.error('Error scanning tmp directory:', fsError);
    }
    
    // Query parameters
    const params = event.queryStringParameters || {};
    const action = params.action || '';
    const conferenceId = params.conferenceId || '';
    
    let result = {};
    
    // Handle different actions - only debug info in production
    switch (action) {
      case 'get_attendees':
        // Get attendees for a specific conference
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
        
        // First, try to load the conference data
        store.conferenceExists(conferenceId);
        
        const attendees = store.getAttendees(conferenceId, params.currentUserId);
        
        result = {
          action: 'get_attendees',
          conferenceId,
          currentUserId: params.currentUserId,
          attendees,
          count: attendees.length
        };
        break;
        
      default:
        // Get debug info
        const debugInfo = store.getDebugInfo();
        result = {
          action: 'get_debug_info',
          debugInfo,
          storage: {
            tmpFiles,
            conferenceIds: Object.keys(store.conferenceAttendees)
          },
          timestamp: new Date().toISOString()
        };
        
        // Add detailed info about every stored conference
        result.conferences = {};
        Object.keys(store.conferenceAttendees).forEach(confId => {
          const confAttendees = store.conferenceAttendees[confId];
          result.conferences[confId] = {
            attendeeCount: Object.keys(confAttendees).length,
            attendees: Object.values(confAttendees).map(a => ({
              id: a.id,
              name: a.profile?.name,
              isVisible: a.isVisible,
              joinedAt: a.joinedAt
            }))
          };
        });
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
