import React, { useState } from 'react';
import SubtopicCard from './SubtopicCard';

const SUBTOPICS_PER_PAGE = 6; // Show 6 subtopics per page

const ArticleCard = ({ 
  article, 
  summary, 
  onExpand, 
  onRegenerate, 
  regenerating = false 
}) => {
  const [currentSubtopicPage, setCurrentSubtopicPage] = useState(1);
  return (
    <div className="article-card">
      <div className="article-title-section">
        <h2>{article.title}</h2>
        <div className="article-meta">
          <span className="source">{article.source}</span>
          <span className="date">{new Date(article.date).toLocaleDateString()}</span>
        </div>
      </div>

      {summary && (
        <div className="summary-section">
          {summary.subtopics ? (
            // New subtopics format with pagination
            <div className="subtopics">
              {(() => {
                const totalSubtopics = summary.subtopics.length;
                const totalPages = Math.ceil(totalSubtopics / SUBTOPICS_PER_PAGE);
                const startIndex = (currentSubtopicPage - 1) * SUBTOPICS_PER_PAGE;
                const currentSubtopics = summary.subtopics.slice(startIndex, startIndex + SUBTOPICS_PER_PAGE);
                
                return (
                  <>
                    <div className="subtopics-header">
                      <h4>📋 Article Breakdown ({totalSubtopics} topics)</h4>
                      {totalPages > 1 && (
                        <span className="subtopics-page-info">
                          Page {currentSubtopicPage} of {totalPages}
                        </span>
                      )}
                    </div>
                    
                    <div className="subtopics-grid">
                      {currentSubtopics.map((subtopic, idx) => (
                        <SubtopicCard
                          key={startIndex + idx}
                          subtopic={subtopic}
                          onLearnMore={() => onExpand({
                            ...article,
                            subtopic: subtopic,
                            isSubtopic: true
                          })}
                        />
                      ))}
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="subtopics-pagination">
                        <button 
                          onClick={() => setCurrentSubtopicPage(prev => Math.max(1, prev - 1))}
                          disabled={currentSubtopicPage === 1}
                          className="subtopic-nav-btn"
                        >
                          ← Previous
                        </button>
                        <span className="subtopic-page-numbers">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentSubtopicPage(pageNum)}
                              className={`subtopic-page-btn ${pageNum === currentSubtopicPage ? 'active' : ''}`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </span>
                        <button 
                          onClick={() => setCurrentSubtopicPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentSubtopicPage === totalPages}
                          className="subtopic-nav-btn"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            // Fallback to old format
            <>
              <div className="tldr">
                <strong>TL;DR:</strong> {summary.tldr}
              </div>
              <div className="key-takeaways">
                <strong>Key Takeaways:</strong>
                <ul>
                  {summary.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx}>{takeaway}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      <div className="article-actions">
        <button 
          className="expand-btn"
          onClick={() => onExpand(article)}
        >
          Read More →
        </button>
        <button 
          className="regenerate-btn"
          onClick={() => onRegenerate(article.id)}
          disabled={regenerating}
        >
          {regenerating ? '⟳ Regenerating...' : '⟳ Regenerate'}
        </button>
      </div>
    </div>
  );
};

export default ArticleCard;