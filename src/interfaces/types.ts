export interface RouteCallback{
    (params?:Record<string, string>):void
}

export interface Route {
    path:string,
    callback:RouteCallback
}