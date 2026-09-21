# SwiftMath / SEFT Abacus — Client UAT Test Flow

এই document-টি এমন client-এর জন্য লেখা, যিনি technical route, database, বা API
সম্পর্কে জানেন না। Screen-এ যে English button/menu দেখা যাবে, সেটি এখানে
`code style`-এ লেখা হয়েছে।

> Document version: 4 August 2026
>
> Test type: Client User Acceptance Testing (UAT)
>
> Roles: Super Admin, Institute Admin, Teacher, Student

---

## 1. Client কীভাবে এই document ব্যবহার করবেন

প্রতিটি test-এর জন্য নিচের নিয়ম অনুসরণ করুন:

1. **Route / Menu** দেখে নির্দিষ্ট page-এ যান। URL নিজে edit করার দরকার নেই।
2. **যা করবেন** অংশের ধাপগুলো একটির পর একটি করুন।
3. **Pass হবে যদি** অংশের ফলাফল screen-এ মিলে যায়।
4. ফলাফলের ঘরে `PASS`, `FAIL`, অথবা `BLOCKED` লিখুন।
5. `FAIL` হলে screenshot নিন এবং bug report template অনুযায়ী লিখুন।

### Result-এর অর্থ

| Result | কখন লিখবেন |
| --- | --- |
| `PASS` | প্রত্যাশিত ফলাফল ঠিকমতো দেখা গেছে |
| `FAIL` | page খুলেছে, কিন্তু ভুল result/error/behavior দেখা গেছে |
| `BLOCKED` | প্রয়োজনীয় account/data/permission না থাকায় test করা যায়নি |
| `N/A` | feature এই environment/browser-এ প্রযোজ্য নয় |

---

## 2. Test শুরু করার আগে

### 2.1 নিরাপদ test environment

- শুধুমাত্র staging/demo link ব্যবহার করুন। Production data দিয়ে test করবেন না।
- Chrome অথবা Edge-এর latest version ব্যবহার করা ভালো।
- Mobile test-এর জন্য একটি Android Chrome এবং সম্ভব হলে একটি iPhone Safari রাখুন।
- Super Admin, Admin, Teacher, Student—প্রতিটি role আলাদা browser profile বা
  Incognito window-তে খুললে বারবার logout করতে হবে না।
- নতুন test data-র নামের শুরুতে `UAT` এবং তারিখ দিন। উদাহরণ:
  `UAT Institute 04Aug`, `UAT Teacher 04Aug`, `UAT Group A`।

### 2.2 Demo account (শুধু seeded demo/staging database হলে)

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `super@seft.test` | `Password123!` |
| Institute Admin | `admin@seft.test` | `Password123!` |
| Teacher | `teacher@seft.test` | `Password123!` |
| Student | `aisha@seft.test` | `Password123!` |

> Production-এ এই demo password ব্যবহার করা যাবে না। Client-এর staging-এ
> account আলাদা হলে project team-এর দেওয়া credential লিখুন।

### 2.3 Test data sheet

Test শুরুর আগে নিচের তথ্য পূরণ করুন:

| Item | Test value |
| --- | --- |
| App link | |
| Test date | |
| Tester name | |
| UAT institute name | |
| UAT institute slug | |
| UAT admin email | |
| UAT teacher email | |
| UAT student email | |
| UAT group name | |
| UAT level name | |

### 2.4 গুরুত্বপূর্ণ test order

নিচের role order অনুসরণ করুন, কারণ এক role-এর তৈরি data পরের role ব্যবহার করবে:

1. Public pages ও sign-in
2. Super Admin — institute ও first admin তৈরি
3. Institute Admin — branding, teacher, curriculum, group ও student তৈরি
4. Teacher — classroom setup, level assignment ও exam schedule
5. Student — practice, exam, ranking ও notification
6. Permission, disable, delete এবং negative/security test সবশেষে

কোনো live/important institute, seeded demo institute, অথবা একমাত্র active admin
disable/delete করবেন না। Destructive test শুধু `UAT` নামের temporary data-তে করুন।

---

## 3. Quick route map

`[instituteId]`, `[groupId]`, `[levelId]`, `[teacherId]`, `[studentId]`, এবং
`[sessionId]` system নিজে তৈরি করে। Client menu/card/button থেকে page খুলবেন;
এই লেখা URL-এ paste করবেন না।

### 3.1 Public এবং shared routes

| Route | কী দেখা/করা যায় |
| --- | --- |
| `/` | Public landing page, product highlights, sign-in link |
| `/login` | Email/password sign-in |
| `/forgot-password` | Password reset link request |
| `/reset-password` | Email-এর valid link থেকে নতুন password set |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |
| `/help/student-install` | Public Bengali/English phone install handout |
| `/dashboard` | Login করা user-কে তার role-এর home-এ পাঠায় |
| `/account` | Profile, password, alert, push ও preference settings |
| `/403` | Permission না থাকলে friendly message |
| `/~offline` | Internet না থাকলে offline message |

### 3.2 Super Admin routes

| Route | Screen |
| --- | --- |
| `/super` | Platform dashboard |
| `/super/institutes` | Institute list, create/edit/enable/disable |
| `/super/institutes/[instituteId]` | Institute overview |
| `/super/institutes/[instituteId]/admins` | Admin create/reset/disable/permissions |
| `/super/institutes/[instituteId]/settings` | Institute identity ও platform access |
| `/super/notifications` | Super Admin notifications |

### 3.3 Institute Admin routes

| Route | Screen |
| --- | --- |
| `/admin` | Institute dashboard ও onboarding checklist |
| `/admin/teachers` | Teacher roster ও create |
| `/admin/teachers/[teacherId]` | Teacher edit, access, reset, permissions |
| `/admin/students` | Student roster, create, export |
| `/admin/students/[studentId]` | Student progress ও permissions |
| `/admin/groups` | Group roster ও create |
| `/admin/groups/[groupId]` | Group overview |
| `/admin/groups/[groupId]/students` | Group students |
| `/admin/groups/[groupId]/settings` | Group edit/delete |
| `/admin/levels` | Curriculum levels |
| `/admin/levels/new` | New level form |
| `/admin/levels/[levelId]` | Level overview |
| `/admin/levels/[levelId]/questions` | Question bank ও CSV import |
| `/admin/levels/[levelId]/settings` | Level rules ও archive/restore |
| `/admin/notifications` | Institute notifications |
| `/admin/activity` | Institute activity/audit log |
| `/admin/settings` | Branding ও curriculum version |

