#!/usr/bin/env bash
# NV55: runs the Edge Function «solvix-ai» locally (Deno) against a fake Supabase REST + a fake Anthropic API (tests/nv55_ai_mock.ts)
# and checks: sign-in check, chat request shape (model, fallback beta, effort, guide/context), asset JSON schema + image,
# no quota used for an invalid request, daily limit / switched off / database not upgraded / question required.
# Needs deno (e.g. `npm i deno` → node_modules/.bin/deno); set DENO to its path. Behind a proxy also DENO_CERT.
set -u
DENO=${DENO:-deno}; H=$(cd "$(dirname "$0")/.." && pwd); F=http://127.0.0.1:8000; M=http://127.0.0.1:9911; export NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost
$DENO run -A "$H/tests/nv55_ai_mock.ts" >/dev/null 2>&1 & MP=$!
SUPABASE_URL=$M SUPABASE_ANON_KEY=anon ANTHROPIC_API_KEY=test-key ANTHROPIC_BASE_URL=$M $DENO run -A "$H/supabase/functions/solvix-ai/index.ts" >/dev/null 2>&1 & FP=$!
trap 'kill $MP $FP 2>/dev/null' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null $M/log && curl -s -o /dev/null -X OPTIONS $F && break; sleep 1; done
fail=0; ok(){ if [ "$1" = 1 ]; then echo "PASS $2"; else echo "FAIL $2"; fail=1; fi; }
c(){ curl -s -X POST $F -H "Authorization: Bearer $1" -H 'content-type: application/json' -d "$2"; }
has(){ case "$1" in *"$2"*) echo 1;; *) echo 0;; esac; }
ok $(has "$(c bad '{"kind":"chat","messages":[{"role":"user","content":"hi"}]}')" '"code":"auth"') 'unknown caller refused'
curl -s $M/log >/dev/null
ok $(has "$(c good '{"kind":"chat","messages":[{"role":"user","content":"كيف أطبع الملصقات؟"}],"guide":"G","context":"C"}')" '"answer"') 'chat answered'
L=$(curl -s $M/log); ok $(python3 -c "import json,sys;l=json.loads(sys.argv[1]);a=[x for x in l if 'anthropic' in x][0];b=a['anthropic'];print(int(b['model']=='claude-opus-5-5' and a['beta']=='server-side-fallback-2026-07-01' and b.get('fallbacks')=='default' and b['output_config']['effort']=='low' and '<guide>' in b['messages'][-1]['content'][-1]['text'] and a['key']=='test-key'))" "$L") 'chat request: model, fallback, effort, guide in the question'
IMG=$(python3 -c "import base64;print(base64.b64encode(open('$H/tests/a.png','rb').read()).decode())")
ok $(has "$(c good "{\"kind\":\"asset\",\"images\":[{\"media_type\":\"image/png\",\"data\":\"$IMG\"}],\"catalog\":\"200101010101|تكييف\",\"conditions\":\"c2|جيد\"}")" '"serial":"SN-1234"') 'asset fields returned'
L=$(curl -s $M/log); ok $(python3 -c "import json,sys;l=json.loads(sys.argv[1]);b=[x for x in l if 'anthropic' in x][0]['anthropic'];print(int(b['output_config']['format']['type']=='json_schema' and b['messages'][0]['content'][0]['type']=='image'))" "$L") 'asset request: JSON schema + image'
ok $(has "$(c good '{"kind":"asset","images":[]}')" '"no_photo"') 'asset without a photo refused'
ok $(test "$(curl -s $M/log)" = "[]" && echo 1 || echo 0) 'no quota taken for an invalid request'
curl -s "$M/ctl?take=limit" >/dev/null; ok $(has "$(c good '{"kind":"chat","messages":[{"role":"user","content":"x"}]}')" '"code":"limit"') 'daily limit'
curl -s "$M/ctl?take=off" >/dev/null; ok $(has "$(c good '{"kind":"chat","messages":[{"role":"user","content":"x"}]}')" '"code":"disabled"') 'switched off'
curl -s "$M/ctl?take=nofn" >/dev/null; ok $(has "$(c good '{"kind":"chat","messages":[{"role":"user","content":"x"}]}')" '"code":"no_migration"') 'database not upgraded'
curl -s "$M/ctl?take=ok" >/dev/null; ok $(has "$(c good '{"kind":"chat","messages":[{"role":"user","content":"a"},{"role":"assistant","content":"b"}]}')" '"no_question"') 'a question is required'
exit $fail
