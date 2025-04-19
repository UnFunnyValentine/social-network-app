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
    const action = params.action || 'unknown_action';
    
    // Special action to force-set conference data (for testing)
    if (action === 'set_conference_data' && params.conferenceId && params.userId) {
      // Create conference if it doesn't exist
      if (!global.ALL_CONFERENCE_DATA[params.conferenceId]) {
        global.ALL_CONFERENCE_DATA[params.conferenceId] = {};
      }
      
      // Create user profile
      const userId = params.userId;
      const name = params.name || 'Test User';
      const isVisible = params.isVisible !== 'false'; // Default to visible
      
      // Add test user to the conference
      global.ALL_CONFERENCE_DATA[params.conferenceId][userId] = {
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
          conference: params.conferenceId,
          userId: userId,
          name: name,
          isVisible: isVisible,
          allConferences: Object.keys(global.ALL_CONFERENCE_DATA)
        })
      };
    }
    
    let result = {};
    
    // Perform the requested action
    switch (action) {
      case 'get_debug_info':
        // Get all debug info from the store
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            debugInfo: store.conferenceAttendees
          })
        };
        
      case 'get_conference_attendees':
        // Get attendees for a specific conference
        const conferenceId = params.conferenceId;
        if (!conferenceId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'conferenceId is required' })
          };
        }
        
        // Return the attendees for the specified conference
        const attendees = store.conferenceAttendees[conferenceId] 
          ? Object.values(store.conferenceAttendees[conferenceId]) 
          : [];
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            conferenceId,
            attendees,
            count: attendees.length
          })
        };
        
      case 'set_conference_data':
        // Manual action to set a test attendee for a conference
        const setConferenceId = params.conferenceId;
        const userId = params.userId;
        const userName = params.name || 'Test User';
        
        if (!setConferenceId || !userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'conferenceId and userId are required' })
          };
        }
        
        // Create a generic attendee object
        const testAttendee = {
          id: userId,
          isVisible: true,
          profile: {
            id: userId,
            name: userName,
            title: 'Test Attendee',
            company: 'Test Company',
            profilePicture: `https://randomuser.me/api/portraits/people/${Math.floor(Math.random() * 100)}.jpg`
          }
        };
        
        // Add to the store
        if (!store.conferenceAttendees[setConferenceId]) {
          store.conferenceAttendees[setConferenceId] = {};
        }
        
        store.conferenceAttendees[setConferenceId][userId] = testAttendee;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Added user ${userId} to conference ${setConferenceId}`,
            conferenceAttendees: store.conferenceAttendees[setConferenceId]
          })
        };

      case 'cleanup_test_users':
        // Clean up test users for a specific conference
        const cleanupConferenceId = params.conferenceId;
        if (!cleanupConferenceId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'conferenceId is required' })
          };
        }
        
        // Check if conference exists
        if (!store.conferenceAttendees[cleanupConferenceId]) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
              error: 'Conference not found',
              conferenceId: cleanupConferenceId
            })
          };
        }
        
        // Count attendees before cleanup
        const beforeCount = Object.keys(store.conferenceAttendees[cleanupConferenceId]).length;
        
        // Remove all test users (users with test in their ID)
        let removedCount = 0;
        const attendeeIds = Object.keys(store.conferenceAttendees[cleanupConferenceId]);
        
        for (const id of attendeeIds) {
          // Check if this is a test user by looking for test-related patterns in the ID
          if (id.includes('test') || 
              id.match(/^test_/i) || 
              id.match(/^linkedin_test/i) || 
              id.match(/^oauth_test/i)) {
            
            // Remove this test user
            delete store.conferenceAttendees[cleanupConferenceId][id];
            removedCount++;
          }
        }
        
        // Count attendees after cleanup
        const afterCount = Object.keys(store.conferenceAttendees[cleanupConferenceId]).length;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            conferenceId: cleanupConferenceId,
            before: beforeCount,
            after: afterCount,
            removed: removedCount,
            message: `Removed ${removedCount} test users from conference ${cleanupConferenceId}`
          })
        };
        
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
