import React, { useState } from 'react';
import { parseFeedContent, validateArticles } from '../feedParser';
import { extractTextFromPDF } from '../utils/pdfExtractor';

const FeedInput = ({ onFeedSubmit, onClose, isFullPage = false }) => {
  const [feedContent, setFeedContent] = useState('');
  const [format, setFormat] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedContent.trim()) {
      setError('Please enter feed content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parsedArticles = parseFeedContent(feedContent, format);
      const validArticles = validateArticles(parsedArticles);
      
      if (validArticles.length === 0) {
        throw new Error('No valid articles found in the feed');
      }

      await onFeedSubmit(validArticles);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // Handle PDF files with text extraction
        setLoading(true);
        setError('');
        
        try {
          const extractedText = await extractTextFromPDF(file);
          setFeedContent(extractedText);
          setError(''); // Clear any previous errors
        } catch (error) {
          console.error('PDF extraction error:', error);
          setError(`PDF text extraction failed: ${error.message}. Please try copying and pasting the text content manually.`);
        } finally {
          setLoading(false);
        }
        return;
      }
      
      // Handle text files
      const reader = new FileReader();
      reader.onload = (event) => {
        setFeedContent(event.target.result);
        setError(''); // Clear any previous errors
      };
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
      };
      reader.readAsText(file);
    }
  };

  const sampleFeeds = {
    json: `{
  "articles": [
    {
      "title": "AI Breakthrough in Medical Diagnosis",
      "content": "Researchers have developed an AI system that can diagnose rare diseases with 95% accuracy, potentially revolutionizing healthcare for millions of patients worldwide.",
      "source": "Medical AI Journal",
      "date": "2025-12-04"
    },
    {
      "title": "Climate Change Impact on Global Food Security",
      "content": "New study reveals that rising temperatures could reduce crop yields by 30% in the next decade, affecting food security for over 2 billion people.",
      "source": "Environmental Science Today",
      "date": "2025-12-03"
    }
  ]
}`,
    rss: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tech News Feed</title>
    <item>
      <title>Quantum Computing Milestone Achieved</title>
      <description>Scientists have successfully demonstrated quantum supremacy in solving complex optimization problems, marking a significant step toward practical quantum computing applications.</description>
      <pubDate>Wed, 04 Dec 2025 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Renewable Energy Reaches New Record</title>
      <description>Solar and wind power now account for 40% of global electricity generation, surpassing fossil fuels for the first time in history.</description>
      <pubDate>Tue, 03 Dec 2025 15:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`,
    text: `1. Space Exploration Breakthrough
NASA's new propulsion system could reduce Mars travel time from 9 months to just 3 months, opening new possibilities for human exploration of the red planet.

2. Ocean Conservation Success
Marine protected areas have led to a 50% increase in fish populations over the past 5 years, demonstrating the effectiveness of conservation efforts.

3. Educational Technology Innovation
Virtual reality classrooms are showing 40% improvement in student engagement and learning outcomes across multiple subjects.`
  };

  if (isFullPage) {
    return (
      <div className="feed-input-page">
        <div className="upload-content">
          <div className="upload-header">
            <h2>📰 Import Your News Content</h2>
            <p>Upload health articles, RSS feeds, or paste content directly</p>
          </div>
        
          <form onSubmit={handleSubmit}>
            <div className="input-section">
              <label htmlFor="format">Feed Format:</label>
              <select 
                id="format" 
                value={format} 
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="auto">Auto-detect</option>
                <option value="json">JSON</option>
                <option value="rss">RSS/XML</option>
                <option value="text">Plain Text</option>
              </select>
            </div>

            <div className="input-section">
              <label htmlFor="file-upload">Or upload a text file:</label>
              <input 
                id="file-upload"
                type="file" 
                accept=".json,.xml,.rss,.txt,.md,.pdf"
                onChange={handleFileUpload}
              />
              <small className="file-help">
                Supported formats: PDF, JSON, RSS/XML, TXT, Markdown. PDF text will be automatically extracted.
              </small>
            </div>

            <div className="input-section">
              <label htmlFor="feed-content">Feed Content:</label>
              <textarea
                id="feed-content"
                value={feedContent}
                onChange={(e) => setFeedContent(e.target.value)}
                placeholder="Paste your news content here or upload a file above...

For PDFs: Upload the file directly or paste extracted text here.
For articles: Paste the full article text.
For RSS feeds: Paste the RSS XML content.
For JSON: Paste structured article data."
                rows={12}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            
            {loading && (
              <div className="processing-message">
                <div className="spinner-small"></div>
                <span>Processing PDF file...</span>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading || !feedContent.trim()}>
                {loading ? 'Processing...' : 'Import Feed'}
              </button>
            </div>
          </form>

          <div className="sample-feeds">
            <h3>Sample Formats:</h3>
            <div className="sample-buttons">
              {Object.entries(sampleFeeds).map(([type, content]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFeedContent(content);
                    setFormat(type);
                  }}
                  className="sample-btn"
                >
                  Load {type.toUpperCase()} Sample
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original modal version for backward compatibility
  return (
    <div className="feed-input-overlay">
      <div className="feed-input-modal">
        <div className="modal-header">
          <h2>📰 Import News Feed</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-section">
            <label htmlFor="format">Feed Format:</label>
            <select 
              id="format" 
              value={format} 
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="auto">Auto-detect</option>
              <option value="json">JSON</option>
              <option value="rss">RSS/XML</option>
              <option value="text">Plain Text</option>
            </select>
          </div>

          <div className="input-section">
            <label htmlFor="file-upload">Or upload a text file:</label>
            <input 
              id="file-upload"
              type="file" 
              accept=".json,.xml,.rss,.txt,.md,.pdf"
              onChange={handleFileUpload}
            />
            <small className="file-help">
              Supported formats: PDF, JSON, RSS/XML, TXT, Markdown. PDF text will be automatically extracted.
            </small>
          </div>

          <div className="input-section">
            <label htmlFor="feed-content">Feed Content:</label>
            <textarea
              id="feed-content"
              value={feedContent}
              onChange={(e) => setFeedContent(e.target.value)}
              placeholder="Paste your news content here or upload a file above...

For PDFs: Upload the file directly or paste extracted text here.
For articles: Paste the full article text.
For RSS feeds: Paste the RSS XML content.
For JSON: Paste structured article data."
              rows={12}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          
          {loading && (
            <div className="processing-message">
              <div className="spinner-small"></div>
              <span>Processing PDF file...</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !feedContent.trim()}>
              {loading ? 'Processing...' : 'Import Feed'}
            </button>
          </div>
        </form>

        <div className="sample-feeds">
          <h3>Sample Formats:</h3>
          <div className="sample-buttons">
            {Object.entries(sampleFeeds).map(([type, content]) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setFeedContent(content);
                  setFormat(type);
                }}
                className="sample-btn"
              >
                Load {type.toUpperCase()} Sample
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedInput;