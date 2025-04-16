let scanner = null;
let currentConference = null;
let isVisible = false;
let linkedInProfile = null;
let conferenceConnections = [];
let html5QrcodeScanner = null;
let scannerActive = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing QR scanner');
    
    // Initialize QR scanner
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    // Start scanner automatically
    const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    console.log('Starting QR scanner');
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onQRCodeSuccess,
        onQRCodeError
    ).catch(err => {
        console.error("Error starting scanner:", err);
        document.getElementById('qr-reader-results').innerHTML = 
            `<p style="color: red;">Error starting camera: ${err.message}<br>
            Please make sure you have granted camera permissions or try uploading a QR code file.</p>`;
    });
    
    // Check URL parameters for direct auth flow
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id') && urlParams.has('name') && urlParams.has('location')) {
        console.log('Direct parameters detected in URL, redirecting to auth');
        
        // Store in sessionStorage
        sessionStorage.setItem('conferenceId', urlParams.get('id'));
        sessionStorage.setItem('conferenceName', urlParams.get('name'));
        sessionStorage.setItem('conferenceLocation', urlParams.get('location'));
        
        // Redirect to auth page
        window.location.href = `auth.html?id=${encodeURIComponent(urlParams.get('id'))}&name=${encodeURIComponent(urlParams.get('name'))}&location=${encodeURIComponent(urlParams.get('location'))}`;
    }
});

function startScanner() {
    const scannerContainer = document.getElementById('scanner-container');
    const qrScanner = document.getElementById('qr-scanner');
    scannerContainer.style.display = 'block';

    html5QrcodeScanner = new Html5Qrcode("qr-scanner");
    const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onQRCodeSuccess,
        onQRCodeError
    ).catch(err => {
        console.error("Error starting scanner:", err);
        document.getElementById('qr-reader-results').innerHTML = 
            `<p style="color: red;">Error starting camera. Please make sure you have granted camera permissions or try uploading a QR code file.</p>`;
    });
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById('scanner-container').style.display = 'none';
        }).catch((err) => {
            console.error("Error stopping scanner:", err);
        });
    }
}

