#!/usr/bin/env python3
"""
Rebuild src/data/curriculum.json from the compiled DC curriculum PDF.

    pip install pdfplumber
    python3 extract_curriculum.py path/to/DC_Curriculum_Compiled.pdf

Reads only the eight semester tables per programme. The credit-distribution
table, the discipline-core list and the elective lists are deliberately ignored.

Every semester is checked against the Total printed on its own table; anything
that does not reconcile is reported on stderr at the end.
"""
import json
import re
import sys
from collections import defaultdict

import pdfplumber

PDF = sys.argv[1] if len(sys.argv) > 1 else "DC_Curriculum_Compiled_NoDEList.pdf"
OUT = sys.argv[2] if len(sys.argv) > 2 else "curriculum.json"


CAPTION = re.compile(r"^Table \d+:\s*(.+?)\s+—\s+B(\d\d)\s+Semester\s+(\d+)\s*$")
LTPC = re.compile(r"^[\d.]+(-[\d.]+){0,3}$")
SERIAL = re.compile(r"^\d{1,2}$")

warnings = []


def warn(msg):
    warnings.append(msg)


# ---------------------------------------------------------------- line building
def build_lines(page):
    """Words grouped into visual lines, each line sorted left to right."""
    words = page.extract_words(keep_blank_chars=False, use_text_flow=False)
    buckets = defaultdict(list)
    for w in words:
        buckets[round(w["top"] * 2) / 2].append(w)

    tops = sorted(buckets)
    merged, current, current_top = [], [], None
    for t in tops:
        if current_top is not None and t - current_top < 4:
            current.extend(buckets[t])
        else:
            if current:
                merged.append((current_top, sorted(current, key=lambda w: w["x0"])))
            current, current_top = list(buckets[t]), t
    if current:
        merged.append((current_top, sorted(current, key=lambda w: w["x0"])))
    return merged


def line_text(words):
    return " ".join(w["text"] for w in words)


# ---------------------------------------------------------------- column model
def column_bounds(head1, head2):
    """
    x cut points from the two header lines.

    head1: Sl. | Course | Course | Course Name | L-T-P-C | Credits
    head2: No  | Category | Code
    """
    def span(words):
        return min(w["x0"] for w in words), max(w["x1"] for w in words)

    h1 = {w["text"]: w for w in head1}
    if "L-T-P-C" not in h1 or "Credits" not in h1:
        return None

    courses = [w for w in head1 if w["text"] == "Course"]
    name_w = [w for w in head1 if w["text"] == "Name"]
    if len(courses) < 3 or not name_w:
        return None

    h2 = {w["text"]: w for w in head2}
    if "Category" not in h2 or "Code" not in h2 or "No" not in h2:
        return None

    c0 = span([h1["Sl."], h2["No"]])
    c1 = span([courses[0], h2["Category"]])
    c2 = span([courses[1], h2["Code"]])
    c3 = span([courses[2], name_w[0]])
    c4 = span([h1["L-T-P-C"]])
    c5 = span([h1["Credits"]])

    return [
        (c0[1] + c1[0]) / 2,
        (c1[1] + c2[0]) / 2,
        (c2[1] + c3[0]) / 2,
        c4[0] - 13,          # name column is left-aligned and runs wide
        (c4[1] + c5[0]) / 2,
    ]


def split_row(words, bounds):
    cells = [[] for _ in range(6)]
    for w in words:
        x = w["x0"]
        col = 5
        for i, b in enumerate(bounds):
            if x < b:
                col = i
                break
        cells[col].append(w["text"])
    return [" ".join(c).strip() for c in cells]


