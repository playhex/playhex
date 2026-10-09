import type { ErrorOut, KoaContextWithOIDC } from 'oidc-provider';

const htmlSafe = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
;

/**
 * Minimal standalone pages rendered by oidc-provider itself (device flow, errors),
 * all other OAuth pages are in the Vue app under /oauth/.
 */
const page = (title: string, body: string): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${htmlSafe(title)} - PlayHex</title>
    <link rel="stylesheet" href="/statics/bootstrap-css/bootstrap.min.css">
    <style>input[type=text]{text-transform:uppercase;text-align:center;letter-spacing:.2em}</style>
</head>
<body data-bs-theme="auto">
    <div class="container py-5" style="max-width:420px">
        <h1 class="h3 mb-4 text-center">${htmlSafe(title)}</h1>
        ${body}
    </div>
    <script>
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.dataset.bsTheme = 'dark';
    </script>
</body>
</html>`;

export const userCodeInputSource = (ctx: KoaContextWithOIDC, form: string, _out?: unknown, err?: Error): void => {
    let message = '<p>Enter the code displayed on your device.</p>';

    if (err && ('userCode' in err || err.name === 'NoCodeError')) {
        message = '<p class="text-danger">The code you entered is incorrect. Try again.</p>';
    } else if (err && err.name === 'AbortedError') {
        message = '<p class="text-danger">The authorization request was interrupted.</p>';
    } else if (err) {
        message = '<p class="text-danger">There was an error processing your request.</p>';
    }

    // form contains the hidden xsrf field and the user_code input, without submit button
    ctx.body = page('Connect a device', `
        ${message}
        ${form.replace('type="text"', 'class="form-control form-control-lg mb-3" type="text"')}
        <button type="submit" form="op.deviceInputForm" class="btn btn-primary w-100">Continue</button>
    `);
};

/**
 * Code confirmation step of device flow, submitted automatically:
 * the consent page displayed right after already shows the application, its author, requested scopes,
 * and the code to check against the one displayed on the device.
 */
export const userCodeConfirmSource = (ctx: KoaContextWithOIDC, form: string): void => {
    ctx.body = page('Connect a device', `
        ${form}
        <noscript><button type="submit" form="op.deviceConfirmForm" class="btn btn-primary w-100">Continue</button></noscript>
        <script>document.getElementById('op.deviceConfirmForm').submit();</script>
    `);
};

export const successSource = (ctx: KoaContextWithOIDC): void => {
    const name = ctx.oidc.client?.clientName;

    ctx.body = page('Device connected', `
        <p class="text-center">${name ? `<strong>${htmlSafe(name)}</strong> is now connected to your PlayHex account.` : 'Your device is now connected.'}</p>
        <p class="text-center">You can close this page.</p>
        <p class="text-center"><a href="/">Back to PlayHex</a></p>
    `);
};

export const renderError = (ctx: KoaContextWithOIDC, out: ErrorOut): void => {
    ctx.type = 'html';
    ctx.body = page('Authorization error', `
        ${Object.entries(out).map(([key, value]) => `<p><strong>${htmlSafe(key)}</strong>: ${htmlSafe(String(value))}</p>`).join('')}
        <p><a href="/">Back to PlayHex</a></p>
    `);
};
