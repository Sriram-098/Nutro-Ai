import React from 'react';
import ArticleCard from './ArticleCard';
import Pagination from './Pagination';

const ArticleFeed = ({ 
  articles, 
  summaries, 
  currentPage, 
  articlesPerPage,
  onExpand, 
  onRegenerate, 
  regenerating,
  onPageChange 
}) => {
  const totalPages = Math.ceil(articles.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const currentArticles = articles.slice(startIndex, startIndex + articlesPerPage);

  return (
    <>
      <main className="feed">
        {currentArticles.map(article => (
          <ArticleCard
            key={article.id}
            article={article}
            summary={summaries[article.id]}
            onExpand={onExpand}
            onRegenerate={onRegenerate}
            regenerating={regenerating === article.id}
          />
        ))}
      </main>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
};

export default ArticleFeed;