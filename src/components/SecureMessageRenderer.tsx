
import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface SecureMessageRendererProps {
  content: string;
  markdownEnabled: boolean;
  className?: string;
}

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true
});

// Custom renderer to limit allowed HTML elements
const renderer = new marked.Renderer();

// Override link rendering to add security attributes
renderer.link = (token: any) => {
  const text = token.text || '';
  const cleanHref = DOMPurify.sanitize(token.href || '', { ALLOWED_TAGS: [] });
  const cleanTitle = token.title ? DOMPurify.sanitize(token.title, { ALLOWED_TAGS: [] }) : '';
  const cleanText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  return `<a href="${cleanHref}" title="${cleanTitle}" target="_blank" rel="noopener noreferrer">${cleanText}</a>`;
};

// Override image rendering for security
renderer.image = (token: any) => {
  const cleanHref = DOMPurify.sanitize(token.href || '', { ALLOWED_TAGS: [] });
  const cleanTitle = token.title ? DOMPurify.sanitize(token.title, { ALLOWED_TAGS: [] }) : '';
  const cleanText = DOMPurify.sanitize(token.text, { ALLOWED_TAGS: [] });
  return `<img src="${cleanHref}" alt="${cleanText}" title="${cleanTitle}" style="max-width: 100%; height: auto;" />`;
};

marked.use({ renderer });

const parseMarkdownSafely = (text: string): string => {
  try {
    console.log('Parsing markdown text:', text.substring(0, 100));
    const parsedMarkdown = marked(text) as string;
    
    // Then sanitize with DOMPurify with strict settings
    const sanitized = DOMPurify.sanitize(parsedMarkdown, {
      ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 'a', 'br', 'p', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'title'],
      ALLOW_DATA_ATTR: false
    });
    
    console.log('Markdown parsed successfully');
    return sanitized;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    // Fallback to plain text with basic HTML escaping
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
};

const parseBasicFormattingSafely = (text: string): string => {
  try {
    console.log('Parsing basic formatting for text:', text.substring(0, 100));
    let formatted = text;
    
    // Bold: **text** or __text__ - using safer regex without lookbehind
    formatted = formatted.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_ - avoiding conflicts with bold formatting
    // First handle single asterisks that aren't part of double asterisks
    formatted = formatted.replace(/(\s|^)\*([^*\s][^*]*?[^*\s])\*(\s|$)/g, '$1<em>$2</em>$3');
    formatted = formatted.replace(/(\s|^)_([^_\s][^_]*?[^_\s])_(\s|$)/g, '$1<em>$2</em>$3');
    
    // Sanitize the result
    const sanitized = DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['strong', 'em', 'b', 'i'],
      ALLOWED_ATTR: []
    });
    
    console.log('Basic formatting parsed successfully');
    return sanitized;
  } catch (error) {
    console.error('Error parsing basic formatting:', error);
    // Return escaped text as fallback
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
};

export const SecureMessageRenderer: React.FC<SecureMessageRendererProps> = ({
  content,
  markdownEnabled,
  className = "text-sm break-words whitespace-pre-wrap"
}) => {
  try {
    console.log('SecureMessageRenderer rendering with markdownEnabled:', markdownEnabled);
    
    // Sanitize input first
    const sanitizedContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
    
    const processedContent = markdownEnabled 
      ? parseMarkdownSafely(sanitizedContent)
      : parseBasicFormattingSafely(sanitizedContent);

    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    );
  } catch (error) {
    console.error('SecureMessageRenderer error:', error);
    // Fallback to plain text rendering
    return (
      <div className={className}>
        {content}
      </div>
    );
  }
};
