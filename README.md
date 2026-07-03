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
- สร้าง `.clickup.json` (เก็บชื่อ ClickUp list ของโปรเจกต์ — commit ขึ้น git แชร์ทีมได้)
- ติดตั้งไฟล์ skill/rules ให้ AI ที่คุณใช้ (Claude / Cursor / Antigravity / Codex)
- เพิ่ม `.clickup-history.json` เข้า `.gitignore`

ตัวเลือก:
```bash
npx clickup-git-sync init --list "[Project XXL] Football 2026" --tools claude,cursor
# --tools: claude, cursor, antigravity, codex (ไม่ใส่ = ติดตั้งทั้งหมด)
# --force: เขียนทับไฟล์เดิม
```

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
  --category Backend \
  --hours 1.5 \
  --stage --yes
```
- `--stage` : `git add .` ให้ก่อน commit
- `--yes` : ใช้ค่าที่ระบบแนะนำโดยไม่ถาม
- `--no-log` : commit อย่างเดียว ไม่ sync ClickUp (บันทึกเป็น untracked)
- `--date YYYY-MM-DD` : กำหนดวันของ subtask (ไม่ใส่ = วันนี้)

ระบบจะ **เดา category** จากนามสกุลไฟล์ และ **แนะนำชั่วโมง** จากขนาด diff ให้อัตโนมัติ

### โหมด Direct Log — ลงเวลาโดยไม่ commit

```bash
npx clickup-git-sync log --task "Daily standup" --category Meeting --hours 0.5
```

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
| `/git-commit` | AI ดู diff → เสนอ commit message + category + hours → ยืนยัน → commit + sync |
| `/clickup-log [task] [hours] [category]` | ลงเวลาตรงเข้า ClickUp โดยไม่ commit |

> **หลักการออกแบบ:** logic ทั้งหมด (เดา category, แนะนำชั่วโมง, เรียก ClickUp API) อยู่ใน CLI ที่อัพเดตกลางผ่าน npm — ไฟล์ skill ในโปรเจกต์ "บาง" มาก แค่บอก AI ว่าเมื่อไหร่ควรเรียก CLI จึงแทบไม่ต้องอัพเดตตาม

---

## 📂 Config

| ไฟล์ | เก็บอะไร | commit ขึ้น git |
|---|---|---|
| `~/.clickup/config.json` | `CLICKUP_API_TOKEN` (ต่อคน, ความลับ) | ❌ |
| `<project>/.clickup.json` | `CLICKUP_LIST_NAME`, `CLICKUP_WORKSPACE_NAME` (ไม่บังคับ) | ✅ |
| `<project>/.clickup-history.json` | ประวัติการ sync (local) | ❌ (gitignored) |

**Category ที่รองรับ:** Planning, Frontend, Backend, Support, Monitor, Testing, Meeting
(ถ้า category task ยังไม่มีใน list ระบบจะสร้างให้อัตโนมัติ)

---

## 🔧 คำสั่งทั้งหมด

```
npx clickup-git-sync setup      # ตั้ง token (ต่อเครื่อง)
npx clickup-git-sync init       # ตั้งค่าโปรเจกต์ + ติดตั้ง skill
npx clickup-git-sync commit     # commit + sync
npx clickup-git-sync log        # ลงเวลาตรง
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
