

import type {Options, PathInput, PathToken} from "../interfaces/types.ts";

export class PathParser {

    /**
     * @param {string}str in parse function
     * @return {Array}
     * */
    private static readonly PATH_REGEXP = new RegExp([
        '(\\\\.)',
        '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    parse(str: string): PathToken[] {
        const tokens: PathToken[] = [];
        let match;

        PathParser.PATH_REGEXP.lastIndex = 0;

        while ((match = PathParser.PATH_REGEXP.exec(str)) !== null) {
            tokens.push({
                path: match[0],
                prefix: match[2] || '',
                name: match[3] || match[4],
                delimiter: match[2] || '/',
                optional: match[5] === '?' || match[5] === '*',
                repeat: match[5] === '*' || match[5] === '+',
                partial: false,
                asterisk: match[6]
            });
        }

        return tokens;
    }
}

interface PathSegment {
    generateSegment(value: any): string;
}

class LiteralSegment implements PathSegment {
    private readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    generateSegment(): string {
        return this.value;
    }
}

class ParameterSegment implements PathSegment {
    private readonly token: Partial<PathToken>;

    constructor(token: Partial<PathToken>) {
        this.token = token;
    }

    generateSegment(value: any): string {
        if (value == null) {
            if (this.token.optional) {
                return '';
            } else {
                throw new TypeError(`Expected "${this.token.name}" to be defined`);
            }
        }

        const segment = encodeURIComponent(value);

        if (!this.isSegmentValid(segment)) {
            throw new TypeError(`Expected "${this.token.name}" to match "${this.token.delimiter}", but received "${segment}"`);
        }

        return this.token.prefix + segment;
    }

    private isSegmentValid(segment: string): boolean {
        const regex = new RegExp(`^${this.token.delimiter}$`);
        return regex.test(segment);
    }
}

export class PathGenerator {
    private readonly segments: PathSegment[];

    constructor(tokens: Partial<PathToken>[]) {
        this.segments = tokens.map(token => {
            return new ParameterSegment(token);
        });
    }

    generatePath(obj: Record<string, any>): string {
        let path = '';

        for (const segment of this.segments) {
            //@ts-ignore
            path += segment.generateSegment(obj[segment.name]);
        }

        return path;
    }
}

export const  regexpToRegexp =(path: RegExp, keys: Partial<PathToken>[]): RegExp => {
    // Use a negative lookahead to match only capturing groups.
    const groups = path.source.match(/\((?!\?)/g);

    if (groups) {
        for (let i = 0; i < groups.length; i++) {
            keys.push({
                name: i,
                prefix: undefined,
                delimiter: undefined,
                optional: false,
                repeat: false,
                pattern: null
            });
        }
    }

    return attachKeys(path, keys);
}

/**
 * Escape special characters in a regular expression string.
 *
 * @param {string} str - The input string.
 * @returns {string} - The escaped string.
 */
export const escapeString =(str: string): string  =>{
    return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
}

/**
 * Escape special characters in a capturing group.
 *
 * @param {string} group - The input capturing group string.
 * @returns {string} - The escaped capturing group string.
 */
export const escapeGroup =(group: string): string=> {
    return group.replace(/([=!:$\/()])/g, '\\$1');
}

/**
 * Attach keys as a property of the regular expression.
 *
 * @param {RegExp} re - The regular expression.
 * @param {string[]} keys - The keys to attach.
 * @returns {RegExp} - The modified regular expression with attached keys.
 */
export const attachKeys =(re: any, keys: Partial<PathToken>[]): RegExp =>{
    re.keys = keys;
    return re;
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
const  arrayToRegexp =(path: (string | RegExp)[], keys: Partial<PathToken>[], options: Options): RegExp => {
    const parts: string[] = [];

    for (let i = 0; i < path.length; i++) {
        parts.push(pathToRegexp(path[i], keys, options).source);
    }

    const regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

    return attachKeys(regexp, keys);
}

const  flags =(options?: Options): string =>{
    return options && options.sensitive ? '' : 'i';
}

function stringToRegexp(path: string, keys: Partial<PathToken>[], options: Options): RegExp {
    const parser = new PathParser()
    const tokens = parser.parse(path);
    const re = tokensToRegExp(tokens, options);

    // Attach keys back to the regexp.
    for (let i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] !== 'string') {
            keys.push(tokens[i]);
        }
    }

    return attachKeys(re, keys);
}

class RouteRegExpBuilder {
    private route: string = '';

    constructor(private tokens: (string | Partial<PathToken>)[], private options: Options = {}) {}

    private escapeString(str: string): string {
        return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
    }

    private buildCaptureGroup(prefix: string, capture: string, repeat: boolean, optional: boolean): string {
        if (repeat) {
            capture += `(?:${this.escapeString(prefix)}${capture})*`;
        }

        if (optional) {
            return prefix ? `(?:${this.escapeString(prefix)}(${capture}))?` : `(${capture})?`;
        }

        return `${this.escapeString(prefix)}(${capture})`;
    }

    private buildRoute(): void {
        const lastToken = this.tokens[this.tokens.length - 1];
        const endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

        for (const token of this.tokens) {
            if (typeof token === 'string') {
                this.route += this.escapeString(token);
            } else {
                this.route += this.buildCaptureGroup(token.prefix as string, token.pattern as string, token.repeat as boolean, token.optional as boolean);
            }
        }

        if (!this.options.strict) {
            this.route = (endsWithSlash ? this.route.slice(0, -2) : this.route) + '(?:\\/(?=$))?';
        }

        this.route += this.options.end ? '$' : this.options.strict && endsWithSlash ? '' : '(?=\\/|$)';
    }

    buildRegExp(): RegExp {
        this.buildRoute();
        return new RegExp('^' + this.route, this.flags());
    }

    private flags(): string {
        return this.options && this.options.strict ? '' : 'i';
    }
}

function tokensToRegExp(tokens: (string | Partial<PathToken>)[], options: Options = {}): RegExp {
    const builder = new RouteRegExpBuilder(tokens, options);
    return builder.buildRegExp();
}

class PathToRegexp {
    private keys: Partial<PathToken>[] = [];
    private tokens: (string | Partial<PathToken>)[] = [];

    constructor(private path: PathInput, private options: Options = {}) {
        this.parsePath();
    }

    private parsePath(): void {
        const parser = new PathParser()
        if (Array.isArray(this.path)) {
            this.tokens = this.path.flatMap((p) => parser.parse(p as string));
        } else if (typeof this.path === 'string' || this.path instanceof RegExp) {
            this.tokens = parser.parse(this.path as string);
        } else {
            throw new Error('Invalid path input');
        }
    }

    private buildKeys(): void {
        for (const token of this.tokens) {
            if (typeof token !== 'string') {
                this.keys.push({
                    name: token.name,
                    delimiter: token.delimiter,
                    optional: token.optional,
                    repeat: token.repeat,
                });
            }
        }
    }

    private buildRegExp(): RegExp {
        const regexp = tokensToRegExp(this.tokens, this.options);
        return attachKeys(regexp, this.keys);
    }

    generateRegExp(): RegExp {
        this.buildKeys();
        return this.buildRegExp();
    }
}

function pathToRegexp(path: PathInput, keys: Partial<PathToken>[] = [], options: Options = {}): RegExp {
    const pathToRegexp = new PathToRegexp(path, options);
    return pathToRegexp.generateRegExp();
}