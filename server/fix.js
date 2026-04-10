const fs = require('fs');
let file = fs.readFileSync('c:/xampp/htdocs/will_guide/server/src/index.ts', 'utf8');
const search = `    socket.on('join_lawyer_room', () => {\r
        socket.join('lawyer_updates');\r
        logger.info({ socketId: socket.id }, 'Client joined lawyer_updates room');\r
    });`;
const replace = `    socket.on('join_lawyer_room', () => {\r
        const userRole = (socket as any).user?.role;\r
        if (userRole === 'lawyer' || userRole === 'admin') {\r
            socket.join('lawyer_updates');\r
            logger.info({ socketId: socket.id }, 'Client joined lawyer_updates room');\r
        } else {\r
            logger.warn({ socketId: socket.id, userRole }, 'Unauthorized attempt to join lawyer_updates room');\r
        }\r
    });`;
file = file.replace(search, replace);
fs.writeFileSync('c:/xampp/htdocs/will_guide/server/src/index.ts', file);
