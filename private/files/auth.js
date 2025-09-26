// Simple password protection for the private file sharing
class FilesAuth {
    constructor() {
        this.isAuthenticated = false;
        this.sessionKey = 'filesAuth';
        
        this.checkAuth();
    }

    checkAuth() {
        // Check if already authenticated in this session
        const sessionAuth = sessionStorage.getItem(this.sessionKey);
        if (sessionAuth === 'authenticated') {
            this.isAuthenticated = true;
            return;
        }

        // Show password prompt
        this.showPasswordPrompt();
    }

    showPasswordPrompt() {
        // Hide the main files content
        document.querySelector('.files-container').style.display = 'none';
        
        // Create password prompt overlay
        const overlay = document.createElement('div');
        overlay.id = 'authOverlay';
        overlay.innerHTML = `
            <div class="auth-container">
                <div class="auth-content">
                    <h2>📁 File Sharing Access</h2>
                    <p>Welcome to our private file sharing area!</p>
                    <p>Please enter the access code:</p>
                    
                    <form id="authForm">
                        <div class="auth-group">
                            <input type="password" id="authPassword" placeholder="Enter access code" required>
                        </div>
                        <button type="submit" class="auth-btn">Access Files</button>
                    </form>
                    
                    <div id="authError" class="auth-error" style="display: none;">
                        Incorrect access code. Please try again.
                    </div>
                    
                    <div class="auth-back">
                        <a href="/private/">&larr; Back to Private Area</a>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);

        // Add event listeners
        document.getElementById('authForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.authenticate();
        });

        // Focus on password input
        document.getElementById('authPassword').focus();
    }

    authenticate() {
        const password = document.getElementById('authPassword').value;
        const errorDiv = document.getElementById('authError');
        
        // Simple password check
        if (this.checkPassword(password)) {
            // Authentication successful
            this.isAuthenticated = true;
            sessionStorage.setItem(this.sessionKey, 'authenticated');
            
            // Remove auth overlay
            document.getElementById('authOverlay').remove();
            
            // Show files content
            document.querySelector('.files-container').style.display = 'block';
        } else {
            // Authentication failed
            errorDiv.style.display = 'block';
            document.getElementById('authPassword').value = '';
            document.getElementById('authPassword').focus();
            
            // Hide error after 3 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }

    checkPassword(password) {
        // File sharing access password
        const correctPassword = 'sharingiscaring'; // This is the password for file sharing
        
        // You can also use multiple passwords for different people
        const validPasswords = [
            'sharingiscaring',  // Main file sharing password
            'sharefiles',       // Alternative password
            'filesforall'       // Another alternative
        ];
        
        return validPasswords.includes(password.toLowerCase());
    }

    // Logout method
    logout() {
        sessionStorage.removeItem(this.sessionKey);
        window.location.reload();
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.filesAuth = new FilesAuth();
    
    // Add logout functionality (hidden, accessible via console)
    window.addEventListener('keydown', (e) => {
        // Press Ctrl+Shift+L to logout (hidden feature)
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            if (confirm('Logout from file sharing?')) {
                window.filesAuth.logout();
            }
        }
    });
});

// CSS styles for authentication
const authStyles = `
<style>
#authOverlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.auth-container {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    padding: 40px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 90%;
    text-align: center;
}

.auth-content h2 {
    color: #333;
    margin-bottom: 20px;
    font-size: 24px;
}

.auth-content p {
    color: #666;
    margin-bottom: 15px;
    font-size: 16px;
}

.auth-group {
    margin-bottom: 25px;
}

.auth-group input {
    width: 100%;
    padding: 15px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    box-sizing: border-box;
    transition: border-color 0.3s ease;
}

.auth-group input:focus {
    outline: none;
    border-color: #6f42c1;
    box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.1);
}

.auth-btn {
    background: #6f42c1;
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    width: 100%;
}

.auth-btn:hover {
    background: #5a32a3;
}

.auth-error {
    background: #fed7d7;
    color: #c53030;
    padding: 10px;
    border-radius: 5px;
    margin-top: 15px;
    font-size: 14px;
}

.auth-back {
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.auth-back a {
    color: #6f42c1;
    text-decoration: none;
    font-size: 14px;
}

.auth-back a:hover {
    text-decoration: underline;
}

@media (max-width: 480px) {
    .auth-container {
        padding: 30px 20px;
    }
    
    .auth-content h2 {
        font-size: 20px;
    }
}
</style>
`;

// Inject auth styles
document.head.insertAdjacentHTML('beforeend', authStyles);