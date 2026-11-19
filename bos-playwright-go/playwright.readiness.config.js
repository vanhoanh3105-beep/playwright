import { defineConfig } from '@playwright/test';
import 'dotenv/config';
export default defineConfig({
  testDir:'./tests/readiness',testMatch:'GO.smoke.js',timeout:120000,expect:{timeout:15000},workers:1,retries:0,forbidOnly:true,
  reporter:[['list'],['html',{outputFolder:'playwright-report/GO/readiness',open:'never'}],['./reporters/status-reporter.cjs',{kind:'readiness'}]],
  outputDir:'test-results/GO/readiness',use:{trace:'off',screenshot:'off',video:'off'}
});
