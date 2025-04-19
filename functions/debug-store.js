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
    // Get direct reference to the data
    const globalData = global.ALL_CONFERENCE_DATA || {};
    
    // Log the current state of the store
    console.log('Global conference data exists:', !!global.ALL_CONFERENCE_DATA);
    console.log('All conferences in global:', Object.keys(globalData));
    console.log('Store exported conferences:', Object.keys(store.conferenceAttendees));
    
    // Check if they match
    const globalKeys = JSON.stringify(Object.keys(globalData).sort());
    const storeKeys = JSON.stringify(Object.keys(store.conferenceAttendees).sort());
    console.log('Keys match:', globalKeys === storeKeys);
    
    // Check storage
    let masterFileExists = false;
    let masterFileContent = '{}';
    try {
      const masterFilePath = path.join('/tmp', 'all-conferences.json');
      masterFileExists = fs.existsSync(masterFilePath);
      if (masterFileExists) {
        masterFileContent = fs.readFileSync(masterFilePath, 'utf8');
        console.log('Master file size:', masterFileContent.length, 'bytes');
      }
    } catch (fsError) {
      console.error('Error checking master file:', fsError);
    }
    
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const action = params.action || '';
    const conferenceId = params.conferenceId || '';
    
    // Special action to force-set conference data (for testing)
    if (action === 'set_conference_data' && conferenceId && params.userId) {
      // Create conference if it doesn't exist
      if (!global.ALL_CONFERENCE_DATA[conferenceId]) {
        global.ALL_CONFERENCE_DATA[conferenceId] = {};
      }
      
      // Create user profile
      const userId = params.userId;
      const name = params.name || 'Test User';
      const isVisible = params.isVisible !== 'false'; // Default to visible
      
      // Add test user to the conference
      global.ALL_CONFERENCE_DATA[conferenceId][userId] = {
        id: userId,
        profile: {
          id: userId,
          name: name,
          email: `${userId}@example.com`,
          headline: 'Test User',
          joinedAt: new Date().toISOString()
        },
        isVisible: isVisible
      };
      
      // Save the data
      try {
        const data = JSON.stringify(global.ALL_CONFERENCE_DATA, null, 2);
        fs.writeFileSync(path.join('/tmp', 'all-conferences.json'), data, 'utf8');
        console.log('Manually saved test data to master file');
      } catch (saveError) {
        console.error('Error saving test data:', saveError);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          action: 'set_conference_data',
          success: true,
          conference: conferenceId,
          userId: userId,
          name: name,
          isVisible: isVisible,
          allConferences: Object.keys(global.ALL_CONFERENCE_DATA)
        })
      };
    }
    
    let result = {};
    
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
          globalState: {
            conferences: Object.keys(globalData),
            exists: !!global.ALL_CONFERENCE_DATA,
            instanceId: Math.random().toString(36).substring(2, 8) // To track function instances
          },
          storage: {
            masterFileExists,
            masterFileSize: masterFileContent.length
          },
          timestamp: new Date().toISOString()
        };
        
        // Add detailed info about every stored conference
        result.conferences = {};
        
        // From global data
        for (const confId in globalData) {
          const confAttendees = globalData[confId];
          result.conferences[confId] = {
            attendeeCount: Object.keys(confAttendees).length,
            attendees: Object.values(confAttendees).map(a => ({
              id: a.id,
              name: a.profile?.name,
              isVisible: a.isVisible,
              joinedAt: a.joinedAt
            }))
          };
        }
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
