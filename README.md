# clickup-git-sync

เครื่องมือ CLI สำหรับเชื่อมประวัติ **Git commit** และ **การลงเวลาทำงาน (Time Tracking)** เข้ากับ **ClickUp** โดยอัตโนมัติ — สร้างเป็น Subtask ใต้หัวข้อ Category ของแต่ละโปรเจกต์

รันผ่าน `npx` ได้เลย ไม่ต้องติดตั้งอะไรล่วงหน้า และ **อัพเดตที่เดียว** (publish npm) ทุกคนได้เวอร์ชันล่าสุดอัตโนมัติ ออกแบบให้ทีมที่ **แต่ละคนใช้ ClickUp คนละ account** ได้ (token แยกต่อเครื่อง)

ใช้ร่วมกับ AI ได้ (Claude, Cursor, Antigravity, Codex) ผ่าน slash command `/clickup-git-commit` และ `/clickup-log` หรือรันเองผ่าน Terminal ก็ได้

---

## 🚀 เริ่มใช้งาน

เลือกสถานการณ์ของคุณ:

- **เพิ่งเข้าทีม / repo ตั้งค่าไว้ให้แล้ว** (มี `.clickup.json` + ไฟล์ skill commit อยู่ใน repo แล้ว) →
  ทำแค่ **ขั้นที่ 1 (ตั้ง token ของตัวเอง)** แล้วใช้งานได้เลย **ไม่ต้องรัน `init`**
- **เริ่มตั้งค่า repo ใหม่เอง** (ยังไม่มี `.clickup.json`) → ทำ **ขั้นที่ 1 → ขั้นที่ 2 (`init`)**

> token เป็นของแต่ละคน (เก็บนอก repo) — ต่อให้ repo ตั้งค่าไว้แล้ว ทุกคนก็ต้องตั้ง token ของตัวเองครั้งแรกเสมอ

### 1. ตั้งค่า Token (ครั้งเดียวต่อเครื่อง)

รับ Personal API Token จาก ClickUp: **Settings → Apps → Personal API Tokens → Generate** (ขึ้นต้นด้วย `pk_...`)

```bash
npx @nextzy-tech/clickup-git-sync setup
# หรือแบบไม่ถาม:
npx @nextzy-tech/clickup-git-sync setup --token pk_xxxxxxxx
```

Token จะถูกเก็บที่ `~/.clickup/config.json` — อยู่นอกโปรเจกต์ ปลอดภัย ไม่ถูก commit และแต่ละคนใช้ token ของตัวเอง

### 2. ตั้งค่าโปรเจกต์ (ครั้งเดียวต่อ repo)

```bash
cd your-project
npx @nextzy-tech/clickup-git-sync init
```

คำสั่งนี้จะ:
- สร้าง `.clickup.json` (เก็บชื่อ ClickUp list + space/folder ของโปรเจกต์ — commit ขึ้น git แชร์ทีมได้)
- ติดตั้งไฟล์ skill/rules ให้ AI ที่คุณใช้ (Claude / Cursor / Antigravity / Codex)
- เพิ่ม `.clickup-history.json` เข้า `.gitignore`

ตัวเลือก:
```bash
npx @nextzy-tech/clickup-git-sync init \
  --list "[Project XL] Test-Clickup-Skill" \
  --space "XXX" --space-id 900000000 \
  --folder-prefix "[XXX] Support List" \
  --tools claude
# --list          : ชื่อ ClickUp list ของโปรเจกต์
# --space          : ล็อก space (client) ตามชื่อ
# --space-id       : ล็อก space ตาม ID (แนะนำ เสถียรกว่าชื่อ)
# --folder-prefix  : prefix ของ folder รายเดือน — ระบบเติม "เดือน ปี" ให้เอง
#                    เช่น "[XXX] Support List" → "[XXX] Support List Jul 2026"
# --tools          : claude, cursor, antigravity, codex (ไม่ใส่ = ติดตั้งทั้งหมด)
# --force          : เขียนทับไฟล์เดิม
```

