/**
 * Decodes common HTML entities like &#39;, &quot;, &amp; etc.
 */
export const decodeHtmlEntities = (text: string | null | undefined): string => {
    if (!text) return '';

    return text
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/&nbsp;/g, ' ');
};
