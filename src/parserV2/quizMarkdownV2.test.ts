import { describe, it, expect } from 'vitest';
import { parseQuizMarkdownV2 } from './quizMarkdownV2';

describe('parseQuizMarkdownV2', () => {
    it('parses ShuffleAnswers and a multi-line Description from the settings block', () => {
        const input = `ShuffleAnswers: true
OneQuestionAtATime: false
DueAt: 08/21/2023 23:59:00
Description: line one
line two
---
a) one
b) two
`;
        const quiz = parseQuizMarkdownV2(input);
        expect(quiz.shuffleAnswers).toBe(true);
        expect(quiz.description).toBe('line one\nline two');
        expect(quiz.questions).toHaveLength(1);
    });

    it('reads ShuffleAnswers however it is capitalised or spaced', () => {
        for (const line of [
            'ShuffleAnswers: true',
            'ShuffleAnswers:true',
            'shuffleanswers: TRUE',
        ]) {
            expect(parseQuizMarkdownV2(`${line}\n---\na) one\n`).shuffleAnswers).toBe(
                true
            );
        }
        expect(
            parseQuizMarkdownV2('ShuffleAnswers: False\n---\na) one\n').shuffleAnswers
        ).toBe(false);
    });

    it('defaults ShuffleAnswers to false when missing', () => {
        const input = `---
a) one
`;
        const quiz = parseQuizMarkdownV2(input);
        expect(quiz.shuffleAnswers).toBe(false);
    });

    it('splits multiple questions on the --- delimiter', () => {
        const input = `ShuffleAnswers: false
---
Which events fire on click?
[*] click
---
Points: 2
True or false?
*a) true
b) false
`;
        const quiz = parseQuizMarkdownV2(input);
        expect(quiz.questions).toHaveLength(2);
        expect(quiz.questions[0].questionType).toBe('multiple_answers');
        expect(quiz.questions[1].questionType).toBe('multiple_choice');
        expect(quiz.questions[1].points).toBe(2);
    });

    it('ignores blank trailing sections', () => {
        const input = `---
a) one
---

`;
        const quiz = parseQuizMarkdownV2(input);
        expect(quiz.questions).toHaveLength(1);
    });

    it('reads a `<!-- time: N -->` directive from the settings block', () => {
        const input = `ShuffleAnswers: true
<!-- time: 25 -->
Description: line one
---
a) one
b) two
`;
        const quiz = parseQuizMarkdownV2(input);
        expect(quiz.timeForQuestion).toBe(25);
        // the directive must not end up inside the description
        expect(quiz.description).toBe('line one');
        expect(quiz.shuffleAnswers).toBe(true);
    });

    it('leaves timeForQuestion unset when no directive is present', () => {
        const quiz = parseQuizMarkdownV2('ShuffleAnswers: false\n---\na) one\n');
        expect(quiz.timeForQuestion).toBeUndefined();
    });

    it('only splits on a line that is nothing but dashes', () => {
        const input = [
            'ShuffleAnswers: false',
            '---',
            'What does `--- ` mean?',
            'It is not a separator when text---follows it.',
            '*a) a separator',
            'b) something else',
        ].join('\n');
        const quiz = parseQuizMarkdownV2(input);
        expect(quiz.questions).toHaveLength(1);
        expect(quiz.questions[0].answers).toHaveLength(2);
    });

    it('splits sections correctly for CRLF line endings', () => {
        const input = [
            'ShuffleAnswers: true',
            'Description: line one',
            '---',
            'a) one',
            'b) two',
            '---',
            '[*] click',
            '',
        ].join('\r\n');
        const quiz = parseQuizMarkdownV2(input);
        expect(quiz.shuffleAnswers).toBe(true);
        expect(quiz.description).toBe('line one');
        expect(quiz.questions).toHaveLength(2);
        expect(quiz.questions[0].questionType).toBe('multiple_choice');
        expect(quiz.questions[1].questionType).toBe('multiple_answers');
    });
});
