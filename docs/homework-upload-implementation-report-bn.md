# Homework photo upload — implementation ও verification report

তারিখ: ৭ নভেম্বর ২০২৬। Workspace: `E:/SwiftMath`।

## ফলাফল

বর্তমান Student uploader-এ ছবির bytes আর Next.js Server Action বা application Function-এর request body দিয়ে যায় না। Browser সরাসরি **private Vercel Blob**-এ upload করে। Application শুধু ছোট authorization ও finalization JSON পায়। ফলে নতুন flow-তে ৮ MiB photo-ও Function-এর 4.5 MB ingress limit-এর মধ্যে পাঠানোর প্রয়োজন নেই।

আগের audit পড়েই implementation করা হয়েছে: [মূল audit](E:/SwiftMath/docs/homework-upload-root-cause-audit.md)। Production database, stored photo, `.env`, Vercel environment/deployment configuration পরিবর্তন করা হয়নি। Commit, push বা deploy করা হয়নি।

**Readiness:** implementation ও নিচের local checks সম্পন্ন। বাস্তব Vercel private storage, Android camera এবং installed Android PWA-তে staging acceptance এখনও বাকি। সেগুলো PASS বলা হচ্ছে না। আলাদা staging নিশ্চিত না থাকায় আপনার নির্দেশ অনুযায়ী synthetic data, নতুন isolated PostgreSQL database ও private local storage mock ব্যবহার করা হয়েছে।

## নতুন flow

```mermaid
sequenceDiagram
    participant B as Student browser / PWA
    participant A as Next.js API
    participant S as Private Blob
    participant D as PostgreSQL
    B->>B: Check image bytes, optional compression, SHA-256
    B->>A: Small JSON: create upload intent
    A->>D: Authorize homework + create scoped ticket
    B->>A: Request short-lived Blob client token
    A-->>B: Exact-path upload authorization
    B->>S: Photo bytes directly
    B->>A: Small JSON: finalize ticket
    A->>S: Read private object; verify size, hash and decoder
    A->>D: Atomic ticket claim + submission mutation
    A-->>B: Saved submission ID
    B->>B: Refresh current homework status
```

Routes:

| Route | কাজ |
|---|---|
| `POST /api/student/homework/uploads` | Homework, page, attempt ও file metadata-তে bound intent তৈরি |
| `POST /api/student/homework/blob` | Authenticated scoped client token; signed storage callback |
| `GET /api/student/homework/uploads/[uploadId]` | নিজের upload status/recovery details |
| `POST /api/student/homework/uploads/[uploadId]` | Metadata-only finalization; ছবি এখানে পাঠানো হয় না |
| `POST /api/student/homework/uploads/diagnostics` | Authenticated, bounded client failure diagnostics |
| `PUT /api/student/homework/uploads/[uploadId]` | শুধু non-production filesystem development; production-এ 404 |

Production-এ Blob configuration অনুপস্থিত থাকলে fail closed হয়; বড় file request দিয়ে fallback করার চেষ্টা হয় না। `next.config.ts`-এর existing Server Action limit পরিবর্তন করা হয়নি। পুরোনো service/action helpers compatibility-র জন্য রয়ে গেছে; নতুন Student page সেগুলো দিয়ে photo submit করে না।

## Authorization ও validation

