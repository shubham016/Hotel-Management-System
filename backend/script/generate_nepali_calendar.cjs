// Run from the repository root: node backend/script/generate_nepali_calendar.cjs
const fs = require('node:fs');
const path = require('node:path');
const calendar = require('@inicrea/bikram-sambat-core');
const packageInfo = require('@inicrea/bikram-sambat-core/package.json');
const rows = [];
for (let year = calendar.MIN_BS_YEAR; year <= calendar.MAX_BS_YEAR; year++) {
  rows.push(Array.from({ length: 12 }, (_, month) => calendar.daysInBsMonth(year, month + 1)));
}
const data = {
  source: `@inicrea/bikram-sambat-core ${packageInfo.version}; derived from https://github.com/Yorion-io/yorion_engine`,
  min_year: calendar.MIN_BS_YEAR, max_year: calendar.MAX_BS_YEAR,
  epoch_ad: calendar.bsToAdIso(calendar.MIN_BS_YEAR, 1, 1),
  months_en: calendar.BS_MONTHS_EN,
  month_lengths: rows
};
fs.writeFileSync(path.resolve(__dirname, '../config/nepali_calendar.json'), JSON.stringify(data, null, 2) + '\n');
const packageRoot = path.dirname(require.resolve('@inicrea/bikram-sambat-core/package.json'));
fs.writeFileSync(path.resolve(__dirname, '../config/nepali_calendar_NOTICE.txt'), fs.readFileSync(path.join(packageRoot, 'LICENSE'), 'utf8') + '\n\n' + fs.readFileSync(path.join(packageRoot, 'NOTICE'), 'utf8'));
console.log(`Calendar table generated: BS ${data.min_year}-${data.max_year}, epoch ${data.epoch_ad}`);
console.log('Current-year official date checks:');
for (const [ad, year, month, day] of [['2026-04-14',2083,1,1], ['2026-10-06',2083,6,20], ['2026-10-11',2083,6,25], ['2026-10-21',2083,7,4], ['2027-03-21',2083,12,7]]) {
  const bs = calendar.adToBs(ad);
  if (bs.year !== year || bs.month !== month || bs.day !== day) throw new Error(`Official anchor mismatch: ${ad}`);
  console.log(`${ad} = ${year}-${month}-${day} BS`);
}