### 3.4 Teacher routes

| Route | Screen |
| --- | --- |
| `/teacher` | Teacher dashboard |
| `/teacher/students` | নিজের সব group-এর students |
| `/teacher/exams` | নিজের সব group-এর exams |
| `/teacher/groups` | নিজের groups |
| `/teacher/groups/[groupId]` | Group overview |
| `/teacher/groups/[groupId]/students` | Student create/level assign |
| `/teacher/groups/[groupId]/students/[studentId]` | Progress, move, password reset |
| `/teacher/groups/[groupId]/exams` | Exam schedule/manage |
| `/teacher/groups/[groupId]/analytics` | Group analytics |
| `/teacher/groups/[groupId]/questions` | Group question overrides |
| `/teacher/groups/[groupId]/settings` | Timer overrides ও delete |
| `/teacher/ranking` | Ranking filters |
| `/teacher/notifications` | Teacher notifications |
| `/teacher/activity` | Teacher activity log |

### 3.5 Student routes

| Route | Screen |
| --- | --- |
| `/student` | Student home, level, group, streak, exam |
| `/student/practice` | Standard, Challenge ও Review mode |
| `/student/practice/[sessionId]` | Questions, timer এবং result |
| `/student/ranking` | Institute ranking |
| `/student/ranking/global` | Global elite ranking |
| `/student/notifications` | Student notifications |
| `/student/help/install` | Signed-in phone install guide |

---

## 4. Public, login ও shared test flow

### PUB-01 — Public home (`/`)

**যা করবেন**

1. Logout অবস্থায় app link খুলুন।
2. `Sign in`, `Forgot your password?`, `Privacy Policy`, এবং
   `Terms of Service` link দেখুন।
3. `Sign in` চাপুন।

**Pass হবে যদি**

- Landing page ভাঙা image বা layout ছাড়া load হয়।
- Sign-in button `/login` page খোলে।
- Public page দেখতে login প্রয়োজন হয় না।

Result: ______  Notes: ______________________________________________

### PUB-02 — Legal pages (`/privacy`, `/terms`)

**যা করবেন** footer থেকে দুইটি legal link একে একে খুলুন।

**Pass হবে যদি** title, last updated date, readable sections এবং back/navigation
স্বাভাবিক থাকে; blank page বা server error না আসে।

Result: ______  Notes: ______________________________________________

### AUTH-01 — ভুল login

1. `/login` খুলুন।
2. ভুল email/password দিয়ে `Sign in` চাপুন।

**Pass হবে যদি** `Invalid email or password.` message আসে এবং কোন account আছে
কি না সে বিষয়ে আলাদা তথ্য প্রকাশ না করে।

Result: ______  Notes: ______________________________________________

### AUTH-02 — Role অনুযায়ী login redirect

প্রতিটি role দিয়ে login করে নিচের ফলাফল মিলিয়ে নিন:

| Role | Login-এর পর expected route |
| --- | --- |
| Super Admin | `/super` |
| Institute Admin | `/admin` |
| Teacher | `/teacher` |
| Student | `/student` |

**Pass হবে যদি** `/dashboard` ব্যবহারকারীকে সঠিক role home-এ পাঠায় এবং অন্য
role-এর sidebar menu না দেখায়।

Result: ______  Notes: ______________________________________________

### AUTH-03 — Protected page redirect

1. Logout করুন।
2. সরাসরি `/student/practice` অথবা `/admin/teachers` খুলুন।
3. Login page এলে সঠিক account দিয়ে sign in করুন।

**Pass হবে যদি** প্রথমে `/login`-এ নেয় এবং login-এর পর চাওয়া protected page-এ
ফিরিয়ে দেয়।

Result: ______  Notes: ______________________________________________

### AUTH-04 — Forgot password

1. Login page থেকে `Forgot password?` চাপুন।
2. test account email লিখে `Send reset link` চাপুন।
3. Email inbox দেখুন। Local demo হলে developer terminal-এর reset link লাগতে পারে।
4. Link খুলে একই নতুন password দুইবার লিখে `Set new password` চাপুন।
5. নতুন password দিয়ে login করুন।

**Pass হবে যদি** generic success message আসে, link কাজ করে, mismatch/৮ অক্ষরের
কম password reject হয়, এবং সফল reset-এর পর নতুন password দিয়ে login করা যায়।

Result: ______  Notes: ______________________________________________

### AUTH-05 — Account menu, account settings ও sign out (`/account`)

প্রতিটি role-এর একটিতে অন্তত একবার করুন:

1. উপরের ডানদিকে user name/avatar চাপুন।
2. `Account settings` খুলুন।
3. Name, Email, Role ঠিক আছে কি না দেখুন।
4. `Notification sound` → `Preview` এবং On/Muted test করুন।
5. Notification preference থাকলে একটি off করে আবার on করুন।
6. Test password ব্যবহার করে `Change password` করুন, তারপর প্রয়োজন হলে আগের
   password-এ ফিরিয়ে আনুন।
7. user menu থেকে `Sign out` করুন।

**Pass হবে যদি** setting save toast আসে, preference refresh-এর পরও থাকে,
password change-এর পর নতুন password কাজ করে, এবং sign out-এর পর protected page
খুললে login page আসে।

Result: ______  Notes: ______________________________________________

---

## 5. Super Admin full test flow

### SA-01 — Dashboard (`/super`)

1. Super Admin দিয়ে login করুন।
2. `Institutes`, `Admins`, `Teachers`, `Students` count দেখুন।
3. `Practice (last 7 days)`-এর Sessions, Pass rate, Avg accuracy এবং chart দেখুন।
4. `Institutes` card খুলুন।

**Pass হবে যদি** platform-wide data load হয়, negative/NaN value না থাকে, এবং
Institutes page খোলে।

Result: ______  Notes: ______________________________________________

### SA-02 — নতুন institute ও first admin (`/super/institutes`)

