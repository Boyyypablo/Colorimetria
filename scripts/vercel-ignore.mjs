#!/usr/bin/env node
/**
 * Vercel ignore script: decide se deve buildar este commit
 * 
 * Exit 0 = build
 * Exit 1 = skip build
 */

// Para PR previews, sempre buildar
if (process.env.VERCEL_ENV === 'preview') {
  console.log('✓ Building preview deployment');
  process.exit(0);
}

// Para production, sempre buildar
console.log('✓ Building production deployment');
process.exit(0);
