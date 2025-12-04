import React from 'react';

const SubtopicCard = ({ subtopic, onLearnMore }) => {
  return (
    <div className="subtopic-card">
      <h4 className="subtopic-title">{subtopic.title}</h4>
      
      {subtopic.tldr && (
        <div className="subtopic-tldr">
          <strong>TL;DR:</strong> {subtopic.tldr}
        </div>
      )}
      
      <div className="subtopic-takeaways">
        <strong>Key Takeaways:</strong>
        <ul>
          {subtopic.keyTakeaways.map((takeaway, idx) => (
            <li key={idx}>{takeaway}</li>
          ))}
        </ul>
      </div>
      
      <button 
        className="expand-subtopic-btn"
        onClick={onLearnMore}
      >
        Learn More →
      </button>
    </div>
  );
};

export default SubtopicCard;