1. `New institute` চাপুন।
2. নিচের sample অনুযায়ী পূরণ করুন:
   - Name: `UAT Institute 04Aug`
   - Slug: `uat-institute-04aug` (শুধু lowercase, number, hyphen)
   - Tagline: `UAT mental math academy`
   - Logo URL: optional valid `https://...` image
   - First admin Full name, unique Email, Temporary password (কমপক্ষে ৮ অক্ষর)
3. `Create institute` চাপুন।

**Pass হবে যদি** `Institute created` toast আসে, dialog বন্ধ হয়, নতুন institute
list-এ Active অবস্থায় দেখা যায়, এবং একইসাথে first admin তৈরি হয়।

**Negative check:** একই slug/email দিয়ে আবার চেষ্টা করলে duplicate error আসবে।

Result: ______  Notes: ______________________________________________

### SA-03 — Institute list actions

নতুন UAT institute card-এ নিচের কাজ করুন:

1. Card title খুলে Overview যান।
2. List-এ ফিরে `Edit` থেকে tagline বা logo URL বদলে `Save changes` করুন।
3. `Admins` এবং `Settings` shortcut আলাদাভাবে খুলুন।

**Pass হবে যদি** Overview-এ name, slug, tagline, created date এবং user/group/level
counts সঠিক হয়; edit করার পর list ও overview—দুই জায়গায় নতুন value দেখা যায়।

Result: ______  Notes: ______________________________________________

### SA-04 — Additional admin (`.../admins`)

1. `Create admin` section-এ unique Full name, Email, Temporary password লিখুন।
2. `Create admin` চাপুন।
3. তৈরি admin-এর `Reset password` খুলুন; নতুন password ও confirmation লিখে `Save`।
4. Incognito window-তে admin-এর নতুন password দিয়ে login করুন।

**Pass হবে যদি** `Admin created` এবং password reset success message আসে; নতুন
password দিয়ে `/admin` খোলে; পুরোনো session/password আর ব্যবহারযোগ্য না থাকে।

Result: ______  Notes: ______________________________________________

### SA-05 — Admin permission override

1. Additional UAT admin-এর `Admin capabilities` section খুলুন।
2. `Institute branding` permission-এর Override `Deny` করে `Save` করুন।
3. ঐ admin দিয়ে login করে Admin → `Settings`-এ branding change submit করুন।
4. Super Admin-এ ফিরে Override `Role default` করুন।
5. Admin দিয়ে একই action আবার করুন।

**Pass হবে যদি** Deny অবস্থায় action hidden/disabled হয় অথবা `/403 Permission
required` আসে; `Role default` ফিরিয়ে দেওয়ার পর আবার কাজ করে; permission change
notification/activity তৈরি হয়।

Result: ______  Notes: ______________________________________________

### SA-06 — Admin enable/disable

1. শুধুমাত্র additional UAT admin-এ `Disable` চাপুন।
2. ঐ admin-এর খোলা page refresh করুন অথবা নতুন login চেষ্টা করুন।
3. Super Admin থেকে `Enable` করুন এবং আবার login করুন।

**Pass হবে যদি** disable-এর পর session বাতিল হয়ে login page-এ
`Your account has been disabled...` message আসে; enable-এর পর login চলে।

Result: ______  Notes: ______________________________________________

### SA-07 — Institute settings ও enable/disable (`.../settings`)

1. Name/tagline/logo edit করে `Save changes` করুন।
2. Test-এর একদম শেষে UAT institute `Disable` করুন।
3. UAT Admin/Teacher/Student account দিয়ে login/refresh করুন।
4. Super Admin দিয়ে institute আবার `Enable` করুন।

**Pass হবে যদি** disable-এর সঙ্গে institute-এর সব member logout/blocked হয়,
Super Admin নিজে blocked না হন, এবং enable-এর পর member login আবার চলে।

Result: ______  Notes: ______________________________________________

### SA-08 — Super notifications (`/super/notifications`)

1. Institute create/disable/enable করার পর `Notifications` খুলুন।
2. `All`, `Unread`, এবং Type filter ব্যবহার করুন।
3. একটি notification খুলুন এবং `Mark all read` test করুন।

**Pass হবে যদি** relevant event আসে, unread count কমে, filter ঠিকমতো কাজ করে,
এবং notification link সঠিক page-এ নেয়।

Result: ______  Notes: ______________________________________________

---

## 6. Institute Admin full test flow

UAT institute-এর Admin account দিয়ে login করুন।

### AD-01 — Dashboard ও onboarding (`/admin`)

1. Dashboard-এর Teachers, Students, Groups, Levels এবং practice analytics দেখুন।
2. `Getting started` checklist-এর incomplete item link খুলুন।
3. Data তৈরি করার পর dashboard-এ ফিরে counts/checklist update হয়েছে কি না দেখুন।

**Pass হবে যদি** শুধু নিজের institute-এর data দেখা যায়, shortcut সঠিক page খোলে,
এবং নতুন data অনুযায়ী count/checklist বদলায়।

Result: ______  Notes: ______________________________________________

### AD-02 — Branding ও institute settings (`/admin/settings`)

1. `Institute name`, optional `Tagline`, `Primary color` edit করুন।
2. 1 MB-এর কম PNG/JPEG/WebP/GIF logo upload করুন অথবা valid Logo URL দিন।
3. `Save changes` চাপুন।
4. Page refresh এবং logout/login করুন।

**Pass হবে যদি** `Institute settings saved` toast আসে; sidebar/header/login-এর
signed-in branding-এ নতুন name/logo/color দেখা যায়; `Slug` read-only থাকে।

**Negative check:** 1 MB-এর বড়/unsupported file বা invalid URL দিলে readable
error আসবে এবং আগের logo নষ্ট হবে না।

Result: ______  Notes: ______________________________________________

### AD-03 — Teacher create/list (`/admin/teachers`)

1. `Add teacher` চাপুন।
2. Full name, unique Email, Temporary password (৮+ অক্ষর) দিন।
3. Create করুন এবং search/list/pagination থাকলে list-এ teacher খুঁজুন।

**Pass হবে যদি** `Teacher added` toast আসে, নতুন teacher list-এ Active থাকে,
এবং duplicate email/short password error দেখায়।

Result: ______  Notes: ______________________________________________

### AD-04 — Teacher profile/access (`/admin/teachers/[teacherId]`)