# ---------------------------------------------------------------- table parsing
def parse_table(lines, start):
    """
    `start` indexes the caption line. Returns (semester_dict, next_index) or
    (None, next_index) if the header could not be located.
    """
    caption = line_text(lines[start][1])
    m = CAPTION.match(caption)
    programme, batch, sem_num = m.group(1), "20" + m.group(2), int(m.group(3))

    # header is the next two lines
    if start + 2 >= len(lines):
        return None, start + 1
    bounds = column_bounds(lines[start + 1][1], lines[start + 2][1])
    if bounds is None:
        warn(f"{programme} B{batch} sem {sem_num}: header not recognised")
        return None, start + 1

    rows, stated, i = [], None, start + 3
    while i < len(lines):
        top, words = lines[i]
        text = line_text(words)
        if text.startswith("Total"):
            cells = split_row(words, bounds)
            stated = cells[5] or cells[4].replace("Total", "").strip()
            i += 1
            break
        if CAPTION.match(text) or text.startswith("Aim for"):
            break
        rows.append((top, split_row(words, bounds)))
        i += 1

    return {
        "programme": programme,
        "batch": batch,
        "num": sem_num,
        "rows": rows,
        "statedTotal": stated,
    }, i


# ---------------------------------------------------------------- row assembly
CORE_CATEGORIES = {"IC", "DC", "DE", "FE", "ISTP", "MTP", "RP", "RP (P/F)"}

CHOOSE_RE = re.compile(r"choose|credits\)", re.I)
LABELISH_RE = re.compile(r"basket|iks|hss", re.I)


def cat_kind(text):
    """How a category cell should be read."""
    if CHOOSE_RE.search(text):
        return "choose"
    if text in CORE_CATEGORIES:
        return "core"
    if LABELISH_RE.search(text):
        return "labelish"
    return "core"


def assemble(table):
    """
    Turn positioned rows into courses, resolving wrapped names and the
    multirow "choose N" baskets.

    A basket is always anchored by a "(choose …)" cell. Label text above or
    below that anchor in the category column is absorbed into the basket, so a
    label sitting on a numbered row is not mistaken for that row's category.
    """
    rows = table["rows"]

    courses = []
    course_of_line = []          # line index -> index of the course it belongs to
    group_credit_at = {}         # course index -> credit value printed for a basket

    for _top, cells in rows:
        serial, cat, code, name, ltpc, credits = cells

        if SERIAL.match(serial):
            courses.append({
                "cat": cat, "code": code, "title": name,
                "ltpc": ltpc, "credits": credits,
            })
            course_of_line.append(len(courses) - 1)
            continue

        course_of_line.append(len(courses) - 1)
        if not courses:
            continue
        if name:
            courses[-1]["title"] += " " + name
        if ltpc and not courses[-1]["ltpc"]:
            courses[-1]["ltpc"] = ltpc
        if code:
            # a code cell can wrap too, e.g. "CE-203P /" + "CE-354P"
            courses[-1]["code"] = (courses[-1]["code"] + " " + code).strip()
        if credits:
            group_credit_at[len(courses) - 1] = credits

    # ---- category column, line by line
    cat_lines = [
        (li, cells[1], cat_kind(cells[1]))
        for li, (_top, cells) in enumerate(rows)
        if cells[1]
    ]

    # ---- grow a basket outward from each "(choose …)" anchor.
    #      A label is always one name line ("IC Basket", "IKS + HSS") plus the
    #      choose text, which itself may wrap ("(choose 0–3" / "credits)").
    #      Absorbing more than one name line would swallow the basket above.
    consumed = set()             # indices into cat_lines that are label text
    baskets = []                 # list of lists of cat_lines indices
    for n, (li, text, kind) in enumerate(cat_lines):
        if kind != "choose" or n in consumed or "choose" not in text.lower():
            continue
        members = [n]

        m = n + 1                                    # wrapped choose text
        while (m < len(cat_lines) and m not in consumed
               and cat_lines[m][2] == "choose"
               and "choose" not in cat_lines[m][1].lower()
               and cat_lines[m][0] - cat_lines[members[-1]][0] <= 4):
            members.append(m)
            m += 1

        m = n - 1                                    # the one name line above
        if (m >= 0 and m not in consumed
                and cat_lines[m][2] == "labelish"
                and cat_lines[n][0] - cat_lines[m][0] <= 4):
            members.insert(0, m)

        consumed.update(members)
        baskets.append(members)

    # ---- what is left in the category column belongs to its own row
    own_cat = [None] * len(courses)
    for n, (li, text, kind) in enumerate(cat_lines):
        if n in consumed:
            continue
        ci = course_of_line[li]
        if ci >= 0 and own_cat[ci] is None:
            own_cat[ci] = text

    # ---- turn each basket into (label, first course touched, last course touched)
    basket_info = []
    for members in baskets:
        label = " ".join(cat_lines[m][1] for m in members)
        touched = [course_of_line[cat_lines[m][0]] for m in members]
        touched = [t for t in touched if t >= 0]
        if not touched:
            continue
        basket_info.append({"label": label, "lo": min(touched), "hi": max(touched)})
    basket_info.sort(key=lambda b: b["lo"])

    # ---- assign each basket the run of category-less rows it spans
    groups = []
    i = 0
    while i < len(courses):
        if own_cat[i] is not None:
            i += 1
            continue
        j = i
        while j + 1 < len(courses) and own_cat[j + 1] is None:
            j += 1

        inside = [b for b in basket_info if i <= b["lo"] <= j]
        if not inside:
            groups.append((i, j, own_cat[i - 1] if i else "", False))
            i = j + 1
            continue

        start = i
        for k, b in enumerate(inside):
            end = min(b["hi"] + 1, j)
            if k + 1 < len(inside):
                end = min(end, inside[k + 1]["lo"] - 1)
            end = max(end, b["hi"], start)
            if k == len(inside) - 1:
                end = j
            groups.append((start, end, b["label"], True))
            start = end + 1
        i = j + 1

    groups.sort(key=lambda g: g[0])
    return courses, own_cat, groups, group_credit_at


