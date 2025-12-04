import React from 'react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  if (totalPages <= 1) return null;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      if (currentPage <= 3) {
        // Show first 3 pages + ellipsis + last page
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show first page + ellipsis + last 3 pages
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Show first + ellipsis + current-1, current, current+1 + ellipsis + last
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination">
      {/* First Page Button */}
      <button 
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="pagination-nav"
        title="First page"
      >
        ⟪
      </button>

      {/* Previous Button */}
      <button 
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="pagination-nav"
        title="Previous page"
      >
        ‹
      </button>
      
      {/* Page Numbers */}
      <div className="pagination-numbers">
        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`pagination-number ${page === currentPage ? 'active' : ''}`}
            >
              {page}
            </button>
          )
        ))}
      </div>

      {/* Next Button */}
      <button 
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="pagination-nav"
        title="Next page"
      >
        ›
      </button>

      {/* Last Page Button */}
      <button 
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="pagination-nav"
        title="Last page"
      >
        ⟫
      </button>
      
      {/* Page Info */}
      <span className="page-info">
        {currentPage} of {totalPages}
      </span>
    </div>
  );
};

export default Pagination;