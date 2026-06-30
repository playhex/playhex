// Vite asset URL imports (e.g. import url from 'foo.css?url').
// Declared in shared so both the shared and client TypeScript projects resolve it.
declare module '*?url' {
    const url: string;
    export default url;
}
