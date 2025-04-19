// Shared storage for Netlify functions
// This serves as a simple in-memory database that persists between function invocations
const fs = require('fs');
const path = require('path');

// THIS IS THE KEY CHANGE: Create a truly global object
global.ALL_CONFERENCE_DATA = global.ALL_CONFERENCE_DATA || {};

// Path to the master file that stores all conferences
const MASTER_FILE = path.join('/tmp', 'all-conferences.json');

// Load data at module initialization time
try {
  if (fs.existsSync(MASTER_FILE)) {
    const data = fs.readFileSync(MASTER_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // Update the global with loaded data
    global.ALL_CONFERENCE_DATA = parsed;
    
    console.log(`Loaded data for ${Object.keys(global.ALL_CONFERENCE_DATA).length} conferences from master file`);
    
    // Log all loaded conferences
    for (const confId in global.ALL_CONFERENCE_DATA) {
      const attendeeCount = Object.keys(global.ALL_CONFERENCE_DATA[confId] || {}).length;
      console.log(`Conference ${confId} has ${attendeeCount} attendees`);
    }
  } else {
    console.log('No master file found, starting with empty database');
  }
} catch (err) {
  console.error('Error loading master file:', err);
}

// Save all conferences to the master file
function saveMasterFile() {
  try {
    const data = JSON.stringify(global.ALL_CONFERENCE_DATA, null, 2);
    fs.writeFileSync(MASTER_FILE, data, 'utf8');
    console.log(`Saved master file with ${Object.keys(global.ALL_CONFERENCE_DATA).length} conferences`);
    return true;
  } catch (err) {
    console.error('Error saving master file:', err);
    return false;
  }
}

// Save individual conference to separate file
function saveConference(conferenceId) {
  if (!conferenceId || !global.ALL_CONFERENCE_DATA[conferenceId]) {
    console.error(`Cannot save conference data - invalid ID: ${conferenceId}`);
    return false;
  }

  try {
    // Also save to the master file for redundancy
    saveMasterFile();
    return true;
  } catch (err) {
    console.error(`Error saving conference ${conferenceId}:`, err);
    return false;
  }
}

// Function to register a user for a conference
exports.registerAttendee = function(conferenceId, userId, userData, isVisible = true) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for registration: missing conferenceId or userId');
    return false;
  }

  // Initialize conference if it doesn't exist
  if (!global.ALL_CONFERENCE_DATA[conferenceId]) {
    global.ALL_CONFERENCE_DATA[conferenceId] = {};
    console.log(`Created new conference: ${conferenceId}`);
  }

  // Format the user profile data
  const profile = userData || { id: userId, name: 'Conference Attendee' };
  
  // Ensure the profile has an ID
  profile.id = userId;

  // Store user data keyed by user ID
  global.ALL_CONFERENCE_DATA[conferenceId][userId] = {
    id: userId,
    profile: profile,
    isVisible: isVisible === true, // Default to visible if true or undefined
    joinedAt: new Date().toISOString()
  };

  console.log(`User ${userId} ${global.ALL_CONFERENCE_DATA[conferenceId][userId].isVisible ? 'visible' : 'hidden'} in conference ${conferenceId}`);
  
  // Log all attendees for debugging
  const attendees = Object.keys(global.ALL_CONFERENCE_DATA[conferenceId]);
  console.log(`Conference ${conferenceId} now has ${attendees.length} attendees: ${attendees.join(', ')}`);
  
  // Save to disk immediately
  saveConference(conferenceId);
  
  // Also save to master file
  saveMasterFile();
  
  return true;
};

// Function to update user visibility
exports.updateVisibility = function(conferenceId, userId, isVisible) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for visibility update: missing conferenceId or userId');
    return false;
  }

  // Initialize conference if it doesn't exist
  if (!global.ALL_CONFERENCE_DATA[conferenceId]) {
    global.ALL_CONFERENCE_DATA[conferenceId] = {};
    return false;
  }

  // Check if user exists
  if (!global.ALL_CONFERENCE_DATA[conferenceId][userId]) {
    console.error(`User ${userId} not found in conference ${conferenceId}`);
    return false;
  }

  // Update visibility
  global.ALL_CONFERENCE_DATA[conferenceId][userId].isVisible = isVisible === true;
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

  // Check if conference exists
  if (!global.ALL_CONFERENCE_DATA[conferenceId]) {
    console.log(`No conference found with ID: ${conferenceId}`);
    return [];
  }

  // Convert object to array of attendees
  let attendees = Object.values(global.ALL_CONFERENCE_DATA[conferenceId]);
  
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
  return !!global.ALL_CONFERENCE_DATA[conferenceId];
};

// Direct access to the conference data
exports.conferenceAttendees = global.ALL_CONFERENCE_DATA;

// Function to get debug info
exports.getDebugInfo = function() {
  const info = {};
  
  // For each conference, count attendees and visible attendees
  for (const conferenceId in global.ALL_CONFERENCE_DATA) {
    const attendees = Object.values(global.ALL_CONFERENCE_DATA[conferenceId]);
    const visibleAttendees = attendees.filter(a => a.isVisible === true);
    
    info[conferenceId] = {
      totalAttendees: attendees.length,
      visibleAttendees: visibleAttendees.length,
      attendeeIds: attendees.map(a => a.id)
    };
  }
  
  return info;
}; 
