// Shared storage for Netlify functions
// This serves as a simple in-memory database that persists between function invocations
const fs = require('fs');
const path = require('path');

// IMPORTANT: We need to use a global to ensure consistency across all function invocations
// This is the main data store - do not use exports to avoid reference issues
global.CONFERENCE_DATA = global.CONFERENCE_DATA || {};

// Function to save single conference data to a file
function saveConference(conferenceId) {
  if (!conferenceId || !global.CONFERENCE_DATA[conferenceId]) {
    console.error(`Cannot save conference data - invalid ID: ${conferenceId}`);
    return false;
  }

  try {
    // Create a dedicated file for this conference
    const filePath = path.join('/tmp', `conference_${conferenceId}.json`);
    const data = JSON.stringify(global.CONFERENCE_DATA[conferenceId], null, 2);
    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`Saved conference ${conferenceId} data to ${filePath}`);
    return true;
  } catch (err) {
    console.error(`Error saving conference ${conferenceId} data:`, err);
    return false;
  }
}

// Function to load single conference data from a file
function loadConference(conferenceId) {
  try {
    const filePath = path.join('/tmp', `conference_${conferenceId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const conferenceData = JSON.parse(data);
      global.CONFERENCE_DATA[conferenceId] = conferenceData;
      console.log(`Loaded conference ${conferenceId} from ${filePath}`);
      
      // Log loaded attendees
      const attendeeCount = Object.keys(conferenceData || {}).length;
      console.log(`Conference ${conferenceId} has ${attendeeCount} attendees`);
      return true;
    } else {
      console.log(`No saved data found for conference ${conferenceId}`);
      return false;
    }
  } catch (err) {
    console.error(`Error loading conference ${conferenceId} data:`, err);
    return false;
  }
}

// Function to register a user for a conference
exports.registerAttendee = function(conferenceId, userId, userData, isVisible = true) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for registration: missing conferenceId or userId');
    return false;
  }

  // Try to load conference data from disk first
  loadConference(conferenceId);

  // Initialize conference if it doesn't exist
  if (!global.CONFERENCE_DATA[conferenceId]) {
    global.CONFERENCE_DATA[conferenceId] = {};
    console.log(`Created new conference: ${conferenceId}`);
  }

  // Format the user profile data
  const profile = userData || { id: userId, name: 'Conference Attendee' };
  
  // Ensure the profile has an ID
  profile.id = userId;

  // Store user data keyed by user ID
  global.CONFERENCE_DATA[conferenceId][userId] = {
    id: userId,
    profile: profile,
    isVisible: isVisible === true, // Default to visible if true or undefined
    joinedAt: new Date().toISOString()
  };

  console.log(`User ${userId} ${global.CONFERENCE_DATA[conferenceId][userId].isVisible ? 'visible' : 'hidden'} in conference ${conferenceId}`);
  
  // Log all attendees for debugging
  const attendees = Object.keys(global.CONFERENCE_DATA[conferenceId]);
  console.log(`Conference ${conferenceId} now has ${attendees.length} attendees: ${attendees.join(', ')}`);
  
  // Save to disk
  saveConference(conferenceId);
  
  return true;
};

// Function to update user visibility
exports.updateVisibility = function(conferenceId, userId, isVisible) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for visibility update: missing conferenceId or userId');
    return false;
  }

  // Try to load conference data from disk first
  loadConference(conferenceId);

  // Initialize conference if it doesn't exist
  if (!global.CONFERENCE_DATA[conferenceId]) {
    global.CONFERENCE_DATA[conferenceId] = {};
    return false;
  }

  // Check if user exists
  if (!global.CONFERENCE_DATA[conferenceId][userId]) {
    console.error(`User ${userId} not found in conference ${conferenceId}`);
    return false;
  }

  // Update visibility
  global.CONFERENCE_DATA[conferenceId][userId].isVisible = isVisible === true;
  console.log(`Updated visibility for ${userId} to ${isVisible ? 'visible' : 'hidden'}`);
  
  // Save to disk
  saveConference(conferenceId);
  
  return true;
};

// Function to get attendees for a conference
exports.getAttendees = function(conferenceId, currentUserId = null) {
  if (!conferenceId) {
    console.error('Invalid data for getting attendees: missing conferenceId');
    return [];
  }

  // Try to load conference data from disk first
  loadConference(conferenceId);

  // Check if conference exists
  if (!global.CONFERENCE_DATA[conferenceId]) {
    console.log(`No conference found with ID: ${conferenceId}`);
    return [];
  }

  // Convert object to array of attendees
  let attendees = Object.values(global.CONFERENCE_DATA[conferenceId]);
  
  // Get count before filtering
  const totalCount = attendees.length;
  
  // Filter for visible attendees and exclude current user
  attendees = attendees.filter(attendee => {
    // Skip hidden attendees
    if (attendee.isVisible !== true) {
      return false;
    }
    
    // Skip current user if provided
    if (currentUserId && attendee.id === currentUserId) {
      return false;
    }
    
    return true;
  });
  
  console.log(`Returning ${attendees.length} out of ${totalCount} attendees for conference ${conferenceId}`);
  
  // Log the attendees being returned
  attendees.forEach(a => {
    console.log(`  Attendee: ${a.profile.name || a.id}`);
  });
  
  return attendees;
};

// Function to check if conference exists
exports.conferenceExists = function(conferenceId) {
  // Try to load conference data from disk first
  loadConference(conferenceId);
  return !!global.CONFERENCE_DATA[conferenceId];
};

// Direct access to the conference data
exports.conferenceAttendees = global.CONFERENCE_DATA;

// Function to get debug info
exports.getDebugInfo = function() {
  const info = {};
  
  // For each conference, count attendees and visible attendees
  for (const conferenceId in global.CONFERENCE_DATA) {
    const attendees = Object.values(global.CONFERENCE_DATA[conferenceId]);
    const visibleAttendees = attendees.filter(a => a.isVisible === true);
    
    info[conferenceId] = {
      totalAttendees: attendees.length,
      visibleAttendees: visibleAttendees.length,
      attendeeIds: attendees.map(a => a.id)
    };
  }
  
  return info;
}; 