- Browser-এর upload authorization/finalization request-এ session, Student role, homework permission, active account এবং active institute যাচাই হয়। অন্য Student/Institute-এর ticket বা expectation দিয়ে upload/finalize করা যায় না। Storage callback আলাদাভাবে SDK signature দিয়ে যাচাই হয়।
- State-changing browser request-এ existing `BETTER_AUTH_URL` origin যাচাই হয়। Reverse proxy-এর internal host আলাদা হলেও configured origin কাজ করে; arbitrary forwarded headers trust করা হয় না।
- Intent-এ student/institute, expectation, FIRST/FINAL phase, page, attempt, exact random pathname, MIME, size ও SHA-256 bind করা হয়। Final photo-র target submission-ও bind করা হয়। Client arbitrary Blob URL দিয়ে finalization করাতে পারে না।
- Intent validity ৩০ মিনিট। Blob client token সর্বোচ্চ ১০ মিনিট এবং intent expiry-এর মধ্যে সীমাবদ্ধ। Exact path, MIME এবং expected byte count enforce করা হয়; random suffix ও overwrite বন্ধ। Permanent read-write token server-এ থাকে।
- JSON request cap 16 KiB; transferred image cap 8 MiB (8,388,608 bytes)। Filename/MIME-কে একমাত্র প্রমাণ ধরা হয় না: byte signature এবং server-side full decoder validation হয়। SHA-256/size mismatch হলে submission তৈরি হয় না।
- JPG, PNG ও WebP পুরো decode হয়। HEIC/HEIF-এর genuine fixture দিয়ে decoder পরীক্ষা হয়েছে। SVG/GIF/PDF, malformed/truncated image এবং excessive image dimensions reject হয়; JPG/PNG/WebP decoder একাধিক page শনাক্ত করলেও reject হয়। Pixel ceiling ৪০ মিলিয়ন।
- HEIC original private storage-এ অপরিবর্তিত থাকে। Existing authorized photo route থেকে JPEG preview দেওয়া হয়, যাতে browser-এ review করা যায়। পুরোনো photo URL/key rewrite করা হয়নি।
- ঐচ্ছিক compression default **off**। চালু করলে supported browser-এ maximum dimension 2400px ও JPEG quality 94% ব্যবহার হয়; output বড় হলে original রাখা হয়। HEIC original browser-এ recompress করা হয় না। Handwriting readability-এর বাস্তব device check staging checklist-এ রাখা হয়েছে।

Implementation reference: [authorization/create](E:/SwiftMath/server/homework-uploads.ts:94), [token scope](E:/SwiftMath/server/homework-uploads.ts:200), [image validation](E:/SwiftMath/server/homework-image-validation.ts:17), [HTTP/session guards](E:/SwiftMath/server/homework-upload-http.ts:48)।

## Timer, retry ও duplicate protection

- First photo verified হয়ে submission transaction সফল হওয়ার সময় server/database timestamp দিয়ে timer শুরু হয়। শুধু file select, button click বা token নেওয়ার সময় timer শুরু হয় না।
- Final photo verified হওয়ার পরে server timestamp দিয়েই submission, completion seconds, lateness ও overtime গণনা হয়। Existing `homeworkTiming` ব্যবহৃত হয়। Final upload/verification চলাকালে timer চলা আগের workflow-এর মতোই রয়েছে।
- একটি ticket-এর finalization বারবার করলে একই submission ID ফেরত আসে। `startedAt`, `submittedAt` বা completion time পুনরায় লেখা হয় না।
- Ticket CAS, expectation row lock এবং submission write একই PostgreSQL transaction-এ হয়। একই attempt-এর competing first/final uploads বিজয়ী submission/photo overwrite করতে পারে না।
- Storage transfer সফল কিন্তু acknowledgement হারালে uploader আগে stored object finalize/recover করার চেষ্টা করে। Database failure হলে claim rollback হয়; ticket retry করা যায়।
- Refresh/reopen recovery-তে `sessionStorage`-এ শুধু versioned ticket ID ও compression preference থাকে; photo bytes, credential বা Blob token থাকে না। অসম্পূর্ণ transfer হলে একই original photo আবার select করতে হবে। Compression preference ফিরে আসে, যাতে processed file-এর hash পুনরায় মেলানো যায়।
- Expired/conflicting intent নতুন authorization দিয়ে retry করা যায়। Whole-file retry supported; byte-range resumable/offline background upload দাবি করা হচ্ছে না।
- Pause upload browser request বন্ধ করে। Storage ইতিমধ্যে গ্রহণ করে থাকলে পরের Retry/Recover সেটিই ব্যবহার করতে পারে। Pause কোনো homework/history delete করে না।

