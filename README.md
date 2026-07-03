# clickup-git-sync

เครื่องมือ CLI สำหรับเชื่อมประวัติ **Git commit** และ **การลงเวลาทำงาน (Time Tracking)** เข้ากับ **ClickUp** โดยอัตโนมัติ — สร้างเป็น Subtask ใต้หัวข้อ Category ของแต่ละโปรเจกต์

รันผ่าน `npx` ได้เลย ไม่ต้อง copy โฟลเดอร์ ไม่ต้องติดตั้งอะไรล่วงหน้า และ **อัพเดตที่เดียว** (publish npm) ทุกคนได้เวอร์ชันล่าสุดอัตโนมัติ ออกแบบให้ทีมที่ **แต่ละคนใช้ ClickUp คนละ account** ได้ (token แยกต่อเครื่อง)

ใช้ร่วมกับ AI ได้ (Claude, Cursor, Antigravity, Codex) ผ่าน slash command `/git-commit` และ `/clickup-log` หรือรันเองผ่าน Terminal ก็ได้

---

## 🚀 เริ่มใช้งาน

### 1. ตั้งค่า Token (ครั้งเดียวต่อเครื่อง)

รับ Personal API Token จาก ClickUp: **Settings → Apps → Personal API Tokens → Generate** (ขึ้นต้นด้วย `pk_...`)

```bash
npx clickup-git-sync setup
# หรือแบบไม่ถาม:
npx clickup-git-sync setup --token pk_xxxxxxxx
```

Token จะถูกเก็บที่ `~/.clickup/config.json` — อยู่นอกโปรเจกต์ ปลอดภัย ไม่ถูก commit และแต่ละคนใช้ token ของตัวเอง

### 2. ตั้งค่าโปรเจกต์ (ครั้งเดียวต่อ repo)

```bash
cd your-project
npx clickup-git-sync init
```

คำสั่งนี้จะ:
- สร้าง `.clickup.json` (เก็บชื่อ ClickUp list + space/folder ของโปรเจกต์ — commit ขึ้น git แชร์ทีมได้)
- ติดตั้งไฟล์ skill/rules ให้ AI ที่คุณใช้ (Claude / Cursor / Antigravity / Codex)
- เพิ่ม `.clickup-history.json` เข้า `.gitignore`

ตัวเลือก:
```bash
npx clickup-git-sync init \
  --list "[Project XL] Test-Clickup-Skill" \
  --space "True Money" --space-id 90182654103 \
  --folder-prefix "[True] Support List" \
  --tools claude
# --list          : ชื่อ ClickUp list ของโปรเจกต์
# --space          : ล็อก space (client) ตามชื่อ
# --space-id       : ล็อก space ตาม ID (แนะนำ เสถียรกว่าชื่อ)
# --folder-prefix  : prefix ของ folder รายเดือน — ระบบเติม "เดือน ปี" ให้เอง
#                    เช่น "[True] Support List" → "[True] Support List Jul 2026"
# --tools          : claude, cursor, antigravity, codex (ไม่ใส่ = ติดตั้งทั้งหมด)
# --force          : เขียนทับไฟล์เดิม
```

> **ทำไมต้อง space + folder?** ClickUp มี list ชื่อซ้ำกันได้ (คนละ folder/เดือน) ถ้าไม่ล็อก space/folder ระบบจะเลือก list อันแรกที่เจอ ซึ่งอาจผิดตัว การตั้ง `--space-id` + `--folder-prefix` ทำให้ค้นหาแคบลงเหลือ **space นั้น + folder ของเดือนนั้น** เท่านั้น (folder เดือนคำนวณจากวันของ commit — ใช้ `--date` เปลี่ยนได้)

---

## 🛠️ การใช้งาน

### โหมด Git Commit — commit แล้ว sync เข้า ClickUp

```bash
npx clickup-git-sync commit
```
โหมด interactive จะถามทีละขั้น (stage / commit message / category / hours / date)