# ---------------------------------------------------------------- shaping
def to_number(text):
    if text is None:
        return None
    t = text.strip().replace("–", "-").replace("—", "-")
    if not t or t == "-":
        return None
    try:
        n = float(t)
    except ValueError:
        return None
    return int(n) if n == int(n) else n


def derive_credits(ltpc):
    """Last field of an L-T-P-C string is the credit value."""
    if not ltpc:
        return None
    parts = ltpc.split("-")
    if len(parts) != 4:
        return None
    return to_number(parts[3])


def shape(table):
    courses, own_cat, groups, group_credit_at = assemble(table)

    group_of = {}
    for gi, (start, end, label, is_basket) in enumerate(groups):
        if start > end:
            continue
        credit_text = None
        for k in range(start, end + 1):
            if k in group_credit_at:
                credit_text = group_credit_at[k]
            elif courses[k]["credits"] and credit_text is None:
                credit_text = courses[k]["credits"]

        choose = 1
        m = re.search(r"choose\s+([0-9]+)", label, re.I)
        if m:
            choose = int(m.group(1))
        clean_label = re.sub(r"\s*\(choose.*?\)?\s*$", "", label)
        clean_label = re.sub(r"\s*\(choose.*?\)\s*", " ", clean_label).strip()
        clean_label = clean_label or "Choice basket"

        single = (start == end) or not is_basket
        for k in range(start, end + 1):
            group_of[k] = {
                "id": f"s{table['num']}-g{gi + 1}",
                "label": clean_label,
                "choose": choose,
                "credits": to_number(credit_text),
                "creditsText": credit_text if to_number(credit_text) is None else None,
                "single": single,
            }

    out = []
    for i, c in enumerate(courses):
        grp = group_of.get(i)
        code = c["code"].strip()
        if code in ("", "—", "-", "–"):
            code = None

        credits = to_number(c["credits"])
        if credits is None and grp and not grp["single"]:
            credits = derive_credits(c["ltpc"])

        category = own_cat[i] or (grp["label"] if grp else None)

        entry = {
            "code": re.sub(r"-\s+", "-", re.sub(r"\s+", " ", code)) if code else None,
            "title": re.sub(r"\s+", " ", c["title"]).strip(),
            "category": category,
            "ltpc": c["ltpc"] or None,
            "credits": credits,
        }
        # the PDF sometimes prints a range instead of a number, e.g. "0–3"
        if credits is None and c["credits"]:
            entry["creditsText"] = c["credits"]
        if grp and not grp["single"]:
            entry["choiceGroup"] = {
                "id": grp["id"],
                "label": grp["label"],
                "choose": grp["choose"],
                "credits": grp["credits"],
            }
            if grp["creditsText"]:
                entry["choiceGroup"]["creditsText"] = grp["creditsText"]
        out.append(entry)

    stated = to_number(table["statedTotal"])
    sem = {"num": table["num"], "statedTotal": stated, "courses": out}
    if stated is None and table["statedTotal"]:
        sem["statedTotalText"] = table["statedTotal"]
    return sem



