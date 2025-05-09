let qrcode;

// Load conferences on page load
document.addEventListener('DOMContentLoaded', function() {
    loadConferenceLogs();
});

// Function to load conference logs
async function loadConferenceLogs() {
    try {
        const response = await fetch('/api/conference/history');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            // Split conferences into live (less than 18 hours old) and history
            const currentTime = new Date();
            const eighteenHoursInMs = 18 * 60 * 60 * 1000; // 18 hours in milliseconds
            
            const liveConferences = [];
            const historyConferences = [];
            
            data.data.forEach(conf => {
                const confCreatedTime = new Date(conf.created_at);
                const ageInMs = currentTime - confCreatedTime;
                
                if (ageInMs < eighteenHoursInMs) {
                    liveConferences.push(conf);
                } else {
                    historyConferences.push(conf);
                }
            });
            
            // Display live conferences (if any)
            if (liveConferences.length > 0) {
                displayLiveConferences(liveConferences);
            }
            
            // Display history conferences
            displayConferenceLogs(historyConferences);
        } else {
            console.log('No conference history found');
        }
    } catch (error) {
        console.error('Error loading conference logs:', error);
    }
}

// Function to display conference logs
function displayConferenceLogs(conferences) {
    // Check if logs container exists, if not create it
    let logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) {
        logsContainer = document.createElement('div');
        logsContainer.id = 'logsContainer';
        logsContainer.className = 'logs-container';
        document.querySelector('.container').appendChild(logsContainer);
        
        const logsHeader = document.createElement('div');
        logsHeader.className = 'logs-header';
        logsHeader.textContent = 'Conference History (Past Conferences)';
        logsContainer.appendChild(logsHeader);
    }
    
    // Create or get logs list
    let logsList = document.getElementById('logsList');
    if (!logsList) {
        logsList = document.createElement('div');
        logsList.id = 'logsList';
        logsList.className = 'logs-list';
        logsContainer.appendChild(logsList);
    } else {
        logsList.innerHTML = ''; // Clear existing logs
    }
    
    // Add each conference to the logs list
    conferences.forEach(conf => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        
        // Format date
        const date = new Date(conf.created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Create the URL
        const conferenceURL = `${window.location.origin}/docs/user/auth.html?id=${conf.id}&name=${encodeURIComponent(conf.name)}&location=${encodeURIComponent(conf.location || '')}`;
        
        logItem.innerHTML = `
            <div class="log-item-header">
                <div class="log-name">${conf.name}</div>
                <div class="log-date">${formattedDate}</div>
            </div>
            <div class="log-details">
                <div class="log-detail">
                    <span class="log-label">Location:</span>
                    <span>${conf.location || 'N/A'}</span>
                </div>
                <div class="log-url">
                    <span>${conferenceURL}</span>
                </div>
            </div>
            <div class="log-actions">
                <button class="btn-download-qr" data-id="${conf.id}" 
                        data-name="${conf.name}" data-qrdata="${conf.qr_data || ''}"
                        data-url="${conferenceURL}">
                    <i class="fas fa-download"></i> Download QR
                </button>
                <button class="btn-copy-link" data-url="${conferenceURL}">
                    <i class="fas fa-copy"></i> Copy Link
                </button>
            </div>
        `;
        
        logsList.appendChild(logItem);
    });
    
    // Add event listeners to download buttons
    document.querySelectorAll('.btn-download-qr').forEach(btn => {
        btn.addEventListener('click', function() {
            const conferenceId = this.getAttribute('data-id');
            const conferenceName = this.getAttribute('data-name');
            const qrData = this.getAttribute('data-qrdata');
            const conferenceURL = this.getAttribute('data-url');
            
            if (qrData) {
                // If QR data exists, use it to download
                downloadQRFromData(qrData, conferenceName);
            } else {
                // Otherwise generate a new QR code
                generateAndDownloadQR(conferenceId, conferenceName, conferenceURL);
            }
        });
    });
    
    // Add event listeners to copy link buttons
    document.querySelectorAll('.btn-copy-link').forEach(btn => {
        btn.addEventListener('click', function() {
            const conferenceURL = this.getAttribute('data-url');
            copyConferenceLink(conferenceURL, this);
        });
    });
}

