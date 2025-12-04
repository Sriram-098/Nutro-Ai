import React, { useState, useEffect } from 'react';
import { mockArticles } from './mockData';
import { generateSummary, simplifyArticle, generateDetailedExplanation, resetWorkingModel } from './aiService';
import {
  Header,
  WelcomeScreen,
  LoadingSpinner,
  ArticleFeed,
  ExpandedArticle,
  ProcessingOverlay,
  FeedInput
} from './components';
import './App.css';

const ARTICLES_PER_PAGE = 3;

function App() {
  const [articles, setArticles] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [simplifiedContent, setSimplifiedContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasArticles, setHasArticles] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(null);
  const [simplifying, setSimplifying] = useState(false);
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome', 'upload', 'feed', 'article'
  const [processingFeed, setProcessingFeed] = useState(false);

  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Reset quota exceeded when API key changes
  useEffect(() => {
    setQuotaExceeded(false);
    resetWorkingModel(); // Clear cached model
  }, []);

  // Function to clear all data and reset application
  const clearAllData = () => {
    setArticles([]);
    setSummaries({});
    setExpandedArticle(null);
    setSimplifiedContent('');
    setCurrentPage(1);
    setHasArticles(false);
    setCurrentView('welcome');
    setQuotaExceeded(false);
    
    // Clear any browser storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.log('Storage clear failed:', error);
    }
    
    console.log('All data cleared - application reset');
  };

  // Remove auto-loading of articles on startup

  const loadArticles = async (articlesToLoad) => {
    setLoading(true);
    // Simulate loading articles
    await new Promise(resolve => setTimeout(resolve, 500));
    setArticles(articlesToLoad);
    
    // Generate summaries for all articles
    const newSummaries = {};
    for (const article of articlesToLoad) {
      try {
        newSummaries[article.id] = await generateSummary(article);
      } catch (error) {
        console.error(`Failed to generate summary for article ${article.id}:`, error);
        
        if (error.message === 'QUOTA_EXCEEDED') {
          setQuotaExceeded(true);
        }
        
        newSummaries[article.id] = {
          tldr: "Summary generation failed. Please try regenerating.",
          keyTakeaways: ["Error occurred during AI processing", "Please try again", "Check your internet connection"]
        };
      }
    }
    setSummaries(newSummaries);
    setLoading(false);
    setHasArticles(true);
  };

  const handleRefresh = async () => {
    if (articles.length === 0) return;
    setRefreshing(true);
    await loadArticles(articles);
    setRefreshing(false);
    setCurrentPage(1);
  };

  const handleLoadSampleData = async () => {
    await loadArticles(mockArticles);
    setCurrentPage(1);
    setCurrentView('feed'); // Navigate to feed after loading samples
  };

  const handleFeedSubmit = async (newArticles) => {
    setProcessingFeed(true);
    try {
      await loadArticles(newArticles);
      setCurrentPage(1);
      setCurrentView('feed'); // Navigate to feed after successful upload
    } catch (error) {
      console.error('Error processing feed:', error);
    } finally {
      setProcessingFeed(false);
    }
  };



  const handleRegenerate = async (articleId) => {
    setRegenerating(articleId);
    const article = articles.find(a => a.id === articleId);
    const newSummary = await generateSummary(article);
    setSummaries(prev => ({ ...prev, [articleId]: newSummary }));
    setRegenerating(null);
  };

  const handleExpand = async (article) => {
    setExpandedArticle(article);
    setCurrentView('article');
    setSimplifying(true);
    
    if (article.isSubtopic && article.subtopic) {
      // For subtopics, generate detailed explanation
      try {
        const detailedContent = await generateDetailedExplanation(article.subtopic, article);
        setSimplifiedContent(detailedContent);
      } catch (error) {
        console.error('Error generating detailed explanation:', error);
        // Fallback to existing expanded explanation
        setSimplifiedContent(article.subtopic.expandedExplanation || 'Unable to generate detailed explanation at this time.');
      }
      setSimplifying(false);
    } else {
      // For full articles, use AI simplification
      try {
        const simplified = await simplifyArticle(article);
        setSimplifiedContent(simplified);
      } catch (error) {
        console.error('Error simplifying article:', error);
        setSimplifiedContent('Unable to simplify article at this time.');
      }
      setSimplifying(false);
    }
  };

  const handleClose = () => {
    setExpandedArticle(null);
    setSimplifiedContent('');
    setCurrentView('feed');
  };

  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const currentArticles = articles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  // Show welcome screen if no articles loaded yet
  if (currentView === 'welcome' && !hasArticles && !loading) {
    return (
      <div className="app">
        <Header />
        <WelcomeScreen 
          onUploadClick={() => setCurrentView('upload')}
          onSampleDataClick={handleLoadSampleData}
        />
      </div>
    );
  }

  // Show upload page
  if (currentView === 'upload') {
    return (
      <div className="app">
        <Header 
          title="📤 Upload News Feed"
          subtitle="Import your health news content for AI analysis"
          backButton={{
            text: "← Back",
            onClick: () => setCurrentView('welcome')
          }}
        />
        <div className="upload-page">
          <FeedInput 
            onFeedSubmit={handleFeedSubmit}
            onClose={() => setCurrentView('welcome')}
            isFullPage={true}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <Header />
        <LoadingSpinner 
          message="Loading and preparing articles..."
          submessage="AI is analyzing content"
        />
      </div>
    );
  }

  if (currentView === 'article' && expandedArticle) {
    return (
      <div className="app">
        <Header 
          backButton={{
            text: "← Back to Feed",
            onClick: handleClose
          }}
        />
        <ExpandedArticle 
          article={expandedArticle}
          simplifiedContent={simplifiedContent}
          simplifying={simplifying}
        />
      </div>
    );
  }

  // Show feed view (main articles list)
  if (currentView === 'feed' || hasArticles) {
    return (
      <div className="app">
        <Header 
          showActions={true}
          onImportClick={() => setCurrentView('upload')}
          onRefreshClick={handleRefresh}
          onClearData={clearAllData}
          refreshing={refreshing}
          processingFeed={processingFeed}
          loading={loading}
          quotaExceeded={quotaExceeded}
        />

        <ArticleFeed 
          articles={articles}
          summaries={summaries}
          currentPage={currentPage}
          articlesPerPage={ARTICLES_PER_PAGE}
          onExpand={handleExpand}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
          onPageChange={setCurrentPage}
        />

        {processingFeed && (
          <ProcessingOverlay 
            message="Processing news feed with AI..."
            submessage="This may take a few moments"
          />
        )}
      </div>
    );
  }

  // Fallback return (should not reach here)
  return (
    <div className="app">
      <header className="header">
        <h1>⚫ Nutro</h1>
        <p>Loading...</p>
      </header>
    </div>
  );
}

export default App;