function onQRCodeSuccess(decodedText) {
    try {
        console.log('QR Code decoded:', decodedText);
        
        // First try to parse as URL
        let url;
        try {
            url = new URL(decodedText);
        } catch (e) {
            // Not a URL, check if it contains conference parameters in text format
            if (decodedText.includes('id=') && decodedText.includes('name=') && decodedText.includes('location=')) {
                // Extract params from text
                const paramsText = decodedText.includes('?') ? decodedText.split('?')[1] : decodedText;
                url = new URL('http://dummy.com?' + paramsText);
        } else {
                throw new Error('Not a valid conference QR code');
            }
        }
        
        const params = new URLSearchParams(url.search);
        
        // Debug all parameters
        console.log('QR code parameters:');
        for (const [key, value] of params.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        if (params.has('id') && params.has('name') && params.has('location')) {
            // Store in sessionStorage for backup
            sessionStorage.setItem('conferenceId', params.get('id'));
            sessionStorage.setItem('conferenceName', params.get('name'));
            sessionStorage.setItem('conferenceLocation', params.get('location'));
            
            console.log('Redirecting to auth.html with parameters:', {
                id: params.get('id'),
                name: params.get('name'),
                location: params.get('location')
            });
            
            // Valid conference QR code, redirect to auth page
            window.location.href = `auth.html?id=${encodeURIComponent(params.get('id'))}&name=${encodeURIComponent(params.get('name'))}&location=${encodeURIComponent(params.get('location'))}`;
        } else {
            // Show message for invalid conference QR
            document.getElementById('qr-reader-results').innerHTML = 
                `<p style="color: orange;">This QR code doesn't contain required conference parameters (id, name, location).</p>
                <p>Decoded text: ${decodedText}</p>`;
        }
    } catch (error) {
        console.error('Error processing QR code:', error);
        
        // Not a URL, show the decoded text
        document.getElementById('qr-reader-results').innerHTML = 
            `<p>Decoded QR Code: ${decodedText}</p>
            <p style="color: orange;">This doesn't appear to be a valid conference QR code.</p>
            <p>Error: ${error.message}</p>`;
    }
}

function onQRCodeError(errorMessage) {
    console.log(errorMessage);
}

function handleQRCodeResult(decodedText) {
    try {
        const url = new URL(decodedText);
        const params = new URLSearchParams(url.search);
        
        if (params.has('id') && params.has('name') && params.has('location')) {
            // Redirect to auth page with parameters
            window.location.href = `auth.html?${params.toString()}`;
        } else {
            alert('Invalid QR code format. Please scan a valid conference QR code.');
        }
    } catch (error) {
        console.error('Error processing QR code:', error);
        alert('Invalid QR code. Please scan a valid conference QR code.');
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Simulate LinkedIn authentication for the proof of concept
function authenticateWithLinkedIn() {
    // Create mock LinkedIn profile
    linkedInProfile = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        firstName: 'Test',
        lastName: 'User',
        headline: 'Software Developer',
        pictureUrl: '../assets/img/default-profile.png',
        publicProfileUrl: 'https://linkedin.com/in/testuser'
    };
    
    // Register user in the conference
    registerUserInConference();
    
    // Generate mock connections
    generateMockConnections();
    
    // Display connections
    displayConnections();
}

function generateMockConnections() {
    // Create 3-5 mock connections
    const connectionCount = Math.floor(Math.random() * 3) + 3;
    const mockConnections = [];
    
    const titles = [
        'Software Engineer at Google',
        'Product Manager at Microsoft',
        'Data Scientist at Amazon',
        'UX Designer at Apple',
        'Marketing Manager at LinkedIn'
    ];
    
    const names = [
        'John Smith',
        'Jane Doe',
        'Robert Johnson',
        'Emily Williams',
        'Michael Brown'
    ];
    
    for (let i = 0; i < connectionCount; i++) {
        mockConnections.push({
            id: 'conn_' + Math.random().toString(36).substr(2, 9),
            name: names[i % names.length],
            title: titles[i % titles.length],
            image: '../assets/img/default-profile.png',
            linkedinUrl: 'https://linkedin.com/in/mockuser' + i
        });
    }
    
    // Store these connections for the current conference
    localStorage.setItem(`conference_${currentConference.id}_connections`, JSON.stringify(mockConnections));
    conferenceConnections = mockConnections;
}

function registerUserInConference() {
    if (!linkedInProfile || !currentConference) return;
    
    const userData = {
        id: linkedInProfile.id,
        name: `${linkedInProfile.firstName} ${linkedInProfile.lastName}`,
        title: linkedInProfile.headline,
        image: linkedInProfile.pictureUrl,
        linkedinUrl: linkedInProfile.publicProfileUrl,
        conferenceId: currentConference.id,
        timestamp: new Date().toISOString()
    };
    
    // Store in localStorage as this is a static demo
    const conferenceAttendees = JSON.parse(localStorage.getItem(`conference_${currentConference.id}_attendees`) || '[]');
    
    // Check if user is already registered
    const existingUser = conferenceAttendees.find(user => user.id === userData.id);
    if (!existingUser) {
        conferenceAttendees.push(userData);
        localStorage.setItem(`conference_${currentConference.id}_attendees`, JSON.stringify(conferenceAttendees));
    }
}

function fetchLinkedInConnections() {
    IN.API.Connections("me").fields(
        "id", "firstName", "lastName", "headline", "pictureUrl", "publicProfileUrl"
    ).result(function(data) {
        const connections = data.values || [];
        
        // Get conference attendees
        const conferenceAttendees = JSON.parse(localStorage.getItem(`conference_${currentConference.id}_attendees`) || '[]');
        
        // Find connections who are also at the conference
        conferenceConnections = connections.filter(connection => 
            conferenceAttendees.some(attendee => attendee.id === connection.id)
        ).map(connection => ({
            id: connection.id,
            name: `${connection.firstName} ${connection.lastName}`,
            title: connection.headline,
            image: connection.pictureUrl,
            linkedinUrl: connection.publicProfileUrl
        }));
        
        // Store these connections for the current conference
        localStorage.setItem(`conference_${currentConference.id}_connections`, JSON.stringify(conferenceConnections));
        
        // Display the connections
        displayConnections();
    });
}

function displayConnections() {
    const connectionsContainer = document.getElementById('connections-list');
    connectionsContainer.innerHTML = '';
    
    // Get user profile data
    const userProfileData = localStorage.getItem('linkedInUser') || sessionStorage.getItem('linkedInUser');
    let userProfile = null;
    
    if (userProfileData) {
        try {
            userProfile = JSON.parse(userProfileData);
            console.log('Loaded user profile:', userProfile);
        } catch (error) {
            console.error('Error parsing user profile:', error);
        }
    }
    
    if (!userProfile) {
        const authMessage = document.createElement('div');
        authMessage.className = 'info-message';
        authMessage.innerHTML = `
            <p>Connect with LinkedIn to see your connections at this conference</p>
            <button class="btn btn-primary" onclick="authenticateWithLinkedIn()">Connect with LinkedIn</button>
        `;
        connectionsContainer.appendChild(authMessage);
        return;
    }
    
    // Extract user info from either OAuth or API format
    const userName = userProfile.name || 
        (userProfile.firstName ? 
            (typeof userProfile.firstName === 'object' ? 
                Object.values(userProfile.firstName.localized)[0] : userProfile.firstName) + ' ' + 
            (typeof userProfile.lastName === 'object' ? 
                Object.values(userProfile.lastName.localized)[0] : userProfile.lastName) :
            userProfile.given_name + ' ' + userProfile.family_name);
    
    const userImage = userProfile.picture || 
        (userProfile.profilePicture && userProfile.profilePicture['displayImage~'] ? 
            userProfile.profilePicture['displayImage~'].elements[0].identifiers[0].identifier :
            userProfile.pictureUrl) || '../assets/img/default-profile.png';
    
    const userHeadline = userProfile.headline || '';
    
    // Display user's own profile first
    const userProfileElement = document.createElement('div');
    userProfileElement.className = 'connection-item current-user';
    userProfileElement.innerHTML = `
        <img src="${userImage}" alt="${userName}" class="profile-pic">
        <div class="profile-info">
            <div class="profile-name">${userName}</div>
            <div class="profile-title">${userHeadline}</div>
            <div class="profile-status">Your Profile</div>
        </div>
    `;
    connectionsContainer.appendChild(userProfileElement);
    
    // Get conference details
    const conferenceId = localStorage.getItem('conferenceId') || sessionStorage.getItem('conferenceId');
    const conferenceName = localStorage.getItem('conferenceName') || sessionStorage.getItem('conferenceName');
    const conferenceLocation = localStorage.getItem('conferenceLocation') || sessionStorage.getItem('conferenceLocation');
    
    // Display conference info
    const conferenceInfo = document.createElement('div');
    conferenceInfo.className = 'conference-info';
    conferenceInfo.innerHTML = `
        <h3>${conferenceName || 'Conference'}</h3>
        <p>${conferenceLocation || 'Location not specified'}</p>
    `;
    connectionsContainer.appendChild(conferenceInfo);
    
    // Get and display connections
    const storedConnections = JSON.parse(localStorage.getItem(`conference_${conferenceId}_connections`) || '[]');
    
    if (storedConnections.length === 0) {
        const noConnectionsMessage = document.createElement('div');
        noConnectionsMessage.className = 'info-message';
        noConnectionsMessage.textContent = 'None of your LinkedIn connections are at this conference yet.';
        connectionsContainer.appendChild(noConnectionsMessage);
    } else {
        const connectionsHeader = document.createElement('div');
        connectionsHeader.className = 'connections-header';
        connectionsHeader.innerHTML = `<h4>Found ${storedConnections.length} of your connections at this conference</h4>`;
        connectionsContainer.appendChild(connectionsHeader);
        
        storedConnections.forEach(connection => {
            const connectionElement = document.createElement('div');
            connectionElement.className = 'connection-item';
            connectionElement.innerHTML = `
                <img src="${connection.image || '../assets/img/default-profile.png'}" alt="${connection.name}" class="profile-pic">
                <div class="profile-info">
                    <div class="profile-name">${connection.name}</div>
                    <div class="profile-title">${connection.title || ''}</div>
                    <div class="linkedin-link">
                        <a href="${connection.linkedinUrl}" target="_blank" class="btn btn-secondary btn-sm">View Profile</a>
                    </div>
                </div>
            `;
            connectionsContainer.appendChild(connectionElement);
        });
    }
}

// Update setVisibilityPreference to trigger LinkedIn auth
function setVisibilityPreference(visible) {
    isVisible = visible;
    localStorage.setItem('conferenceVisibility', visible);
    
    const message = visible 
        ? "You are now discoverable to other conference attendees" 
        : "You will remain private during this conference";
    
    alert(message);
    
    if (visible) {
        // If visible, prompt for LinkedIn authentication
        authenticateWithLinkedIn();
    } else {
        // If not visible, just show the connections screen
        displayConnections();
    }
    
    showScreen('connections-screen');
}

// Add after the existing scanner code
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('qr-reader-results').innerHTML = '<p>Processing file...</p>';

    if (!file.type.startsWith('image/')) {
        document.getElementById('qr-reader-results').innerHTML = 
            '<p style="color: red;">Please upload an image file (PNG, JPG, etc.)</p>';
        return;
    }

    console.log('Processing uploaded file:', file.name, file.type);
    handleImageUpload(file);
}

function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('File read successfully, creating image');
        const img = new Image();
        
        img.onload = function() {
            console.log('Image loaded, dimensions:', img.width, 'x', img.height);
            
            // Create canvas to process the image
        const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
        const context = canvas.getContext('2d');
            context.drawImage(img, 0, 0);
            
            // Get image data for QR code processing
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            document.getElementById('qr-reader-results').innerHTML = 
                '<p>Scanning image for QR code...</p>';
            
            // Try to find QR code in the image
            try {
                const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
                    console.log('QR code found in image:', code.data);
                    document.getElementById('qr-reader-results').innerHTML = 
                        '<p style="color: green;">QR code found! Processing...</p>';
                    
                    // Process the QR code data
                    onQRCodeSuccess(code.data);
            } else {
                    document.getElementById('qr-reader-results').innerHTML = 
                        '<p style="color: red;">No QR code found in the image. Please try another image or use the camera scanner.</p>';
                }
            } catch (error) {
                console.error('Error processing image data:', error);
                document.getElementById('qr-reader-results').innerHTML = 
                    `<p style="color: red;">Error processing image: ${error.message}</p>`;
            }
        };
        
        img.onerror = function(err) {
            console.error('Error loading image:', err);
            document.getElementById('qr-reader-results').innerHTML = 
                '<p style="color: red;">Error loading image. Please try another file.</p>';
        };
        
        // Set source to the file data
        img.src = e.target.result;
    };
    
    reader.onerror = function(err) {
        console.error('Error reading file:', err);
        document.getElementById('qr-reader-results').innerHTML = 
            '<p style="color: red;">Error reading file. Please try again.</p>';
    };
    
    // Read the file as data URL
    reader.readAsDataURL(file);
}

