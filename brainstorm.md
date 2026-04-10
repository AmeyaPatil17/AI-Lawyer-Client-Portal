MVP goal: Produce a lawyer-ready intake package for Ontario wills that (a) materially reduces follow-up and (b) reliably flags/escalates high-risk fact patterns.



MVP scope

1\) Ontario Will Intake Questionnaire (rule-driven)

Deliverable: a versioned, rules-based questionnaire covering:

Personal profile (identity, marital status, dependants)

Executors/alternates

Beneficiaries + alternates + contingency rules

Guardians for minors

Trust/trustee designations for minors

Specific gifts vs residue

Digital assets intent (high level)

Funeral/burial preferences (optional)

Prior wills + revocation intent

Assets overview (categorical, not detailed planning)

Key MVP capability: dynamic branching that asks only what’s needed and forces disambiguation (e.g., relationship definitions, alternates, survivorship conditions, minors).



2\) AI “Lawyer-like” Guidance Layer (with hard guardrails)

AI does:

Explain each question in plain language

Ask follow-ups when answers are ambiguous/incomplete

Offer “legal phrasing suggestions” without asserting legal conclusions

Never fills facts on behalf of the client (no hallucinated data)

AI must not do:

Recommend outcomes (“you should disinherit X”)

Provide tax/estate planning advice

Draft will clauses



3\) Escalation engine (must-have)

A deterministic ruleset that triggers:

Mandatory escalation (lawyer review required before intake is “complete”)

Soft flags (lawyer attention items, but can proceed)

Examples: blended families, disinheritance, capacity/undue influence signals, unclear marital/separation, minor beneficiaries without trustee plan, disabled dependants, business ownership, cross-border assets.



4\) Lawyer review console (internal)

Lawyer can:

View a “Matter” summary

See all Q/A + AI follow-ups

See Flags \& Escalations with reason codes

Add internal notes

Mark matter as Accepted / Needs Follow-up / Schedule Call



5\) Docx output packet (your stated deliverable)

One-click generation of a standardized Docx that includes:

Client identifiers + intake consent acknowledgements

Clean structured answers (not chat logs)

Assumptions/unknowns explicitly listed

Flags/escalations section

Time-stamped audit trail reference (not full log)



6\) Security + RBAC + Audit logs (MVP-level, not “later”)

You’re handling highly confidential client info; you need baseline controls from day 1 (LSO confidentiality obligations are strict).

Roles: client, lawyer, head lawyer, staff (least privilege) + immutable audit log.



MVP “non-goals” (explicitly excluded)

Generating the will document

Multi-province support (can be Phase 2)

Deep estate/tax planning logic

Practice-management integrations

E-signing, ID verification, payments (can be Phase 2)



MVP success criteria (tie directly to your metrics)

Acceptance without follow-up: target a % for simple/typical profiles first

Time to completion: median completion time + drop-off points

Lawyer time saved: measure review time vs old intake

Escalation correctness: lawyer agrees escalation was warranted/unwarranted



Collecting client info without frustration (even with a huge question bank)

The winning pattern here is progressive disclosure: clients should feel like they’re answering a short interview, while your system is quietly traversing a large decision tree behind the scenes.



1\) Start with a 3–7 minute triage that “routes” the client

Ask only what you need to unlock the right modules:

Ontario residency + basic identity

Marital status (married / separated / common-law / divorced / widowed)

Minor children / dependants

Any disabled dependants

Business ownership / private corporation shares

Foreign property / US ties

Prior wills / complex family situation (blended family, disinheritance intent)

Output of triage: a “question path” (modules to include/exclude) + early escalation flags.



2\) Use a module-based wizard, not one mega-form

Organize the experience into 6–10 sections with clear goals and progress:

People \& relationships (build an “entities list” once)

Executors \& alternates

Beneficiaries \& alternates

Guardians / trustees (if minors)

Gifts, residue, contingencies

Prior wills + special circumstances

Review \& confirmation

Key UX trick: build a People directory early (names, relationship, DOB optional). Then later questions become “pick from list” instead of re-typing, which dramatically reduces fatigue.



3\) One question at a time, but with fast controls

A single-question screen can still be fast if you add:

“I’m not sure” (doesn’t block; creates a lawyer flag)

“Save \& continue later” (always)

“Show example” and “Why this matters” (collapsible)

“Use legal wording” (toggle: plain language → suggested legal phrasing)

“Edit in summary” (jump back without losing place)



4\) Hard completeness rules + soft guidance

Separate two things:

Deterministic completeness gates (required fields, mutually exclusive choices, identity uniqueness, missing alternates, minor-beneficiary trustee gap, etc.)

AI guidance only for: clarifying, rephrasing, asking follow-ups, and surfacing inconsistencies.

This keeps the AI from “deciding” legal outcomes while still eliminating ambiguity.



5\) Treat uncertainty as first-class data

When a user can’t answer (common), don’t force them into bad answers:

store “unknown” explicitly

ask one follow-up (“Do you know where this could be found?”)

generate a lawyer issue item automatically

This prevents abandonment and keeps lawyers in control of risk.



6\) End with a “lawyer-ready review”

Before submission:

show a structured summary

highlight contradictions (e.g., beneficiary appears twice, executor is also minor, missing alternates)

show flags/escalations and let client add clarifying notes



Programming language: TypeScript
Frontend Framework: Vue.js
Backend: Node.js

UI Library: Tailwind
Database: MongoDB
AI Model: google/gemini-2.5-flash-lite



What you should build first (MVP backlog in 10 items)

Ontario question bank + canonical data schema

Branching rules engine (deterministic)

Escalation rules engine (deterministic + reason codes)

AI guidance service (follow-ups + legal-term suggestions + refusal style)

Answer validation + “completeness score” gating submission

Client portal flow: consent → guided completion → review → submit

Lawyer console: matter list → review → flags → disposition

Docx generator template (firm-standard formatting)

RBAC + MFA for firm users + audit logging

Canada-resident backend + encrypted storage + backup + deletion workflow (head lawyer only)



