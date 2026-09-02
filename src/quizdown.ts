import App from './App.svelte';
import parseQuizdown from './parser.js';
import parseQuizVersion2 from './parserV2/index.js';
import { Config } from './config.js';
import marked from './customizedMarked.js';
import type { Quiz } from './quiz';
import Toolbar from './Toolbar.svelte';

export interface Quizdown {
    register(extension: QuizdownExtension): Quizdown;
    createApp(rawQuizdown: string, node: Element, config: Config, version?: 1 | 2): App;
    parseQuizdown(rawQuizdown: string, config: Config): Quiz;
    parseQuizVersion2(rawQuizdown: string, config: Config): Quiz;
    init(config: object): void;
    getMarkedParser(): typeof marked;
    createToolbar(node: Element): Toolbar;
}

export interface QuizdownExtension {
    setup(quizdown: Quizdown): void;
}

function register(extension: QuizdownExtension): Quizdown {
    extension.setup(this as Quizdown);
    return this as Quizdown;
}

function createApp(rawQuizdown: string, node: Element, config: Config, version: 1 | 2 = 1): App {
    node.innerHTML = '';
    let root: ShadowRoot;
    if (!!node.shadowRoot) {
        //clear root if it allready exists
        root = node.shadowRoot;
        root.innerHTML = '';
    } else {
        root = node.attachShadow({ mode: 'open' });
    }

    if (!config) {
        // prevents an error for empty config
        config = new Config({});
    }

    let quiz = version === 2 ? parseQuizVersion2(rawQuizdown, config) : parseQuizdown(rawQuizdown, config);
    let app = new App({
        // https://github.com/sveltejs/svelte/pull/5870
        target: root,
        intro: false,
        props: {
            quiz: quiz,
        },
    });
    return app;
}

function init(config: object = {}): void {
    let globalConfig = new Config(config);
    if (globalConfig.startOnLoad) {
        if (typeof document !== 'undefined') {
            window.addEventListener(
                'load',
                function () {
                    let nodes = document.querySelectorAll('.quizdown');
                    for (let node of nodes) {
                        createApp(node.innerHTML, node, globalConfig);
                    }
                },
                false
            );
        }
    }
}

function getMarkedParser(): typeof marked {
    return marked;
}

function createToolbar(node: Element): Toolbar {
    node.innerHTML = '';
    let root: ShadowRoot;
    if (!!node.shadowRoot) {
        //clear root if it allready exists
        root = node.shadowRoot;
        root.innerHTML = '';
    } else {
        root = node.attachShadow({ mode: 'open' });
    }

    let toolbar = new Toolbar({
        target: root,
        props: {},
    });
    return toolbar;
}


let quizdown: Quizdown = {
    init,
    register,
    parseQuizdown,
    parseQuizVersion2,
    createApp,
    getMarkedParser,
    createToolbar,
    // createFetcher,
};

export default quizdown;
