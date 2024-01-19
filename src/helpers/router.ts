import type {Route, RouteCallback} from "../interfaces/types.ts";

export class Router {
    private routes: Route[] = [];
    private currentPath: string | null = null;

    registerRoute = (path: string, callback: RouteCallback): void => {
        this.routes.push({path, callback})
    }
}


