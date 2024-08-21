import * as marked from 'marked';
import { parse as parseYaml } from 'yaml';

// customize tokenizer to include yaml like header blocks
const tokenizer: marked.TokenizerObject = {
    // type definition does no allow custom token type
    // @ts-ignore
    hr(src) {
        //adapted from https://github.com/markedjs/marked/blob/master/src/rules.js
        const regex = RegExp(
            /^ {0,3}(-{3,}(?=[^-\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~-]* *(?:\n+|$)|$)/
        );
        const cap = regex.exec(src);
        if (cap) {
            let data = {};
            try {
                data = parseYaml(cap[3], {});
            } catch (error) {
                console.error('Error parsing YAML frontmatter:', error.message);
            }
            return {
                type: 'options',
                raw: cap[0],
                data: data,
            };
        }
    },
};

// customize renderer
const renderer: marked.RendererObject = {
    //disable blockquote, we use this for hints
    blockquote(text) {
        return text;
    },
    //disable heading, we only use h3 headings
    heading(text) {
        return text;
    },
};

// referenced example: https://marked.js.org/using_pro#extensions
function makeValueDirectiveExtension(name: string) {
    return {
        name: name,
        level: 'block',
        start(src) { return src.match(/\n/)?.index; },    // Hint to Marked.js to stop and check for a match
        tokenizer(src, tokens) {
            const rule = new RegExp("^\\s*" + name + ":\\s*(\\d+\\.?\\d*)", "i");
            const match = rule.exec(src);
            if (match) {
                return {
                    type: name,
                    raw: match[0],
                    value: Number(match[1]),
                };
            }
        },
        renderer(token) {
            return "";
        },
        childTokens: [],                 // Any child tokens to be visited by walkTokens
    };
}

marked.use({ extensions: [makeValueDirectiveExtension("time"), makeValueDirectiveExtension("points")] });

marked.use({
    renderer: renderer,
    // type definition does not allow custom token type
    // @ts-ignore
    tokenizer: tokenizer,
});

export default marked;
