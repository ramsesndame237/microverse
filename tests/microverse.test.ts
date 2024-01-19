import {beforeEach, describe, expect, it, mock} from "bun:test";

import {Router} from '../index.ts'

describe("test microverse framework",()=>{
    let router: Router
    beforeEach(()=>{
        router = new Router()
    })
    it('check if the route is register with a callback function',()=>{
        const callbackMock = mock(()=>{})
        router.registerRoute('/test-route',callbackMock)
        expect(router['routes'].length).toBe(1)

    })
})