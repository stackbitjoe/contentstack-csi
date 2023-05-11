const fs = require('fs');
const path = require('path');

module.exports = {
    saveTheme: (theme) => {
        const dirname = path.join(__dirname, '../content/data');
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, { recursive: true });
        }

        fs.writeFileSync(path.join(dirname, 'style.json'), JSON.stringify(theme, null, 2));
    }
}