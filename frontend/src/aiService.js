// Load API configuration from environment variables
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_BASE_URL = process.env.REACT_APP_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';

// Debug environment variables
console.log('🔍 Environment Debug:');
console.log('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
console.log('GEMINI_API_KEY starts with:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'undefined');
console.log('All REACT_APP env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));

// Validate API key is available
if (!GEMINI_API_KEY) {
  console.error('⚠️ GEMINI API KEY NOT FOUND! Please check your .env file.');
  console.log('📝 Instructions:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Add your Gemini API key to REACT_APP_GEMINI_API_KEY');
  console.log('3. Get your API key from: https://ai.google.dev/');
} else if (GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error('⚠️ PLACEHOLDER API KEY DETECTED! Please replace with your actual API key.');
} else {
  console.log('✅ Gemini API key loaded successfully');
}

// Dynamic model finder
let workingModel = null;

// Function to reset the working model (useful when API key changes)
export const resetWorkingModel = () => {
  workingModel = null;
  console.log('Working model cache reset');
};

const findWorkingModel = async () => {
  if (workingModel) return workingModel;
  
  try {
    // Get available models from API
    const modelsData = await listAvailableModels();
    
    if (modelsData && modelsData.models) {
      const availableModels = modelsData.models.filter(model => 
        model.supportedGenerationMethods && 
        model.supportedGenerationMethods.includes('generateContent')
      );
      
      console.log('Available models for generateContent:', availableModels.map(m => m.name));
      
      // Try each available model
      for (const model of availableModels) {
        try {
          const modelName = model.name.replace('models/', '');
          const testUrl = `${GEMINI_BASE_URL}/${modelName}:generateContent`;
          
          const response = await fetch(`${testUrl}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello' }] }]
            })
          });
          
          if (response.ok) {
            workingModel = modelName;
            console.log('Found working model:', modelName);
            return modelName;
          } else {
            console.log(`Model ${modelName} returned status:`, response.status);
          }
        } catch (error) {
          console.log(`Model ${model.name} failed:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error getting available models:', error);
  }
  
  // Fallback to hardcoded models if API call fails
  const fallbackModels = [
    'gemini-1.5-pro',
    'gemini-1.5-flash', 
    'gemini-pro',
    'gemini-1.0-pro'
  ];
  
  for (const model of fallbackModels) {
    try {
      const testUrl = `${GEMINI_BASE_URL}/${model}:generateContent`;
      const response = await fetch(`${testUrl}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }]
        })
      });
      
      if (response.ok) {
        workingModel = model;
        console.log('Found working fallback model:', model);
        return model;
      }
    } catch (error) {
      console.log(`Fallback model ${model} failed:`, error.message);
    }
  }
  
  throw new Error('No working Gemini model found');
};

const callGeminiAPI = async (prompt) => {
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('🔑 No API key found in environment variables');
    throw new Error('API_KEY_MISSING');
  }
  
  if (GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.error('🔑 Placeholder API key detected - please replace with actual key');
    throw new Error('API_KEY_MISSING');
  }
  
  if (GEMINI_API_KEY.length < 20) {
    console.error('🔑 API key appears to be invalid (too short)');
    throw new Error('API_KEY_MISSING');
  }

  try {
    const model = await findWorkingModel();
    const apiUrl = `${GEMINI_BASE_URL}/${model}:generateContent`;
    
    const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Details:', errorData);
      
      // Handle quota exceeded specifically
      if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }
      
      throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

export const generateSummary = async (article) => {
  const prompt = `You are an expert health news analyst. Break this article into comprehensive subtopics based on the content depth and complexity. Generate as many subtopics as needed to cover all important aspects.

CRITICAL REQUIREMENTS:
1. Analyze the content thoroughly and create subtopics for EVERY significant point, finding, or aspect
2. For long articles, generate 10-30+ subtopics if the content supports it
3. For short articles, generate 3-8 subtopics minimum
4. Each subtopic must have a CLEAR, SPECIFIC title (not generic)
5. Each subtopic must have a 2-line TL;DR summary
6. Each subtopic must have EXACTLY 3 key takeaways
7. Cover all research findings, implications, recommendations, background, methodology, results, etc.
8. Don't limit yourself - extract maximum value from the content

CONTENT ANALYSIS APPROACH:
- Break down research methodology into subtopics
- Create separate subtopics for each major finding
- Cover implications for different groups (patients, doctors, general public)
- Include background context as subtopics
- Address limitations, future research, and recommendations
- Create subtopics for practical applications
- Cover any statistics, data points, or measurements

REQUIRED JSON FORMAT (NO other text):
{
  "subtopics": [
    {
      "title": "Clear, Specific Subtopic Title",
      "tl_dr": [
        "First line: Main finding or key insight",
        "Second line: Why it matters or what's next"
      ],
      "key_takeaways": [
        "First key takeaway - specific and actionable",
        "Second key takeaway - clear and practical",
        "Third key takeaway - valuable insight"
      ]
    }
  ]
}

TITLE EXAMPLES (be comprehensive like these):
- "Study Methodology and Participant Demographics"
- "Primary Research Findings on Heart Health"
- "Statistical Significance and Data Analysis"
- "What This Means for Your Daily Diet"
- "Warning Signs to Watch For"
- "Steps You Can Take Today"
- "How This Affects Current Treatment Options"
- "Implications for Healthcare Providers"
- "Limitations of the Current Study"
- "Future Research Directions"
- "Cost-Benefit Analysis"
- "Comparison with Previous Studies"

TL;DR GUIDELINES:
- First line: State the main finding, result, or key point
- Second line: Explain why it matters or what comes next
- Keep each line under 80 characters
- Make it conversational and engaging

TAKEAWAY GUIDELINES:
- Make each takeaway a complete, standalone insight
- Focus on practical implications and actions
- Keep each takeaway under 120 characters
- Avoid medical jargon - use everyday language
- Be specific with numbers, percentages, and data when available
- Exactly 3 takeaways per subtopic

ARTICLE TO ANALYZE:
Title: ${article.title}
Content: ${article.content}

Generate comprehensive subtopics covering ALL aspects of this content. Don't limit the number - create as many as the content supports:`;

  try {
    const response = await callGeminiAPI(prompt);
    console.log('Raw Gemini response for subtopics:', response);
    
    // Clean the response and extract JSON
    let cleanResponse = response.trim();
    
    // Remove any markdown code blocks
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    
    // Find JSON object
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed JSON:', parsed);
      
      // Handle simplified subtopics format
      if (parsed.subtopics && Array.isArray(parsed.subtopics)) {
        console.log('✅ Successfully parsed subtopics:', parsed.subtopics.length);
        
        // Validate and format subtopics
        const validatedSubtopics = parsed.subtopics
          .filter(subtopic => subtopic.title && subtopic.title.trim().length > 5)
          .map(subtopic => ({
            title: subtopic.title?.substring(0, 80) || 'Health Topic',
            tldr: Array.isArray(subtopic.tl_dr) 
              ? subtopic.tl_dr.slice(0, 2).join(' ') 
              : (subtopic.tl_dr || 'Key health information and insights'),
            keyTakeaways: (subtopic.key_takeaways || [])
              .slice(0, 3) // Exactly 3 takeaways
              .map(takeaway => typeof takeaway === 'string' ? takeaway.substring(0, 120) : String(takeaway).substring(0, 120)),
            expandedExplanation: `Learn more about ${subtopic.title?.toLowerCase() || 'this health topic'} and its implications for your health and wellness.`
          }));
        
        // Ensure we have exactly 3 takeaways for each subtopic
        validatedSubtopics.forEach(subtopic => {
          while (subtopic.keyTakeaways.length < 3) {
            const fillers = [
              'Important health information to consider',
              'Research-backed insights for better wellness',
              'Expert recommendations for informed decisions'
            ];
            subtopic.keyTakeaways.push(fillers[subtopic.keyTakeaways.length] || 'Additional health insights');
          }
        });
        
        if (validatedSubtopics.length > 0) {
          return { subtopics: validatedSubtopics };
        }
      } else {
        console.log('❌ No subtopics found in response, falling back');
      }
      
      // Fallback to old format for compatibility
      if (parsed.tl_dr && parsed.key_takeaways) {
        return {
          tldr: Array.isArray(parsed.tl_dr) ? parsed.tl_dr.join(' ') : parsed.tl_dr,
          keyTakeaways: parsed.key_takeaways.slice(0, 3).map(item => 
            typeof item === 'string' ? item.substring(0, 150) : String(item).substring(0, 150)
          )
        };
      } else if (parsed.tldr && parsed.keyTakeaways && Array.isArray(parsed.keyTakeaways)) {
        return {
          tldr: parsed.tldr.substring(0, 300),
          keyTakeaways: parsed.keyTakeaways.slice(0, 3).map(item => 
            typeof item === 'string' ? item.substring(0, 150) : String(item).substring(0, 150)
          )
        };
      }
    }
    
    throw new Error('Invalid JSON structure in response');
  } catch (error) {
    console.error('Error generating summary:', error);
    console.log('Article content length:', article.content.length);
    console.log('Article title:', article.title);
    
    // Handle API key missing
    if (error.message === 'API_KEY_MISSING') {
      return {
        subtopics: [
          {
            title: "API Key Required",
            keyTakeaways: [
              "Gemini API key not configured - check your .env file",
              "Copy .env.example to .env and add your API key", 
              "Get your free API key from https://ai.google.dev/"
            ],
            expandedExplanation: "🔑 Gemini API key is missing. Please configure your .env file with a valid API key to enable AI features."
          }
        ]
      };
    }

    // Handle quota exceeded with specific message
    if (error.message === 'QUOTA_EXCEEDED') {
      return {
        subtopics: [
          {
            title: "API Quota Exceeded",
            keyTakeaways: [
              "API quota limit reached - upgrade to paid plan for unlimited access",
              "Smart summary generated from article analysis", 
              "Full AI features will resume when quota resets"
            ],
            expandedExplanation: "⚠️ Gemini API quota exceeded. Using smart fallback summary based on article content."
          }
        ]
      };
    }
    
    // Enhanced fallback based on article content
    const sentences = article.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints = sentences.slice(0, 3).map(s => s.trim().substring(0, 120));
    
    // Create a better summary from the content
    const words = article.content.split(' ');
    const shortContent = words.slice(0, 40).join(' ') + (words.length > 40 ? '...' : '');
    
    // Create intelligent fallback subtopics from content
    console.log('Creating fallback subtopics...');
    const paragraphs = article.content.split(/\n\s*\n/).filter(p => p.trim().length > 30);
    const contentSentences = article.content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    console.log('Paragraphs found:', paragraphs.length);
    console.log('Sentences found:', contentSentences.length);
    
    const fallbackSubtopics = [];
    
    // Determine appropriate number of subtopics based on content
    const contentLength = article.content.length;
    const wordCount = article.content.split(' ').length;
    
    let targetSubtopics;
    if (wordCount < 100) {
      targetSubtopics = 3; // Short articles: 3 subtopics minimum
    } else if (wordCount < 300) {
      targetSubtopics = 6; // Medium articles: 6 subtopics  
    } else if (wordCount < 600) {
      targetSubtopics = 10; // Long articles: 10 subtopics
    } else if (wordCount < 1000) {
      targetSubtopics = 15; // Very long articles: 15 subtopics
    } else {
      targetSubtopics = Math.min(30, Math.floor(wordCount / 50)); // Extremely long: up to 30 subtopics
    }
    
    console.log(`Content has ${wordCount} words, targeting ${targetSubtopics} subtopics`);
    
    if (paragraphs.length >= targetSubtopics) {
      // Create subtopics from paragraphs
      console.log('Using paragraph-based subtopics');
      paragraphs.slice(0, targetSubtopics).forEach((paragraph, index) => {
        const words = paragraph.trim().split(' ');
        const title = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const keyPoints = sentences.slice(0, 3).map(s => s.trim().substring(0, 120));
        
        // Create more intelligent titles and takeaways
        const intelligentTitle = createIntelligentTitle(paragraph, index);
        const smartTakeaways = createSmartTakeaways(paragraph);
        
        fallbackSubtopics.push({
          title: intelligentTitle,
          tldr: createTLDR(paragraph),
          keyTakeaways: smartTakeaways.slice(0, 3), // Ensure exactly 3 takeaways
          expandedExplanation: createFriendlyExplanation(paragraph)
        });
      });
    } else if (contentSentences.length >= targetSubtopics * 2) {
      // Create subtopics from sentence groups
      console.log('Using sentence-based subtopics');
      const sentencesPerGroup = Math.max(2, Math.floor(contentSentences.length / targetSubtopics));
      
      for (let i = 0; i < contentSentences.length; i += sentencesPerGroup) {
        const chunk = contentSentences.slice(i, i + sentencesPerGroup);
        if (chunk.length === 0) break;
        
        const groupIndex = Math.floor(i / sentencesPerGroup);
        if (groupIndex >= targetSubtopics) break;
        
        const title = chunk[0]?.substring(0, 50) + '...' || `Health Aspect ${groupIndex + 1}`;
        
        fallbackSubtopics.push({
          title: title,
          tldr: chunk[0]?.substring(0, 100) + '...' || 'Health information summary',
          keyTakeaways: chunk.slice(0, 3).map(s => s.trim().substring(0, 120)),
          expandedExplanation: chunk.join('. ') + '.'
        });
      }
    } else {
      // Create artificial subtopics from content analysis
      console.log('Using content-analysis subtopics');
      const words = article.content.split(' ');
      const totalWords = words.length;
      const wordsPerSection = Math.max(30, Math.floor(totalWords / targetSubtopics));
      
      for (let i = 0; i < targetSubtopics; i++) {
        const startIndex = i * wordsPerSection;
        const endIndex = Math.min(startIndex + wordsPerSection, totalWords);
        const section = words.slice(startIndex, endIndex).join(' ');
        
        if (section.trim().length < 20) break;
        
        const sectionSentences = section.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const title = words.slice(startIndex, startIndex + 6).join(' ') + '...';
        
        fallbackSubtopics.push({
          title: title,
          tldr: sectionSentences[0]?.substring(0, 100) + '...' || 'Health topic summary',
          keyTakeaways: sectionSentences.slice(0, 3).map(s => s.trim().substring(0, 120)),
          expandedExplanation: section.substring(0, 500) + (section.length > 500 ? '...' : '')
        });
      }
    }
    
    // Ensure we have the target number of subtopics (minimum 2)
    const minSubtopics = Math.max(2, targetSubtopics);
    if (fallbackSubtopics.length < minSubtopics) {
      console.log(`Adding subtopics to reach target of ${minSubtopics}`);
      while (fallbackSubtopics.length < minSubtopics) {
        const index = fallbackSubtopics.length;
        fallbackSubtopics.push({
          title: `Health Insight ${index + 1}`,
          tldr: `Additional health information and insights from the article content.`,
          keyTakeaways: [
            "Important health information discussed",
            "Research findings and expert opinions", 
            "Recommendations for further consideration"
          ],
          expandedExplanation: `This section covers additional health information from the article. ${shortContent.substring(index * 100, (index + 1) * 100)}...`
        });
      }
    }
    
    console.log('Final fallback subtopics count:', fallbackSubtopics.length);
    
    return {
      subtopics: fallbackSubtopics
    };
  }
};

// Helper functions for better fallback content
const createIntelligentTitle = (content, index) => {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const firstSentence = sentences[0]?.trim() || '';
  
  // Extract key health terms
  const healthTerms = firstSentence.match(/\b(study|research|treatment|symptoms|causes|prevention|benefits|risks|therapy|diagnosis|patients|health|medical|clinical)\b/gi);
  
  if (healthTerms && healthTerms.length > 0) {
    const words = firstSentence.split(' ').slice(0, 6);
    return words.join(' ') + (words.length < firstSentence.split(' ').length ? '...' : '');
  }
  
  // Fallback titles based on content analysis
  const fallbackTitles = [
    'Key Health Findings',
    'What You Need to Know',
    'Important Health Information',
    'Research Insights',
    'Health Recommendations',
    'Medical Breakthrough'
  ];
  
  return fallbackTitles[index % fallbackTitles.length];
};

const createTLDR = (content) => {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const firstTwo = sentences.slice(0, 2).map(s => s.trim().substring(0, 80));
  
  if (firstTwo.length >= 2) {
    return firstTwo.join('. ') + '.';
  } else if (firstTwo.length === 1) {
    return firstTwo[0] + '. More details available in the full content.';
  }
  
  return 'Important health information with significant implications for wellness and care.';
};

const createSmartTakeaways = (content) => {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length >= 3) {
    return sentences.slice(0, 3).map(s => s.trim().substring(0, 100));
  }
  
  // Generate contextual takeaways
  const hasNumbers = /\d+/.test(content);
  const hasStudy = /study|research|trial/i.test(content);
  const hasHealth = /health|medical|treatment|symptoms/i.test(content);
  
  const takeaways = [];
  
  if (hasStudy) {
    takeaways.push('Research provides new evidence for health decisions');
  }
  if (hasNumbers) {
    takeaways.push('Statistical findings support the conclusions');
  }
  if (hasHealth) {
    takeaways.push('Direct implications for personal health and wellness');
  }
  
  // Fill remaining slots to get exactly 3
  while (takeaways.length < 3) {
    const fillers = [
      'Expert recommendations based on current evidence',
      'Important considerations for healthcare decisions',
      'Potential impact on treatment approaches'
    ];
    takeaways.push(fillers[takeaways.length - 1] || 'Additional health insights provided');
  }
  
  return takeaways.slice(0, 3); // Return exactly 3 takeaways
};

const createFriendlyExplanation = (content) => {
  const cleaned = content.substring(0, 400).replace(/\s+/g, ' ').trim();
  
  // Make it more conversational
  let friendly = cleaned;
  
  // Replace technical terms with friendlier versions
  friendly = friendly
    .replace(/\bpatients\b/gi, 'people')
    .replace(/\bsubjects\b/gi, 'participants')
    .replace(/\bclinical\b/gi, 'medical')
    .replace(/\bsignificant\b/gi, 'important')
    .replace(/\befficacy\b/gi, 'effectiveness');
  
  return friendly + (content.length > 400 ? '...' : '');
};

// Helper functions for enhancing subtopic content
const enhanceTitle = (title) => {
  if (!title || typeof title !== 'string') return 'Health Topic';
  
  // Clean and capitalize properly
  let enhanced = title.trim();
  
  // Remove common prefixes that make titles generic
  enhanced = enhanced.replace(/^(what|how|why|when|where)\s+/i, '');
  
  // Ensure proper capitalization
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  
  // Limit length
  return enhanced.substring(0, 80);
};

const enhanceTLDR = (tldr) => {
  if (!tldr) return ['Key health information provided'];
  
  if (Array.isArray(tldr)) {
    return tldr.slice(0, 1).map(item => 
      typeof item === 'string' ? item.trim().substring(0, 100) : String(item).substring(0, 100)
    );
  }
  
  if (typeof tldr === 'string') {
    const sentences = tldr.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 1) {
      return [sentences[0].trim().substring(0, 100)];
    } else {
      return [tldr.substring(0, 100)];
    }
  }
  
  return ['Health information summary'];
};

const enhanceKeyTakeaways = (takeaways) => {
  if (!takeaways || !Array.isArray(takeaways)) {
    return [
      'Important health information provided',
      'Research findings and expert insights',
      'Recommendations for further consideration'
    ];
  }
  
  const enhanced = takeaways
    .filter(item => item && typeof item === 'string' && item.trim().length > 5)
    .map(item => item.trim().substring(0, 120))
    .slice(0, 3);
  
  // Fill to 3 items if needed
  while (enhanced.length < 3) {
    const fillers = [
      'Evidence-based health recommendations',
      'Important considerations for wellness',
      'Expert insights and guidance provided'
    ];
    enhanced.push(fillers[enhanced.length] || 'Additional health insights');
  }
  
  return enhanced;
};

const enhanceExplanation = (explanation) => {
  if (!explanation || typeof explanation !== 'string') {
    return 'This section provides important health information and insights based on current research and expert recommendations.';
  }
  
  let enhanced = explanation.trim();
  
  // Make it more conversational
  enhanced = enhanced
    .replace(/\bpatients\b/gi, 'people')
    .replace(/\bsubjects\b/gi, 'participants')
    .replace(/\bclinical\b/gi, 'medical')
    .replace(/\bsignificant\b/gi, 'important')
    .replace(/\befficacy\b/gi, 'effectiveness');
  
  // Ensure reasonable length
  return enhanced.substring(0, 500) + (enhanced.length > 500 ? '...' : '');
};

export const simplifyArticle = async (article) => {
  const prompt = `Transform this health content into an engaging, easy-to-understand explanation that anyone can follow.

WRITING STYLE:
- Write like you're explaining to a smart friend over coffee
- Use "you" and "your" to make it personal
- Replace medical jargon with everyday terms
- Include relatable examples and analogies
- Keep sentences short and punchy
- Make it feel conversational, not clinical

STRUCTURE GUIDELINES:
- Start with the most important point
- Use transition words to flow smoothly
- End with something actionable or thought-provoking
- Break up long concepts into digestible pieces

JSON FORMAT REQUIRED:
{
  "friendly_rewrite": "Your engaging, conversational rewrite here"
}

CONTENT TO REWRITE:
Title: ${article.title}
Content: ${article.content}

Make this health information engaging and accessible:`;

  try {
    const response = await callGeminiAPI(prompt);
    console.log('Raw simplify response:', response);
    
    // Clean the response and extract JSON
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    
    // Find JSON object
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.friendly_rewrite) {
        return parsed.friendly_rewrite;
      }
    }
    
    // Fallback if no JSON found
    if (cleanResponse.length > 50) {
      return cleanResponse;
    }
    
    throw new Error('Response too short or invalid format');
  } catch (error) {
    console.error('Error simplifying article:', error);
    
    // Handle API key missing
    if (error.message === 'API_KEY_MISSING') {
      return `🔑 Gemini API key is missing. Please configure your .env file with a valid API key.\n\nInstructions:\n1. Copy .env.example to .env\n2. Add your Gemini API key to REACT_APP_GEMINI_API_KEY\n3. Get your API key from: https://ai.google.dev/\n\nOriginal article content:\n\n${article.content}`;
    }
    
    // Handle quota exceeded
    if (error.message === 'QUOTA_EXCEEDED') {
      return `⚠️ Gemini API quota exceeded. Here's the original article content:\n\n${article.content}\n\nTo get AI-simplified versions, you'll need to upgrade to a paid Gemini API plan or wait for the quota to reset.`;
    }
    
    // Create a better fallback using the article content
    const sentences = article.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const firstSentences = sentences.slice(0, 4).join('. ') + '.';
    
    return `Here's a summary of this article: ${firstSentences}\n\nThis article provides valuable insights about current developments in this field. While AI simplification is temporarily unavailable, the key information above captures the main points from the original content.`;
  }
};

// Function to list available models
export const listAvailableModels = async () => {
  try {
    const response = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`);
    if (!response.ok) {
      throw new Error(`Models API failed: ${response.status}`);
    }
    const data = await response.json();
    console.log('Available models response:', data);
    
    if (data.models) {
      const supportedModels = data.models.filter(model => 
        model.supportedGenerationMethods && 
        model.supportedGenerationMethods.includes('generateContent')
      );
      console.log('Models that support generateContent:', supportedModels.map(m => m.name));
      return { models: supportedModels };
    }
    return data;
  } catch (error) {
    console.error('Error listing models:', error);
    return null;
  }
};

// Quick API key validation function
export const validateAPIKey = () => {
  console.log('🔍 API Key Validation:');
  console.log('- Key exists:', !!GEMINI_API_KEY);
  console.log('- Key length:', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
  console.log('- Key preview:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 15) + '...' : 'undefined');
  
  if (!GEMINI_API_KEY) {
    return { valid: false, error: 'No API key found' };
  }
  
  if (GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return { valid: false, error: 'Placeholder API key - replace with actual key' };
  }
  
  if (GEMINI_API_KEY.length < 20) {
    return { valid: false, error: 'API key too short - check if complete' };
  }
  
  return { valid: true, message: 'API key appears valid' };
};

// Test function to check API connectivity
export const testGeminiAPI = async () => {
  try {
    // First, let's see what models are available
    console.log('Checking available models...');
    const models = await listAvailableModels();
    
    if (models && models.models) {
      console.log('Available models:', models.models.map(m => m.name));
      console.log('Full model details:', models.models);
      
      // Get the first available model that supports generateContent
      const availableModel = models.models.find(model => 
        model.supportedGenerationMethods && 
        model.supportedGenerationMethods.includes('generateContent')
      );
      
      if (availableModel) {
        console.log('Using available model:', availableModel.name);
        
        // Extract just the model name (remove 'models/' prefix if present)
        const modelName = availableModel.name.replace('models/', '');
        
        // Test this specific model
        const testUrl = `${GEMINI_BASE_URL}/${modelName}:generateContent`;
        console.log('Testing with URL:', testUrl);
        
        const response = await fetch(`${testUrl}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say hello' }] }]
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Direct test successful:', data);
          return { success: true, response: 'API is working with model: ' + modelName, models };
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Direct test failed:', response.status, errorData);
        }
      }
    }
    
    // If we get here, try the original method
    const testPrompt = 'Say hello';
    const response = await callGeminiAPI(testPrompt);
    console.log('API Test Response:', response);
    return { success: true, response: 'API is working!', models };
  } catch (error) {
    console.error('API Test Failed:', error);
    
    // Try to get available models even if the test fails
    const models = await listAvailableModels();
    if (models && models.models) {
      console.log('Available models from error handler:', models.models.map(m => m.name));
      return { success: false, error: error.message, availableModels: models.models.map(m => m.name) };
    }
    return { success: false, error: error.message, models };
  }
};

// Combined function to get both summary and friendly rewrite in one call
// Function to generate detailed explanation for subtopics
export const generateDetailedExplanation = async (subtopic, originalArticle) => {
  const prompt = `You are a health expert providing detailed, comprehensive explanations. A user wants to learn more about this specific health topic.

CONTEXT:
- Original Article: "${originalArticle.title}"
- Subtopic Focus: "${subtopic.title}"
- Brief Summary: "${subtopic.tldr}"

INSTRUCTIONS:
1. Write a detailed, comprehensive explanation (300-500 words)
2. Use clear, accessible language that anyone can understand
3. Include specific examples, analogies, or real-world applications
4. Explain the "why" and "how" behind the information
5. Add practical implications and actionable insights
6. Structure with clear paragraphs for easy reading
7. Make it engaging and informative, not dry or clinical

WRITING STYLE:
- Conversational but authoritative tone
- Use "you" and "your" to make it personal
- Include relevant examples and analogies
- Break complex concepts into digestible parts
- End with practical takeaways or next steps

JSON FORMAT REQUIRED:
{
  "detailed_explanation": "Your comprehensive, detailed explanation here"
}

Generate a thorough, engaging explanation that goes much deeper than the brief summary:`;

  try {
    const response = await callGeminiAPI(prompt);
    console.log('Raw detailed explanation response:', response);
    
    // Clean the response and extract JSON
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    
    // Find JSON object
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.detailed_explanation) {
        return parsed.detailed_explanation;
      }
    }
    
    // Fallback if no JSON found but response exists
    if (cleanResponse.length > 100) {
      return cleanResponse;
    }
    
    throw new Error('Response too short or invalid format');
  } catch (error) {
    console.error('Error generating detailed explanation:', error);
    
    // Handle quota exceeded
    if (error.message === 'QUOTA_EXCEEDED') {
      return `⚠️ Gemini API quota exceeded. Here's an enhanced explanation based on the available information:\n\n${createEnhancedFallbackExplanation(subtopic, originalArticle)}`;
    }
    
    // Enhanced fallback explanation
    return createEnhancedFallbackExplanation(subtopic, originalArticle);
  }
};