# ---------------------------------------------------------------- branch mapping
import json
import re
from collections import defaultdict

BRANCH = {
    "B. S. Chemical Sciences": ("BS", None, None),
    "B. Tech Agricultural Engineering with Data Analytics": ("AE", None, None),
    "B. Tech Bioengineering": ("BIO", None, None),
    "B. Tech Chemical Engineering": ("CHE", None, None),
    "B. Tech Civil Engineering": ("CE", None, None),
    "B. Tech Computer Science and Engineering": ("CSE", None, None),
    "B. Tech Data Science and Artificial Intelligence": ("DSAI", None, None),
    "B. Tech Data Science and Engineering": ("DSE", None, None),
    "B. Tech Electrical Engineering": ("EE", None, None),
    "B. Tech Engineering Physics": ("EP", None, None),
    "B. Tech Materials Science and Engineering": ("MSE", None, None),
    "B. Tech Mathematics and Computing": ("MNC", None, None),
    "B. Tech Mechanical Engineering": ("ME", None, None),
    "B. Tech Microelectronics and VLSI": ("VLSI", None, None),
    "B. Tech Quantum Science and Engineering": ("QSE", None, None),
    "B. Tech General Engineering - AI and Robotics": ("GE", "GE-AIR", "AI and Robotics"),
    "B. Tech General Engineering - Communication Technology": ("GE", "GE-COM", "Communication Technology"),
    "B. Tech General Engineering - Fintech": ("GE", "GE-FIN", "Fintech"),
    "B. Tech General Engineering - Mechatronics": ("GE", "GE-MEC", "Mechatronics"),
    "B. Tech General Engineering - Open Specialisation": ("GE", "GE-OPEN", "Open Specialisation"),
}

FULL_NAME = {
    "B. S. Chemical Sciences": "B.S. Chemical Sciences",
    "B. Tech Agricultural Engineering with Data Analytics": "B.Tech Agricultural Engineering with Data Analytics",
    "B. Tech Bioengineering": "B.Tech Bioengineering",
    "B. Tech Chemical Engineering": "B.Tech Chemical Engineering",
    "B. Tech Civil Engineering": "B.Tech Civil Engineering",
    "B. Tech Computer Science and Engineering": "B.Tech Computer Science and Engineering",
    "B. Tech Data Science and Artificial Intelligence": "B.Tech Data Science and Artificial Intelligence",
    "B. Tech Data Science and Engineering": "B.Tech Data Science and Engineering",
    "B. Tech Electrical Engineering": "B.Tech Electrical Engineering",
    "B. Tech Engineering Physics": "B.Tech Engineering Physics",
    "B. Tech Materials Science and Engineering": "B.Tech Materials Science and Engineering",
    "B. Tech Mathematics and Computing": "B.Tech Mathematics and Computing",
    "B. Tech Mechanical Engineering": "B.Tech Mechanical Engineering",
    "B. Tech Microelectronics and VLSI": "B.Tech Microelectronics and VLSI",
    "B. Tech Quantum Science and Engineering": "B.Tech Quantum Science and Engineering",
}

README = [
    "Semester-wise curriculum extracted from the compiled DC Curriculum PDF",
    "(DC_Curriculum_Compiled_NoDEList, last updated 17 August 2026).",
    "One entry per branch + batch (+ specialisation for General Engineering).",
    "Only the eight semester tables are represented. The credit-distribution table,",
    "the discipline-core list and the elective lists are NOT duplicated here.",
    "",
    "Course fields: code, title, category, ltpc, credits.",
    "  credits: null    -> the PDF printed no single number; see creditsText if present",
    "  creditsText      -> the literal cell, e.g. '0-3', when it is a range not a number",
    "  choiceGroup      -> rows forming a 'choose N' basket. Rows in one basket share",
    "                      choiceGroup.id and the basket contributes choiceGroup.credits",
    "                      to the semester total ONCE, not once per option.",
    "statedTotal is the Total printed on that semester's table (null when it is a range;",
    "statedTotalText then holds the literal, e.g. '22-25').",
]

