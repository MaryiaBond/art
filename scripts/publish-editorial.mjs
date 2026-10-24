import {publishPackage} from './editorial-lib.mjs';
const path=process.argv[2];if(!path){console.error('Usage: node scripts/publish-editorial.mjs <human-approved-package.json>');process.exit(2)}
const {target,result}=await publishPackage(path);
console.log(`Published ${target}. Packages: ${result.files}. Counts: ${JSON.stringify(result.counts)}.`);
console.log('Run npm test and node scripts/build.mjs before deployment.');
