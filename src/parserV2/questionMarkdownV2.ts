// Ported from ~/projects/canvasManagement's quizQuestionMarkdownUtils.ts
// (parsing side only -- quizhub never writes v2 markdown back out).
import { getAnswers, getQuestionType, isAnswerLine } from './answerMarkdownV2';
import { extractFeedback } from './feedbackMarkdownV2';
import type { ParsedQuestionV2 } from './types';

const POINTS_LINE = /^points:[ \t]*(\d+(?:\.\d+)?)[ \t]*$/i;

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
    const { points, lines } = splitPointsLine(input.trim().split('\n'));

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
        answers,
        matchDistractors,
        correctComments,
        incorrectComments,
        neutralComments,
    };
}
