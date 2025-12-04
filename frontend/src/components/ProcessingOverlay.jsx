import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const ProcessingOverlay = ({ message = "Processing...", submessage = null }) => {
  return (
    <div className="processing-overlay">
      <div className="processing-modal">
        <LoadingSpinner 
          message={message}
          submessage={submessage}
        />
      </div>
    </div>
  );
};

export default ProcessingOverlay;