แบบสั่งตรง (เหมาะกับ AI หรือ script):
```bash
npx clickup-git-sync commit \
  --message "Fix login bug" \
  --category "Main Task [Backend]" \
  --hours 1 --min 30 \
  --stage --yes
```
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
npx clickup-git-sync log --task "Daily standup" --category "Main Task [Meeting]" --hours 0.5
npx clickup-git-sync log --task "Fix bug" --category "Main Task [Backend]" --h 1 --min 30 --start-date 2026-07-01
```
รับ flag เวลา/วันที่ชุดเดียวกับ `commit`

### ลงเวลากับ task ที่มีอยู่แล้ว (ไม่สร้างใหม่)

```bash
# ค้นหา task ตามชื่อ (เฉพาะในลิสต์ที่ตั้งไว้)
npx clickup-git-sync add-time --task-name "Daily standup" --min 20

# ระบุ task โดยตรงด้วย ID (แม่นยำ ไม่กำกวม)
npx clickup-git-sync add-time --task-id 86ey5fc1a --h 1 --start-date 2026-07-02

# ลงเวลาโดยไม่อยากถูกใส่เป็น assignee
npx clickup-git-sync add-time --task-name "Sprint planning" --h 1 --no-assign
```
- ค้นด้วยชื่อแล้วเจอหลายตัว → ระบบโชว์ตัวเลือก + id ให้เลือกใช้ `--task-id`
- **default: เพิ่มตัวเองเป็น assignee** แบบ additive (ไม่เตะคนที่สร้าง task ออก) — เหมาะกับ task ที่หลายคนช่วยกันลงเวลา เช่นตอนประชุมอีกคนสร้าง task เรามาลงเวลาต่อ
- ไม่อยากถูก assign → ใส่ `--no-assign` (ลงแค่ time entry)

### สร้าง task โดยไม่ลงเวลา (subtask เปล่า)

```bash
npx clickup-git-sync task --task "Investigate flaky test" --category "Main Task [Testing]"
```
สร้าง subtask ใต้ category ที่ระบุ + assign ให้ตัวเอง แต่ **ไม่ลงเวลา** (รับ `--start-date`/`--end-date` ได้)

### ดูประวัติ

```bash
npx clickup-git-sync history            # แบบสรุป
npx clickup-git-sync history --limit 10 # 10 รายการล่าสุด
npx clickup-git-sync history --json     # JSON ดิบ
```

---

## 🤖 ใช้กับ AI (Slash Commands)

หลังรัน `init` แล้ว AI ในโปรเจกต์จะเข้าใจคำสั่ง:

| คำสั่ง | ทำอะไร |
|---|---|
| `/git-commit` | AI ดู diff → เสนอ commit message + category + hours + วันที่ → ยืนยัน → commit + sync |
| `/clickup-log` | ครอบ 3 เคส: (A) ลงเวลา+สร้าง subtask ใหม่, (B) ลงเวลา task ที่มีอยู่ (AI ค้นหาในลิสต์ให้), (C) สร้าง task เปล่าไม่ลงเวลา |

AI จะถามวันที่ก่อนลงเสมอ (Enter = วันนี้ / ย้อนหลัง / นำหน้าได้) และใช้ category ชื่อเต็มให้ตรงเป๊ะ

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
`Main Task [Support]`, `Main Task [Backend]`, `Main Task [Frontend]`, `Main Task [Planning and Learning]`, `Main Task [Monitor]`, `Main Task [Testing]`, `Main Task [Meeting]`
(ถ้า category task ยังไม่มีใน list ระบบจะสร้างให้อัตโนมัติ — ระวังพิมพ์ชื่อไม่ตรงจะสร้าง task ใหม่ผิดตัว)

---

## 🔧 คำสั่งทั้งหมด

```
npx clickup-git-sync setup      # ตั้ง token (ต่อเครื่อง)
npx clickup-git-sync init       # ตั้งค่าโปรเจกต์ + ติดตั้ง skill
npx clickup-git-sync commit     # commit + สร้าง subtask + ลงเวลา
npx clickup-git-sync log        # สร้าง subtask + ลงเวลา (ไม่ commit)
npx clickup-git-sync add-time   # ลงเวลากับ task ที่มีอยู่แล้ว
npx clickup-git-sync task       # สร้าง subtask ไม่ลงเวลา
npx clickup-git-sync history    # ดูประวัติ
npx clickup-git-sync help       # ช่วยเหลือ
```

---

## 📦 สำหรับผู้ดูแล (Publish)

```bash
npm version patch   # หรือ minor / major
npm publish
```
ผู้ใช้ทุกคนที่รันผ่าน `npx` จะได้เวอร์ชันใหม่อัตโนมัติ — ไม่ต้องแจกไฟล์ใหม่

## License

MIT
