

import type {PathToken} from "../interfaces/types.ts";

class PathParser {

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

class PathGenerator {
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
