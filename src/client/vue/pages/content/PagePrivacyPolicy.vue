<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Privacy policy',
});
</script>

<template>
    <h1>Privacy Policy</h1>
    <p><strong>Last updated:</strong> March 28, 2026</p>

    <p>
        Welcome to <strong>PlayHex</strong>
        (<a href="https://playhex.org/">https://playhex.org/</a>).
        Your privacy is important to us.
        This Privacy Policy explains what data we collect, how we use it, and your rights.
    </p>

    <h2>1. Who We Are</h2>

    <p>
        PlayHex is a free software project distributed under the
        <strong>GNU Affero General Public License v3 (AGPLv3)</strong>.
    </p>

    <p>If you have any questions, you can contact us at:<br>
        <strong>Email:</strong> <a href="mailto:julien.maulny@protonmail.com">julien.maulny@protonmail.com</a>
    </p>

    <h2>2. Data We Collect</h2>
    <p>We aim to collect as little personal data as possible.</p>

    <h3>a. Usage Data (Analytics)</h3>
    <p>We use <strong>Matomo (self-hosted)</strong>, an open-source analytics platform, to understand how visitors use the
        site.</p>

    <p>Matomo may collect:</p>
    <ul>
        <li>Pages visited</li>
        <li>Time spent on pages</li>
        <li>Browser and device information</li>
        <li>Referrer (how you arrived at the site)</li>
        <li>Approximate geographic location (based on IP)</li>
    </ul>

    <p><strong>Important:</strong></p>
    <ul>
        <li>Matomo is hosted by us (no third-party data sharing)</li>
        <li>IP addresses are anonymized</li>
        <li>Data is used only for internal analytics</li>
    </ul>

    <h3>b. Error Monitoring</h3>
    <p>We use <strong>Sentry</strong> to monitor errors and improve the stability of the website.</p>

    <p>Sentry may collect:</p>
    <ul>
        <li>Technical error logs</li>
        <li>Browser and device metadata</li>
        <li>URL where the error occurred</li>
    </ul>

    <p>We configure Sentry to avoid collecting sensitive personal data whenever possible.</p>

    <h2>3. Cookies</h2>
    <p>Matomo may use cookies to:</p>
    <ul>
        <li>Distinguish returning visitors</li>
        <li>Improve analytics accuracy</li>
    </ul>

    <p>These cookies are:</p>
    <ul>
        <li>First-party</li>
        <li>Not used for advertising</li>
        <li>Not shared with third parties</li>
    </ul>

    <p>You can disable cookies in your browser settings.</p>

    <h2>4. How We Use Data</h2>
    <p>We use collected data strictly to:</p>
    <ul>
        <li>Improve the website and user experience</li>
        <li>Fix bugs and technical issues</li>
        <li>Understand general usage patterns</li>
    </ul>

    <p>We do <strong>not</strong>:</p>
    <ul>
        <li>Sell your data</li>
        <li>Use data for advertising</li>
        <li>Share data with third parties (except Sentry for error monitoring)</li>
    </ul>

    <h2>5. Legal Basis (GDPR)</h2>
    <p>If you are in the European Economic Area (EEA), our legal basis for processing data is:</p>
    <ul>
        <li><strong>Legitimate interest</strong> (for analytics and site improvement)</li>
        <li><strong>Consent</strong> (where required, e.g., cookies depending on your jurisdiction)</li>
    </ul>

    <h2>6. Data Retention</h2>
    <p>We retain data only as long as necessary:</p>
    <ul>
        <li>Analytics data: limited retention (configured in Matomo)</li>
        <li>Error logs: retained for debugging purposes, then deleted</li>
    </ul>

    <h2>7. Your Rights</h2>
    <p>Under GDPR, you have the right to:</p>
    <ul>
        <li>Access your data</li>
        <li>Request deletion</li>
        <li>Object to processing</li>
        <li>Request restriction of processing</li>
    </ul>

    <p>To exercise your rights, contact us at:<br>
        <strong>Email:</strong> <a href="mailto:julien.maulny@protonmail.com">julien.maulny@protonmail.com</a>
    </p>

    <h2>8. Data Security</h2>
    <p>We take reasonable technical measures to protect your data, including:</p>
    <ul>
        <li>Self-hosted analytics (Matomo)</li>
        <li>Minimization of collected data</li>
        <li>Secure infrastructure practices</li>
    </ul>

    <h2>9. Third-Party Services</h2>
    <p>We use the following services:</p>
    <ul>
        <li>Matomo (self-hosted) – analytics</li>
        <li>Sentry – error monitoring</li>
    </ul>

    <p>These services are used solely to operate and improve the website.</p>

    <h2>10. Open Source Transparency</h2>
    <p>PlayHex is free software under the AGPLv3 license. You are encouraged to review the source code to understand exactly
        how data is handled.</p>

    <h2>11. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. Updates will be posted on this page with a new "Last updated"
        date.</p>

    <h2>12. Contact</h2>
    <p>For any privacy-related questions:</p>
    <p>📧 <a href="mailto:julien.maulny@protonmail.com">julien.maulny@protonmail.com</a></p>
</template>
