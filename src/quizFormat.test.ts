import { describe, it, expect } from 'vitest';
import { parseQuiz, readQuizSource, textParamFor } from './quizFormat';
import { Config } from './config';

const V1 = `# A quiz

## Which colour is the sky?

- [x] blue
- [ ] green
`;

const V2 = `ShuffleAnswers: false
---
Which colour is the sky?
*a) blue
b) green
`;

describe('parseQuiz', () => {
    it('reads version 1 with the quizdown parser', () => {
        const quiz = parseQuiz(V1, new Config({}), 1);
        expect(quiz.questions.map((q) => q.questionType)).toEqual([
            'SingleChoice',
        ]);
        expect(quiz.config.title).toBe('A quiz');
    });

    it('reads version 2 with the canvasManagement parser', () => {
        const quiz = parseQuiz(V2, new Config({}), 2);
        expect(quiz.questions.map((q) => q.questionType)).toEqual([
            'SingleChoice',
        ]);
    });

    it('defaults to version 1, including for an unknown version', () => {
        expect(parseQuiz(V1, new Config({})).questions).toHaveLength(1);
        expect(
            parseQuiz(V1, new Config({}), 7 as 1).questions
        ).toHaveLength(1);
    });
});

describe('readQuizSource', () => {
    it('reads the version-1 parameters and their long spellings', () => {
        expect(readQuizSource('?t=abc')).toEqual({
            version: 1,
            encodedText: 'abc',
            sourceUrl: null,
        });
        expect(readQuizSource('?source=/quiz.md')).toEqual({
            version: 1,
            encodedText: null,
            sourceUrl: '/quiz.md',
        });
    });

    it('switches to version 2 for t2/s2', () => {
        expect(readQuizSource('?t2=abc')).toEqual({
            version: 2,
            encodedText: 'abc',
            sourceUrl: null,
        });
        expect(readQuizSource('?s2=/quiz.md')).toEqual({
            version: 2,
            encodedText: null,
            sourceUrl: '/quiz.md',
        });
    });

    it('never mixes the two formats: a version-2 link ignores t/s', () => {
        expect(readQuizSource('?s2=/v2.md&t=abc')).toEqual({
            version: 2,
            encodedText: null,
            sourceUrl: '/v2.md',
        });
    });

    it('reports no quiz at all when nothing is passed', () => {
        expect(readQuizSource('')).toEqual({
            version: 1,
            encodedText: null,
            sourceUrl: null,
        });
    });
});

describe('textParamFor', () => {
    it('names the parameter a quiz of each format travels in', () => {
        expect(textParamFor(1)).toBe('t');
        expect(textParamFor(2)).toBe('t2');
    });
});
