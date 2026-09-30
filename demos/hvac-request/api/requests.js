// POST /api/requests: a customer's service request. Vercel runs each file in
// api/ as its own function; they all share the handler in server.js.
import { vercelRoute } from '../server.js';

export default vercelRoute('/api/requests');
