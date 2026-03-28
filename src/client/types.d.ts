/* eslint-disable @typescript-eslint/no-explicit-any */

// Since typescript 6, I need this to import .css files to have eslint happy

declare module '*.styl' {
    const content: any;
    export default content;
}

declare module '*.scss' {
    const content: any;
    export default content;
}

declare module '*.css' {
    const content: any;
    export default content;
}