Reference: [atomic finalization](E:/SwiftMath/server/homework-uploads.ts:376), [client uploader](E:/SwiftMath/components/homework/homework-photo-upload.tsx:19)।

## UI ও diagnostics

Spinner, disabled submit, transfer percentage/progress bar এবং verification stage দেখায়। File input authorization-এর সময় remount করে selection মুছে ফেলে না। Same upload-এর repeated click block থাকে। Existing page type/select suggestions এবং timer component reuse হয়েছে।

Session expiry হলে sign-in link; unsupported/oversized/corrupt image হলে নির্দিষ্ট নির্দেশনা; network/storage/DB সমস্যা হলে retry/recovery message দেখায়। Homework rendering ব্যর্থ হলে dedicated error boundary status refresh করতে বলে—আগে saved হয়ে থাকতে পারে বলে blind duplicate submission উৎসাহিত করে না।

Structured server events: authorization, token issuance, storage verification/callback, DB commit/failure, client transfer failure ও cleanup। Correlation hash, safe error code, HTTP status, bytes/duration log হয়; নতুন diagnostics-এ raw exception, token, cookie, image bytes বা student name/contact লেখা হয় না। Browser-এও bounded structured failure warning থাকে। Offline হলে client diagnostic server পর্যন্ত পৌঁছানোর নিশ্চয়তা নেই।

Homework HTML/RSC এখন service worker-এর network-only rule-এ থাকে। API/private photo-এর existing protections বজায় আছে। Existing PWA update notice/refresh mechanism রাখা হয়েছে; release-এর পরে পুরোনো খোলা PWA refresh করা প্রয়োজন।

## Database migration ও historical safety

নতুন additive migration:

`E:/SwiftMath/prisma/migrations/20261107010000_homework_direct_photo_uploads/migration.sql`

নতুন `HomeworkPhotoUploadKind`, `HomeworkPhotoUploadStatus` enum এবং `HomeworkPhotoUpload` table যোগ হয়েছে। Institute/User/Expectation relation, request deduplication index, unique pathname, expiry/status indexes এবং size/hash/state checks আছে। Existing homework submission, score, timing বা photo key update/delete করার SQL নেই।

Isolated database-এ migration-এর **আগে** genuine historical fixture রাখা হয়েছিল: APPROVED, score 8.5, completion 272 seconds এবং legacy `blob:homework/...` keys। Migration-এর আগে/পরে full-row fingerprint সমান; tests-এ একই values ও keys আছে।

Local source database শুধু repeatable-read/read-only transaction দিয়ে fingerprint করা হয়েছে। Class Performance, entries, homework-এর চারটি table এবং Practice—সাতটি table-এর before/after fingerprint অপরিবর্তিত। Source-এ homework/Class Performance rows শূন্য; Practice rows ছয়টি। অতএব এটি local source অপরিবর্তিত থাকার প্রমাণ; production historical dataset independently audited হয়েছে—এমন দাবি নয়। Production-এ কোনো write/migration চালানো হয়নি।

Existing homework cron নতুন namespace-এর abandoned uploads পরিষ্কার করতে পারে: expiry-এর অন্তত ২৪ ঘণ্টা পরে, সর্বোচ্চ ২৫টি candidate/run। কেবল unfinalized, unreferenced `homework-uploads/...` object delete হয়। Legacy `homework/...`, finalized ticket বা submission-এ referenced photo এতে delete হয় না। Cleanup failure retryable থাকে; callbacks late এলে expired cleanup আবার eligible করা হয়।

Reference: [schema](E:/SwiftMath/prisma/schema.prisma:855), [cleanup](E:/SwiftMath/server/homework-uploads.ts:480)।