// Function to download QR from data URL
function downloadQRFromData(qrData, conferenceName) {
    const a = document.createElement('a');
    a.download = `qr-code-${conferenceName.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.href = qrData;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Function to generate and download a QR code
function generateAndDownloadQR(conferenceId, conferenceName, conferenceURL) {
    // Create a temporary div for the QR code
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    // Generate the QR code
    const tempQrcode = new QRCode(tempDiv, {
        text: conferenceURL,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Wait for QR code to be generated
    setTimeout(() => {
        const qrImage = tempDiv.querySelector('img');
        if (qrImage) {
            const qrDataUrl = qrImage.src;
            
            // Save QR data to database
            saveQRDataToDatabase(conferenceId, qrDataUrl);
            
            // Download the QR code
            downloadQRFromData(qrDataUrl, conferenceName);
            
            // Clean up
            document.body.removeChild(tempDiv);
        }
    }, 100);
}

// Function to save QR data to database
async function saveQRDataToDatabase(conferenceId, qrData) {
    try {
        await fetch('/api/conference/save-qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conferenceId,
                qrData
            })
        });
    } catch (error) {
        console.error('Error saving QR data:', error);
    }
}

function generateConferenceQR() {
    const conferenceName = document.getElementById('conferenceName').value;
    const conferenceLocation = document.getElementById('conferenceLocation').value;

    if (!conferenceName || !conferenceLocation) {
        alert('Please enter both conference name and location');
        return;
    }

    const conferenceId = generateUniqueId();
    // Generate URL that points directly to LinkedIn auth page
    const conferenceURL = `${window.location.origin}/docs/user/auth.html?id=${conferenceId}&name=${encodeURIComponent(conferenceName)}&location=${encodeURIComponent(conferenceLocation)}`;

    // Clear previous QR code
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';

    // Generate new QR code using qrcodejs library
    qrcode = new QRCode(qrcodeElement, {
        text: conferenceURL,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Store the QR data URL for later use
    setTimeout(() => {
        const qrImage = document.querySelector('#qrcode img');
        if (qrImage) {
            qrImage.setAttribute('alt', 'Conference QR Code');
            // Store the original data URL
            window.qrDataUrl = qrImage.src;
            
            // Save new conference to database with QR data
            saveConferenceToDatabase(conferenceId, conferenceName, conferenceLocation, qrImage.src);
        }
    }, 100);

    document.getElementById('conferenceDetails').innerHTML = `
        <p><strong>Conference Name:</strong> ${conferenceName}</p>
        <p><strong>Location:</strong> ${conferenceLocation}</p>
        <p class="note">Scan this QR code to connect with LinkedIn</p>
        <div class="url-display">
            <span>URL: ${conferenceURL}</span>
            <button class="copy-btn" onclick="copyURL('${conferenceURL}')">Copy URL</button>
        </div>
    `;

    // Show download button
    document.getElementById('downloadBtn').style.display = 'inline-block';
    
    // Reload conference logs to include the new one
    setTimeout(() => {
        loadConferenceLogs();
    }, 1000);
}

// Function to save a new conference to the database
async function saveConferenceToDatabase(id, name, location, qrData) {
    try {
        // First save the conference with all details
        await fetch('/api/conference/save-qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conferenceId: id,
                name: name,
                location: location,
                qrData
            })
        });
    } catch (error) {
        console.error('Error saving conference:', error);
    }
}

function copyURL(url) {
    navigator.clipboard.writeText(url).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
            copyBtn.textContent = 'Copy URL';
            copyBtn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy URL:', err);
        alert('Failed to copy URL. Please try again.');
    });
}

function downloadQRImage() {
    // Try multiple methods to download the QR code
    
    // Method 1: Use stored data URL (most reliable)
    if (window.qrDataUrl) {
        const a = document.createElement('a');
        const conferenceName = document.getElementById('conferenceName').value || 'conference';
        a.download = `qr-code-${conferenceName.toLowerCase().replace(/\s+/g, '-')}.png`;
        a.href = window.qrDataUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('Download method 1 used');
        return;
    }
    
    // Method 2: Direct download of image element
    const qrImage = document.querySelector('#qrcode img');
    if (!qrImage) {
        alert('Please generate a QR code first');
        return;
    }
    
    try {
        const conferenceName = document.getElementById('conferenceName').value || 'conference';
        const a = document.createElement('a');
        a.download = `qr-code-${conferenceName.toLowerCase().replace(/\s+/g, '-')}.png`;
        a.href = qrImage.src;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('Download method 2 used');
    } catch (error) {
        console.error('Error downloading image:', error);
        alert('Could not download QR code. Please right-click on the image and select "Save Image As..."');
    }
}

function generateUniqueId() {
    return 'conf_' + Math.random().toString(36).substr(2, 9);
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}

// Function to copy conference link to clipboard
function copyConferenceLink(url, button) {
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = url;
    document.body.appendChild(tempInput);
    
    // Select and copy the URL
    tempInput.select();
    document.execCommand('copy');
    
    // Remove the temporary input
    document.body.removeChild(tempInput);
    
    // Show copied feedback
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
    button.style.backgroundColor = '#28a745';
    
    // Restore original text after 2 seconds
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '';
    }, 2000);
}

// Function to display live conferences
function displayLiveConferences(conferences) {
    // Check if live container exists, if not create it
    let liveContainer = document.getElementById('liveContainer');
    if (!liveContainer) {
        liveContainer = document.createElement('div');
        liveContainer.id = 'liveContainer';
        liveContainer.className = 'live-container';
        
        // Insert before logs container if it exists
        const logsContainer = document.getElementById('logsContainer');
        if (logsContainer) {
            logsContainer.parentNode.insertBefore(liveContainer, logsContainer);
        } else {
            document.querySelector('.container').appendChild(liveContainer);
        }
        
        const liveHeader = document.createElement('div');
        liveHeader.className = 'live-header';
        liveHeader.innerHTML = 'Live Conferences <span class="live-badge">Active</span>';
        liveContainer.appendChild(liveHeader);
    }
    
    // Create or get live list
    let liveList = document.getElementById('liveList');
    if (!liveList) {
        liveList = document.createElement('div');
        liveList.id = 'liveList';
        liveList.className = 'live-list';
        liveContainer.appendChild(liveList);
    } else {
        liveList.innerHTML = ''; // Clear existing list
    }
    
    // Add each conference to the live list
    conferences.forEach(conf => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item live-item';
        
        // Format date
        const date = new Date(conf.created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Calculate hours elapsed
        const currentTime = new Date();
        const hoursElapsed = Math.floor((currentTime - date) / (60 * 60 * 1000));
        const remainingHours = 18 - hoursElapsed;
        
        // Create the URL
        const conferenceURL = `${window.location.origin}/docs/user/auth.html?id=${conf.id}&name=${encodeURIComponent(conf.name)}&location=${encodeURIComponent(conf.location || '')}`;
        
        logItem.innerHTML = `
            <div class="log-item-header">
                <div class="log-name">${conf.name}</div>
                <div class="log-date">${formattedDate} <span class="live-time-remaining">(${remainingHours}h remaining)</span></div>
            </div>
            <div class="log-details">
                <div class="log-detail">
                    <span class="log-label">Location:</span>
                    <span>${conf.location || 'N/A'}</span>
                </div>
                <div class="log-url">
                    <span>${conferenceURL}</span>
                </div>
            </div>
            <div class="log-actions">
                <button class="btn-download-qr" data-id="${conf.id}" 
                        data-name="${conf.name}" data-qrdata="${conf.qr_data || ''}"
                        data-url="${conferenceURL}">
                    <i class="fas fa-download"></i> Download QR
                </button>
                <button class="btn-copy-link" data-url="${conferenceURL}">
                    <i class="fas fa-copy"></i> Copy Link
                </button>
            </div>
        `;
        
        liveList.appendChild(logItem);
    });
    
    // Add event listeners to download buttons
    document.querySelectorAll('.btn-download-qr').forEach(btn => {
        btn.addEventListener('click', function() {
            const conferenceId = this.getAttribute('data-id');
            const conferenceName = this.getAttribute('data-name');
            const qrData = this.getAttribute('data-qrdata');
            const conferenceURL = this.getAttribute('data-url');
            
            if (qrData) {
                // If QR data exists, use it to download
                downloadQRFromData(qrData, conferenceName);
            } else {
                // Otherwise generate a new QR code
                generateAndDownloadQR(conferenceId, conferenceName, conferenceURL);
            }
        });
    });
    
    // Add event listeners to copy link buttons
    document.querySelectorAll('.btn-copy-link').forEach(btn => {
        btn.addEventListener('click', function() {
            const conferenceURL = this.getAttribute('data-url');
            copyConferenceLink(conferenceURL, this);
        });
    });
}
