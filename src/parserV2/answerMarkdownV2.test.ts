import { describe, it, expect } from 'vitest';
import { getQuestionType, getAnswers, isAnswerLine } from './answerMarkdownV2';

describe('getQuestionType', () => {
    it('detects multiple_choice from a)/*a) prefixes', () => {
        expect(getQuestionType(['question text', '*a) true', 'b) false'])).toBe(
            'multiple_choice'
        );
    });

    it('detects multiple_answers from [ ]/[*] prefixes', () => {
        expect(
            getQuestionType(['question text', '[*] click', '[ ] hover'])
        ).toBe('multiple_answers');
    });

    it('detects matching from ^ prefixes', () => {
        expect(getQuestionType(['question text', '^ dog - canine'])).toBe(
            'matching'
        );
    });

    it('detects numerical from a trailing = line', () => {
        expect(getQuestionType(['question text', '= 42'])).toBe('numerical');
    });

    it('detects short_answer= from a trailing marker line', () => {
        expect(
            getQuestionType(['question text', '= Paris', '= paris', 'short_answer='])
        ).toBe('short_answer=');
    });

    it('detects bare short_answer from a trailing keyword line', () => {
        expect(getQuestionType(['question text', 'short answer'])).toBe(
            'short_answer'
        );
        expect(getQuestionType(['question text', 'short_answer'])).toBe(
            'short_answer'
        );
    });

    it('detects essay from a trailing keyword line', () => {
        expect(getQuestionType(['question text', 'essay'])).toBe('essay');
    });

    it('falls back to the empty type when nothing matches', () => {
        expect(getQuestionType(['just some text, no answers'])).toBe('');
        expect(getQuestionType([])).toBe('');
    });

    it('does not mistake an answer-like line inside a fenced code block for the answer start', () => {
        const lines = [
            'What does this print?',
            '```',
            'a) not an answer, just code',
            '```',
            '*a) real answer',
            'b) other answer',
        ];
        expect(getQuestionType(lines)).toBe('multiple_choice');
    });
});

describe('getAnswers', () => {
    it('parses multiple_choice answers with one correct', () => {
        const { answers } = getAnswers(['q', '*a) true', 'b) false'], 'multiple_choice');
        expect(answers).toEqual([
            { correct: true, text: 'true' },
            { correct: false, text: 'false' },
        ]);
    });

    it('parses multiple_answers with several correct', () => {
        const { answers } = getAnswers(
            ['q', '[*] click', '[ ] hover', '[*] scroll'],
            'multiple_answers'
        );
        expect(answers.map((a) => a.correct)).toEqual([true, false, true]);
        expect(answers.map((a) => a.text)).toEqual(['click', 'hover', 'scroll']);
    });

    it('separates matching pairs from distractors', () => {
        const { answers, matchDistractors } = getAnswers(
            ['q', '^ dog - canine', '^ cat - feline', '^ - reptile'],
            'matching'
        );
        expect(answers).toEqual([
            { correct: true, text: 'dog', matchedText: 'canine' },
            { correct: true, text: 'cat', matchedText: 'feline' },
        ]);
        expect(matchDistractors).toEqual(['reptile']);
    });

    it('keeps a " - " inside the matched text of a matching answer', () => {
        const { answers } = getAnswers(
            ['q', '^ dog - a canine - and a good one'],
            'matching'
        );
        expect(answers[0].matchedText).toBe('a canine - and a good one');
    });

    it('parses a numerical exact answer', () => {
        const { answers } = getAnswers(['q', '= 42'], 'numerical');
        expect(answers).toEqual([{ correct: true, text: '42' }]);
    });

    it('parses a numerical range answer', () => {
        const { answers } = getAnswers(['q', '= [2, 5]'], 'numerical');
        expect(answers).toEqual([{ correct: true, text: '[2, 5]' }]);
    });

    it('collects accepted answers for short_answer=, excluding the trailing marker line', () => {
        const { answers } = getAnswers(
            ['q', '= Paris', '= paris', 'short_answer='],
            'short_answer='
        );
        expect(answers).toEqual([
            { correct: true, text: 'Paris' },
            { correct: true, text: 'paris' },
        ]);
    });

    it('returns no answers for essay/short_answer/empty types', () => {
        expect(getAnswers(['q', 'essay'], 'essay')).toEqual({
            answers: [],
            matchDistractors: [],
        });
        expect(getAnswers(['q', 'short answer'], 'short_answer')).toEqual({
            answers: [],
            matchDistractors: [],
        });
        expect(getAnswers(['q'], '')).toEqual({ answers: [], matchDistractors: [] });
    });

    it('supports multiline answers, appending continuation lines to the previous answer', () => {
        const { answers } = getAnswers(
            ['q', '*a) true', 'b) false', '', '   endline'],
            'multiple_choice'
        );
        expect(answers[1].text).toBe('false\n\n   endline');
    });
});

describe('isAnswerLine', () => {
    it('recognizes each valid delimiter', () => {
        expect(isAnswerLine('a) x')).toBe(true);
        expect(isAnswerLine('b) x')).toBe(true);
        expect(isAnswerLine(') x')).toBe(true);
        expect(isAnswerLine('*a) x')).toBe(true);
        expect(isAnswerLine('[ ] x')).toBe(true);
        expect(isAnswerLine('[*] x')).toBe(true);
        expect(isAnswerLine('^ x')).toBe(true);
        expect(isAnswerLine('= x')).toBe(true);
        expect(isAnswerLine('not an answer')).toBe(false);
    });
});