## পরিবর্তিত/নতুন files

| অংশ | Files |
|---|---|
| Student UI | `E:/SwiftMath/app/student/homework/page.tsx`, `E:/SwiftMath/app/student/homework/error.tsx`, `E:/SwiftMath/components/homework/homework-photo-upload.tsx` |
| Upload API | `E:/SwiftMath/app/api/student/homework/uploads/route.ts`, `E:/SwiftMath/app/api/student/homework/uploads/[uploadId]/route.ts`, `E:/SwiftMath/app/api/student/homework/uploads/diagnostics/route.ts`, `E:/SwiftMath/app/api/student/homework/blob/route.ts` |
| Server | `E:/SwiftMath/server/homework-uploads.ts`, `E:/SwiftMath/server/homework-upload-http.ts`, `E:/SwiftMath/server/homework-image-validation.ts`, `E:/SwiftMath/server/homework.ts`, `E:/SwiftMath/server/homework-photos.ts` |
| Shared/client | `E:/SwiftMath/lib/homework-upload.ts`, `E:/SwiftMath/lib/homework-upload-client.ts`, `E:/SwiftMath/types/heic-decode.d.ts` |
| DB/cron | `E:/SwiftMath/prisma/schema.prisma`, migration SQL উপরে, `E:/SwiftMath/app/api/cron/homework/route.ts` |
| PWA | `E:/SwiftMath/lib/pwa-runtime-caching.ts`, `E:/SwiftMath/lib/pwa-runtime-caching.test.ts` |
| Tests | `E:/SwiftMath/server/homework-uploads.integration.test.ts`, `E:/SwiftMath/server/homework-image-validation.test.ts`, `E:/SwiftMath/lib/homework-upload-client.test.ts`, `E:/SwiftMath/components/homework/homework-photo-upload.test.ts` |
| Fixtures/runner | `E:/SwiftMath/test/fixtures/homework-synthetic.heic`, `E:/SwiftMath/test/fixtures/README.md`, `E:/SwiftMath/scripts/test-class-performance-db.mjs` |
| Dependencies/tooling | `E:/SwiftMath/package.json`, `E:/SwiftMath/package-lock.json`, `E:/SwiftMath/vitest.config.ts`, `E:/SwiftMath/eslint.config.mjs`, `E:/SwiftMath/tsconfig.json` |
| এই report | `E:/SwiftMath/docs/homework-upload-implementation-report-bn.md` |

`heic-decode@2.1.0` ও তার decoder dependency যোগ হয়েছে। Test/lint/TypeScript discovery থেকে `.data` বাদ দেওয়া হয়েছে, যাতে isolated shadow app ও private runtime artifacts source test হিসেবে scan না হয়। আগের audit document এই কাজ শুরুর আগেই ছিল এবং পরিবর্তন করা হয়নি। Prisma generated client regenerate করা হয়েছে; generated files tracked change নয়।

## Verification results

| Check | Final result |
|---|---|
| TypeScript `tsc --noEmit` | PASS |
| Prisma schema validation/generation | PASS |
| ESLint | 0 errors; 7 existing unused-import/parameter warnings, সব untouched files-এ |
| Standard automated tests | 401 PASS; 58 DB tests default run-এ skipped |
| Isolated Homework upload DB suite | 31 PASS |
| Existing isolated Class Performance DB suite | 15 PASS |
| Existing isolated Reports DB suite | 12 PASS |
| Aggregate automated tests, DB suites-সহ | **459 PASS, 0 FAIL**; default-skipped 58টি আলাদা suites-এ চালানো হয়েছে |
| Production-like local HTTP checks | **50 PASS, 0 FAIL** |
| Production build | PASS; isolated shadow source ও test-only process environment |
| Read-only source DB integrity / migration fixture | PASS |
| Migrated isolated DB বনাম Prisma schema, read-only `migrate diff` | PASS; empty migration, exit 0 |

