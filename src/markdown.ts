import DOMPurify from 'dompurify';
import marked from './customizedMarked';

// quizdown can be embedded in a page, where '<' and friends arrive escaped
export function htmlDecode(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html);
}

// Both quiz formats render through the one shared `marked` instance, so
// registered extensions (KaTeX, syntax highlighting) apply to either.
export function renderMarkdown(text: string): string {
    if (!text) return '';
    return sanitizeHtml(marked.parse(htmlDecode(text)) as string);
}

export function renderTokens(tokens: marked.Token[]): string {
    return sanitizeHtml(marked.parser(tokens as marked.TokensList));
}