// Helper function to create enhanced fallback explanations
const createEnhancedFallbackExplanation = (subtopic, originalArticle) => {
  const baseExplanation = subtopic.expandedExplanation || subtopic.tldr || 'No explanation available';
  const keyTakeaways = subtopic.keyTakeaways || [];
  
  let enhanced = `## ${subtopic.title}\n\n`;
  
  // Add the base explanation
  enhanced += `${baseExplanation}\n\n`;
  
  // Add detailed breakdown of key takeaways
  if (keyTakeaways.length > 0) {
    enhanced += `### Key Points Explained:\n\n`;
    keyTakeaways.forEach((takeaway, index) => {
      enhanced += `**${index + 1}. ${takeaway}**\n`;
      enhanced += `This point highlights important aspects of ${subtopic.title.toLowerCase()}. Understanding this helps you make informed decisions about your health and wellness.\n\n`;
    });
  }
  
  // Add practical implications
  enhanced += `### What This Means for You:\n\n`;
  enhanced += `The information about ${subtopic.title.toLowerCase()} has practical implications for your daily health decisions. `;
  enhanced += `Consider discussing these findings with healthcare professionals who can provide personalized guidance based on your individual circumstances.\n\n`;
  
  // Add context from original article
  if (originalArticle.content && originalArticle.content.length > 100) {
    const sentences = originalArticle.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const relevantSentences = sentences.slice(0, 2).join('. ') + '.';
    enhanced += `### Additional Context:\n\n${relevantSentences}\n\n`;
  }
  
  // Add conclusion
  enhanced += `### Moving Forward:\n\n`;
  enhanced += `Stay informed about developments in this area, as research continues to evolve. `;
  enhanced += `Always consult with qualified healthcare providers for advice specific to your situation.`;
  
  return enhanced;
};