Teacher row/card-এর `Manage` বা name খুলুন:

1. Full name/email edit করে `Save changes` করুন।
2. `Reset password` দিয়ে নতুন password set করুন।
3. Teacher দিয়ে নতুন password login test করুন।
4. `Disable` → teacher refresh/login test → `Enable` করুন।

**Pass হবে যদি** edit list-এ reflect করে, reset-এর পর old session revoked হয়,
disable-এ teacher blocked হয় এবং enable-এ login ফেরে।

Result: ______  Notes: ______________________________________________

### AD-05 — Teacher permissions

1. Teacher profile-এর `Teacher permissions` থেকে `Schedule exams`-এ `Deny` save করুন।
2. Teacher account দিয়ে Group → Exams খুলে exam schedule action test করুন।
3. Admin দিয়ে permission `Role default` করুন এবং teacher দিয়ে আবার test করুন।

**Pass হবে যদি** Deny অবস্থায় action দেখা না যায় অথবা `/403` আসে; default করার
পর action ফিরে আসে; teacher notification-এ permission change দেখা যায়।

Result: ______  Notes: ______________________________________________

### AD-06 — Group create/list (`/admin/groups`)

1. আগে অন্তত একজন active teacher রাখুন।
2. `Create group` চাপুন।
3. Group name `UAT Group Admin` এবং Teacher নির্বাচন করুন।
4. Create করুন এবং group card খুলুন।

**Pass হবে যদি** `Group created` toast আসে, card-এ assigned teacher ও student
count থাকে, এবং Overview/Students/Settings tabs খোলে।

Result: ______  Notes: ______________________________________________

### AD-07 — Group overview/students/settings

1. Overview-এ group name, teacher, student count মিলিয়ে নিন।
2. `Students` tab-এ roster ও `Manage all students` link test করুন।
3. `Settings`-এ group name বদলান এবং অন্য teacher assign করে save করুন।
4. Empty UAT group-এ `Delete group` confirmation test করুন।

**Pass হবে যদি** edit সব list/detail page-এ update হয়; student থাকা group delete
না হয়; empty group confirmation-এর পর delete হয়।

Result: ______  Notes: ______________________________________________

### AD-08 — New level (`/admin/levels/new`)

`Add level` চাপুন এবং একটি temporary level তৈরি করুন:

| Field | Sample |
| --- | --- |
| Name | `UAT Addition Level` |
| Operation | `Addition (+)` |
| Order | খালি/unused positive position |
| Terms / question | `3` |
| Questions | `5` |
| Min number | `1` |
| Max number | `20` |
| Time limit (s) | `120` |
| Pass accuracy (%) | `80` |
| Bank-only mode | প্রথম test-এ Off |
| Require previous level pass | sequence অনুযায়ী Off/On |

**Pass হবে যদি** level save হয়ে `/admin/levels`-এ ফেরে, order অনুযায়ী list-এ
দেখা যায়, এবং invalid order/numeric/range value readable error দেয়।

Result: ______  Notes: ______________________________________________

### AD-09 — Level overview/settings/archive

1. Level খুলে Overview-এ rules ও bank coverage দেখুন।
2. `Settings` tab-এ question count/time/pass target বদলে save করুন।
3. Temporary level `Archive` করুন; archived section-এ যায় কি না দেখুন।
4. `Restore` করুন।

**Pass হবে যদি** updated rule Student Practice-এ reflect করে; archived level নতুন
assignment/session-এ না আসে; restore-এর পর active list-এ ফিরে আসে।

Result: ______  Notes: ______________________________________________

### AD-10 — Add/edit/publish question (`.../questions`)

1. `Add question`-এ Prompt `12 + 7 + 3`, Correct answer `22`, Difficulty এবং
   optional Category দিন।
2. Add করুন—প্রথমে Draft badge থাকা উচিত।
3. `Edit` করে prompt/category বদলান।
4. `Publish` করুন, তারপর active Enable/Disable test করুন।
5. Up/Down অথবা drag করে order বদলান এবং refresh করুন।
6. Temporary question `Move to draft` এবং তারপর `Delete` test করুন।

**Pass হবে যদি** প্রতিটি action-এর success toast আসে; refresh-এর পর status,
content ও order থাকে; published live question practice/exam bank-এ eligible হয়;
admin-disabled question teacher override দিয়ে চালু করা না যায়।

Result: ______  Notes: ______________________________________________

### AD-11 — Question CSV import

1. Question bank page থেকে `Download template` করুন।
2. Template-এর format না বদলে কয়েকটি valid row পূরণ করুন।
3. `CSV file`-এ file নির্বাচন করে import করুন।
4. একটি ভুল answer/difficulty/column-সহ আলাদা CSV import করে error test করুন।

**Pass হবে যদি** valid import-এ imported draft count দেখায়; rows Draft হিসেবে
আসে; invalid file-এ row-specific readable error আসে এবং partial/duplicate data
অপ্রত্যাশিতভাবে তৈরি না হয়।

Result: ______  Notes: ______________________________________________

### AD-12 — Bank-only coverage

1. Test level-এর `Bank-only mode` On করুন।
2. Published + active question সংখ্যা level-এর `Questions` count-এর চেয়ে কম রাখুন।
3. Assigned student দিয়ে practice start করুন।
4. এরপর পর্যাপ্ত question publish/enable করে আবার start করুন।

**Pass হবে যদি** কম coverage-এ clear message দিয়ে practice block হয়; পর্যাপ্ত
coverage হলে session শুরু হয়; teacher group override-এ বেশি question off করলেও
একই safe block কাজ করে।

Result: ______  Notes: ______________________________________________

### AD-13 — Curriculum version (`/admin/settings`)

এই test অন্য practice test শেষ হওয়ার পরে করুন।

1. Current live generation ও published question count লিখে রাখুন।
2. Note `UAT Version 2` দিয়ে `Start new version` চাপুন।
3. Question bank-এ গিয়ে নতুন version banner দেখুন।
4. প্রয়োজনীয় draft question publish করুন।

**Pass হবে যদি** version number বাড়ে; নতুন version শুরুতে live bank clear থাকে;
পুরোনো session/history থাকে; শুধু নতুন version-এর published questions নতুন
practice/exam-এ ব্যবহৃত হয়।

