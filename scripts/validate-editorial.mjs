import {readPackage} from './editorial-lib.mjs';
const path=process.argv[2];if(!path){console.error('Usage: node scripts/validate-editorial.mjs <package.json> [--approved]');process.exit(2)}
const pkg=await readPackage(path,{requireApproval:process.argv.includes('--approved')});
console.log(`Editorial package valid: ${pkg.packageId} (${pkg.status}).`);
