export function getDayWindow(date = new Date()) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
}

export function extractDescription(content: string): string {
    if (!content) return '';
    const words = content.split(/\s+/);
    if (words.length <= 80) {
        return words.join(' ');
    }

    let splitIndex = 110;
    let found = false;
    for (let i = Math.min(words.length - 1, 110); i >= 80; i--) {
        if (words[i].endsWith('.')) {
            splitIndex = i + 1;
            found = true;
            break;
        }
    }

    if (!found) {
        splitIndex = 100; // fallback to 100 if no full stop in range
    }

    return words.slice(0, splitIndex).join(' ');
}

export function extractKeywords(filename: string): string[] {
    return filename
        .replace(/\.[^/.]+$/, '') // remove file extension
        .split(/[\s-_]+/) // split on spaces, dashes, underscores
        .map((kw) => kw.toLowerCase())
        .filter(Boolean);
}

export function normalizeIp(ip?: string): string | undefined {
    if (!ip) return ip;

    // Handle IPv4-mapped IPv6
    if (ip.startsWith('::ffff:')) {
        return ip.replace('::ffff:', '');
    }

    return ip;
}