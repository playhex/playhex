/* eslint-disable */

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module 'vue-matomo' {
    import {Plugin} from 'vue'
    const VueMatomo: Plugin
    export default VueMatomo
}
