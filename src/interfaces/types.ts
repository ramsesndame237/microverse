export interface RouteCallback{
    (params?:Record<string, string>):void
}

export interface Route {
    path:string,
    callback:RouteCallback
}

export interface PathToken {
    path: string;
    prefix: string | null;
    name?: string | number ;
    delimiter: string | null;
    optional: boolean;
    repeat: boolean;
    partial: boolean;
    asterisk?: string;
    pattern?:string | null;

}
export interface Options {
    sensitive?: boolean;
    strict?: boolean;
    end?: boolean;
}
export type PathInput = string | RegExp | (string | RegExp)[];

