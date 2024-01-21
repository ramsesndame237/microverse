import {PathGenerator, PathParser} from "./src/utils/utils.ts";
import type {PathToken} from "./src/interfaces/types.ts";

declare var define:any
((global: any, factory: () => any) => {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        // Node.js
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Global scope
        global.page = factory();
    }
})(this, () => {
    'use strict';

    const isArray = Array.isArray || function (arr){return Object.prototype.toString.call(arr) == '[object Array]'}
    var PATH_REGEXP = new RegExp([
        // Match escaped characters that would otherwise appear in future matches.
        // This allows the user to escape special characters that won't transform.
        '(\\\\.)',
        // Match Express-style parameters and un-named parameters with a prefix
        // and optional suffixes. Matches appear as:
        //
        // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
        // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
        // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
        '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    const compile =(str:string) => {
        const parser = new PathParser()
        return new PathGenerator(parser.parse(str))
    }
    /**
     * Escape special characters in a regular expression string.
     *
     * @param {string} str - The input string.
     * @returns {string} - The escaped string.
     */
    const escapeString =(str: string): string  =>{
        return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
    }

    /**
     * Escape special characters in a capturing group.
     *
     * @param {string} group - The input capturing group string.
     * @returns {string} - The escaped capturing group string.
     */
    const escapeGroup =(group: string): string=> {
        return group.replace(/([=!:$\/()])/g, '\\$1');
    }

    /**
     * Attach keys as a property of the regular expression.
     *
     * @param {RegExp} re - The regular expression.
     * @param {string[]} keys - The keys to attach.
     * @returns {RegExp} - The modified regular expression with attached keys.
     */
    const attachKeys =(re: any, keys: Partial<PathToken>[]): RegExp =>{
        re.keys = keys;
        return re;
    }


    const  regexpToRegexp =(path: RegExp, keys: Partial<PathToken>[]): RegExp => {
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


    return ;
});