Result: ______  Notes: ______________________________________________

### AD-14 — Student create/list/export (`/admin/students`)

1. `Add student` চাপুন।
2. Group, Full name, unique Email, Temporary password এবং optional Starting level দিন।
3. Student তৈরি করুন।
4. `Export students` চাপুন এবং downloaded CSV খুলুন।

**Pass হবে যদি** `Student added` toast আসে, student roster-এ group/level সহ দেখা
যায়, এবং export file readable columns/সঠিক institute data ধারণ করে। অন্য
institute-এর student থাকবে না।

Result: ______  Notes: ______________________________________________

### AD-15 — Student detail ও permissions (`/admin/students/[studentId]`)

1. Student name খুলে profile/progress দেখুন।
2. Admin list থেকে password reset এবং enable/disable action থাকলে test করুন।
3. `Student permissions`-এ `Start practice` Deny করুন।
4. Student দিয়ে Practice start করুন; পরে `Role default` ফিরিয়ে আবার test করুন।

**Pass হবে যদি** progress শুধু ঐ student-এর হয়; disabled student blocked হয়;
Deny-এ start action `/403`/blocked হয়; default-এ practice আবার চলে।

Result: ______  Notes: ______________________________________________

### AD-16 — Notifications ও activity (`/admin/notifications`, `/admin/activity`)

1. Question publish, curriculum version, permission এবং group change-এর পরে
   `Activity` খুলুন।
2. Filter, Previous/Next pagination ব্যবহার করুন।
3. `Notifications`-এ All/Unread/Type এবং `Mark all read` test করুন।

**Pass হবে যদি** actor, action, target, time সঠিক event-এর সাথে মিলে; filter-এর
পর count/list বদলায়; notification unread badge sync হয়।

Result: ______  Notes: ______________________________________________

---

## 7. Teacher full test flow

Admin-এর তৈরি UAT Teacher account দিয়ে login করুন।

### TR-01 — Dashboard (`/teacher`)

1. Group/student/session stats এবং quick actions দেখুন।
2. Students, Exams, Ranking, Activity shortcuts খুলুন।

**Pass হবে যদি** teacher শুধু নিজের groups/students-এর data দেখেন এবং সব shortcut
সঠিক page খোলে।

Result: ______  Notes: ______________________________________________

### TR-02 — Create group (`/teacher/groups`)

1. `Create group` চাপুন।
2. `UAT Teacher Group A` লিখে create করুন।
3. আরেকটি empty group `UAT Teacher Group B` তৈরি করুন; student move test-এ লাগবে।

**Pass হবে যদি** group list-এ দুইটি group আসে এবং teacher ownership সঠিক থাকে।

Result: ______  Notes: ______________________________________________

### TR-03 — Add student ও students list

1. Group A → `Students` → `Add student` চাপুন।
2. Full name, unique Email এবং ৮+ অক্ষরের temporary password দিয়ে add করুন।
3. `/teacher/students` খুলে নতুন student খুঁজুন।

**Pass হবে যদি** `Student added` toast আসে; group ও all-students list—দুই জায়গায়
student দেখা যায়; অন্য teacher-এর group-এর student manage করা যায় না।

Result: ______  Notes: ______________________________________________

### TR-04 — Assign level ও progress

1. Group A → Students-এ নতুন student-এর level dropdown থেকে available level নিন।
2. `Save` করুন।
3. Student detail খুলে progress/history দেখুন।

**Pass হবে যদি** `Level updated` toast আসে; level student account-এর Home ও
Practice-এ দেখা যায়; prerequisite-locked level assign/শুরু হলে safe error আসে।

Result: ______  Notes: ______________________________________________

### TR-05 — Move student ও reset password

1. Student detail → `Move to another group`-এ Group B নির্বাচন করুন।
2. Move করুন এবং নতুন group page-এ redirect হয়েছে কি না দেখুন।
3. `Reset password` দিয়ে নতুন password set করুন।
4. Student দিয়ে নতুন password login test করুন।

**Pass হবে যদি** student পুরোনো group থেকে সরে নতুন group-এ যায়; দুই group count
update হয়; password reset-এর পর student নতুন password দিয়ে login করতে পারে।

Result: ______  Notes: ______________________________________________

### TR-06 — Group question override (`.../questions`)

1. Group A → `Questions` খুলুন এবং level নির্বাচন করুন।
2. একটি admin-published active question `Disable for group` করুন।
3. Refresh করে status দেখুন; পরে আবার Enable করুন।

**Pass হবে যদি** `Off for this group` badge/status আসে; change activity log-এ
থাকে; admin-disabled question teacher enable করতে না পারেন; bank-only coverage
কমে গেলে warning/block দেখা যায়।

Result: ______  Notes: ______________________________________________

### TR-07 — Group timer override (`.../settings`)

1. `Level time limits`-এ একটি level-এর default seconds লিখে রাখুন।
2. Custom seconds দিয়ে `Save` করুন।
3. Assigned student-এর Practice page-এ নতুন time limit দেখুন।
4. Teacher page-এ ফিরে `Use default` করুন এবং আবার Student page দেখুন।

**Pass হবে যদি** custom value-তে `Custom group timer` badge ও নতুন seconds আসে;
default-এ আগের level timer ফিরে আসে; invalid/zero seconds reject হয়।

Result: ______  Notes: ______________________________________________

### TR-08 — Schedule exam (`.../exams`)

1. Group A → `Exams` খুলুন।
2. Title `UAT Weekly Exam`, Level, Opens এবং Closes নির্বাচন করুন।
3. প্রথম exam-এর Opens ভবিষ্যতে দিন—cancel test-এর জন্য।
4. দ্বিতীয় exam-এর window এখন open থাকে এমনভাবে দিন—student test-এর জন্য।
5. `Schedule exam` চাপুন।

**Pass হবে যদি** `Exam scheduled` toast আসে; list-এ title, level, window, status,
question count, attempts দেখা যায়; closes time opens-এর আগে হলে error আসে; group-এর
প্রতিটি student একই fixed paper পায়।

Result: ______  Notes: ______________________________________________

### TR-09 — Exam cancel rules (`/teacher/exams`)

