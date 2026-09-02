// The question-type grammar of canvasManagement's quiz markdown format
// (see ~/projects/canvasManagement's quizQuestionAnswerMarkdownUtils.ts).
export type QuestionTypeV2 =
    | 'multiple_choice'
    | 'multiple_answers'
    | 'matching'
    | 'numerical'
    | 'short_answer='
    | 'short_answer'
    | 'essay'
    | '';

export interface ParsedAnswerV2 {
    correct: boolean;
    text: string;
    // matching only: the right-hand side of `^ prompt - match`
    matchedText?: string;
}

export interface ParsedQuestionV2 {
    text: string;
    questionType: QuestionTypeV2;
    points: number;
    // seconds, from a `<!-- time: N -->` directive; absent means "carry on
    // with whatever the previous question was allotted"
    timeForQuestion?: number;
    answers: ParsedAnswerV2[];
    matchDistractors: string[];
    correctComments?: string;
    incorrectComments?: string;
    neutralComments?: string;
}

export interface ParsedQuizV2 {
    shuffleAnswers: boolean;
    description: string;
    // seconds, from a `<!-- time: N -->` directive in the settings block
    timeForQuestion?: number;
    questions: ParsedQuestionV2[];
}