# printed totals that do not equal the sum of their own rows, in the source PDF
KNOWN_TOTAL_CONFLICTS = {
    ("CSE", "2023", 6), ("CSE", "2024", 6), ("CSE", "2025", 6), ("CSE", "2026", 6),
    ("DSE", "2023", 4), ("DSE", "2024", 4),
}


def dash(s):
    return s.replace("\u2013", "-").replace("\u2014", "-") if isinstance(s, str) else s




# ---------------------------------------------------------------- main
def main():
    tables = []
    with pdfplumber.open(PDF) as pdf:
        for page in pdf.pages:
            lines = build_lines(page)
            i = 0
            while i < len(lines):
                if CAPTION.match(line_text(lines[i][1])):
                    table, i = parse_table(lines, i)
                    if table:
                        tables.append(table)
                else:
                    i += 1

    programmes = defaultdict(list)
    for t in tables:
        programmes[(t["programme"], t["batch"])].append(t)

    print(f"tables: {len(tables)}   programme/batch entries: {len(programmes)}",
          file=sys.stderr)

    out, problems = [], []
    for (programme, batch), ts in programmes.items():
        if programme not in BRANCH:
            problems.append(f"unmapped programme: {programme}")
            continue
        code, spec_code, spec_name = BRANCH[programme]
        entry = {"branch": code, "batch": batch}
        if spec_code:
            entry["specialisationCode"] = spec_code
            entry["specialisation"] = spec_name
            entry["name"] = f"B.Tech General Engineering \u2014 {spec_name}"
        else:
            entry["name"] = FULL_NAME[programme]
        entry["source"] = f"{programme} \u2014 B{batch[2:]}, Tables 3-10"

        semesters = []
        for t in sorted(ts, key=lambda t: t["num"]):
            s = shape(t)
            sem = {"num": s["num"], "statedTotal": s["statedTotal"]}
            if s.get("statedTotalText"):
                sem["statedTotalText"] = dash(s["statedTotalText"])

            counted, total = set(), 0
            for c in s["courses"]:
                g = c.get("choiceGroup")
                if g:
                    if g["id"] in counted:
                        continue
                    counted.add(g["id"])
                    total += g["credits"] or 0
                else:
                    total += c["credits"] or 0

            if sem["statedTotal"] is not None and total != sem["statedTotal"]:
                sem["statedTotalConflict"] = True
                problems.append(
                    f"{code} {batch} sem{s['num']}: rows sum to {total}, "
                    f"table prints {sem['statedTotal']}"
                )

            courses = []
            for c in s["courses"]:
                item = {k: c[k] for k in ("code", "title", "category", "ltpc", "credits")}
                if c.get("creditsText"):
                    item["creditsText"] = dash(c["creditsText"])
                if c.get("choiceGroup"):
                    g = dict(c["choiceGroup"])
                    if g.get("creditsText"):
                        g["creditsText"] = dash(g["creditsText"])
                    item["choiceGroup"] = g
                courses.append(item)
            sem["courses"] = courses
            semesters.append(sem)

        entry["semesters"] = semesters
        out.append(entry)

    order = {b: i for i, b in enumerate(
        ["BS", "AE", "BIO", "CHE", "CE", "CSE", "DSAI", "DSE", "EE", "EP",
         "GE", "MSE", "MNC", "ME", "VLSI", "QSE"])}
    out.sort(key=lambda e: (order.get(e["branch"], 99),
                            e.get("specialisationCode") or "", -int(e["batch"])))

    doc = {
        "schemaVersion": 2,
        "sourceDocument": "DC_Curriculum_Compiled_NoDEList",
        "lastUpdated": "2026-08-17",
        "_readme": README,
        "curricula": out,
    }
    with open(OUT, "w") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)

    print(f"wrote {OUT}: {len(out)} entries, "
          f"{sum(len(e['semesters']) for e in out)} semesters, "
          f"{sum(len(s['courses']) for e in out for s in e['semesters'])} rows",
          file=sys.stderr)
    for p in warnings + problems:
        print("  CHECK:", p, file=sys.stderr)


if __name__ == "__main__":
    main()