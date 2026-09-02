/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
// ?raw hands us the file's text, so the test needs no node APIs
import demo2Markdown from '../../public/demo2.md?raw';
import parseQuizVersion2 from './index';
import { Config } from '../config';
import type { MatchingQuestion, NumericalQuestion } from '../quiz';

const SAMPLE = `ShuffleAnswers: false
OneQuestionAtATime: false
DueAt: 08/21/2023 23:59:00
AllowedAttempts: -1
Description: sample quiz
---
Points: 2
Which color is the sky?
*a) blue
b) green
---
Which events fire on click?
[*] click
[ ] hover
---
Match the animal to its family.
^ dog - canine
^ cat - feline
^ - reptile
---
What is 6 * 7?
= 42
---
Points: 3
The capital of France is...
= Paris
= paris
short_answer=
---
Name your favorite color.
short_answer
---
Explain your reasoning.
essay
`;

describe('parseQuizVersion2', () => {
    it('maps every canvasManagement question type to the matching quizhub class', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        const types = quiz.questions.map((q) => q.questionType);
        expect(types).toEqual([
            'SingleChoice',
            'MultipleChoice',
            'Matching',
            'Numerical',
            'ShortAnswer',
            'OpenResponse',
            'OpenResponse',
        ]);
    });

    it('carries the per-question Points value into maxScore, defaulting to 1', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        expect(quiz.questions[0].maxScore).toBe(2);
        expect(quiz.questions[1].maxScore).toBe(1);
        expect(quiz.questions[3].maxScore).toBe(1); // Numerical is graded like any other type
        expect(quiz.questions[4].maxScore).toBe(3);
    });

    it('zeroes maxScore only for the truly ungraded OpenResponse questions', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        expect(quiz.questions[5].maxScore).toBe(0);
        expect(quiz.questions[6].maxScore).toBe(0);
    });

    it('grades the numerical question against its exact accepted answer', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        const numerical = quiz.questions[3] as NumericalQuestion;
        numerical.response = '42';
        expect(numerical.isCorrect()).toBe(true);
        numerical.response = '41';
        expect(numerical.isCorrect()).toBe(false);
    });

    it('maps ShuffleAnswers and Description onto the quiz Config', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        expect(quiz.config.shuffleAnswers).toBe(false);
        expect(quiz.config.description).toContain('sample quiz');
    });

    it('builds matching pairs with a distractor available among the match options', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        const matching = quiz.questions[2] as MatchingQuestion;
        expect(matching.pairs).toHaveLength(2);
        expect(matching.answers).toHaveLength(3); // 2 correct options + 1 distractor
    });

    it('puts match options in prompt order, distractors last, as plain text', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        const matching = quiz.questions[2] as MatchingQuestion;
        expect(matching.answers.map((a) => a.html)).toEqual([
            'canine',
            'feline',
            'reptile',
        ]);
        expect(matching.pairs.map((p) => p.correctMatchId)).toEqual([0, 1]);
    });

    it('hides +/-/... feedback behind the hint instead of showing it up front', () => {
        const quiz = parseQuizVersion2(
            `ShuffleAnswers: false
---
Which is bigger?
+ right, 2 > 1
- no, 1 is smaller
*a) 2
b) 1
`,
            new Config({})
        );
        expect(quiz.questions[0].explanation).toBe('');
        expect(quiz.questions[0].hint).toContain('right, 2 &gt; 1');
        expect(quiz.questions[0].hint).toContain('no, 1 is smaller');
        expect(quiz.questions[0].text).toContain('Which is bigger?');
    });

    it('does not throw when an `*a)` question marks several answers correct', () => {
        const quiz = parseQuizVersion2(
            'ShuffleAnswers: false\n---\nPick some\n*a) one\n*b) two\n',
            new Config({})
        );
        expect(quiz.questions[0].questionType).toBe('MultipleChoice');
    });

    it('maps the editor cursor line onto the question that contains it', () => {
        // the live editor hands the parser a plain config object, hence the cast
        const activeQuestionFor = (activeLineNumber: number) =>
            parseQuizVersion2(SAMPLE, { activeLineNumber } as Config).config
                .activeQuestion;
        // SAMPLE's `---` lines are 6, 11 and 15
        expect(activeQuestionFor(1)).toBe(-1); // settings block: quiz intro
        expect(activeQuestionFor(8)).toBe(0);
        expect(activeQuestionFor(13)).toBe(1);
        expect(activeQuestionFor(16)).toBe(2);
    });

    it('carries the allotted time forward from question to question', () => {
        const quiz = parseQuizVersion2(
            `ShuffleAnswers: false
<!-- time: 20 -->
---
First, at the quiz-wide 20s
*a) yes
---
<!-- time: 45 -->
Second, and every question after it, at 45s
*a) yes
---
Third, still 45s
*a) yes
---
<!-- time: 5 -->
Fourth, back down to 5s
*a) yes
`,
            new Config({})
        );
        expect(
            quiz.questions.map((q) => q.allottedTimeMilliSeconds / 1000)
        ).toEqual([20, 45, 45, 5]);
    });

    it('falls back to the config default when no directive appears', () => {
        const quiz = parseQuizVersion2(SAMPLE, new Config({}));
        expect(quiz.questions[0].allottedTimeMilliSeconds).toBe(10000);
    });

    it('lets the page override the default, and the directive override that', () => {
        const withoutDirective = parseQuizVersion2(
            SAMPLE,
            new Config({ timeForQuestion: 60 })
        );
        expect(withoutDirective.questions[0].allottedTimeMilliSeconds).toBe(60000);

        const withDirective = parseQuizVersion2(
            'ShuffleAnswers: false\n<!-- time: 30 -->\n---\nA question\n*a) yes\n',
            new Config({ timeForQuestion: 60 })
        );
        expect(withDirective.questions[0].allottedTimeMilliSeconds).toBe(30000);
    });

    it('parses the shipped public/demo2.md sample without throwing', () => {
        const quiz = parseQuizVersion2(demo2Markdown, new Config({}));
        // 20s quiz-wide; 30s carries across the two rendering questions, and
        // the closing essay gets two minutes
        expect(
            quiz.questions.map((q) => q.allottedTimeMilliSeconds / 1000)
        ).toEqual([20, 20, 20, 20, 20, 20, 30, 30, 120]);
        expect(quiz.questions.map((q) => q.questionType)).toEqual([
            'SingleChoice',
            'MultipleChoice',
            'Matching',
            'Numerical',
            'ShortAnswer',
            'OpenResponse',
            'SingleChoice',
            'SingleChoice',
            'OpenResponse',
        ]);
    });
});