নতুন regression coverage: image formats/decoder, 8 MiB boundary, spoofed/truncated files, excessive pixels, optional compression settings, progress/duplicate-click prevention, pause, session expiry, refresh recovery, compressed-file recovery, lost acknowledgements, metadata cap, CSRF/reverse proxy, token scope/signature, cross-student/institute denial, first/final timer semantics, concurrent commits, DB rollback/retry, storage failure, approved-page protection, Attempt 2, historical teacher authorization এবং abandoned-object cleanup।

HTTP harness-এ real Blob SDK, real Next.js production build ও real isolated PostgreSQL ব্যবহার হয়েছে; storage backend স্থানীয় private mock। Application ingress-এ 4,500,000-byte simulated cap ছিল। এটি actual Vercel infrastructure test নয়।

**সরাসরি evidence:**

- 1, 2, 4, 5 ও 8 MiB JPG—FIRST এবং FINAL উভয় upload সফল। Private read-এ exact original byte hash মিলে গেছে। PNG/WebP/genuine HEIC finalization ও authorized preview-ও সফল।
- Normal upload flow-এর সর্বোচ্চ application POST body **894 bytes**; photo transfer **8,388,608 bytes** সরাসরি mock Blob-এ গেছে। Normal photo flow-তে application 413: **0**।
- Control হিসেবে পুরোনো ধরনের 5 MiB application POST একই local gateway-এ 413 দিয়েছে। Oversized metadata ও disabled production binary fallback-ও যথাক্রমে 413/404 দিয়েছে—এগুলো deliberate rejection।
- Actual Chromium browser-এ first/final দুটো 8 MiB photo, refresh-persistent timer, delayed transfer এবং storage acknowledgement drop পরীক্ষা হয়েছে। Private object সফল হলেও response হারানোর পর automatic recovery হয়েছে। Read-only DB verification: `SUBMITTED`, Attempt 1, মোট **একটি** attempt, completion **133 seconds**, first/final উভয় object **8,388,608 bytes**।
- Browser progress 63% ও disabled submit দৃশ্যমান ছিল। 390px responsive viewport-এ submitted history যাচাই হয়েছে। এটি Android hardware/browser certification নয়।
- Size fixtures transport যাচাইয়ের জন্য ছোট valid image-এ padding দিয়ে তৈরি। Synthetic HEIC-তে শুধু test text আছে। Real high-resolution camera photo quality/performance staging-এ পরীক্ষা করতে হবে।

Local evidence directory:

`C:/Users/zisan/.codex/visualizations/2026/09/14/01a09f2d-6f58-7691-8345-fc54d9d7639c/homework-upload-fix-20261107/`

এখানে `http-results.json`, `final-evidence.json`, `transport.jsonl`, `build.log`, isolated setup/mock/harness scripts ও browser screenshot আছে। Synthetic test databases inspection-এর জন্য রাখা হয়েছে; কোনো source/production database reset বা truncate করা হয়নি।

![Local synthetic mobile-width submission proof](C:/Users/zisan/.codex/visualizations/2026/09/14/01a09f2d-6f58-7691-8345-fc54d9d7639c/homework-upload-fix-20261107/browser-success-mobile.jpg)

পুনরায় regression চালানোর commands:

```powershell
npm test
npm run test:homework-uploads:db
npm run test:class-performance:db
npm run test:reports:db
npx tsc --noEmit
npm run lint
npx prisma validate
```

DB runner localhost source URL থেকেই **নতুন** `swiftmath_cp_regression_<timestamp>` database বানায়; source DB migrate/seed/clean করে না। DB suites সেই dedicated name ও localhost guard ছাড়া execute হয় না। `.env` edit করার প্রয়োজন নেই।

## Approval-এর পরে staging ও deployment checklist