> **ทำไมต้อง space + folder?** ClickUp มี list ชื่อซ้ำกันได้ (คนละ folder/เดือน) ถ้าไม่ล็อก space/folder ระบบจะเลือก list อันแรกที่เจอ ซึ่งอาจผิดตัว การตั้ง `--space-id` + `--folder-prefix` ทำให้ค้นหาแคบลงเหลือ **space นั้น + folder ของเดือนนั้น** เท่านั้น (folder เดือนคำนวณจากวันของ commit — ใช้ `--date` เปลี่ยนได้)

---

## 🛠️ การใช้งาน

### โหมด Git Commit — commit แล้ว sync เข้า ClickUp

```bash
npx @nextzy-tech/clickup-git-sync commit
```
โหมด interactive จะถามทีละขั้น (stage / commit message / category / hours / date)

แบบสั่งตรง (เหมาะกับ AI หรือ script):
```bash
npx @nextzy-tech/clickup-git-sync commit \
  --message "Fix login bug" \
  --description "แก้ token หมดอายุแล้วไม่ redirect — ปรับ authGuard + เพิ่ม refresh flow" \
  --category "Main Task [Backend]" \
  --hours 1 --min 30 \
  --stage --yes
```
- `--message` : **ชื่อสั้น (subject)** — ใช้เป็นทั้งบรรทัดแรกของ git commit และชื่อ task ใน ClickUp อย่าให้ยาว
- `--description`/`--desc` : รายละเอียดยาว — ไปเป็น **git commit body** และ **รายละเอียดของ task** (ใส่หรือไม่ก็ได้)
- `--stage` : `git add .` ให้ก่อน commit
- `--yes` : ใช้ค่าที่ระบบแนะนำโดยไม่ถาม
- `--no-log` : commit อย่างเดียว ไม่ sync ClickUp (บันทึกเป็น untracked)

**เวลา** (รวมกัน): `--hours`/`-h` และ/หรือ `--minutes`/`--min` — เช่น `-h 1 --min 30` = 1.5 ชม.

**วันที่** (ไม่ใส่ = วันนี้):
- `--start-date YYYY-MM-DD` : วันเริ่ม
- `--end-date YYYY-MM-DD` : วันจบ/due (ไม่ใส่ = เท่ากับ start)
- `--date YYYY-MM-DD` : ตั้งทั้ง start และ end พร้อมกัน
- ถ้าใส่ start ชัดเจน time entry จะไปลงวันนั้นด้วย (backdate ได้จริง) และ folder รายเดือนจะเลือกตามเดือนของ start
- กรอกวันผิดรูปแบบ = error หยุดทันที (ไม่เดาเป็นวันนี้)

ระบบจะ **เดา category** จากนามสกุลไฟล์, **แนะนำชั่วโมง** จากขนาด diff, และ **assign subtask ให้เจ้าของ token เอง** อัตโนมัติ

### โหมด Direct Log — ลงเวลาโดยไม่ commit (สร้าง subtask + time)

```bash
npx @nextzy-tech/clickup-git-sync log --task "Daily standup" --category "Main Task [Meeting]" --hours 0.5
npx @nextzy-tech/clickup-git-sync log --task "แก้บั๊ก login" --category "Main Task [Backend]" --description "token หมดอายุแล้วไม่ redirect" --h 1 --min 30 --start-date 2026-07-01
```
รับ flag เวลา/วันที่ชุดเดียวกับ `commit` — และ `--description`/`--desc` ใส่รายละเอียดลงในตัว task ได้ (ให้ชื่อ `--task` สั้น เข้าใจง่าย)

### ลงเวลากับ task ที่มีอยู่แล้ว (ไม่สร้างใหม่)

```bash
# ค้นหา task ตามชื่อ (เฉพาะในลิสต์ที่ตั้งไว้)
npx @nextzy-tech/clickup-git-sync add-time --task-name "Daily standup" --min 20

# ระบุ task โดยตรงด้วย ID (แม่นยำ ไม่กำกวม)
npx @nextzy-tech/clickup-git-sync add-time --task-id 86ey5fc1a --h 1 --start-date 2026-07-02

# ลงเวลาโดยไม่อยากถูกใส่เป็น assignee
npx @nextzy-tech/clickup-git-sync add-time --task-name "Sprint planning" --h 1 --no-assign
```
- ค้นด้วยชื่อแล้วเจอหลายตัว → ระบบโชว์ตัวเลือก + id ให้เลือกใช้ `--task-id`
- **default: เพิ่มตัวเองเป็น assignee** แบบ additive (ไม่เตะคนที่สร้าง task ออก) — เหมาะกับ task ที่หลายคนช่วยกันลงเวลา เช่นตอนประชุมอีกคนสร้าง task เรามาลงเวลาต่อ
- ไม่อยากถูก assign → ใส่ `--no-assign` (ลงแค่ time entry)

