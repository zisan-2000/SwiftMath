# SwiftMath Homework Photo Upload — Root Cause Audit

**তারিখ:** ৭ নভেম্বর ২০২৬, Asia/Dhaka। **ধরন:** investigation only; implementation নয়।

**পরীক্ষিত commit:** `2afeb6d20e7fb38498c676a07946023c5bdabbc7`। স্থানীয় HEAD এবং Vercel-এর সর্বশেষ production deployment-এর commit একই।

## ১. Executive summary

**Production-এ homework upload request বড় হওয়ায় প্রত্যাখ্যাত হওয়ার বাস্তব প্রমাণ পাওয়া গেছে।** Read-only CDN request logs-এ `POST /student/homework`-এর **১৩টি HTTP 413** আছে। একই code-এ গ্রহণযোগ্য photo limit **৮ MiB**, Next.js Server Action body limit **১০ MiB**, অথচ Vercel Functions-এর documented body limit **৪.৫ MB**। Browser সরাসরি function-এ photo পাঠাচ্ছে; direct-to-Blob client upload বা compression নেই। ফলে application-এর অনুমোদিত বড় ছবির একটি অংশ hosting transport দিয়ে পৌঁছাতেই পারবে না। [Vercel request-body limit](https://vercel.com/docs/functions/limitations#request-body-size)

Local isolated reproduction-এ ৫ MiB ছবি ও simulated ingress rejection দিয়ে **ঠিক “Something went wrong” error boundary** পাওয়া গেছে। Browser console-এ `fetchServerAction → ErrorBoundaryHandler` chain দেখা গেছে। একই synthetic account/attempt-এ retry করে ১ MiB final photo দিলে submission সফল; PostgreSQL-এ `SUBMITTED` এবং saved file size ১,০৪৮,৫৭৬ bytes যাচাই হয়েছে।

**যা দাবি করা যাচ্ছে না:** নির্দিষ্ট ৪ জনের প্রত্যেকের failure এই এক কারণেই হয়েছে—এটি নিশ্চিত নয়। তাঁদের failure time, selected file size/type এবং device trace পাওয়া যায়নি; ব্যবহারকারী জানিয়েছেন তথ্যগুলো দেওয়া সম্ভব নয়। CDN records-এ file bytes, first/final action identity, response error body বা application invocation trace নেই। **১৩টি request ≠ ১৩ জন student; ৪টি redirect ≠ ৪ জন successful student।**

**সিদ্ধান্ত:** payload-size mismatch একটি নিশ্চিত production design defect; production 413 failures এবং একই UI symptom-এর local reproduction এটিকে এই ঘটনার **প্রধান evidence-supported failure mechanism** করে। প্রতিটি reported student-এর exact trigger এবং প্রত্যেক production request কোথায় reject হয়েছে—এগুলো এখনও সম্পূর্ণভাবে correlated নয়।

## ২. Scope, নিরাপত্তা এবং evidence baseline

| বিষয় | যাচাইকৃত তথ্য |
|---|---|
| Repository | `zisan-2000/SwiftMath`, স্থানীয় `E:/SwiftMath` |
| Vercel project | `swift-math` |
| Production domain | `abacuslms.com` |
| Production deployment | `dpl_C57Fu9vEEMDzgjrPD5NgXzL6J7r1`, READY, main |
| Deployed/local commit | `2afeb6d20e7fb38498c676a07946023c5bdabbc7` |
| Local runtime | Next.js 16.2.6, Node.js 24.13.0, isolated webpack dev server |
| Test database | নতুন local `swiftmath_hw_upload_audit_1793989877996` |
| Test storage | আলাদা source copy-এর local `.data`; `BLOB_READ_WRITE_TOKEN` স্পষ্টভাবে empty |
| External Blob faults | Mock SDK; কোনো real Blob request/object নয় |
| Browser | Desktop Chromium/IAB, 390×844 viewport; বাস্তব Android device/PWA install নয় |

Production-এ শুধু deployment metadata, runtime/error summaries এবং CDN request logs পড়া হয়েছে। **Production-এ কোনো test POST, session creation/revocation, SQL write, Blob write/delete, environment change বা deployment করা হয়নি।** Production database ও student photos পড়া হয়নি। Application source/config/schema/dependencies অপরিবর্তিত; repository-তে এই report-ই একমাত্র সংযোজন।

Local synthetic fixture-এ শিক্ষক/ছাত্র/academic level/homework, নতুন database ও পৃথক filesystem ব্যবহার হয়েছে। Source archive HEAD থেকে নেওয়া; `.env` copy করা হয়নি। Local DB connection-এ localhost ও `swiftmath_hw_upload_audit_…` prefix guard আছে। মূল `.env` শুধু স্থানীয় connection স্থাপনের জন্য পড়া হয়েছে; credentials output/report-এ নেই।

## ৩. Production request-level evidence

### ৩.১ যে query বাস্তব ব্যর্থ request পেয়েছে

Installed CLI 41.6.2 শুধু live runtime stream সমর্থন করছিল। আলাদা temporary npm cache থেকে CLI 65.12.1 দিয়ে explicit project/team scope-এ read-only request query চালানো হয়েছে; application dependency পরিবর্তন হয়নি।

```text
vercel logs requests
  --project prj_ipnaPT1KnopB9t94en4vqUHuMmVF
  --scope zisans-projects-7581fee3
  --environment production
  --since 11h --limit 300
  --query 'requestPath:"/student/homework" AND requestMethod:POST'
  --json --non-interactive
```

Query window: **২০২৬-১১-০৬ ০৭:৩৬:০১Z → ১৮:৩৬:০১Z**, অর্থাৎ বাংলাদেশ সময় **৬ নভেম্বর ১৩:৩৬:০১ → ৭ নভেম্বর ০০:৩৬:০১**। API summary: `recordsReturned=17`, `hasMore=false`, `excludedIntervals=[]`।

| Status | Request সংখ্যা | User-Agent থেকে coarse classification |
|---|---:|---|
| 413 | 13 | Android / Chrome-family |
| 303 | 4 | Android / Chrome-family |
| 401 / 403 / 500 / অন্যান্য failed status | 0 | এই নির্দিষ্ট window/path-এ ফেরত আসেনি |

303 থেকে database commit বা photo success প্রমাণ হয় না: এই application **success ও known validation error দুটোতেই redirect করে**। এ sample-এর উপর ভিত্তি করে ২০ জনের failure rate নির্ণয় করা যাবে না। UA দিয়ে Chrome tab ও installed PWA আলাদা করাও যায় না। Raw UA, IP বা student identity সংরক্ষণ করা হয়নি।

### ৩.২ Correlation records

নিচের সব record: `POST /student/homework`, `HTTP 413`, domain `abacuslms.com`, deployment `dpl_C57Fu9vEEMDzgjrPD5NgXzL6J7r1`, edge region `bom1`।

| ৬ নভেম্বর UTC | বাংলাদেশ সময়, ৬ নভেম্বর | Request ID |
|---|---|---|
| 15:30:25.658 | 21:30:25.658 | `5wmzh-1793979025658-629529f544a4` |
| 15:31:12.113 | 21:31:12.113 | `p72bx-1793979072113-1f64f078ac82` |
| 15:39:55.979 | 21:39:55.979 | `whmk2-1793979595979-c477b9ac467b` |
| 16:50:33.782 | 22:50:33.782 | `nbm2l-1793983833782-a9a2e952bf2f` |
| 17:00:37.816 | 23:00:37.816 | `hr8w2-1793984437816-212de3e5b7ce` |
| 17:00:54.291 | 23:00:54.291 | `tl6st-1793984454291-a2c7395ba65a` |
| 17:01:15.174 | 23:01:15.174 | `rf78k-1793984475174-3f96e7d29929` |
| 17:01:40.152 | 23:01:40.152 | `vw4ql-1793984500152-1ed252d05fe6` |
| 17:02:01.724 | 23:02:01.724 | `pmt54-1793984521724-7a5df817339d` |
| 17:03:06.533 | 23:03:06.533 | `bgrqp-1793984586533-d0afa6b39bbe` |
| 17:03:57.238 | 23:03:57.238 | `b6ph2-1793984637238-1cbaa351e521` |
| 17:04:16.938 | 23:04:16.938 | `6p246-1793984656938-e85a1fba7bf9` |
| 17:05:09.816 | 23:05:09.816 | `llx9r-1793984709816-670ec98b1b01` |

CDN record schema-তে `Content-Length`, uploaded MIME, response body/error code এবং Blob/DB stage নেই। তাই এই request-গুলোর response body-তে ঠিক `FUNCTION_PAYLOAD_TOO_LARGE` লেখা ছিল, প্রত্যেকটির file size ঠিক কত ছিল, বা প্রত্যেকটি first না final upload ছিল—এগুলো যাচাই করা হয়নি। এখানে নিশ্চিত তথ্য **HTTP 413**; documented ingress cap ও code path থেকে rejection mechanism বিশ্লেষণ করা হয়েছে।

### ৩.৩ Log access-এর বাস্তব সীমা

- MCP runtime logs-এর ২৪ ঘণ্টা ও ৭ দিনের query retention-সংক্রান্ত HTTP 400 দিয়েছে: এই project **Hobby** plan-এ। ৫০ মিনিটের query সফল হয়েছে, কিন্তু শুধু দুইটি `/api/notifications/summary` SSL warning এসেছে।
- Runtime error summary-তে `/student/homework`-এর SSL warning cluster এসেছে; এটিকে upload exception বা TLS connection failure ধরা হয়নি।
- ৭ দিনের CDN request query HTTP 402 দিয়েছে; server message অনুযায়ী এই account-এর ১২ ঘণ্টার বেশি পুরোনো CDN records দেখতে অতিরিক্ত entitlement প্রয়োজন। **১১ ঘণ্টার query সফল হয়েছে**—উপরের request evidence সেখান থেকে।
- Legacy observability schema endpoint HTTP 404 দিয়েছে। সেটি telemetry না থাকার প্রমাণ নয়; এই API path থেকে schema পাওয়া যায়নি।
- 413-গুলোর শেষ timestamp 17:05Z; raw runtime query-র window ছিল 17:36Z–18:26Z। ফলে ওই failure-গুলোর raw application logs দিয়ে invocation/storage/DB correlation করা যায়নি।

Hobby runtime-log retention ১ ঘণ্টা—official documentation-ও তা বলে। পুরোনো raw runtime trace এই audit-এ ফেরত পাওয়া যায়নি। [Runtime log retention](https://vercel.com/docs/logs/runtime#limits)

## ৪. End-to-end code audit

```text
Android camera / gallery
 → File: original size + browser-reported MIME
 → HTML form / React Server Action multipart body
 → Vercel request-body limit
 → Next.js proxy + Server Action body processing
 → authenticated student / permission / ownership / homework-state checks
 → Buffer → private Blob put (production)
 → Prisma submission create/update
 → revalidatePath + redirect / Flight rendering
 → homework page loader + maintenance queries
 → browser success UI অথবা error boundary
```

Proxy-র cookie-presence redirect ও Action-এর trusted authentication আলাদা check; platform-এর কোন routing layer প্রথমে চলে তার per-request trace পাওয়া যায়নি।

| Evidence location | বর্তমান আচরণ ও implication |
|---|---|
| [page.tsx:62](E:/SwiftMath/app/student/homework/page.tsx:62), [page.tsx:63](E:/SwiftMath/app/student/homework/page.tsx:63) | First/final **আলাদা form**, প্রতি request-এ একটি file। `capture="environment"`, JPEG/PNG/WebP/HEIC accept। Client compression, preflight byte validation বা direct Blob client upload নেই। Camera resolution/encoding browser/device-এর উপর নির্ভর করে। |
| [next.config.ts:11](E:/SwiftMath/next.config.ts:11) | `serverActions.bodySizeLimit="10mb"`; এটি hosting ingress-এর limit বাড়ায় না। |
| [homework-photos.ts:9](E:/SwiftMath/server/homework-photos.ts:9) | Maximum **8×1024×1024 = 8,388,608 bytes**। UI message-তে MB বলা হলেও code-এর হিসাব MiB। |
| [homework-photos.ts:19](E:/SwiftMath/server/homework-photos.ts:19) | Validation server-এ, request পৌঁছানোর পরে। Exact MIME lookup; `image/heif`, `image/jpg`, empty/octet-stream map-এ নেই। Content decode/magic-byte verification বা HEIC conversion নেই। |
| [homework-photos.ts:37](E:/SwiftMath/server/homework-photos.ts:37) | `file.arrayBuffer()` থেকে পূর্ণ Buffer; তারপর private `put`। Browser→function ও function→Blob দুই transfer। এই path-এ explicit progress callback, abort signal বা application-controlled retry নেই; SDK-র নিজস্ব আচরণ আলাদা। |
| [homework-photos.ts:48](E:/SwiftMath/server/homework-photos.ts:48) | Production token না থাকলে known `HomeworkPhotoError`; production-এ filesystem fallback হয় না। Token missing একমাত্র কারণ হলে সব upload-এ একই path ব্যর্থ হওয়ার কথা; ৪ জনের কারণ হিসেবে প্রমাণ নেই। Actual token পড়া হয়নি। |
| [actions.ts:16](E:/SwiftMath/app/student/homework/actions.ts:16), [actions.ts:33](E:/SwiftMath/app/student/homework/actions.ts:33) | Trusted permission check। Known homework/photo errors redirect-এ যায়; অন্য exception rethrow হয়। Request parse/ingress error এই catch-এ পৌঁছাতে নাও পারে। |
| [homework.ts:462](E:/SwiftMath/server/homework.ts:462) | Ownership/institute, open/cancelled state, academic level, existing attempt ও duplicate-page checks। Expected business errors generic boundary হওয়ার কথা নয়। |
| [homework.ts:506](E:/SwiftMath/server/homework.ts:506) | First Blob put-এর **পরে** submission create; create ব্যর্থ হলে uploaded object cleanup। P2002-তে friendly duplicate-attempt message। |
| [homework.ts:542](E:/SwiftMath/server/homework.ts:542) | Final Blob put-এর পরে conditional `updateMany(IN_PROGRESS)`; duplicate final submit নীরবে নতুন attempt তৈরি করে না। |
| [homework.ts:557](E:/SwiftMath/server/homework.ts:557) | Final update commit হওয়ার **পরে** read হয়। Returned Promise-এর rejection caller-এ পৌঁছাতে পারে; committed submission থাকা সত্ত্বেও UI error সম্ভব। Fault injection-এ এই distinction যাচাই হয়েছে। |
| [actions.ts:28](E:/SwiftMath/app/student/homework/actions.ts:28), [actions.ts:40](E:/SwiftMath/app/student/homework/actions.ts:40) | Revalidation ও success redirect submission-এর পরে। এখানে failure মানেই upload/DB rollback নয়। |
| [homework.ts:435](E:/SwiftMath/server/homework.ts:435), [homework.ts:170](E:/SwiftMath/server/homework.ts:170) | Page load-এ `maintainHomework` চলে: schedule occurrence generation/materialization ও আরও DB operations। Upload সফল হলেও পরের render আলাদা dependency failure-তে ব্যর্থ হতে পারে। |
| [upload-submit-button.tsx:15](E:/SwiftMath/components/homework/homework-upload-submit-button.tsx:15) | `useFormStatus` pending indicator আছে, repeated click disabled। Pulsing bar actual byte progress নয়; pending state থেকে failure-এর stage বোঝা যায় না। |
| [error.tsx:25](E:/SwiftMath/app/error.tsx:25) | Error শুধু browser `console.error`-এ যায়; external client-error reporting নেই। Client/Server Action error এখানে “Something went wrong” দেখাতে পারে। |
| [global-error.tsx:73](E:/SwiftMath/app/global-error.tsx:73) | Root fallback একই generic title; error telemetry/digest display নেই। শুধু title দেখে দুই boundary বা upload stage আলাদা করা যায় না। |
| [photo route:17](E:/SwiftMath/app/api/homework/photos/[submissionId]/[kind]/route.ts:17) | Authenticated private-photo read, `no-store`, `nosniff`; storage stream ফেরত দেয়। Actual production Blob large-image rendering আলাদাভাবে test করা হয়নি। |

Next.js client-এর installed implementation-এ invalid non-Flight action response থেকে exception তৈরি হয়: [server-action-reducer.js:118](E:/SwiftMath/node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js:118)। Local browser console-এ একই function এবং application error boundary পাওয়া গেছে।

প্রথম upload-এর eligibility path-এ academic-level snapshot missing থাকলে storage-এর আগেই expectation backfill হতে পারে (`server/homework.ts:479`)। তাই application-এ পৌঁছানো যেকোনো rejected file-এর ক্ষেত্রে “কোনো DB field-ই বদলায়নি” বলা যাবে না। এই audit-এর synthetic fixtures-এ snapshot আগেই সেট ছিল; validation test-এ submission তৈরি হয়নি।

### PWA / stale deployment / authentication

- [app/sw.ts:22](E:/SwiftMath/app/sw.ts:22): worker update user-controlled; `skipWaiting=false`। [pwa-runtime.tsx:62](E:/SwiftMath/components/pwa/pwa-runtime.tsx:62)-এ explicit refresh আছে। পুরোনো open tab/client bundle থাকার সম্ভাবনা থাকে; এটি current incident-এর প্রমাণ নয়।
- [pwa-runtime-caching.ts:13](E:/SwiftMath/lib/pwa-runtime-caching.ts:13) শুধু `/api/` ও `/_next/data/`-কে NetworkOnly করে। Installed Serwist production defaults-এ **App Router RSC requests একই `/student/homework` path-এ NetworkFirst cache-এ যায়**; network fail হলে পুরোনো HTML/Flight থেকে stale UI/action reference আসার ঝুঁকি আছে। Dependencies: `@serwist/turbopack/src/index.worker.ts:208`, `:220`, `:235`।
- ওই defaults-এর relevant routes GET; app-এ POST caching/background-sync queue নেই। তাই **photo POST cache থেকে replay হচ্ছে—এমন প্রমাণ নেই**। Upload-এর সময় offline/connection break হলে নির্ভরযোগ্য background retry নেই।
- Unknown action ID injection-এ local HTTP 404 এবং `x-nextjs-action-not-found: 1` পাওয়া গেছে। তবে production sample-এর failed records **413**, 404 নয়। [Next.js stale Server Action explanation](https://nextjs.org/docs/messages/failed-to-find-server-action)
- [proxy.ts:33](E:/SwiftMath/proxy.ts:33) শুধু session-cookie presence দেখে; [session.ts:46](E:/SwiftMath/lib/session.ts:46) সত্যিকারের session/account/institute validation করে। No-cookie local request 307 login redirect; invalid cookie 303 Action redirect। Expiry মানেই HTTP 401 হবে—এমন assumption ভুল।
- CSRF origin mismatch local test-এ 500, কোনো submission নয়। Production 413 sample থেকে auth/origin error ঘোষণা করা যাচ্ছে না।

## ৫. Actual reproduction এবং ফলাফল

### পদ্ধতি ও সীমাবদ্ধতা

Unchanged source copy, isolated PostgreSQL, synthetic 128×128 images এবং padding দিয়ে নির্দিষ্ট byte size তৈরি হয়েছে। JPEG/PNG/WebP decoder দিয়ে fixture format যাচাই হয়েছে। এগুলো আসল camera photo বা megapixel-memory test নয়। HTTP harness installed React `encodeReply([FormData])` দিয়ে প্রকৃত Server Action protocol ব্যবহার করে। Local storage fallback দিয়ে Blob-এর পরিবর্তে পৃথক files লেখা হয়েছে—**live production Blob API success test নয়**।

**MiB = 1,048,576 bytes**। Vercel documentation-এর MB এবং code-এর MiB আলাদা করে উল্লেখ করা হয়েছে। ৫/৮ MiB দুই অর্থেই ৪.৫ MB cap-এর বেশি; exact Vercel byte threshold probe করা হয়নি।

### ৫.১ Direct local Next.js → storage → PostgreSQL → read/render

| Synthetic input | Full first-request bytes | First / Final HTTP | Database ও photo read |
|---|---:|---|---|
| JPEG 1 MiB | 1,049,085 | 303 / 303 | SUBMITTED; read 200; 1,048,576 bytes |
| JPEG 2 MiB | 2,097,661 | 303 / 303 | SUBMITTED; read 200; 2,097,152 bytes |
| JPEG 4 MiB | 4,194,813 | 303 / 303 | SUBMITTED; read 200; 4,194,304 bytes |
| JPEG 5 MiB | 5,243,389 | 303 / 303 | SUBMITTED; read 200; 5,242,880 bytes |
| JPEG 8 MiB | 8,389,117 | 303 / 303 | SUBMITTED; read 200; 8,388,608 bytes |
| JPEG 8 MiB + 1 byte | 8,389,126 | 303 error redirect | নির্দিষ্ট 8 MB validation message; submission হয়নি |
| JPEG 11 MiB | 11,534,855 | 500 | submission হয়নি; local proxy/body warning |
| PNG 1 MiB | 1,049,082 | 303 / 303 | SUBMITTED; read 200; image/png |
| WebP 1 MiB | 1,049,086 | 303 / 303 | SUBMITTED; read 200; image/webp |
| JPEG bytes labelled `image/heic` | 1,049,088 | 303 / 303 | MIME-only storage acceptance; **genuine HEIC decode test নয়** |
| `image/heif` | 1,049,088 | 303 error redirect | supported-format message; submission হয়নি |
| Empty MIME → octet-stream | 1,049,103 | 303 error redirect | supported-format message; submission হয়নি |

Successful cases-এর পর homework GET 200; generic page boundary হয়নি। Multipart overhead এখানে প্রায় ৫০০ bytes; প্রকৃত browser/file name/form অনুযায়ী বদলাবে। First ও final photo এক request-এ যোগ করে ১৬ MiB হিসাব করা হয়নি।

১১ MiB test-এর runtime warning: `Request body exceeded 10MB ... middlewareClientMaxBodySize`। Installed Next.js-এ বর্তমান setting-এর নাম `proxyClientMaxBodySize`, default 10,485,760 bytes; warning-এ পুরোনো নাম আছে। Local guide: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md:7`; default: `node_modules/next/dist/server/config-shared.js:260`। Proxy নিজে body truncate করে; পরে decode failure-তে 500 হতে পারে। তাই ওই local 500-কে ৪.৫ MB Vercel ingress-এর 413 বলা যাবে না। এটিও application max validator-এর আগের framework-body failure।

### ৫.২ Local 4,500,000-byte ingress simulation

| JPEG size | HTTP | Next-এ forward হয়েছে? |
|---|---|---|
| 1 / 2 / 4 MiB | 303 | হ্যাঁ |
| 5 / 8 MiB | 413 | না |

এই gate শুধু documented-limit boundary demonstration; **Vercel infrastructure reproduction নয়**। নিচের browser test-এ exact generic symptom যাচাই করা হয়েছে।

### ৫.৩ Browser control experiment

1. Desktop Chromium-এ 390×844 viewport, synthetic student ও running attempt খোলা হয়। এটি actual Android/PWA নয়।
2. Hydrated form থেকে **5 MiB final photo** submit। Gate log: `bodyBytes=5,243,438`, `hasNextAction=true`, `status=413`, `forwarded=false`।
3. App-এর “Something went wrong” screen দেখা যায়। Browser console: `Error: SIMULATED_FUNCTION_PAYLOAD_TOO_LARGE`, `fetchServerAction`, `<form>`, `ErrorBoundaryHandler`।
4. `Try again` করলে একই attempt IN_PROGRESS দেখা যায়। একই account/attempt-এ **1 MiB final photo** দিলে “Homework submitted for teacher review.” আসে। DB-তে SUBMITTED এবং final file 1,048,576 bytes মিলে যায়।
5. Hydration-এর আগের ordinary form POST-তেও gate rejection test হয়েছে; সেটি plain 413 text page দেখিয়েছে। ফলে browser-এর hydration/progressive-enhancement state অনুযায়ী error presentation বদলাতে পারে।

**Screenshot: local simulated rejection, production নয়।**

![Local simulated 413 error boundary](C:/Users/zisan/.codex/visualizations/2026/09/14/01a09f2d-6f58-7691-8345-fc54d9d7639c/homework-upload-audit-20261107/simulated-413-browser.jpg)

### ৫.৪ Other protocol ও fault tests

| পরীক্ষা | Actual result |
|---|---|
| No session cookie | 307 → `/login?redirect=...`; submission নেই |
| Invalid session cookie | 303 Action redirect → `/login`; submission নেই |
| Wrong Origin | 500, Invalid Server Actions request; submission নেই |
| Unknown/stale action ID | 404, action-not-found header; submission নেই |
| Body 8 KiB পাঠিয়ে connection বিচ্ছিন্ন | submission নেই; local `aborted` error |
| Blob put exception — mock | DB create হয়নি; unexpected exception caller-এ গেছে |
| DB create failure after Blob — mock | object cleanup; original exception propagated |
| Duplicate attempt P2002 — mock | friendly error redirect + cleanup |
| Unsupported MIME — mock | known validation redirect, Blob/DB write হয়নি |
| Final DB update failure — mock | extra final-object cleanup |
| Final update committed, পরের read failed — mock | committed state বজায়; caller error পেয়েছে |
| Revalidation failed after successful create — mock | committed state বজায়; caller error পেয়েছে |

**সম্পন্ন:** HTTP harness-এ ২২টি scenario, দুইটি browser submission control, এবং **৭/৭ fault-injection tests PASS**। Status/error/DB outcomes উপরে দেওয়া হয়েছে; expected rejection-কে successful upload বলা হয়নি। Mock failures production-এ ঘটেছে—এমন দাবি নেই।

**যা পরীক্ষা করা হয়নি:** real Android camera capture/low-RAM device, installed Android PWA, genuine HEIC rendering, mobile radio switching/long-duration timeout, live Vercel staging upload, live Blob storage outage/quota/credentials। Controlled connection abort বা ছোট image padding দিয়ে এগুলোর সব দাবি পূরণ হয় না।

Local harness তৈরির সময় cross-drive webpack resolution, raw SQL fixture timestamps এবং প্রথম multipart encoder-এর ত্রুটি ঠিক করা হয়েছে। এগুলো test harness setup issue; production finding হিসেবে গণনা করা হয়নি। উপরের ফল corrected source-copy environment ও React-compatible multipart protocol থেকে নেওয়া।

## ৬. কেন ২০ জনের মধ্যে ৪ জন

**Confirmed:** failures selective হতে পারে, কারণ একই application একটি ১ MiB ও ৫ MiB file-কে application validator অনুযায়ী গ্রহণযোগ্য মনে করলেও platform transport বড়টিকে reject করতে পারে। Local same-account control-এ এই পার্থক্য হয়েছে। Production-এ Android Chrome-family-তে 413 এবং 303 দুটো response-ই আছে—browser family একাই কারণ বোঝাচ্ছে না।

**সবচেয়ে শক্তিশালী hypothesis:** ওই ৪ জনের camera/gallery file size/encoding বড়, অথবা first ছোট হলেও final photo বড়; camera resolution, compression ও scene detail-এ file size আলাদা হয়। **তাঁদের actual photo metadata পাওয়া যায়নি, তাই এটি ব্যক্তিভিত্তিক confirmed explanation নয়।**

Network break, stale PWA/client, uncommon MIME ও session expiry অন্য সম্ভাব্য trigger। এই sample-এর 413-এর সঙ্গে সেগুলোর direct causation পাওয়া যায়নি। তাঁদের account-এর academic level/eligibility data বদলানোর সুপারিশ করা হচ্ছে না।

## ৭. কেন Vercel runtime logs-এ স্পষ্ট error নাও দেখা যেতে পারে

1. **CDN request logs ও application runtime logs আলাদা।** HTTP 413 request records-এ পাওয়া গেছে; `level:error` application-console search দিয়ে একই evidence দেখা যায় না।
2. Documented ingress-size rejection হলে upload Action/storage code চালানোর আগেই body আটকে যায়; application catch/logger তখন চলতে পারে না। **Local gate-এ pre-action rejection নিশ্চিত। Production records-এ invocation trace নেই, তাই প্রত্যেক record-এর pre-execution stage independently প্রমাণিত নয়।**
3. Browser `fetchServerAction` invalid response থেকে exception তৈরি করে; [app/error.tsx:25](E:/SwiftMath/app/error.tsx:25)-এর console log **ছাত্রের browser-এ**, Vercel function-এ নয়। Global boundary-তেও reporting hook নেই।
4. Known errors redirect হিসেবে ফেরে; আলাদা `console.error` করা হয় না। 303 response থেকে validation বনাম success বোঝা যায় না।
5. Hobby-র runtime retention ১ ঘণ্টা। উদ্ধার হওয়া failed requests ওই raw runtime window-এর আগের। SSL warnings-এর noise-ও আসল HTTP failure খোঁজা কঠিন করে।
6. কোনো upload correlation ID, stage logs, payload-byte/MIME telemetry, client build version বা structured client-error ingestion পাওয়া যায়নি। Offline/client-side failure-তে request server-এ নাও পৌঁছাতে পারে।

**Storage/DB/render বিভাজন:** 413 sample-তে request গ্রহণেই failure নিশ্চিত; Blob/Prisma exception-এর প্রমাণ নেই। তবে সফল DB save-এর পর error হওয়া সম্ভব—fault tests তা দেখিয়েছে। তাই generic screen দেখেই “ছবি save হয়নি” ধরে repair/re-upload করা নিরাপদ সিদ্ধান্ত নয়; actual attempt state দেখে retry করতে হবে।

## ৮. Severity-ranked findings

| Priority | Finding | Evidence / confidence |
|---|---|---|
| **P1 — High** | 8 MiB accepted file → function upload path; hosting cap 4.5 MB | Code + official limit + 13 production POST 413 + matching local browser symptom। Exact affected-student mapping unresolved। |
| **P1 — High** | Transport failure generic error boundary-তে যায়; actionable per-upload recovery/diagnostic নেই | Hydrated browser reproduction, console stack, `app/error.tsx`। |
| **P2 — Medium** | Client/stage observability ও retention gap | Browser-only console, no upload phase logging; raw-runtime retention failures বনাম CDN evidence। |
| **P2 — Medium** | Unstable network-এ upload success/commit-এর acknowledgement অস্পষ্ট হতে পারে | No application resumable protocol; abort test; post-commit read/revalidation fault tests। Production occurrence unresolved। |
| **P2 — Medium** | Protected App Router HTML/RSC NetworkFirst fallback stale form/bundle দিতে পারে | Installed production caching rules + unknown-action local 404। Current 413 incident-এর root cause প্রমাণিত নয়। |
| **P2 — Medium** | MIME-only acceptance ও HEIC normalization/preview recovery gap | Mislabelled JPEG accepted as HEIC; HEIF/octet-stream rejected; genuine HEIC browser decoding untested। Teacher viewer-এ `onLoad` আছে, `onError` নেই। |
| **P3 — Low** | Pending pulse actual upload percentage নয়; size limit upfront জানানো/যাচাই হয় না | Upload button source, file input source। এটি নিজে HTTP 413 তৈরি করে না। |

## ৯. Recommended permanent fixes — implementation এখন করা হয়নি

### A. Transport স্থায়ীভাবে ঠিক করা

**Preferred:** authenticated **direct browser → private Blob upload**, এবং small metadata-only start/finalize request। File function body দিয়ে পাঠানো বন্ধ হবে। Vercel-এর official client-upload flow বড় file সরাসরি Blob-এ পাঠায়; server token exchange ও authorization বাধ্যতামূলক। [Client uploads](https://vercel.com/docs/vercel-blob/client-upload)

প্রস্তাবিত flow:

1. Student-এর নিজের active expectation/attempt যাচাই করে short-lived, path-scoped upload ticket তৈরি। Existing institute/student permissions, original homework scope ও page-lock semantics বজায় রাখা।
2. Browser original/compressed file private Blob-এ পাঠাবে। Server-এর long-lived Blob token client-এ দেওয়া যাবে না। Actual progress, bounded retry/cancel এবং network failure message দেখাবে।
3. Server callback/finalize-এ ticket, object path ownership, size/type এবং object existence যাচাই করবে; client-এর দেওয়া arbitrary object key বিশ্বাস করবে না। প্রয়োজনমতো content decoding/sniffing করবে।
4. Small transaction/conditional update-এ idempotent first-start বা final-submit commit। Timer server timestamps থেকে; first upload + accepted start-এর পরে start হবে, current behavior অনুযায়ী। Double click, lost response বা callback retry-তে duplicate attempt হবে না।
5. Success acknowledgement-এ saved submission state দেখাবে। Unknown result হলে status পুনরায় পড়বে; অন্ধভাবে আবার upload করবে না। Failed/unreferenced upload cleanup সীমিত TTL ও reference checks দিয়ে হবে; committed photos মুছবে না।

শুধু Next.js `bodySizeLimit`/memory/maxDuration বাড়ানো বা Vercel plan বদলানোকে payload-limit fix হিসেবে ধরা যাবে না।

**ছোট interim mitigation:** client-side resize/compression ও preflight byte check; উদাহরণস্বরূপ প্রায় ১–২ MiB target এবং ৩ MiB-এর মতো conservative hard file budget, multipart overhead-এর জন্য margin রেখে। Unreadable homework text যেন না হয় তা device UAT-এ যাচাই করতে হবে। Server limit/message একই policy-তে আনতে হবে। Compression fail/unsupported format হলে পরিষ্কার message; ছবি silently বাদ দেওয়া নয়। Interim cap সরাসরি বড় original upload-এর পূর্ণ বিকল্প নয়।

### B. Error handling ও SRE observability

- Expected size/format/network/session failures inline recoverable result হিসেবে দেখানো; page/file selection যতটা browser অনুমতি দেয় সংরক্ষণ। Generic boundary শুধু unexpected failure-এর fallback।
- `client-selected`, `upload-started`, `storage-confirmed`, `db-committed`, `render-failed` stage ও elapsed time log/metric। Correlation ID, deployment/build ID, sanitized file bytes/MIME, browser family এবং error category রাখবে। **Photo bytes, cookies, auth tokens, student names/numbers বা private Blob URLs log নয়।**
- Client error boundary-তে redacted telemetry; server-side structured logs ও CDN HTTP-status monitoring একসঙ্গে। Alert-এ HTTP 413 rate এবং finalize failure আলাদা থাকবে। Raw runtime retention-এর বাইরে দরকারি retention strategy ঠিক করতে হবে।
- DB commit হওয়ার পর read/render failure-তে authoritative saved-state recovery। “Submission failed” বলে দ্বিতীয় attempt বানানোর আগে state check।

### C. PWA/format/network hardening

- Protected personal HTML/modern RSC route-এর cache policy যাচাই করে stale fallback এড়ানো; POST upload queueing স্বয়ংক্রিয়ভাবে যোগ করা নয়। Deployment skew-এর জন্য safe refresh/retry, selected-file loss warning।
- JPEG/PNG/WebP normalization policy; genuine HEIC/HEIF decode support যাচাই করে conversion বা clear unsupported message। Private viewer-এ load-error UI।
- Client transfer progress ও final server-confirmed success আলাদা। Mobile background/resume, Wi-Fi/mobile switching এবং bounded retry test করতে হবে।

## ১০. Regression test plan

| Area | ভবিষ্যৎ test / expected result |
|---|---|
| Payload | 1/2/4/5/8 MiB JPEG + exact boundaries; chosen architecture অনুযায়ী direct upload success অথবা clear preflight rejection। Oversized function request কোনো expected path হবে না। |
| Multipart | File limit-এর সঙ্গে form overhead; long page/name, unicode filename, first/final আলাদা request। |
| Formats | Genuine JPEG/PNG/WebP/HEIC/HEIF, wrong/empty MIME, corrupted image, huge pixel dimensions; decode/normalization ও preview ফল নিশ্চিত। |
| Devices | দুই বা বেশি বাস্তব Android device/camera resolution; Chrome tab এবং installed PWA; camera ও gallery; low-memory device। প্রয়োজনে Samsung Internet/iOS আলাদা। |
| Network | Slow upload, partial disconnect, offline, Wi-Fi→mobile switching, background/foreground, timeout/cancel; saved state ও safe retry ঠিক থাকবে। |
| Auth | Session expires before ticket, during transfer, before finalize; no cookie, disabled account, permission denied; unauthorized student/teacher access blocked। |
| Storage | Mock timeout/quota/auth error, partial/multipart failure; no duplicate object/attempt; private access বজায়। |
| Database | Failure before commit, concurrent start/finalize, duplicate callback, lost acknowledgement, failure after commit; idempotency ও recovery। |
| Render | Saved photo/DB row থাকা অবস্থায় redirect target/maintenance loader failure; recovery authoritative state দেখাবে। |
| PWA | Old tab/new deploy, cached RSC offline fallback, waiting worker update; incompatible action-এর controlled refresh। |
| Observability | Forced 413, 404-action, storage/DB failures; client reference ও server/CDN request ID correlate; logs-এ secret/photo নেই। |
| Production-like staging | Real Vercel ingress + non-production private Blob + isolated DB দিয়ে E2E, response headers ও bytes capture; local success-কে platform validation বলা হবে না। |

## ১১. Affected-device trace নিরাপদে সংগ্রহের পদ্ধতি

বর্তমান audit report সম্পন্ন করতে এই তথ্য আর বাধ্যতামূলক নয়। ভবিষ্যৎ incident-এর exact device-level correlation-এর জন্য:

1. সম্ভব হলে staging-এর synthetic student ও non-personal test photo ব্যবহার করুন। শুধু investigation-এর জন্য production-এ test upload বা student records পরিবর্তন করবেন না।
2. Device owner নিজের Android USB debugging অনুমোদন করবেন। Desktop Chrome-এর `chrome://inspect/#devices` থেকে Chrome tab বা PWA target inspect করুন। [Official Android remote debugging](https://developer.chrome.com/docs/devtools/remote-debugging/)
3. Network → Preserve log; Console খোলা রাখুন। একটি normal workflow upload-এর timestamp বাংলাদেশ সময়সহ লিখুন। File content নয়—selected file-এর byte size, MIME ও camera/gallery source নোট করুন।
4. Failed POST-এ status, sanitized path, response error code/text, visible request Content-Length, `x-vercel-id`, public deployment/build identifier এবং first/final stage নোট করুন। Console-এর error message/digest নিন। `_rsc`/photo/student identifiers redact করুন।
5. 413 + gateway-size error থাকলে ingress classification; 404 + action-not-found হলে stale action; 303 + login redirect হলে auth; HTTP 200 Flight-এর ভিতরের error বা successful commit-এর পর failure হলে আলাদা storage/DB/render correlation লাগবে।
6. **Raw HAR পাঠাবেন না।** “Sanitized HAR” হলেও multipart request data, filenames, private URLs/IDs থেকে যেতে পারে। Metadata-only summary দিন; Cookie/Set-Cookie/Authorization/token/request-body/photo content বাদ দিন।
7. একই synthetic case-এ ছোট ও বড় file দিয়ে staging control run করুন। Production logs retention-এর মধ্যে request ID দিয়ে read-only lookup করুন।

## ১২. Evidence artifacts ও পুনরায় চালানোর নোট

এই workstation-এ evidence directory:

`C:/Users/zisan/.codex/visualizations/2026/09/14/01a09f2d-6f58-7691-8345-fc54d9d7639c/homework-upload-audit-20261107/`

| Artifact | বিষয় |
|---|---|
| `production-request-evidence.json` | Redacted failed-request metadata, timestamps/IDs, pagination summary |
| `production-post-summary.json` | সব retrieved POST-এর status ও coarse browser/platform family; raw UA/IP নেই |
| `request-results.json` | Corrected HTTP matrix-এর ২২টি scenario |
| `browser-gate.jsonl` | Simulated 413, exact browser body bytes এবং `hasNextAction=true` |
| `simulated-413-browser.jpg` | Local error-boundary screenshot |
| `verification-summary.json` | Browser control-এর DB state ও final-file bytes |
| `setup.mjs`, `serve.mjs`, `requests.mjs`, `gate.mjs` | পৃথক reproduction harness; application source-এর বাইরে |
| `upload-faults.test.ts` | সাতটি mock fault-injection test |

Re-run-এ নতুন isolated database/context ব্যবহার করতে হবে। আগের committed attempts-এর বিরুদ্ধে matrix আবার চালালে duplicate-attempt validation আসবে; সেটিকে transport regression বলা যাবে না। `setup.mjs` নতুন DB তৈরি করে; source copy ও dependencies/junction setup-ও প্রয়োজন। Test server-এ token empty এবং context-এর isolated DB guard অক্ষুণ্ণ রাখতে হবে।

Audit শেষে test server/proxy বন্ধ করা হয়েছে; database ও artifacts inspection-এর জন্য রাখা হয়েছে। Source code, `.env`, production records/Blob এবং existing historical homework অপরিবর্তিত। **এখন পর্যন্ত কোনো fix deploy বা application implementation করা হয়নি।**
