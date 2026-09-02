// Ported from ~/projects/canvasManagement's quizFeedbackMarkdownUtils.ts
// (extractFeedback only -- quizhub never writes v2 markdown back out).

// a question's description lines may carry feedback, prefixed by delimiter and
// continued on the following unprefixed lines
const DELIMITERS = {
    correct: '+',
    incorrect: '-',
    neutral: '...',
};

type FeedbackType = keyof typeof DELIMITERS;

export interface ExtractedFeedback {
    correctComments?: string;
    incorrectComments?: string;
    neutralComments?: string;
    otherLines: string[];
}

function feedbackTypeOf(line: string): FeedbackType | null {
    for (const type of Object.keys(DELIMITERS) as FeedbackType[]) {
        if (line.startsWith(DELIMITERS[type])) return type;
    }
    return null;
}

export function extractFeedback(lines: string[]): ExtractedFeedback {
    const comments = { correct: [], incorrect: [], neutral: [] } as Record<
        FeedbackType,
        string[]
    >;
    const otherLines: string[] = [];
    let currentType: FeedbackType | null = null;

    for (const line of lines) {
        const lineType = feedbackTypeOf(line);
        if (lineType) {
            currentType = lineType;
            comments[lineType].push(
                line.slice(DELIMITERS[lineType].length).trim()
            );
        } else if (currentType) {
            // an unprefixed line continues the feedback block above it
            comments[currentType].push(line.trim());
        } else {
            otherLines.push(line);
        }
    }

    const join = (type: FeedbackType) =>
        comments[type].filter(Boolean).join('\n') || undefined;

    return {
        correctComments: join('correct'),
        incorrectComments: join('incorrect'),
        neutralComments: join('neutral'),
        otherLines,
    };
}
