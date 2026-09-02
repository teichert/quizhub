import {
    Quiz,
    BaseQuestion,
    Answer,
    MultipleChoice,
    SingleChoice,
    MatchingQuestion,
    ShortAnswerQuestion,
    NumericalQuestion,
    OpenResponseQuestion,
    Information,
} from '../quiz';
import type { NumericalAnswer } from '../quiz';
import { Config } from '../config';
import { parseQuizMarkdownV2, splitLines, SECTION_DELIMITER } from './quizMarkdownV2';
import { renderMarkdown } from './render';
import type { ParsedQuestionV2 } from './types';

// canvasManagement numerical answers: "42" (exact) or "[2, 5]" (range)
function parseNumericalAnswerText(text: string): NumericalAnswer {
    const rangeMatch = text.match(/^\[([^,]+),\s*([^\]]+)\]$/);
    if (rangeMatch) {
        return {
            type: 'range',
            min: parseFloat(rangeMatch[1].trim()),
            max: parseFloat(rangeMatch[2].trim()),
        };
    }
    return { type: 'exact', value: parseFloat(text) };
}

// Canvas shows +/-/... feedback only after submission. quizhub has no
// after-the-fact slot for question level feedback, so it goes behind the hint
// toggle -- anywhere else would spoil the answer before it is given.
function buildHint(q: ParsedQuestionV2): string {
    const parts = [
        q.correctComments,
        q.incorrectComments,
        q.neutralComments,
    ].filter(Boolean);
    return renderMarkdown(parts.join('\n\n'));
}

function buildQuestion(q: ParsedQuestionV2, options: Config): BaseQuestion {
    const text = renderMarkdown(q.text);
    const explanation = '';
    const hint = buildHint(q);

    switch (q.questionType) {
        case 'multiple_choice':
        case 'multiple_answers': {
            const answers = q.answers.map(
                (a, i) => new Answer(i, renderMarkdown(a.text), a.correct, '')
            );
            // SingleChoice rejects more than one correct answer, so an `*a)`
            // question that marks several (an authoring slip, or a half-typed
            // question in the live editor) renders as multiple answers rather
            // than throwing and blanking the whole quiz
            const isSingle =
                q.questionType === 'multiple_choice' &&
                answers.filter((a) => a.correct).length <= 1;
            const Choice = isSingle ? SingleChoice : MultipleChoice;
            return new Choice(text, explanation, hint, answers, options);
        }
        case 'matching': {
            // match options keep their raw text: they are rendered inside
            // <option> elements, which cannot show markup. Distractors are
            // extra options that are the correct match for no prompt.
            const matchOptions = q.answers
                .map((a) => a.matchedText)
                .concat(q.matchDistractors)
                .map((matchText, id) => new Answer(id, matchText, false, ''));
            const pairs = q.answers.map((a, i) => ({
                promptHtml: renderMarkdown(a.text),
                correctMatchId: i,
            }));
            return new MatchingQuestion(
                text,
                explanation,
                hint,
                matchOptions,
                pairs,
                options
            );
        }
        case 'short_answer=': {
            // kept raw (not rendered to HTML): compared verbatim against the
            // user's typed response, never displayed
            const answers = q.answers.map((a, i) => new Answer(i, a.text, true, ''));
            return new ShortAnswerQuestion(text, explanation, hint, answers, options);
        }
        case 'numerical': {
            const acceptedAnswers = q.answers.map((a) => parseNumericalAnswerText(a.text));
            return new NumericalQuestion(text, explanation, hint, acceptedAnswers, options);
        }
        case 'short_answer':
            return new OpenResponseQuestion(text, explanation, hint, options, 'text');
        case 'essay':
            return new OpenResponseQuestion(text, explanation, hint, options, 'essay');
        default:
            return new Information(text, explanation, hint, [], options);
    }
}

function configForQuestion(base: Config, points: number): Config {
    const config = new Config(base);
    config.pointsForQuestion = points;
    return config;
}

// live editor: the question the cursor's line belongs to, or -1 for the
// settings block (which shows the quiz intro)
function findActiveQuestion(rawMarkdown: string, activeLineNumber: number): number {
    return (
        splitLines(rawMarkdown)
            .slice(0, activeLineNumber)
            .filter((line) => SECTION_DELIMITER.test(line)).length - 1
    );
}

function parseQuizVersion2(rawMarkdown: string, globalConfig: Config): Quiz {
    const parsed = parseQuizMarkdownV2(rawMarkdown);

    let quizConfig = new Config(globalConfig);
    quizConfig.shuffleAnswers = parsed.shuffleAnswers;
    if (parsed.description) {
        quizConfig.description = renderMarkdown(parsed.description);
    }
    if (globalConfig.activeLineNumber) {
        quizConfig.activeQuestion = findActiveQuestion(
            rawMarkdown,
            globalConfig.activeLineNumber
        );
    }

    const questions = parsed.questions.map((q) =>
        buildQuestion(q, configForQuestion(quizConfig, q.points))
    );

    return new Quiz(questions, quizConfig);
}

export default parseQuizVersion2;
