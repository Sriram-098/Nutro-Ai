import React from 'react';

const LoadingSpinner = ({ 
  message = "Loading...", 
  submessage = null,
  size = "large" 
}) => {
  const spinnerClass = size === "small" ? "spinner-small" : "spinner";
  
  if (size === "small") {
    return (
      <div className="loading-inline">
        <div className={spinnerClass}></div>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="loading">
      <div className={spinnerClass}></div>
      <p>{message}</p>
      {submessage && <small>{submessage}</small>}
    </div>
  );
};

export default LoadingSpinner;