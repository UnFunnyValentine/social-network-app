// Shared storage for Netlify functions
// This serves as a simple in-memory database that persists between function invocations
// as long as the function instance stays warm
const fs = require('fs');
const path = require('path');

// Path to store data
const DATA_FILE = path.join('/tmp', 'conference-data.json'); 

// ⚠️ IMPORTANT: The module's state must be maintained as a singleton across all function invocations
// Export the conference attendees directly so it's shared across all function instances
exports.conferenceAttendees = {};

// Load any previously saved data
try {
  if (fs.existsSync(DATA_FILE)) {
    const savedData = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(savedData);
    exports.conferenceAttendees = parsed;
    console.log(`Loaded ${Object.keys(exports.conferenceAttendees).length} conferences from file storage`);
    
    // Log all loaded conferences
    for (const conferenceId in exports.conferenceAttendees) {
      const attendees = Object.values(exports.conferenceAttendees[conferenceId]);
      console.log(`Conference ${conferenceId} has ${attendees.length} attendees`);
    }
  }
} catch (err) {
  console.error('Error loading stored data:', err);
}

// Function to save data to file
function saveData() {
  try {
    const data = JSON.stringify(exports.conferenceAttendees, null, 2);
    fs.writeFileSync(DATA_FILE, data, 'utf8');
    console.log(`Saved data to ${DATA_FILE}`);
  } catch (err) {
    console.error('Error saving data to file:', err);
  }
}

// Function to register a user for a conference
exports.registerAttendee = function(conferenceId, userId, userData, isVisible = true) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for registration: missing conferenceId or userId');
    return false;
  }

  // Initialize conference if it doesn't exist
  if (!exports.conferenceAttendees[conferenceId]) {
    exports.conferenceAttendees[conferenceId] = {};
    console.log(`Created new conference: ${conferenceId}`);
  }

  // Format the user profile data
  const profile = userData || { id: userId, name: 'Conference Attendee' };
  
  // Ensure the profile has an ID
  profile.id = userId;

  // Store user data keyed by user ID
  exports.conferenceAttendees[conferenceId][userId] = {
    id: userId,
    profile: profile,
    isVisible: isVisible === true, // Default to visible if true or undefined
    joinedAt: new Date().toISOString()
  };

  console.log(`User ${userId} ${exports.conferenceAttendees[conferenceId][userId].isVisible ? 'visible' : 'hidden'} in conference ${conferenceId}`);
  console.log(`Conference ${conferenceId} now has ${Object.keys(exports.conferenceAttendees[conferenceId]).length} attendees`);
  
  // Print all attendees in this conference
  const attendees = Object.values(exports.conferenceAttendees[conferenceId]);
  attendees.forEach(attendee => {
    console.log(`- Attendee: ${attendee.id}, name: ${attendee.profile.name || 'unnamed'}, visible: ${attendee.isVisible}`);
  });
  
  // Save data to file
  saveData();
  
  return true;
};

// Function to update user visibility
exports.updateVisibility = function(conferenceId, userId, isVisible) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for visibility update: missing conferenceId or userId');
    return false;
  }

  // Initialize conference if it doesn't exist
  if (!exports.conferenceAttendees[conferenceId]) {
    exports.conferenceAttendees[conferenceId] = {};
    return false;
  }

  // Check if user exists
  if (!exports.conferenceAttendees[conferenceId][userId]) {
    console.error(`User ${userId} not found in conference ${conferenceId}`);
    return false;
  }

  // Update visibility
  exports.conferenceAttendees[conferenceId][userId].isVisible = isVisible === true;
  console.log(`Updated visibility for ${userId} to ${isVisible ? 'visible' : 'hidden'}`);
  
  // Save data to file
  saveData();
  
  return true;
};

// Function to get attendees for a conference
exports.getAttendees = function(conferenceId, currentUserId = null) {
  if (!conferenceId) {
    console.error('Invalid data for getting attendees: missing conferenceId');
    return [];
  }

  // Check if conference exists
  if (!exports.conferenceAttendees[conferenceId]) {
    console.log(`No conference found with ID: ${conferenceId}`);
    return [];
  }

  // Convert object to array of attendees
  let attendees = Object.values(exports.conferenceAttendees[conferenceId]);
  
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
  return !!exports.conferenceAttendees[conferenceId];
};

// Function to get debug info
exports.getDebugInfo = function() {
  const info = {};
  
  // For each conference, count attendees and visible attendees
  for (const conferenceId in exports.conferenceAttendees) {
    const attendees = Object.values(exports.conferenceAttendees[conferenceId]);
    const visibleAttendees = attendees.filter(a => a.isVisible === true);
    
    info[conferenceId] = {
      totalAttendees: attendees.length,
      visibleAttendees: visibleAttendees.length,
      attendeeIds: attendees.map(a => a.id)
    };
  }
  
  return info;
}; 
