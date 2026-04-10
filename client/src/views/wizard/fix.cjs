const fs = require('fs');
const path = require('path');
const dir = 'c:/xampp/htdocs/will_guide/client/src/views/wizard/';
const files = fs.readdirSync(dir);
for (const file of files) {
    if (file.endsWith('.vue')) {
        let content = fs.readFileSync(path.join(dir, file), 'utf8');
        let modified = false;
        
        // Match multiline button tags up to the @click
        const replaced = content.replace(/<button([^>]+)@click="saveAndNext"([^>]*)class="/g, '<button$1@click="saveAndNext"$2class="hidden ');
        if (replaced !== content) {
            content = replaced;
            modified = true;
        }

        const divReplaced = content.replace(/<div class="mt-8 flex justify-end">/g, '<div class="mt-8 hidden justify-end">');
        if (divReplaced !== content) {
            content = divReplaced;
            modified = true;
        }
        
        const reviewReplaced = content.replace(/<div class="bg-gray-900 p-4 flex justify-end space-x-3/g, '<div class="hidden bg-gray-900 p-4 flex justify-end space-x-3');
        if (reviewReplaced !== content) {
            content = reviewReplaced;
            modified = true;
        }

        const mt6Replaced = content.replace(/<div class="flex justify-end space-x-3 mt-6"/g, '<div class="hidden justify-end space-x-3 mt-6"');
        if (mt6Replaced !== content) {
            content = mt6Replaced;
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(path.join(dir, file), content);
            console.log('Fixed', file);
        }
    }
}
