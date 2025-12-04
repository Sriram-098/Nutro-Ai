import React from 'react';

const WelcomeScreen = ({ onUploadClick, onSampleDataClick }) => {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">⚫</div>
        <h2>Welcome to Nutro</h2>
        <p>AI-powered news analysis platform for intelligent content processing</p>
        
        <div className="welcome-actions">
          <button 
            className="primary-btn"
            onClick={onUploadClick}
          >
            ▲ Upload Content
          </button>
          <button 
            className="secondary-btn"
            onClick={onSampleDataClick}
          >
            ▼ Try Sample Articles
          </button>
        </div>
        
        <div className="features">
          <div className="feature">
            <span className="feature-icon">■</span>
            <div>
              <h4>AI Analysis</h4>
              <p>Advanced content processing and summarization</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">●</span>
            <div>
              <h4>Clean Interface</h4>
              <p>Minimalist design for focused reading</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">▪</span>
            <div>
              <h4>Multiple Formats</h4>
              <p>Supports JSON, RSS, and plain text</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;