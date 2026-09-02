import { describe, it, expect } from 'vitest';
import {
    Answer,
    Quiz,
    ShortAnswerQuestion,
    MatchingQuestion,
    NumericalQuestion,
    OpenResponseQuestion,
} from './quiz';
import { Config } from './config';

function makeConfig(points = 1): Config {
    return new Config({ pointsForQuestion: points, timeForQuestion: 10 });
}

describe('ShortAnswerQuestion', () => {
    it('accepts a case-insensitive, trimmed match against any accepted answer', () => {
        const answers = [new Answer(0, 'Paris', true, ''), new Answer(1, 'paris', true, '')];
        const q = new ShortAnswerQuestion('capital of France?', '', '', answers, makeConfig());
        q.response = '  PARIS  ';
        expect(q.isCorrect()).toBe(true);
    });

    it('rejects a response that matches none of the accepted answers', () => {
        const answers = [new Answer(0, 'Paris', true, '')];
        const q = new ShortAnswerQuestion('capital of France?', '', '', answers, makeConfig());
        q.response = 'London';
        expect(q.isCorrect()).toBe(false);
    });

    it('ignores answers not flagged correct when checking the response', () => {
        const answers = [new Answer(0, 'Paris', false, '')];
        const q = new ShortAnswerQuestion('capital of France?', '', '', answers, makeConfig());
        q.response = 'Paris';
        expect(q.isCorrect()).toBe(false);
    });
});

describe('NumericalQuestion', () => {
    it('accepts an exact match', () => {
        const q = new NumericalQuestion(
            'what is 6 * 7?',
            '',
            '',
            [{ type: 'exact', value: 42 }],
            makeConfig()
        );
        q.response = '42';
        expect(q.isCorrect()).toBe(true);
    });

    it('rejects a value that does not match the exact answer', () => {
        const q = new NumericalQuestion(
            'what is 6 * 7?',
            '',
            '',
            [{ type: 'exact', value: 42 }],
            makeConfig()
        );
        q.response = '41';
        expect(q.isCorrect()).toBe(false);
    });

    it('accepts any value within a range answer, inclusive of the bounds', () => {
        const q = new NumericalQuestion(
            'pick a number between 2 and 5',
            '',
            '',
            [{ type: 'range', min: 2, max: 5 }],
            makeConfig()
        );
        q.response = '2';
        expect(q.isCorrect()).toBe(true);
        q.response = '5';
        expect(q.isCorrect()).toBe(true);
        q.response = '3.5';
        expect(q.isCorrect()).toBe(true);
    });

    it('rejects a value outside a range answer', () => {
        const q = new NumericalQuestion(
            'pick a number between 2 and 5',
            '',
            '',
            [{ type: 'range', min: 2, max: 5 }],
            makeConfig()
        );
        q.response = '6';
        expect(q.isCorrect()).toBe(false);
    });

    it('rejects a non-numeric response instead of throwing', () => {
        const q = new NumericalQuestion(
            'what is 6 * 7?',
            '',
            '',
            [{ type: 'exact', value: 42 }],
            makeConfig()
        );
        q.response = 'not a number';
        expect(q.isCorrect()).toBe(false);
    });

    it('is a normally scored question, unlike OpenResponseQuestion', () => {
        const q = new NumericalQuestion(
            'what is 6 * 7?',
            '',
            '',
            [{ type: 'exact', value: 42 }],
            makeConfig(3)
        );
        expect(q.maxScore).toBe(3);
    });
});

describe('MatchingQuestion', () => {
    function makeMatching() {
        const matchOptions = [
            new Answer(0, 'canine', false, ''),
            new Answer(1, 'feline', false, ''),
            new Answer(2, 'reptile', false, ''), // distractor
        ];
        const pairs = [
            { promptHtml: 'dog', correctMatchId: 0 },
            { promptHtml: 'cat', correctMatchId: 1 },
        ];
        return new MatchingQuestion('match these', '', '', matchOptions, pairs, makeConfig());
    }

    it('is solved when every prompt is matched to its correct option', () => {
        const q = makeMatching();
        q.selections = [0, 1];
        expect(q.isCorrect()).toBe(true);
    });

    it('is not solved when a pair is mismatched', () => {
        const q = makeMatching();
        q.selections = [1, 0];
        expect(q.isCorrect()).toBe(false);
    });

    it('is not solved if a distractor is selected', () => {
        const q = makeMatching();
        q.selections = [2, 1];
        expect(q.isCorrect()).toBe(false);
    });

    it('resets selections to null for every pair', () => {
        const q = makeMatching();
        q.selections = [0, 1];
        q.reset();
        expect(q.selections).toEqual([null, null]);
    });
});

describe('OpenResponseQuestion', () => {
    it('uses a textarea for essays and a single-line input otherwise', () => {
        expect(
            new OpenResponseQuestion('q', '', '', makeConfig(), 'essay').inputMode
        ).toBe('essay');
        expect(
            new OpenResponseQuestion('q', '', '', makeConfig(), 'text').inputMode
        ).toBe('text');
    });

    it('is always "correct" but never contributes to the score', () => {
        const q = new OpenResponseQuestion('explain yourself', '', '', makeConfig(5), 'essay');
        expect(q.maxScore).toBe(0);
        q.response = 'anything at all';
        expect(q.isCorrect()).toBe(true);
        q.responseTimeMilliSeconds = 1000;
        expect(q.computeQuizhubStyleScore()).toBe(0);
    });

    it('resets its response text', () => {
        const q = new OpenResponseQuestion('explain yourself', '', '', makeConfig(), 'text');
        q.response = 'something';
        q.reset();
        expect(q.response).toBe('');
    });
});

describe('Quiz.evaluate', () => {
    it('adds up only the questions that are graded and solved', () => {
        const config = makeConfig(4);
        const solved = new NumericalQuestion(
            'what is 6 * 7?',
            '',
            '',
            [{ type: 'exact', value: 42 }],
            config
        );
        solved.response = '42';
        const unsolved = new NumericalQuestion(
            'what is 6 * 8?',
            '',
            '',
            [{ type: 'exact', value: 48 }],
            config
        );
        unsolved.response = '0';
        const ungraded = new OpenResponseQuestion('why?', '', '', config, 'essay');
        ungraded.response = 'because';

        const quiz = new Quiz([solved, unsolved, ungraded], config);
        // answered instantly, so the solved question scores its full maxScore
        expect(quiz.evaluate()).toBe(4);
        expect(quiz.maxScoreTotal()).toBe(8);
        expect([solved.solved, unsolved.solved]).toEqual([true, false]);
    });
});
