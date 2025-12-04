import React from 'react';
import LoadingSpinner from './LoadingSpinner';

// Function to format content with basic markdown-like formatting
const formatContent = (content) => {
  if (!content) return '';
  
  let formatted = content
    // Convert ### headers to h4
    .replace(/### (.*?)(\n|$)/g, '<h4>$1</h4>')
    // Convert ## headers to h3
    .replace(/## (.*?)(\n|$)/g, '<h3>$1</h3>')
    // Convert **bold** to strong
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert line breaks to paragraphs
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => {
      // Don't wrap headers in paragraphs
      if (paragraph.startsWith('<h3>') || paragraph.startsWith('<h4>')) {
        return paragraph;
      }
      return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
  
  return formatted;
};

const ExpandedArticle = ({ 
  article, 
  simplifiedContent, 
  simplifying = false 
}) => {
  return (
    <div className="expanded-article">
      <div className="article-header">
        <h2>
          {article.isSubtopic && article.subtopic 
            ? article.subtopic.title 
            : article.title}
        </h2>
        <div className="article-meta">
          <span className="source">{article.source}</span>
          <span className="date">{new Date(article.date).toLocaleDateString()}</span>
          {article.isSubtopic && (
            <span className="subtopic-badge">Subtopic</span>
          )}
        </div>
      </div>
      
      <div className="simplified-content">
        <h3>📖 {article.isSubtopic ? 'Detailed Explanation' : 'Simplified Version'}</h3>
        {simplifying ? (
          <LoadingSpinner 
            size="small"
            message="AI is preparing detailed content..."
          />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: formatContent(simplifiedContent) }} />
        )}
      </div>
      
      {!article.isSubtopic && (
        <div className="original-content">
          <h3>📄 Original Article</h3>
          <p>{article.content}</p>
        </div>
      )}
    </div>
  );
};

export default ExpandedArticle;