export const generateCompleteAnalysis = async (article) => {
  const prompt = `You are an AI Health News Summarizer. Your job is to process user-provided news articles and generate clean, consistent summaries suitable for a daily health news feed.

Follow these rules strictly:
1. Only summarize and simplify the content provided. Do not add new facts.
2. Output must ALWAYS follow this structure:
{
  "tl_dr": [
    "Line 1 of the TL;DR summary.",
    "Line 2 of the TL;DR summary."
  ],
  "key_takeaways": [
    "Takeaway 1",
    "Takeaway 2",
    "Takeaway 3"
  ],
  "friendly_rewrite": "A simplified, friendly, easy-to-read rewrite of the full article."
}
3. TL;DR must be exactly 2 lines.
4. Key Takeaways must be exactly 3 bullet points.
5. The friendly rewrite should keep the meaning but use light, clear, everyday language.
6. Do NOT include extra commentary or explanation outside the JSON.
7. Always return valid JSON only.

Article Title: ${article.title}
Article Content: ${article.content}

Summarize this health-related article according to the above rules:`;

  try {
    const response = await callGeminiAPI(prompt);
    console.log('Raw complete analysis response:', response);
    
    // Clean the response and extract JSON
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    
    // Find JSON object
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.tl_dr && parsed.key_takeaways && parsed.friendly_rewrite) {
        return {
          summary: {
            tldr: Array.isArray(parsed.tl_dr) ? parsed.tl_dr.join(' ') : parsed.tl_dr,
            keyTakeaways: parsed.key_takeaways.slice(0, 3).map(item => 
              typeof item === 'string' ? item.substring(0, 150) : String(item).substring(0, 150)
            )
          },
          friendlyRewrite: parsed.friendly_rewrite
        };
      }
    }
    
    throw new Error('Invalid JSON structure in response');
  } catch (error) {
    console.error('Error generating complete analysis:', error);
    throw error;
  }
};