// News feed parser for various formats
export const parseFeedContent = (content, format = 'auto') => {
  try {
    // Auto-detect format if not specified
    if (format === 'auto') {
      if (content.trim().startsWith('<')) {
        format = 'rss';
      } else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        format = 'json';
      } else {
        format = 'text';
      }
    }

    switch (format) {
      case 'json':
        return parseJSONFeed(content);
      case 'rss':
        return parseRSSFeed(content);
      case 'text':
        return parseTextFeed(content);
      default:
        throw new Error('Unsupported format');
    }
  } catch (error) {
    console.error('Feed parsing error:', error);
    throw new Error('Failed to parse feed content. Please check the format.');
  }
};

const parseJSONFeed = (content) => {
  const data = JSON.parse(content);
  
  // Handle different JSON structures
  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      id: item.id || Date.now() + index,
      title: item.title || item.headline || 'Untitled',
      content: item.content || item.description || item.summary || '',
      source: item.source || item.publisher || 'Unknown Source',
      date: item.date || item.publishedAt || new Date().toISOString()
    }));
  } else if (data.articles || data.items) {
    const articles = data.articles || data.items;
    return articles.map((item, index) => ({
      id: item.id || Date.now() + index,
      title: item.title || item.headline || 'Untitled',
      content: item.content || item.description || item.summary || '',
      source: item.source || item.publisher || 'Unknown Source',
      date: item.date || item.publishedAt || new Date().toISOString()
    }));
  }
  
  throw new Error('Invalid JSON structure');
};

const parseRSSFeed = (content) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'text/xml');
  
  const items = xmlDoc.querySelectorAll('item');
  if (items.length === 0) {
    throw new Error('No articles found in RSS feed');
  }
  
  return Array.from(items).map((item, index) => {
    const title = item.querySelector('title')?.textContent || 'Untitled';
    const description = item.querySelector('description')?.textContent || '';
    const source = xmlDoc.querySelector('channel title')?.textContent || 'RSS Feed';
    const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
    
    return {
      id: Date.now() + index,
      title: title.trim(),
      content: description.trim(),
      source: source.trim(),
      date: new Date(pubDate).toISOString()
    };
  });
};

const parseTextFeed = (content) => {
  const trimmedContent = content.trim();
  
  // Check if it looks like a single article (starts with "Title:" or has a clear title structure)
  if (trimmedContent.startsWith('Title:') || trimmedContent.includes('Title:')) {
    // Handle "Title: ..." format
    const titleMatch = trimmedContent.match(/Title:\s*(.+?)(?:\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Article';
    const articleContent = trimmedContent.replace(/Title:\s*.+?(?:\n|$)/, '').trim();
    
    return [{
      id: Date.now(),
      title: title,
      content: articleContent || 'No content available',
      source: 'Text Feed',
      date: new Date().toISOString()
    }];
  }
  
  // Check for obvious multiple article indicators
  const hasNumberedList = /^\d+\.\s+/m.test(trimmedContent);
  const hasMultipleHeadings = (trimmedContent.match(/^[A-Z][^.!?]*$/gm) || []).length > 1;
  const hasArticleSeparators = trimmedContent.includes('---') || trimmedContent.includes('***');
  
  // If no clear multiple article indicators, treat as single article
  if (!hasNumberedList && !hasMultipleHeadings && !hasArticleSeparators) {
    const lines = trimmedContent.split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      // Use first line as title if it looks like a headline
      const firstLine = lines[0].trim();
      const isLikelyTitle = firstLine.length < 200 && 
                          !firstLine.endsWith('.') && 
                          firstLine.split(' ').length > 2;
      
      if (isLikelyTitle && lines.length > 1) {
        const remainingContent = lines.slice(1).join('\n').trim();
        return [{
          id: Date.now(),
          title: firstLine,
          content: remainingContent,
          source: 'Text Feed',
          date: new Date().toISOString()
        }];
      } else {
        // Generate title from first few words
        const words = trimmedContent.split(' ');
        const title = words.slice(0, 12).join(' ') + (words.length > 12 ? '...' : '');
        
        return [{
          id: Date.now(),
          title: title,
          content: trimmedContent,
          source: 'Text Feed',
          date: new Date().toISOString()
        }];
      }
    }
  }
  
  // Only split if there are clear indicators of multiple articles
  let sections = [];
  
  if (hasNumberedList) {
    // Split by numbered items
    sections = trimmedContent.split(/(?=^\d+\.\s+)/m).filter(section => section.trim());
  } else if (hasArticleSeparators) {
    // Split by separators
    sections = trimmedContent.split(/---+|^\*\*\*+/m).filter(section => section.trim());
  } else if (hasMultipleHeadings) {
    // Split by double newlines only if multiple headings detected
    sections = trimmedContent.split(/\n\s*\n/).filter(section => section.trim());
  }
  
  if (sections.length <= 1) {
    // Fallback: treat as single article
    const words = trimmedContent.split(' ');
    const title = words.slice(0, 12).join(' ') + (words.length > 12 ? '...' : '');
    
    return [{
      id: Date.now(),
      title: title,
      content: trimmedContent,
      source: 'Text Feed',
      date: new Date().toISOString()
    }];
  }
  
  return sections.map((section, index) => {
    const cleanSection = section.replace(/^\d+\.\s*/, '').trim();
    const lines = cleanSection.split('\n').filter(line => line.trim());
    const title = lines[0]?.trim().substring(0, 100) || `Article ${index + 1}`;
    const content = lines.length > 1 ? lines.slice(1).join('\n').trim() : cleanSection;
    
    return {
      id: Date.now() + index,
      title: title,
      content: content || cleanSection,
      source: 'Text Feed',
      date: new Date().toISOString()
    };
  });
};

// Validate and clean articles
export const validateArticles = (articles) => {
  console.log('Validating articles:', articles);
  
  const validArticles = articles.filter(article => {
    const hasTitle = article.title && article.title.trim().length > 3;
    const hasContent = article.content && article.content.trim().length > 10;
    
    console.log('Article validation:', {
      title: article.title?.substring(0, 50),
      titleLength: article.title?.length,
      contentLength: article.content?.length,
      hasTitle,
      hasContent
    });
    
    return hasTitle && hasContent;
  }).map(article => ({
    ...article,
    title: article.title.substring(0, 200), // Limit title length
    content: article.content.substring(0, 3000) // Increased content length limit
  }));
  
  console.log('Valid articles after filtering:', validArticles.length);
  return validArticles;
};