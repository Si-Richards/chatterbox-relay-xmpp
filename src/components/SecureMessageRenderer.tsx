
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
renderer.link = ({ href, title, tokens }) => {
  const text = tokens[0]?.raw || '';
  const cleanHref = DOMPurify.sanitize(href || '', { ALLOWED_TAGS: [] });
  const cleanTitle = title ? DOMPurify.sanitize(title, { ALLOWED_TAGS: [] }) : '';
  const cleanText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  return `<a href="${cleanHref}" title="${cleanTitle}" target="_blank" rel="noopener noreferrer">${cleanText}</a>`;
};

// Override image rendering for security
renderer.image = ({ href, title, text }) => {
  const cleanHref = DOMPurify.sanitize(href || '', { ALLOWED_TAGS: [] });
  const cleanTitle = title ? DOMPurify.sanitize(title, { ALLOWED_TAGS: [] }) : '';
  const cleanText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  return `<img src="${cleanHref}" alt="${cleanText}" title="${cleanTitle}" style="max-width: 100%; height: auto;" />`;
};

marked.use({ renderer });

const parseMarkdownSafely = (text: string): string => {
  try {
    // Use the synchronous version of marked for simplicity
    const parsedMarkdown = marked(text) as string;
    
    // Then sanitize with DOMPurify with strict settings
    const sanitized = DOMPurify.sanitize(parsedMarkdown, {
      ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 'a', 'br', 'p', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'title'],
      ALLOW_DATA_ATTR: false
    });
    
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
  // Simple and safe text formatting without HTML
  let formatted = text;
  
  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not if already in bold)
  formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  formatted = formatted.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');
  
  // Sanitize the result
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i'],
    ALLOWED_ATTR: []
  });
};

export const SecureMessageRenderer: React.FC<SecureMessageRendererProps> = ({
  content,
  markdownEnabled,
  className = "text-sm break-words whitespace-pre-wrap"
}) => {
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
};