1. All Exams page-এ দুইটি exam দেখুন।
2. Future exam, zero attempts অবস্থায় `Cancel` করুন।
3. Student attempt থাকা বা already open/closed exam-এ cancel option দেখুন।

**Pass হবে যদি** শুধু upcoming + zero-attempt exam cancel করা যায়; attempt থাকা
exam delete না হয়; status Upcoming/Open/Closed সঠিক হয়।

Result: ______  Notes: ______________________________________________

### TR-10 — Analytics (`.../analytics`)

1. Student practice শেষ করার আগে Group analytics দেখুন।
2. Student standard practice শেষ করার পরে আবার refresh করুন।

**Pass হবে যদি** Last 7 days sessions/pass rate/accuracy এবং per-student data
নতুন result অনুযায়ী update হয়; no-data অবস্থায় friendly empty state আসে।

Result: ______  Notes: ______________________________________________

### TR-11 — Ranking (`/teacher/ranking`)

1. Time period: All time, Last 7 days, Last 30 days test করুন।
2. Students: Whole institute, All my groups, নির্দিষ্ট group test করুন।
3. Level stats: All levels এবং নির্দিষ্ট level test করুন।
4. `Apply filters` এবং `Reset` ব্যবহার করুন।

**Pass হবে যদি** filter selection অনুযায়ী subtitle/list/URL বদলায়; teacher অন্য
institute-এর student না দেখেন; qualifying score না থাকলে clear empty message আসে।

Result: ______  Notes: ______________________________________________

### TR-12 — Activity ও notifications

1. `/teacher/activity`-এ group/question/exam change খুঁজুন; group filter এবং
   pagination test করুন।
2. `/teacher/notifications`-এ All/Unread/Type এবং Mark all read test করুন।

**Pass হবে যদি** শুধু teacher-এর relevant group/student event দেখা যায় এবং unread
sidebar/bell count inbox-এর সাথে sync থাকে।

Result: ______  Notes: ______________________________________________

### TR-13 — Delete group safety (`.../settings`)

1. Student থাকা Group B delete চেষ্টা করুন।
2. Student-কে অন্য group-এ move করুন।
3. Empty Group B delete confirmation সম্পন্ন করুন।

**Pass হবে যদি** non-empty group-এ `This group still has students...` error আসে;
empty হলে confirmation-এর পর delete হয়ে `/teacher/groups`-এ ফিরে যায়।

Result: ______  Notes: ______________________________________________

---

## 8. Student full test flow

Teacher/Admin-এর assigned UAT Student account দিয়ে login করুন।

### ST-01 — Student home (`/student`)

1. Greeting, Current level, Group, Practice streak, Institute rank দেখুন।
2. Last 7 days Sessions, Pass rate, Avg accuracy এবং Badges দেখুন।
3. `Start practice` ও `View ranking` link দেখুন।

**Pass হবে যদি** সব data signed-in student-এর সাথে মিলে; অন্য student-এর personal
data না থাকে; no history হলে friendly empty/zero state আসে।

Result: ______  Notes: ______________________________________________

### ST-02 — No level / locked level

1. Teacher দিয়ে temporary student-এর level `— No level —` করুন।
2. Student Practice page খুলুন।
3. Level assign করে, prerequisite pass ছাড়া locked level test করুন।

**Pass হবে যদি** no-level অবস্থায় `No level assigned yet` দেখায়; locked level-এ
`Locked` badge/message আসে এবং session শুরু হয় না; valid level-এ modes আসে।

Result: ______  Notes: ______________________________________________

### ST-03 — Standard practice (`/student/practice`)

1. Questions, Time limit, Pass target লিখে রাখুন।
2. `Standard practice` → `Start practice` চাপুন।
3. প্রতিটি answer box পূরণ করুন। একটি run-এ ইচ্ছাকৃত ভুল answer দিন।
4. `Submit answers` চাপুন এবং Results দেখুন।
5. আবার run করে pass target অনুযায়ী সঠিক answer দিন।

**Pass হবে যদি** timer চলে; question count level rule-এর সাথে মিলে; submit-এর
পর Score/Accuracy/Time/Passed বা Keep practising দেখায়; failed standard attempt-এ
level বাড়ে না; eligible pass-এ পরের level unlock/level-up হয়।

Result: ______  Notes: ______________________________________________

### ST-04 — Resume ও refresh safety

1. নতুন timed practice শুরু করে কয়েকটি answer দিন।
2. Page refresh অথবা Home-এ যান।
3. Home-এর `Practice in progress` → `Resume practice` চাপুন।

**Pass হবে যদি** একই `[sessionId]` session ফিরে আসে; server timer চলতে থাকে;
একই student একসাথে দ্বিতীয় normal session শুরু করতে না পারে; refresh করে extra
time পাওয়া না যায়।

Result: ______  Notes: ______________________________________________

### ST-05 — Timer expiry

1. ছোট UAT timer level/group override ব্যবহার করুন।
2. Session submit না করে timer শেষ হওয়া পর্যন্ত অপেক্ষা করুন।

**Pass হবে যদি** auto-submit/result হয়, `Time expired` status আসে, এবং timer
শেষের পরে answer বদলে score manipulate করা না যায়।

Result: ______  Notes: ______________________________________________

### ST-06 — Challenge mode

1. Practice page-এ Challenge card-এর shorter timer এবং pass target লিখে রাখুন।
2. `Start challenge` চাপুন, answers submit করুন।

**Pass হবে যদি** standard-এর চেয়ে shorter timer/stricter target দেখা যায়;
Results-এ `Challenge` badge থাকে; pass করলেও level-up না হয়।

Result: ______  Notes: ______________________________________________

### ST-07 — Review mode

1. `Start review` চাপুন।
2. কিছুক্ষণ অপেক্ষা করে answers submit করুন।

**Pass হবে যদি** countdown না থাকে, auto-expire না হয়, Results-এ `Review` badge
থাকে, এবং pass/score হলেও level progression বা timed ranking প্রভাবিত না হয়।

Result: ______  Notes: ______________________________________________

### ST-08 — Practice history ও retry

1. Practice page-এর Recent attempts দেখুন।
2. Finished attempt-এর `View result`/`Try again` ব্যবহার করুন।
3. In-progress item থেকে Resume করুন।

