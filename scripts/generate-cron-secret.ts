#!/usr/bin/env tsx

/**
 * Genera un CRON_SECRET seguro para autenticación de Vercel Cron Jobs
 *
 * Uso:
 *   npx tsx scripts/generate-cron-secret.ts
 *   # O:
 *   node scripts/generate-cron-secret.ts
 *
 * El secret generado debe agregarse como variable de entorno en Vercel:
 *   CRON_SECRET=<el_valor_generado>
 */

import crypto from 'node:crypto'

const secret = crypto.randomBytes(32).toString('hex')

console.log('\n🔐 CRON_SECRET generado:')
console.log('━'.repeat(80))
console.log(secret)
console.log('━'.repeat(80))
console.log('\n📋 Copia este valor y agrégalo en:')
console.log('   https://vercel.com/david-cepeda-org/orvita/settings/environment-variables')
console.log('\n   Variable: CRON_SECRET')
console.log('   Value: (pega el secret de arriba)')
console.log('   Environment: Production, Preview, Development\n')
