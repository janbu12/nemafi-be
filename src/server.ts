import { web } from './application/web.js';
import { env } from './config/env.js';


web.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}/api`);
});