### สร้าง task โดยไม่ลงเวลา (subtask เปล่า)

```bash
npx @nextzy-tech/clickup-git-sync task --task "เช็ค flaky test" --category "Main Task [Testing]" --description "test login เขียว/แดงสลับ — น่าจะ race กับ mock timer"
```
สร้าง subtask ใต้ category ที่ระบุ + assign ให้ตัวเอง แต่ **ไม่ลงเวลา** (รับ `--start-date`/`--end-date` และ `--description`/`--desc` ได้)

### แก้ไข task ที่มีอยู่แล้ว (ชื่อ / วันที่)

```bash
# เปลี่ยนชื่อ task
npx @nextzy-tech/clickup-git-sync update --task-name "Daily standup" --name "Daily standup (team)"

# เปลี่ยน start/end date (เลือก task ด้วย id เพื่อความแม่นยำ)
npx @nextzy-tech/clickup-git-sync update --task-id 86ey5fc1a --start-date 2026-07-01 --end-date 2026-07-05

# แก้รายละเอียด (description) ของ task
npx @nextzy-tech/clickup-git-sync update --task-name "แก้บั๊ก login" --description "อัปเดต: เพิ่ม refresh token flow แล้ว"
```
เลือก task ด้วย `--task-id` (แม่นยำ) หรือ `--task-name` (ค้นในลิสต์ — ถ้าเจอหลายตัวจะให้เลือก) แล้วแก้ได้ทั้ง
`--name`, `--start-date`, `--end-date` (หรือ `--date` ตั้งทั้งคู่), `--description`/`--desc` โดยต้องระบุอย่างน้อย 1 ฟิลด์
(ใส่ `--description ""` ค่าว่างเพื่อล้างรายละเอียดเดิมได้)

### ดูประวัติ

```bash
npx @nextzy-tech/clickup-git-sync history            # แบบสรุป
npx @nextzy-tech/clickup-git-sync history --limit 10 # 10 รายการล่าสุด
npx @nextzy-tech/clickup-git-sync history --json     # JSON ดิบ
```

---

## 🤖 ใช้กับ AI (Slash Commands)

หลังรัน `init` แล้ว AI ในโปรเจกต์จะเข้าใจคำสั่ง:

| คำสั่ง | ทำอะไร |
|---|---|
| `/clickup-git-commit` | AI ดู diff → เสนอ **subject สั้น + รายละเอียด** + category + hours + วันที่ → ยืนยัน → commit + sync |
| `/clickup-log` | ครอบ 4 เคส: (A) ลงเวลา+สร้าง subtask ใหม่, (B) ลงเวลา task ที่มีอยู่ (AI ค้นหาในลิสต์ให้), (C) สร้าง task เปล่าไม่ลงเวลา, (D) แก้ไข task ที่มีอยู่ (ชื่อ / วันที่ / รายละเอียด) |

AI จะถามวันที่ก่อนลงเสมอ (Enter = วันนี้ / ย้อนหลัง / นำหน้าได้) และใช้ category ชื่อเต็มให้ตรงเป๊ะ

> **ชื่อสั้น รายละเอียดยาวไปไว้ใน description:** AI จะตั้งชื่อ commit/task ให้สั้นเข้าใจง่าย (ภาษาคน ไม่ใช่ศัพท์เทคนิค/ชื่อ symbol) แล้วยัดเนื้อหาที่ยาวลง `--description` ซึ่งไปเป็น git commit body + รายละเอียดของ task ใน ClickUp

> **หลักการออกแบบ:** logic ทั้งหมด (เดา category, แนะนำชั่วโมง, เรียก ClickUp API) อยู่ใน CLI ที่อัพเดตกลางผ่าน npm — ไฟล์ skill ในโปรเจกต์ "บาง" มาก แค่บอก AI ว่าเมื่อไหร่ควรเรียก CLI จึงแทบไม่ต้องอัพเดตตาม