**Pass হবে যদি** mode, level, date, status, Passed/Not passed/Leveled up badge
সঠিক থাকে; previous result read-only থাকে; retry নতুন session তৈরি করে।

Result: ______  Notes: ______________________________________________

### ST-09 — Scheduled exam

Teacher-এর open `UAT Weekly Exam` ব্যবহার করুন:

1. Student Home-এ `Scheduled exam available` card দেখুন।
2. Title, level, pass target, closing time মিলিয়ে `Start exam` চাপুন।
3. মাঝপথে Home-এ গিয়ে `Resume exam` চাপুন।
4. Submit করুন। একই exam আবার start চেষ্টা করুন।

**Pass হবে যদি** শুধু open window-তে exam start হয়; একই fixed paper/session resume
হয়; result-এ `Exam` badge থাকে; permitted attempt শেষ হলে duplicate attempt block
হয়; closed/upcoming/cancelled exam start করা যায় না।

Result: ______  Notes: ______________________________________________

### ST-10 — Practice ও exam conflict

1. একটি normal practice in progress রাখুন।
2. Teacher-এর open exam থাকা অবস্থায় Student Home খুলুন।

**Pass হবে যদি** `Finish your current practice session before starting this exam`
message আসে এবং `Resume practice` দেখায়; practice শেষ হলে `Start exam` আসে।

Result: ______  Notes: ______________________________________________

### ST-11 — Institute ranking (`/student/ranking`)

1. `Institute ranking` tab দেখুন।
2. Time period, Whole institute/My group, All levels/specific level filter করুন।
3. Apply এবং Reset করুন।

**Pass হবে যদি** নিজের row-তে `You` badge থাকে; filter অনুযায়ী list বদলায়;
rank rule অনুযায়ী qualifying data আসে; অন্য institute-এর identity/data না আসে।

Result: ______  Notes: ______________________________________________

### ST-12 — Global elite ranking (`/student/ranking/global`)

1. `Global elite ranking` tab খুলুন।
2. Available level/step tabs এবং time period filter করুন।

**Pass হবে যদি** page clearly `Bonus board` হিসেবে চিহ্নিত থাকে; eligible elite
scores-ই আসে; Institute ranking main board অপরিবর্তিত থাকে।

Result: ______  Notes: ______________________________________________

### ST-13 — Notifications (`/student/notifications`)

1. Teacher exam schedule এবং student level-up/permission change-এর পর inbox খুলুন।
2. All, Unread, Type filter test করুন।
3. Notification খুলুন, link follow করুন, `Mark all read` চাপুন।

**Pass হবে যদি** exam/level/permission event সঠিক text ও time-এ আসে; unread badge
কমে; link relevant exam/practice/page-এ যায়।

Result: ______  Notes: ______________________________________________

### ST-14 — Badges ও streak

1. Student Home-এর Badges panel-এ earned/locked status লিখে রাখুন।
2. Qualifying timed session শেষ করে Home refresh করুন।

**Pass হবে যদি** earned count/নতুন badge rule অনুযায়ী update হয়; Review mode
timed streak বাড়ায় না; streak text negative/ভুল date দেখায় না।

Result: ______  Notes: ______________________________________________

---

## 9. Notifications, push, PWA ও offline flow

### PWA-01 — Student install guide

1. Student menu → `Get app` অথবা `/student/help/install` খুলুন।
2. Public `/help/student-install` handout-ও খুলুন।

**Pass হবে যদি** Android Chrome ও iPhone Safari-এর আলাদা readable instruction,
home-screen benefit এবং push instruction দেখা যায়।

Result: ______  Notes: ______________________________________________

### PWA-02 — Android install

1. Android Chrome-এ app link খুলে Student login করুন।
2. Install prompt অথবা Chrome menu → `Install app` / `Add to Home screen` করুন।
3. Home-screen icon থেকে app খুলুন।

**Pass হবে যদি** institute name/logo icon দেখা যায়, app standalone-এর মতো খোলে,
এবং login/session/navigation কাজ করে।

Result: ______  Notes: ______________________________________________

### PWA-03 — iPhone install

1. Safari-তে link খুলুন; WhatsApp in-app browser ব্যবহার করবেন না।
2. Share → `Add to Home Screen` → Add করুন।
3. icon থেকে খুলুন।

**Pass হবে যদি** institute branding সহ home-screen icon তৈরি হয় এবং app open হয়।

Result: ______  Notes: ______________________________________________

### PWA-04 — Browser push

1. Signed-in Account → `Push notifications` → Browser push `On` করুন।
2. Browser permission prompt-এ Allow দিন।
3. Configured staging-এ test notification/exam reminder পাঠানোর জন্য project team-এর
   সহায়তা নিন।
4. পরে `Off` করুন।

**Pass হবে যদি** On/Off toast আসে, alert click সঠিক app page খোলে, এবং Off-এর পর
নতুন push না আসে। iPhone-এ install-এর আগে `How to install` message আসা expected।

> `VAPID keys are not configured` এলে Result `BLOCKED` লিখুন; এটি browser bug নয়,
> environment configuration প্রয়োজন।

Result: ______  Notes: ______________________________________________

### PWA-05 — Offline

1. App একবার online-এ খুলুন।
2. Device internet off করে page/open navigation test করুন।

**Pass হবে যদি** friendly `You're offline` page আসে এবং স্পষ্টভাবে বলে practice,
exam, ranking ও account data-এর জন্য internet দরকার; stale data submit না হয়।

Result: ______  Notes: ______________________________________________

---

## 10. Role, permission ও data-isolation security flow

এই section project team-এর উপস্থিতিতে করা ভালো।

### SEC-01 — Wrong-role page access

প্রতিটি row test করুন:

| Login role | সরাসরি যে route খুলবেন | Expected |
| --- | --- | --- |
| Student | `/admin` | নিজের `/student` home-এ redirect |
| Student | `/teacher/groups` | নিজের `/student` home-এ redirect |
| Teacher | `/admin/settings` | নিজের `/teacher` home-এ redirect |
| Admin | `/super/institutes` | নিজের `/admin` home-এ redirect |
| Super Admin | `/student/practice` | নিজের `/super` home-এ redirect |

