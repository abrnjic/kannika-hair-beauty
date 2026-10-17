import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('Firebase Admin imports when serverless runtime disables require(ESM)',()=>{const result=execFileSync(process.execPath,['--no-experimental-require-module','--input-type=module','-e',"await Promise.all([import('firebase-admin/app'),import('firebase-admin/auth'),import('firebase-admin/firestore')]);console.log('ready')"],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(result.trim(),'ready')});
