let qrcode;

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