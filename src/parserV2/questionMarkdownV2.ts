// Ported from ~/projects/canvasManagement's quizQuestionMarkdownUtils.ts
// (parsing side only -- quizhub never writes v2 markdown back out).
import { getAnswers, getQuestionType, isAnswerLine } from './answerMarkdownV2';
import { extractFeedback } from './feedbackMarkdownV2';
import type { ParsedQuestionV2 } from './types';

const POINTS_LINE = /^points:[ \t]*(\d+(?:\.\d+)?)[ \t]*$/i;

// quizhub's answer to v1's `time:` directive. An HTML comment on a line of its
// own, so canvasManagement carries it through the file untouched and Canvas
// never renders it: `<!-- time: 30 -->`.
const TIME_DIRECTIVE =
    /^[ \t]*<!--[ \t]*time:[ \t]*(\d+(?:\.\d+)?)[ \t]*-->[ \t]*$/i;

// Takes the directive lines out of a section and reports the last value seen,
// so the directive can sit anywhere in the question without becoming text.
export function splitTimeDirective(lines: string[]): {
    timeForQuestion?: number;
    lines: string[];
} {
    let timeForQuestion: number | undefined;
    const rest = lines.filter((line) => {
        const match = TIME_DIRECTIVE.exec(line);
        if (!match) return true;
        timeForQuestion = parseFloat(match[1]);
        return false;
    });
    return { timeForQuestion, lines: rest };
}

function splitPointsLine(lines: string[]): { points: number; lines: string[] } {
    const match = POINTS_LINE.exec(lines[0] || '');
    return match
        ? { points: parseFloat(match[1]), lines: lines.slice(1) }
        : { points: 1, lines };
}

// Everything before the first answer/type line, stopping at code fences so a
// fenced code block never gets mistaken for the start of the answer block.
function getLinesBeforeAnswerLines(lines: string[]): string[] {
    const result: string[] = [];
    let inFence = false;
    for (const line of lines) {
        const isFenceLine = line.trimStart().startsWith('```');
        if (!inFence && isAnswerLine(line)) break;
        result.push(line);
        if (isFenceLine) inFence = !inFence;
    }
    return result;
}

export function parseQuestionMarkdownV2(input: string): ParsedQuestionV2 {
    // the time directive comes out first: it must not be mistaken for the
    // trailing keyword line that decides essay/short_answer
    const { timeForQuestion, lines: timeless } = splitTimeDirective(
        input.trim().split('\n')
    );
    const { points, lines } = splitPointsLine(timeless);

    const questionType = getQuestionType(lines);
    // essay/short_answer are marked by a trailing keyword line that
    // getQuestionType just matched; it is not part of the question text
    const bodyLines =
        questionType === 'essay' || questionType === 'short_answer'
            ? lines.slice(0, -1)
            : lines;

    const { correctComments, incorrectComments, neutralComments, otherLines } =
        extractFeedback(getLinesBeforeAnswerLines(bodyLines));

    const { answers, matchDistractors } = getAnswers(lines, questionType);

    return {
        text: otherLines.join('\n'),
        questionType,
        points,
        timeForQuestion,
        answers,
        matchDistractors,
        correctComments,
        incorrectComments,
        neutralComments,
    };
}