---

## 📂 Config

| ไฟล์ | เก็บอะไร | commit ขึ้น git |
|---|---|---|
| `~/.clickup/config.json` | `CLICKUP_API_TOKEN` (ต่อคน, ความลับ) | ❌ |
| `<project>/.clickup.json` | `CLICKUP_LIST_NAME` + scope (ดูด้านล่าง) | ✅ |
| `<project>/.clickup-history.json` | ประวัติการ sync (local) | ❌ (gitignored) |

ฟิลด์ใน `.clickup.json`:

| ฟิลด์ | ทำอะไร | บังคับ |
|---|---|---|
| `CLICKUP_LIST_NAME` | ชื่อ list ปลายทาง | ✅ |
| `CLICKUP_SPACE_ID` | ล็อก space ตาม ID (แนะนำ) | ไม่ |
| `CLICKUP_SPACE_NAME` | ล็อก space ตามชื่อ (fallback) | ไม่ |
| `CLICKUP_FOLDER_PREFIX` | prefix folder รายเดือน (เติม "เดือน ปี" ให้เอง) | ไม่ |
| `CLICKUP_WORKSPACE_NAME` | เลือก workspace เมื่อ token มีหลายอัน | ไม่ |

> ไม่ใส่ scope เลย = พฤติกรรมเดิม (ค้นหา list ทุก space) — ใส่เมื่อมี list ชื่อซ้ำหรืออยาก focus client เดียว

**Category ที่รองรับ** (ชื่อ parent task ต้องตรงเป๊ะ):
`Main Task [Support]`, `Main Task [Backend]`, `Main Task [Frontend]`, `Main Task [Planning and Learning]`, `Main Task [Infrastructure]`, `Main Task [Monitor]`, `Main Task [Testing]`, `Main Task [Meeting]`, `Main Task [Review code & logic]`
(ถ้า category task ยังไม่มีใน list ระบบจะสร้างให้อัตโนมัติ — ระวังพิมพ์ชื่อไม่ตรงจะสร้าง task ใหม่ผิดตัว)

---

## 🔧 คำสั่งทั้งหมด

```
npx @nextzy-tech/clickup-git-sync setup      # ตั้ง token (ต่อเครื่อง)
npx @nextzy-tech/clickup-git-sync init       # ตั้งค่าโปรเจกต์ + ติดตั้ง skill
npx @nextzy-tech/clickup-git-sync commit     # commit + สร้าง subtask + ลงเวลา
npx @nextzy-tech/clickup-git-sync log        # สร้าง subtask + ลงเวลา (ไม่ commit)
npx @nextzy-tech/clickup-git-sync add-time   # ลงเวลากับ task ที่มีอยู่แล้ว
npx @nextzy-tech/clickup-git-sync task       # สร้าง subtask ไม่ลงเวลา
npx @nextzy-tech/clickup-git-sync update     # แก้ชื่อ/วันที่ ของ task ที่มีอยู่
npx @nextzy-tech/clickup-git-sync history    # ดูประวัติ
npx @nextzy-tech/clickup-git-sync help       # ช่วยเหลือ
```

---

## 🆕 การอัปเดต (สำหรับคนที่ใช้อยู่แล้ว)

เมื่อผู้ดูแลปล่อยเวอร์ชันใหม่ขึ้น npm มี 2 อย่างที่พฤติกรรมต่างกัน:

**1) logic ของ CLI — อัปเดตเอง (เกือบ)**
รันผ่าน `npx` จะดึงเวอร์ชันล่าสุดให้ **แต่ npx มี cache** จึงอาจยังได้ตัวเก่าอยู่ ถ้าอยากชัวร์ว่าได้ล่าสุด:
```bash
npx @nextzy-tech/clickup-git-sync@latest <command>   # บังคับเวอร์ชันล่าสุด
# หรือเคลียร์ cache ครั้งเดียว:
npx clear-npx-cache
```

