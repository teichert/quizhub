import type { Quiz } from './quiz';
import type { Config } from './config';
import parseQuizdown from './parser';
import parseQuizVersion2 from './parserV2/index';

// 1 = quizdown markdown, 2 = canvasManagement markdown (see docs/syntax.md)
export type QuizFormatVersion = 1 | 2;

const PARSERS: Record<QuizFormatVersion, (raw: string, config: Config) => Quiz> = {
    1: parseQuizdown,
    2: parseQuizVersion2,
};

export function parseQuiz(
    rawMarkdown: string,
    config: Config,
    version: QuizFormatVersion = 1
): Quiz {
    return (PARSERS[version] || PARSERS[1])(rawMarkdown, config);
}

// Each format has its own query parameters, so a link says both where the
// quiz is and how to read it: ?t=/?s= for version 1, ?t2=/?s2= for version 2.
export interface QuizSource {
    version: QuizFormatVersion;
    // base64-encoded markdown, or null when the quiz lives at `sourceUrl`
    encodedText: string | null;
    sourceUrl: string | null;
}

export function readQuizSource(search: string): QuizSource {
    const params = new URLSearchParams(search);
    const firstOf = (...names: string[]) =>
        names.map((name) => params.get(name)).find(Boolean) || null;

    const encodedText = firstOf('text2', 't2');
    const sourceUrl = firstOf('source2', 's2');
    // a version-2 link never falls back to the version-1 parameters: mixing
    // the two would mean reading one format's quiz with the other's parser
    if (encodedText || sourceUrl) {
        return { version: 2, encodedText, sourceUrl };
    }
    return {
        version: 1,
        encodedText: firstOf('text', 't'),
        sourceUrl: firstOf('source', 's'),
    };
}

// the parameter that carries a quiz of this format, for building links
export function textParamFor(version: QuizFormatVersion): string {
    return version === 2 ? 't2' : 't';
}
