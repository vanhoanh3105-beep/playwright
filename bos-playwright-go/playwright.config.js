import { defineConfig } from '@playwright/test';
import 'dotenv/config';
export default defineConfig({
  testDir:'./tests/groups',testMatch:'GO.spec.js',timeout:480000,expect:{timeout:15000},workers:1,fullyParallel:false,retries:0,forbidOnly:true,
  reporter:[['list'],['html',{outputFolder:'playwright-report/GO/cases',open:'never'}],['./reporters/status-reporter.cjs',{kind:'cases'}]],
  outputDir:'test-results/GO/cases',use:{trace:'off',screenshot:'off',video:'off'}
});
