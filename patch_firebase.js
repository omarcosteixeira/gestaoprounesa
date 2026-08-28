import fs from 'fs';
let code = fs.readFileSync('src/firebase.ts', 'utf8');

const target = '      EMAIL_CAMPAIGN_LOGS: `artifacts/${currentProjectId}/public/data/email_campaign_logs`,';
const replacement = target + '\n      SALES_CONTACTS: `artifacts/${currentProjectId}/public/data/sales_contacts`,';

code = code.replace(target, replacement);
fs.writeFileSync('src/firebase.ts', code);
