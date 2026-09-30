// POST /api/leads/HV-7K2Q9M/contact (qualify, book, complete, cancel, lost).
import { vercelRoute } from '../../../server.js';

export default vercelRoute('/api/leads', ['ref', 'action']);
