// Ported from ~/projects/canvasManagement's quizQuestionAnswerMarkdownUtils.ts
// (parsing side only -- quizhub never writes v2 markdown back out).
import type { ParsedAnswerV2, QuestionTypeV2 } from './types';

// `a)` / `*a)` / `*)` / `)` single choice, `[ ]` / `[*]` multiple answers,
// `^` matching, `=` numerical or accepted short answer
const ANSWER_LINE = /^(\*?[a-z]?\)|\[[ *]*\]|\^|=)/;
const MULTIPLE_CHOICE_LINE = /^\*?[a-z]?\)/;
const MULTIPLE_ANSWER_LINE = /^\[[ *]*\]/;
// the part of a choice line to drop to leave just the answer text
const CHOICE_PREFIX = /^(\*?[a-z]?\)|\[[ *]*\])/;

export function isAnswerLine(line: string): boolean {
    return ANSWER_LINE.test(line.trimStart());
}

// Groups the lines from the first answer line onwards into one entry per
// answer, treating a line without an answer prefix as a continuation of the
// previous answer. Lines inside a fenced code block are never answer lines.
export function splitAnswerLinesWithMultilineSupport(
    linesAfterPoints: string[]
): string[] {
    const answerLines: string[] = [];
    let inFence = false;
    for (const line of linesAfterPoints) {
        const trimmed = line.trimStart();
        const isFenceLine = trimmed.startsWith('```');
        if (!inFence && ANSWER_LINE.test(trimmed)) {
            answerLines.push(line);
        } else if (answerLines.length > 0) {
            answerLines[answerLines.length - 1] += '\n' + line;
        }
        if (isFenceLine) inFence = !inFence;
    }
    return answerLines;
}

export function getQuestionType(linesAfterPoints: string[]): QuestionTypeV2 {
    if (linesAfterPoints.length === 0) return '';
    const lastLine = linesAfterPoints[linesAfterPoints.length - 1]
        .toLowerCase()
        .trim();
    if (lastLine === 'essay') return 'essay';
    if (lastLine === 'short answer' || lastLine === 'short_answer')
        return 'short_answer';
    if (lastLine === 'short_answer=') return 'short_answer=';
    if (lastLine.startsWith('=')) return 'numerical';

    const answerLines = splitAnswerLinesWithMultilineSupport(linesAfterPoints);
    if (answerLines.length === 0) return '';
    const firstAnswerLine = answerLines[0].trimStart();

    if (MULTIPLE_CHOICE_LINE.test(firstAnswerLine)) return 'multiple_choice';
    if (MULTIPLE_ANSWER_LINE.test(firstAnswerLine)) return 'multiple_answers';
    // "^" lines in one block are matching; blank-line-separated blocks of them
    // are multiple dropdowns, one dropdown per prompt
    if (firstAnswerLine.startsWith('^'))
        return splitIntoDropdownGroups(answerLines).length > 1
            ? 'multiple_dropdowns'
            : 'matching';

    return '';
}

// A blank (or whitespace-only) line between "^" lines starts a new dropdown
// group. splitAnswerLinesWithMultilineSupport attaches blank lines to the
// answer before them, so a group ends at any answer carrying one.
function splitIntoDropdownGroups(answerLines: string[]): string[][] {
    const groups: string[][] = [[]];
    for (const line of answerLines) {
        groups[groups.length - 1].push(line);
        const endsGroup = line
            .split('\n')
            .slice(1)
            .some((l) => l.trim() === '');
        if (endsGroup) groups.push([]);
    }
    return groups.filter((group) => group.length > 0);
}

// a line with no prompt is one of its group's distractors
function parseDropdownAnswers(answerLines: string[]): ParsedAnswerV2[] {
    return splitIntoDropdownGroups(answerLines).flatMap((group, dropdownGroup) =>
        group.map((line) => {
            const { text, matchedText } = parseMatchingAnswer(line.trimStart());
            return { correct: text !== '', text, matchedText, dropdownGroup };
        })
    );
}

// `^ prompt - match`, or `^ - distractor` for an unmatched extra option
function parseMatchingAnswer(input: string): ParsedAnswerV2 {
    const [text, ...matchedParts] = input.replace(/^\^/, '').split(' - ');
    return {
        correct: true,
        text: text.trim(),
        matchedText: matchedParts.join(' - ').trim(),
    };
}

export function parseAnswerLine(
    input: string,
    questionType: QuestionTypeV2
): ParsedAnswerV2 {
    const trimmed = input.trimStart();

    if (questionType === 'matching') {
        return parseMatchingAnswer(trimmed);
    }
    if (questionType === 'numerical' || questionType === 'short_answer=') {
        return { correct: true, text: trimmed.replace(/^=\s*/, '').trim() };
    }

    // '*a)' -> starts with '*'; '[*]' -> '*' is the 2nd character
    const isCorrect = trimmed.startsWith('*') || trimmed[1] === '*';
    return { correct: isCorrect, text: trimmed.replace(CHOICE_PREFIX, '').trim() };
}

const TYPES_WITH_ANSWERS: QuestionTypeV2[] = [
    'multiple_choice',
    'multiple_answers',
    'matching',
    'multiple_dropdowns',
    'short_answer=',
    'numerical',
];

export function getAnswers(
    linesAfterPoints: string[],
    questionType: QuestionTypeV2
): { answers: ParsedAnswerV2[]; matchDistractors: string[] } {
    if (!TYPES_WITH_ANSWERS.includes(questionType)) {
        return { answers: [], matchDistractors: [] };
    }

    // short_answer= ends with a marker line that is not one of the answers
    const lines =
        questionType === 'short_answer='
            ? linesAfterPoints.slice(0, -1)
            : linesAfterPoints;
    if (questionType === 'multiple_dropdowns') {
        return {
            answers: parseDropdownAnswers(splitAnswerLinesWithMultilineSupport(lines)),
            matchDistractors: [],
        };
    }
    const allAnswers = splitAnswerLinesWithMultilineSupport(lines).map((line) =>
        parseAnswerLine(line, questionType)
    );

    if (questionType === 'matching') {
        // an answer with no prompt is a distractor: a match option that is
        // correct for no prompt
        return {
            answers: allAnswers.filter((a) => a.text),
            matchDistractors: allAnswers
                .filter((a) => !a.text)
                .map((a) => a.matchedText),
        };
    }
    return { answers: allAnswers, matchDistractors: [] };
}