**Pass হবে যদি** অন্য role-এর page/data এক মুহূর্তের জন্যও visible না হয়।

Result: ______  Notes: ______________________________________________

### SEC-02 — Permission denied action

Admin/Super Admin permission test-এ একটি action Deny করার পরে সেই action-এর
direct page/button submit test করুন।

**Pass হবে যদি** server `/403 Permission required` দেখায় বা action safeভাবে
বন্ধ রাখে; URL/button manipulate করেও কাজ না হয়; data পরিবর্তন না হয়।

Result: ______  Notes: ______________________________________________

### SEC-03 — Cross-institute isolation

দুইটি UAT institute থাকলে:

1. Institute A Admin/Teacher দিয়ে Institute B-এর copied detail link খুলুন।
2. Student/teacher/group/level list ও export দেখুন।

**Pass হবে যদি** 404/redirect/empty scoped result আসে; Institute B-এর name,
email, score বা content দেখা/বদলানো না যায়; CSV export-এও শুধু Institute A থাকে।

Result: ______  Notes: ______________________________________________

### SEC-04 — Disabled account/institute session revocation

1. Target account অন্য browser-এ signed in রাখুন।
2. Higher role থেকে account অথবা institute disable করুন।
3. Target browser refresh বা নতুন protected page খুলুন।

**Pass হবে যদি** সঙ্গে সঙ্গে session revoke হয়ে `/login?disabled=1`-এ যায় এবং
disabled message আসে; Back button দিয়ে protected data দেখা যায় না।

Result: ______  Notes: ______________________________________________

### SEC-05 — 404 ও invalid link

1. একটি fake detail URL যেমন `/admin/students/not-a-real-id` test করুন।
2. Deleted/other-institute resource-এর পুরোনো link খুলুন।

**Pass হবে যদি** `404 Page not found` friendly page আসে; raw database/server
error, stack trace বা sensitive ID detail না আসে।

Result: ______  Notes: ______________________________________________

---

## 11. Responsive, usability ও visual checks

প্রতিটি মূল role-এর অন্তত Dashboard, list, detail এবং একটি form page-এ করুন।

| ID | Check | Pass হবে যদি |
| --- | --- | --- |
| UI-01 | Desktop 1366×768 | Sidebar, header, content overlap না করে |
| UI-02 | Tablet 768×1024 | Cards/forms readable; horizontal overflow না থাকে |
| UI-03 | Mobile 360×800 | Mobile menu খোলে; button/input tap করা যায় |
| UI-04 | Long name/email | Text safely wrap/truncate হয়; layout ভাঙে না |
| UI-05 | Light/Dark theme | Text contrast, logo, chart, badges readable থাকে |
| UI-06 | Slow click/double click | Duplicate institute/user/exam/session তৈরি না হয় |
| UI-07 | Form validation | Required/invalid field-এ readable message ও value থাকে |
| UI-08 | Loading/empty/error | Blank white screen নয়; friendly state দেখা যায় |
| UI-09 | Browser Back/Refresh | Unexpected duplicate submit বা wrong role/data না আসে |
| UI-10 | Keyboard | Tab দিয়ে form/button পৌঁছানো ও focus দেখা যায় |

Overall UI result: ______  Notes: ____________________________________

---

## 12. End-to-end business flow (final acceptance)

এই flow একবার সম্পূর্ণ Pass হলে core business journey accepted ধরা যাবে।

### E2E-01 — Institute থেকে student result পর্যন্ত

1. Super Admin নতুন UAT institute ও Admin তৈরি করেন।
2. Admin login করে branding save করেন।
3. Admin Teacher তৈরি করেন।
4. Admin level/rules ঠিক করেন এবং পর্যাপ্ত questions publish করেন।
5. Admin অথবা Teacher group তৈরি করেন।
6. Teacher Student তৈরি করে group ও level assign করেন।
7. Student login করে Standard practice complete করেন।
8. Teacher Student progress ও Group analytics-এ result দেখেন।
9. Teacher open exam schedule করেন।
10. Student notification/Home থেকে exam complete করেন।
11. Teacher Exams/Analytics এবং Admin Dashboard/Activity-এ result/event দেখেন।
12. Student Ranking/Badges/Streak update দেখেন।

**Final Pass criteria**

- চার role-এর data একই business event-এর সাথে consistent।
- Student-এর score/timer server result হিসেবে একবারই save হয়।
- Institute boundary ভাঙে না।
- Permission ও account disable সঙ্গে সঙ্গে কার্যকর হয়।
- Mobile-এ student journey complete করা যায়।
- কোনো blocker, data loss, blank page, raw error বা duplicate critical record নেই।

E2E result: ______  Approved by: __________________  Date: ___________

---

## 13. Bug report template

`FAIL` পাওয়া গেলে নিচের format copy করে পূরণ করুন:

```text
Bug title:
Test case ID: (উদাহরণ ST-03)
Role:
Page/Menu:
Device + Browser:
Date & time:

আমি যা করেছি:
1.
2.
3.

আমি যা আশা করেছিলাম:

আসলে যা হয়েছে:

Error message (যদি থাকে):
Screenshot/video:
Test account email (password নয়):
কতবার হয়েছে: Always / Sometimes / Once
Severity: Blocker / High / Medium / Low
```

### Severity সহজভাবে

| Severity | উদাহরণ |
| --- | --- |
| Blocker | Login করা যায় না, score save হয় না, অন্য institute-এর data দেখা যায় |
| High | Core create/practice/exam/permission flow কাজ করে না |
| Medium | একটি filter, export, notification বা secondary action ভুল |
| Low | Text, spacing, colour, ছোট visual সমস্যা |

---

## 14. Final sign-off sheet

| Area | Result | Tester | Notes |
| --- | --- | --- | --- |
| Public/Auth | | | |
| Super Admin | | | |
| Institute Admin | | | |
| Teacher | | | |
| Student Practice | | | |
| Scheduled Exam | | | |
| Ranking/Gamification | | | |
| Notifications/Push | | | |
| PWA/Mobile/Offline | | | |
| Permissions/Security | | | |
| Full E2E | | | |

**Client decision:** `APPROVED` / `APPROVED WITH MINOR FIXES` / `NOT APPROVED`

Client name: ______________________________

Signature: _________________________________

Date: _____________________________________
