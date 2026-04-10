const fs = require('fs');
const path = require('path');

const viewsDir = 'c:/xampp/htdocs/will_guide/client/src/views/incorporation';
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.vue'));

files.forEach(file => {
    let content = fs.readFileSync(path.join(viewsDir, file), 'utf8');

    // Extract title from <h2>
    const titleMatch = content.match(/<h2[^>]*>(.*?)<\/h2>/);
    let title = 'Wizard Section';
    if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Replace the main wrapper <div v-else>
    let replaced = false;
    content = content.replace(/<div v-else>/g, () => {
        replaced = true;
        return `<div v-else role="region" aria-label="${title}">`;
    });

    if (!replaced) {
        // Find <div class="space-y-8"> or something similar at top level
        content = content.replace(/<div class="space-y-[0-9]+">/, (match) => {
            return match.replace('<div ', `<div role="region" aria-label="${title}" `);
        });
    }

    // Add aria-label to buttons that might just have Next/Back without context
    content = content.replace(/<button([^>]*)>([^<]*)Next([^<]*)<\/button>/ig, (match, attrs, pre, post) => {
        if (!attrs.includes('aria-label')) {
            return `<button aria-label="Proceed to next step"${attrs}>${pre}Next${post}</button>`;
        }
        return match;
    });

    content = content.replace(/<button([^>]*)>([^<]*)Back([^<]*)<\/button>/ig, (match, attrs, pre, post) => {
        if (!attrs.includes('aria-label')) {
            return `<button aria-label="Go back to previous step"${attrs}>${pre}Back${post}</button>`;
        }
        return match;
    });

    // Write back
    fs.writeFileSync(path.join(viewsDir, file), content, 'utf8');
    console.log('Processed', file);
});
