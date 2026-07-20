const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://localhost:5173';

const roles = [
  { name: 'professor', email: 'ogalesco.patrick@pnc.edu.ph', routes: ['/professor/dashboard','/professor/appointments','/professor/document-request','/professor/transactions','/professor/schedule-manager'] },
  { name: 'student', email: 'santos.carlos@pnc.edu.ph', routes: ['/student/dashboard','/student/queue','/student/queue-status','/student/announcements','/student/professor-schedules','/student/appointments','/student/documents','/student/transactions'] }
];

(async () => {
  const browser = await chromium.launch();
  for (const role of roles) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await page.fill('#email', role.email);
    await page.fill('#password', 'password123');
    await Promise.all([page.waitForNavigation({timeout:15000}).catch(()=>{}), page.click('button[type="submit"]')]);
    await page.waitForTimeout(1000);
    for (const route of role.routes) {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(700);
      const fname = role.name + route.replace(/\//g,'_') + '.png';
      await page.screenshot({ path: path.join(__dirname, 'shots', fname), fullPage: true });
      console.log('saved', fname);
    }
    await page.close();
  }
  await browser.close();
})();
