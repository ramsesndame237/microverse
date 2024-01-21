export interface RouteCallback{
    (params?:Record<string, string>):void
}

export interface Route {
    path:string,
    callback:RouteCallback
}

export interface PathToken {
    path: string;
    prefix: string;
    name: string | undefined;
    delimiter: string;
    optional: boolean;
    repeat: boolean;
    partial: boolean;
    asterisk: string | undefined;

}

