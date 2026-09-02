import DOMPurify from 'dompurify';
import marked from '../customizedMarked';

function htmlDecode(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

// Uses quizhub's shared `marked` instance so registered extensions (KaTeX,
// syntax highlighting) apply to version-2 content the same way they do to v1.
export function renderMarkdown(text: string): string {
    if (!text) return '';
    return DOMPurify.sanitize(marked.parse(htmlDecode(text)) as string);
}
