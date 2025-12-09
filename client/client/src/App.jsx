import { useState } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './App.css';
import config from './config';

function App() {
  // Credentials State
  const [senderEmail, setSenderEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");

  // UI State
  const [showGuide, setShowGuide] = useState(false); // <--- Controls the Popup

  // Email Data State
  const [emailStr, setEmailStr] = useState("");
  const [nameStr, setNameStr] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("Hi {name},<br><br>Check out my portfolio <a href='https://google.com'>here</a>.");
  const [scheduledTime, setScheduledTime] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setStatus("Processing...");

    const emails = emailStr.split(',').map(e => e.trim()).filter(e => e);
    const names = nameStr.split(',').map(n => n.trim()).filter(n => n);

    if (!senderEmail || !appPassword) {
        setStatus("⚠️ Error: Please enter Sender Email and App Password.");
        setLoading(false);
        return;
    }
    if (emails.length === 0 || emails.length !== names.length) {
      setStatus(`⚠️ Error: Email/Name count mismatch or empty.`);
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${config.API_URL}/send-email`, {
        senderEmail,
        appPassword,
        emails,
        names,
        subject,
        content,
        scheduledTime: scheduledTime || null
      });
      setStatus("✅ Success! Emails added to queue.");
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed. Check your credentials or server.");
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      <div className="glass-card">
        
        <header className="app-header">
          <div className="header-content">
            <h1>🚀 Bulk Mailer Pro</h1>
            <p>Send personalized emails using your own Gmail.</p>
          </div>
        </header>

        <div className="form-content">
          
          {/* --- CREDENTIALS SECTION --- */}
          <div className="credentials-box">
            <h3>🔐 Sender Credentials</h3>
            <div className="input-row">
                <div className="form-group">
                    <label>Your Gmail Address</label>
                    <input 
                        type="email" 
                        placeholder="you@gmail.com"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>
                        App Password 
                        {/* The Trigger Link */}
                        <span className="help-link" onClick={() => setShowGuide(true)}>
                            ❓ How do I get this?
                        </span>
                    </label>
                    <input 
                        type="password" 
                        placeholder="abcd efgh ijkl mnop"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                    />
                </div>
            </div>
            <p className="security-note">
                Your credentials are never stored. They are used once to send the email.
            </p>
          </div>
          
          {/* --- REST OF THE FORM (No changes here) --- */}
          <div className="input-row">
            <div className="form-group">
              <label>1. Recipient Emails <span className="badge">Comma Separated</span></label>
              <textarea 
                placeholder="hr@google.com, hr@microsoft.com"
                value={emailStr} 
                onChange={(e) => setEmailStr(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>2. Recipient Names <span className="badge">Same Order</span></label>
              <textarea 
                placeholder="Sundar, Satya"
                value={nameStr} 
                onChange={(e) => setNameStr(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group">
            <label>3. Subject</label>
            <input 
              type="text" 
              placeholder="Job Application"
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>4. Message Body <small>(Use <b>{`{name}`}</b> for dynamic name)</small></label>
            <div className="editor-wrapper">
              <ReactQuill 
                theme="snow"
                value={content}
                onChange={setContent}
                className="custom-quill"
              />
            </div>
          </div>

          <div className="action-bar">
            <div className="scheduler-section">
              <label>📅 Schedule (Optional)</label>
              <input 
                type="datetime-local" 
                value={scheduledTime} 
                onChange={(e) => setScheduledTime(e.target.value)} 
              />
            </div>

            <button onClick={handleSend} disabled={loading} className="send-btn">
              {loading ? "Processing..." : "🚀 Schedule / Send"}
            </button>
          </div>

          {status && (
            <div className={`status-msg ${status.includes("Error") || status.includes("Failed") ? "error" : "success"}`}>
              {status}
            </div>
          )}

        </div>
      </div>

      {/* --- POPUP MODAL (THE GUIDE) --- */}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🔑 How to get an App Password</h2>
                    <button className="close-btn" onClick={() => setShowGuide(false)}>×</button>
                </div>
                <div className="modal-body">
                    <p>Google requires a special password for 3rd party apps. Your normal password won't work.</p>
                    <ol>
                        <li>Go to your <a href="https://myaccount.google.com/" target="_blank">Google Account Settings</a>.</li>
                        <li>Click on <b>Security</b> in the left menu.</li>
                        <li>Make sure <b>2-Step Verification</b> is turned <b>ON</b>.</li>
                        <li>In the search bar at top, search for <b>"App Passwords"</b>.</li>
                        <li>Create a new app name (e.g., "Bulk Mailer") and click <b>Create</b>.</li>
                        <li>Copy the <b>16-digit code</b> (e.g., `abcd efgh ijkl mnop`) and paste it here.</li>
                    </ol>
                    <div className="alert-box">
                        <b>Note:</b> If you don't see "App Passwords", it means 2-Step Verification is OFF. Turn it on first.
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={() => setShowGuide(false)}>Got it!</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default App;