// Check URL parameters on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('direct') && urlParams.get('direct') === 'preferences') {
        handleQRCodeResult(window.location.href);
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('direct') && urlParams.get('direct') === 'linkedin') {
        // Store conference details and start LinkedIn auth directly
        const conferenceId = urlParams.get('id');
        const conferenceName = urlParams.get('name');
        const conferenceLocation = urlParams.get('location');
        
        localStorage.setItem('currentConference', JSON.stringify({
            id: conferenceId,
            name: conferenceName,
            location: conferenceLocation
        }));
        
        // Start LinkedIn auth immediately
        startLinkedInAuth();
    }
});

function startLinkedInAuth() {
    // Show loading state
    document.getElementById('welcome-screen').innerHTML = '<div class="loading">Connecting to LinkedIn...</div>';
    
    // Simulate LinkedIn auth (since we're using a mock)
    setTimeout(() => {
        // After successful auth, show connections screen
        showScreen('connections-screen');
        loadConnections();
    }, 1500);
}

function loadConnections() {
    const connectionsList = document.getElementById('connections-list');
    connectionsList.innerHTML = '<div class="loading">Loading connections...</div>';
    
    // Use mock LinkedIn API to get connections
    window.IN.API.Connections().fields().result((response) => {
        const connections = response.values;
        displayConnections(connections);
    });
}

function displayConnections(connections) {
    const connectionsList = document.getElementById('connections-list');
    connectionsList.innerHTML = '';
    
    if (connections.length === 0) {
        connectionsList.innerHTML = '<p>No connections found at this conference.</p>';
        return;
    }
    
    connections.forEach(connection => {
        const connectionElement = document.createElement('div');
        connectionElement.className = 'connection-card';
        connectionElement.innerHTML = `
            <img src="${connection.pictureUrl}" alt="${connection.firstName} ${connection.lastName}" class="connection-image">
            <div class="connection-info">
                <h4>${connection.firstName} ${connection.lastName}</h4>
                <p>${connection.headline}</p>
                <a href="${connection.publicProfileUrl}" target="_blank" class="btn btn-secondary">View Profile</a>
            </div>
        `;
        connectionsList.appendChild(connectionElement);
    });
}