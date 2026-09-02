import { describe, it, expect } from 'vitest';
import { parseQuestionMarkdownV2 } from './questionMarkdownV2';

describe('parseQuestionMarkdownV2', () => {
    it('defaults points to 1 when no Points line is present', () => {
        const q = parseQuestionMarkdownV2('Which events fire on click?\n[*] click\n');
        expect(q.points).toBe(1);
        expect(q.questionType).toBe('multiple_answers');
    });

    it('parses an explicit Points line', () => {
        const q = parseQuestionMarkdownV2(
            'Points: 2\nTrue or false?\n*a) true\nb) false\n'
        );
        expect(q.points).toBe(2);
        expect(q.text).toBe('True or false?');
    });

    it('keeps a fenced code block in the question text out of the answer scan', () => {
        const input = [
            'Points: 2',
            '`some type` of question',
            '',
            'with many',
            '',
            '```',
            'lines',
            '```',
            '',
            '*a) true',
            'b) false',
        ].join('\n');
        const q = parseQuestionMarkdownV2(input);
        expect(q.questionType).toBe('multiple_choice');
        expect(q.text).toContain('```\nlines\n```');
        expect(q.answers).toHaveLength(2);
    });

    it('extracts +/-/... feedback lines out of the question text', () => {
        const input = [
            'Which is bigger?',
            '+ correct feedback',
            '- incorrect feedback',
            '... always shown',
            '*a) 2',
            'b) 1',
        ].join('\n');
        const q = parseQuestionMarkdownV2(input);
        expect(q.correctComments).toBe('correct feedback');
        expect(q.incorrectComments).toBe('incorrect feedback');
        expect(q.neutralComments).toBe('always shown');
        expect(q.text).toBe('Which is bigger?');
    });

    it('leaves a line that only mentions points in the question text', () => {
        const q = parseQuestionMarkdownV2(
            'How many points: 5 or 6?\n*a) 5\nb) 6\n'
        );
        expect(q.points).toBe(1);
        expect(q.text).toBe('How many points: 5 or 6?');
    });

    it('keeps delimiter characters inside a continued feedback line', () => {
        const input = [
            'Which is bigger?',
            '- no: 1 is well-known to be smaller',
            'and 2 - as everyone knows - is bigger',
            '*a) 2',
            'b) 1',
        ].join('\n');
        const q = parseQuestionMarkdownV2(input);
        expect(q.incorrectComments).toBe(
            'no: 1 is well-known to be smaller\nand 2 - as everyone knows - is bigger'
        );
    });

    it('strips the trailing type-keyword line for essay/short_answer questions', () => {
        const essay = parseQuestionMarkdownV2('Describe the algorithm.\nessay\n');
        expect(essay.questionType).toBe('essay');
        expect(essay.text).toBe('Describe the algorithm.');

        const shortAnswer = parseQuestionMarkdownV2(
            'Name the capital.\nshort_answer\n'
        );
        expect(shortAnswer.questionType).toBe('short_answer');
        expect(shortAnswer.text).toBe('Name the capital.');
    });
});
