// Save conference QR code function
const supabaseQueries = require('./supabase-db');

exports.handler = async (event, context) => {
  // CORS headers for cross-origin requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { conferenceId, qrData, name, location } = data;
    
    if (!conferenceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required conferenceId field' })
      };
    }

    let result;
    
    // Check if we need to create/update a conference with name and location
    if (name) {
      // Create or update conference with all details
      const conferenceData = {
        id: conferenceId,
        name: name,
        location: location || '',
        qrData: qrData || null
      };
      
      result = await supabaseQueries.createConference(conferenceData);
    } else if (qrData) {
      // Just update the QR data of an existing conference
      result = await supabaseQueries.updateConferenceQrData(conferenceId, qrData);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing either name or qrData field' })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Conference data saved successfully',
        data: result
      })
    };
  } catch (error) {
    console.error('Error saving conference data:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to save conference data',
        details: error.message
      })
    };
  }
}; 
