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
    const { conferenceId, qrData } = data;
    
    if (!conferenceId || !qrData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Update conference with QR data
    const result = await supabaseQueries.updateConferenceQrData(conferenceId, qrData);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'QR code data saved successfully',
        data: result
      })
    };
  } catch (error) {
    console.error('Error saving QR code data:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to save QR code data',
        details: error.message
      })
    };
  }
}; 