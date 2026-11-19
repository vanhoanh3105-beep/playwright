import 'dotenv/config';
import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline/promises';
import { config, qaUrl, storageState } from '../src/config.js';

const browser = await chromium.launch({ headless: false });
const origin = qaUrl('/').origin;
const context = await browser.newContext({
    storageState: storageState('ceo')
});

const entries = new Map();
const pending = [];
let recording = false;

const hidden = /token|secret|password|cookie|authorization|api.?key/i;

function shape(value, depth = 0) {
    if (depth > 5) return '[depth limit]';
    if (value === null) return 'null';

    if (Array.isArray(value)) {
        return {
            type: 'array',
            sample: value.length
                ? shape(value[0], depth + 1)
                : 'empty'
        };
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value)
                .filter(k => !hidden.test(k))
                .slice(0, 80)
                .map(k => [k, shape(value[k], depth + 1)])
        );
    }

    return typeof value;
}

context.on('request', req => {
    const url = new URL(req.url());

    if (!recording) return;
    if (url.origin !== origin) return;
    if (!url.pathname.startsWith('/api/')) return;
    if (url.pathname === '/api/ai/brain/dang-xem/') return;

    const entry = {
        method: req.method(),
        path: url.pathname,
        queryKeys: [...new Set(url.searchParams.keys())]
            .filter(k => !hidden.test(k)),
        status: null
    };

    try {
        const body = req.postDataJSON();

        if (body != null) {
            entry.requestShape = shape(body);
        }
    } catch {}

    entries.set(req, entry);
});

context.on('response', res => {
    const entry = entries.get(res.request());
    if (!entry) return;

    entry.status = res.status();
    entry.contentType =
        (res.headers()['content-type'] || '').split(';')[0];

    if (entry.contentType.includes('json')) {
        pending.push(
            res.json()
                .then(body => {
                    entry.responseShape = shape(body);
                })
                .catch(() => {})
        );
    }

    console.log(entry.method, entry.path, entry.status);
});

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

try {
    const page = await context.newPage();

    await page.goto(
        qaUrl(config('UI_CEO_CHAT_PATH', {
            required: true
        })).toString(),
        { waitUntil: 'domcontentloaded' }
    );

    await rl.question(
        'AI Brain loaded? Press Enter to START recording: '
    );

    recording = true;

    await rl.question(
        'Complete the QA action, then press Enter to SAVE: '
    );

    recording = false;

    let timer;
    await Promise.race([
        Promise.allSettled(pending),
        new Promise(resolve => {
            timer = setTimeout(resolve, 4000);
        })
    ]);
    clearTimeout(timer);

    fs.mkdirSync('results/groups/GO', {
        recursive: true
    });

    fs.writeFileSync(
        'results/groups/GO/discovery-interaction.json',
        JSON.stringify([...entries.values()], null, 2)
    );

    console.log('API captured:', entries.size);
    console.log('Saved discovery-interaction.json');
} finally {
    rl.close();
    await browser.close();
}
