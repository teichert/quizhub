// Ported from ~/projects/canvasManagement's quizMarkdownUtils.ts (parsing
// side only). Unlike the source project, this is a lenient reader: fields
// that only matter for Canvas submission (DueAt/LockAt/UnlockAt/Password/
// AssignmentGroup/AllowedAttempts/OneQuestionAtATime/ShowCorrectAnswers) are
// simply ignored rather than required/validated, since quizhub only renders
// a quiz -- it never writes canvasManagement markdown back out.
import {
    parseQuestionMarkdownV2,
    splitTimeDirective,
} from './questionMarkdownV2';
import type { ParsedQuizV2 } from './types';

// a line of only dashes separates the settings block and each question
export const SECTION_DELIMITER = /^---[ \t]*$/;

export function splitLines(input: string): string[] {
    return input.split(/\r\n?|\n/);
}

export function parseQuizMarkdownV2(input: string): ParsedQuizV2 {
    // section 0 is the settings block, the rest are questions
    const sections: string[][] = [[]];
    for (const line of splitLines(input)) {
        if (SECTION_DELIMITER.test(line)) {
            sections.push([]);
        } else {
            sections[sections.length - 1].push(line);
        }
    }

    // a `<!-- time: N -->` here sets the allotted time for the whole quiz
    const { timeForQuestion, lines: settingsLines } = splitTimeDirective(
        sections[0]
    );

    // ShuffleAnswers and Description are the only settings quizhub renders
    const settings = settingsLines.join('\n');
    const shuffleAnswers = /^ShuffleAnswers:[ \t]*true/im.test(settings);
    const description = /^Description:[ \t]*([\s\S]*)/m.exec(settings);

    const questions = sections
        .slice(1)
        .map((section) => section.join('\n'))
        .filter((section) => section.trim().length > 0)
        .map((section) => parseQuestionMarkdownV2(section));

    return {
        shuffleAnswers,
        description: description ? description[1].trim() : '',
        timeForQuestion,
        questions,
    };
}
