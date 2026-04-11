import fs from 'fs';

function replaceFile(path, oldText, newText) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(oldText, newText);
    fs.writeFileSync(path, content, 'utf8');
  } else {
    console.log('Missed:', path);
  }
}

// redis-client
replaceFile('server/tests/unit/room.service.test.ts', "import redis from '../../redis-client';", "import redis from '../../config/redis-client';");
replaceFile('server/tests/setup.ts', "vi.mock('../redis-client',", "vi.mock('../config/redis-client',");
replaceFile('server/services/room.service.ts', "import redis from '../redis-client.js';", "import redis from '../config/redis-client.js';");
replaceFile('server/services/moderation.service.ts', "import redis from '../redis-client.js';", "import redis from '../config/redis-client.js';");
replaceFile('server/routes/livekit.routes.ts', "import redis from '../redis-client.js';", "import redis from '../config/redis-client.js';");
replaceFile('server/routes/moderation.routes.ts', "import redis from '../redis-client.js';", "import redis from '../config/redis-client.js';");
replaceFile('server/middleware/rate-limiters.ts', "import redis from './redis-client.js';", "import redis from '../config/redis-client.js';");

// turn-credentials
replaceFile('server/tests/integration/ice.routes.test.ts', "import * as turnCredentials from '../../turn-credentials';", "import * as turnCredentials from '../../config/turn-credentials';");
replaceFile('server/routes/ice.routes.ts', "import { getTurnCredentials } from '../turn-credentials.js';", "import { getTurnCredentials } from '../config/turn-credentials.js';");

// text-moderator
replaceFile('server/tests/unit/text-moderator.test.ts', "import { analyzeText } from '../../text-moderator';", "import { analyzeText } from '../../utils/text-moderator';");
replaceFile('server/tests/integration/moderation.routes.test.ts', "import * as textModerator from '../../text-moderator';", "import * as textModerator from '../../utils/text-moderator';");
replaceFile('server/routes/moderation.routes.ts', "import { analyzeText } from '../text-moderator.js';", "import { analyzeText } from '../utils/text-moderator.js';");

// rate-limiters
replaceFile('server/routes/moderation.routes.ts', "import { reportLimiter, textCheckLimiter } from '../rate-limiters.js';", "import { reportLimiter, textCheckLimiter } from '../middleware/rate-limiters.js';");
replaceFile('server/routes/livekit.routes.ts', "import { tokenLimiter } from '../rate-limiters.js';", "import { tokenLimiter } from '../middleware/rate-limiters.js';");
replaceFile('server/routes/ice.routes.ts', "import { tokenLimiter } from '../rate-limiters.js';", "import { tokenLimiter } from '../middleware/rate-limiters.js';");
replaceFile('server/routes/agent.routes.ts', "import { agentLimiter } from '../rate-limiters.js';", "import { agentLimiter } from '../middleware/rate-limiters.js';");

console.log('Backend imports updated!');