1. আলাদা non-production database, **private** Blob store ও HTTPS staging URL নিশ্চিত করতে হবে। কোনো paid resource বা deployment এখানে তৈরি করা হয়নি। Existing production Blob token staging-এ reuse করবেন না।
2. Target DB backup/migration status review করে additive migration apply করতে হবে; তারপর regenerated Prisma client-সহ app release। `prisma migrate deploy` সব pending migration apply করে, তাই আগে pending list review আবশ্যক। Production-এ `migrate dev/reset`, truncate বা history repair নয়।
3. Existing `DATABASE_URL`, server-only `BLOB_READ_WRITE_TOKEN`, auth secret ও সঠিক `BETTER_AUTH_URL` staging scope-এ প্রয়োজন। Auth origin browser URL-এর সঙ্গে মিলতে হবে। Local mock/API URL overrides production-এ রাখা যাবে না।
4. Real Android Chrome ও installed PWA—কমপক্ষে দুটি device/camera—থেকে JPG/PNG/WebP/HEIC এবং 1–8 MiB FIRST/FINAL পরীক্ষা। First success-এর আগে timer নয়; refresh-এর পরে একই timer; final success-এর পরে একবারই SUBMITTED।
5. Optional compression চালু/বন্ধ করে handwriting zoom করে পড়া যায় কি না এবং orientation যাচাই। 12MP/উচ্চ-resolution photo-য় memory, decoder latency ও Function duration মাপতে হবে। 40MP-এর বেশি image-এর actionable rejection যাচাই।
6. Slow 3G/offline, token নেওয়ার আগে disconnect, transfer-এর মধ্যে pause, storage success-এর পরে connection loss, finalization-এর সময়ে session expiry, login করে recovery—কোনো duplicate/history overwrite নয়। Expired ticket হলে নতুন upload দিয়ে retry।
7. Actual Blob CORS, scoped token expiry/path/MIME/size/overwrite constraints এবং signed callbacks যাচাই। Direct private URL unauthenticated অবস্থায় readable হওয়া চলবে না। Cross-student/cross-institute API ও teacher private access আবার পরীক্ষা।
8. Teacher review: নতুন photo দেখুন, approve/reject/resubmit, score/comment/history যাচাই; Attempt 2 আলাদা থাকবে। Student group move-এর পর original teacher historical access এবং unrelated teacher denial যাচাই।
9. Existing cron authorization ও cleanup-এর staging-only orphan fixture যাচাই। Daily volume-এ ২৫টি candidate/run backlog হচ্ছে কি না monitor করতে হবে; existing cron/deployment configuration এখানে পাল্টানো হয়নি।
10. পুরোনো খোলা PWA-তে existing Update/Refresh দিন। নতুন uploader load হয়েছে এবং homework/photo API offline cache থেকে আসছে না—যাচাই করুন।

## বাকি সীমাবদ্ধতা

বাস্তব Android camera/PWA, mobile OS process termination, actual Vercel private store/edge এবং cloud latency এই environment-এ পরীক্ষা করা যায়নি। Local responsive Chromium, mocked private transport এবং isolated PostgreSQL tests এগুলোর বিকল্প নয়। HEIC decode CPU/memory ও compression readability-এর device-level acceptance release-এর আগে দরকার।

Internet একেবারে না থাকলে upload সম্পূর্ণ করা যায় না; progress/retry state দেখানো হয়। Pending intent ৩০ মিনিট পরে expire হয়; নতুন photo transfer লাগতে পারে। Browser storage unavailable হলে in-memory retry কাজ করে, refresh recovery নিশ্চিত নয়। Re-encoding browserভেদে byte-identical না হলে hash mismatch দেখিয়ে explicit new-upload flow নিতে হবে; saved historical submission পাল্টাবে না।

**কোনো automatic deployment হয়নি। Approval ও staging acceptance ছাড়া live release করা হবে না।**

SDK/API reference: [Vercel client uploads](https://vercel.com/docs/vercel-blob/client-upload), [Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)।
