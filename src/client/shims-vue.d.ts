declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

import { Router, RouteRecordRaw } from 'vue-router';
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $router: Router;
        $route: RouteRecordRaw;
    }
}

declare module '@vue/runtime-core' {
    export interface ComponentCustomProperties {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $t: (key: string, ...args: any[]) => string;
    }
}