**2) ไฟล์ skill / rules — ไม่อัปเดตเอง ⚠️**
ไฟล์ skill (`.claude/skills/...`, `.cursorrules`, `AGENTS.md` ฯลฯ) ถูก "เขียนลง repo" ตอนรัน `init`
ดังนั้นถ้าเวอร์ชันใหม่มีการเปลี่ยน skill (เช่นเพิ่มคำสั่ง `update`) ไฟล์เดิมในโปรเจกต์จะ **ไม่เปลี่ยนตาม**
ต้องรัน `init --force` ทับเองในโปรเจกต์นั้น:
```bash
npx @nextzy-tech/clickup-git-sync@latest init --force --tools claude
```
แล้ว reload skill ในเครื่องมือ AI (ใน Claude Code สั่ง `/reload-skills`) — คำสั่งใหม่ถึงจะโผล่

> เช็คว่าเวอร์ชันล่าสุดบน registry คือเท่าไร: `npm view @nextzy-tech/clickup-git-sync version`

---

## 📦 สำหรับผู้ดูแล (Publish)

### เอาขึ้น npm ครั้งแรก (first publish)

```bash
# 1) ล็อกอิน npm (ครั้งเดียวต่อเครื่อง) — ต้องเป็นสมาชิก org @nextzy-tech
npm login

# 2) ดูว่าจะ publish ไฟล์อะไรบ้าง โดยยังไม่ publish จริง
npm pack --dry-run

# 3) publish (package.json ตั้ง "access": "public" ไว้แล้ว จึงเผยแพร่ scoped package สาธารณะได้เลย)
npm publish

# 4) push โค้ด + git tag ขึ้น GitHub
git push && git push --tags

# 5) ยืนยันว่าขึ้น registry แล้ว
npm view @nextzy-tech/clickup-git-sync version
```
> ถ้า org `@nextzy-tech` ยังไม่มี ต้องไปสร้างที่ npmjs.com ก่อน (ครั้งเดียว) แล้วเพิ่มสมาชิกทีมที่มีสิทธิ์ publish

### แก้ไขแล้วเอาขึ้นใหม่ (release update)

```bash
# 1) แก้โค้ด แล้วทดสอบ local ก่อน (ยังไม่ต้อง publish)
node bin/cli.js help
node bin/cli.js <command> ...        # ยิงจริงกับ task ทดสอบได้
# หรือ: npm pack แล้วเอาไฟล์ .tgz ไปติดตั้งทดสอบในโปรเจกต์อื่น

# 2) commit ให้หมดก่อน — git working directory ต้องสะอาด
#    ไม่งั้น npm version จะ error: "Git working directory not clean."
git add -A && git commit -m "<สรุปการแก้>"

# 3) bump version ตาม semver (คำสั่งนี้สร้าง git commit + tag ให้อัตโนมัติ)
npm version patch    # แก้บั๊ก / เอกสาร          1.0.0 → 1.0.1
npm version minor    # เพิ่มคำสั่งใหม่ (ไม่ breaking) 1.0.0 → 1.1.0
npm version major    # เปลี่ยนแบบ breaking         1.0.0 → 2.0.0

# 4) publish + push
npm publish
git push && git push --tags
```

> `npm version` บังคับให้ working tree สะอาด (ต้อง commit งานที่แก้ให้เรียบร้อยก่อน) แล้วมันจะสร้าง
> commit ของการ bump version + git tag ให้เองอีกที — ถ้ายังมีไฟล์ค้างจะขึ้น error `Git working directory not clean.`

| bump | ใช้เมื่อ |
|---|---|
| `patch` | แก้บั๊ก / แก้เอกสาร / ปรับข้อความ (ไม่เพิ่มความสามารถ) |
| `minor` | เพิ่มความสามารถใหม่แบบเข้ากันได้กับของเดิม — เช่นรอบที่เพิ่มคำสั่ง `update` |
| `major` | เปลี่ยนแบบ breaking (ลบ/เปลี่ยนพฤติกรรม flag เดิม) |

> **สำคัญ:** logic อยู่ใน CLI กลาง — พอ `npm publish` แล้วคนที่รันผ่าน `npx` ได้เวอร์ชันใหม่เอง
> **แต่ถ้าการแก้รอบนั้นแตะ template ของ skill** (`src/templates.js`) ผู้ใช้เดิมต้องรัน `init --force`
> ในโปรเจกต์ของตัวเองเพื่อรีเฟรชไฟล์ skill (ดูหัวข้อ "🆕 การอัปเดต" ด้านบน)

## License

MIT
