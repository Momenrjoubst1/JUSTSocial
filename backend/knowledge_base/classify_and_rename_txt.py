
import os
import re

# ========= إعدادات =========
BASE_DIR = "."
PREVIEW_CHARS = 1500  # عدد الأحرف المقروءة من بداية الملف

CATEGORIES = {
    "admission": [
        "admission", "registration", "acceptance",
        "القبول", "التسجيل"
    ],
    "regulations": [
        "regulation", "bylaw", "policy", "system",
        "نظام", "تعليمات", "سياسة"
    ],
    "study_plans": [
        "study plan", "credit hours", "curriculum",
        "خطة دراسية", "ساعات معتمدة"
    ],
    "faculties": [
        "faculty", "department", "college",
        "كلية", "قسم"
    ],
    "calendar": [
        "academic calendar", "calendar",
        "التقويم", "الجدول الأكاديمي"
    ],
    "reports": [
        "annual report", "report",
        "تقرير", "تقرير سنوي"
    ],
    "newsletters": [
        "newsletter", "bulletin", "issue", "volume",
        "نشرة"
    ],
}

def detect_category(text):
    text_lower = text.lower()
    for category, keywords in CATEGORIES.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                return category
    return "other"

def slugify(name):
    name = name.lower()
    name = re.sub(r"[^\w]+", "_", name)
    return name.strip("_")

def main():
    files = [f for f in os.listdir(BASE_DIR) if f.endswith(".txt")]

    print(f"📄 Found {len(files)} txt files")

    for filename in files:
        path = os.path.join(BASE_DIR, filename)

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read(PREVIEW_CHARS)
        except Exception:
            print(f"❌ Failed to read {filename}")
            continue

        category = detect_category(content)

        base, ext = os.path.splitext(filename)
        new_name = f"{category}_{slugify(base)}{ext}"

        if new_name == filename:
            continue

        new_path = os.path.join(BASE_DIR, new_name)

        counter = 1
        while os.path.exists(new_path):
            new_name = f"{category}_{slugify(base)}_{counter}{ext}"
            new_path = os.path.join(BASE_DIR, new_name)
            counter += 1

        os.rename(path, new_path)
        print(f"✅ {filename} → {new_name}")

    print("🎉 Classification & renaming done.")

if __name__ == "__main__":
    main()
