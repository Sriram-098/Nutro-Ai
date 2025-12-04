import React from 'react';

const Header = ({ 
  title = "⚫ Nutro", 
  subtitle = "AI-powered news analysis platform",
  showActions = false,
  onImportClick,
  onRefreshClick,
  onClearData,
  refreshing = false,
  processingFeed = false,
  loading = false,
  backButton = null,
  quotaExceeded = false
}) => {
  return (
    <header className="header">
      {backButton && (
        <button className="back-btn" onClick={backButton.onClick}>
          {backButton.text}
        </button>
      )}
      
      <h1>{title}</h1>
      <p>{subtitle}</p>
      
      {showActions && (
        <div className="header-actions">
          <button 
            className="import-btn" 
            onClick={onImportClick}
            disabled={loading || processingFeed}
          >
            📰 Import Feed
          </button>
          <button 
            className="refresh-btn" 
            onClick={onRefreshClick}
            disabled={refreshing || processingFeed}
          >
            {refreshing ? '↻ Refresh Feed' : '↻ Refresh Feed'}
          </button>
          {onClearData && (
            <button 
              className="clear-data-btn" 
              onClick={onClearData}
              title="Clear all data and reset app"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      )}
      
      {quotaExceeded && (
        <div className="quota-warning">
          ⚠️ Gemini API quota exceeded. Using smart fallback summaries. 
          <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer">
            Upgrade to paid plan
          </a> for unlimited access.
        </div>
      )}
    </header>
  );
};

export default Header;