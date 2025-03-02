declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
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
