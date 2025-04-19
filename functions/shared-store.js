// Shared storage for Netlify functions
// This serves as a simple in-memory database that persists between function invocations
// as long as the function instance stays warm

// Main storage for conference attendees
const conferenceAttendees = {};

// Function to register a user for a conference
function registerAttendee(conferenceId, userId, userData, isVisible = true) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for registration: missing conferenceId or userId');
    return false;
  }

  // Initialize conference if it doesn't exist
  if (!conferenceAttendees[conferenceId]) {
    conferenceAttendees[conferenceId] = {};
  }

  // Format the user profile data
  const profile = userData || { id: userId, name: 'Conference Attendee' };
  
  // Ensure the profile has an ID
  profile.id = userId;

  // Store user data keyed by user ID
  conferenceAttendees[conferenceId][userId] = {
    id: userId,
    profile: profile,
    isVisible: isVisible === true, // Default to visible if true or undefined
    joinedAt: new Date().toISOString()
  };

  console.log(`User ${userId} ${conferenceAttendees[conferenceId][userId].isVisible ? 'visible' : 'hidden'} in conference ${conferenceId}`);
  console.log(`Conference ${conferenceId} now has ${Object.keys(conferenceAttendees[conferenceId]).length} attendees`);
  
  return true;
}

// Function to update user visibility
function updateVisibility(conferenceId, userId, isVisible) {
  if (!conferenceId || !userId) {
    console.error('Invalid data for visibility update: missing conferenceId or userId');
    return false;
  }

  // Initialize conference if it doesn't exist
  if (!conferenceAttendees[conferenceId]) {
    conferenceAttendees[conferenceId] = {};
    return false;
  }

  // Check if user exists
  if (!conferenceAttendees[conferenceId][userId]) {
    console.error(`User ${userId} not found in conference ${conferenceId}`);
    return false;
  }

  // Update visibility
  conferenceAttendees[conferenceId][userId].isVisible = isVisible === true;
  console.log(`Updated visibility for ${userId} to ${isVisible ? 'visible' : 'hidden'}`);
  
  return true;
}

// Function to get attendees for a conference
function getAttendees(conferenceId, currentUserId = null) {
  if (!conferenceId) {
    console.error('Invalid data for getting attendees: missing conferenceId');
    return [];
  }

  // Check if conference exists
  if (!conferenceAttendees[conferenceId]) {
    return [];
  }

  // Convert object to array of attendees
  let attendees = Object.values(conferenceAttendees[conferenceId]);
  
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
}

// Function to check if conference exists
function conferenceExists(conferenceId) {
  return !!conferenceAttendees[conferenceId];
}

// Function to get debug info
function getDebugInfo() {
  const info = {};
  
  // For each conference, count attendees and visible attendees
  for (const conferenceId in conferenceAttendees) {
    const attendees = Object.values(conferenceAttendees[conferenceId]);
    const visibleAttendees = attendees.filter(a => a.isVisible === true);
    
    info[conferenceId] = {
      totalAttendees: attendees.length,
      visibleAttendees: visibleAttendees.length,
      attendeeIds: attendees.map(a => a.id)
    };
  }
  
  return info;
}

// Export functions and data
module.exports = {
  conferenceAttendees,
  registerAttendee,
  updateVisibility,
  getAttendees,
  conferenceExists,
  getDebugInfo
}; 
