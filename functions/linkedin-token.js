const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { code } = data;
    
    console.log('Received code:', code);
    console.log('Using client ID:', process.env.LINKEDIN_CLIENT_ID);
    console.log('Using redirect URI:', process.env.REDIRECT_URI);
    
    // Exchange the code for a token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Token response received');
    
    // Get the user profile using the basic profile endpoint for r_basicprofile scope
    const profileResponse = await axios.get('https://api.linkedin.com/v2/basicProfile', {
      headers: {
        'Authorization': `Bearer ${tokenResponse.data.access_token}`
      }
    });

    console.log('Profile data received');
    
    // Get the user's email if the email scope is granted
    let emailData = null;
    try {
      const emailResponse = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      });
      emailData = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress || null;
    } catch (emailError) {
      console.log('Email retrieval error:', emailError.message);
      // Continue without email if not available
    }

    // Combine profile and email data
    const userData = {
      ...profileResponse.data,
      email: emailData
    };

    // Return the combined data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(userData)
    };
  } catch (error) {
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error',
        message: error.message
      })
    };
  }
};
