# Project Specification: Will Guide MVP

## 1. Executive Summary

**Goal**: Produce a lawyer-ready intake package for Ontario wills that materially reduces follow-up time and reliably flags high-risk fact patterns.
**Core Value**: Progressive disclosure intake, rule-driven branching, and "lawyer-like" AI guidance without providing legal advice.

## 2. Technical Stack

- **Frontend**: Vue.js (Vue 3) + Vite
- **UI Framework**: Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **AI Model**: Google Gemini 2.5 Flash Lite (via API)
- **Language**: TypeScript (for both client and server)

## 3. Product Scope (MVP)

### 3.1. Triage & Routing

- **Objective**: 3-7 minute initial flow to determine intake complexity.
- **Key Data Points**:
  - Ontario Residency
  - Marital Status (Married, Common-law, Divorced, etc.)
  - Dependants (Minors, Disabled)
  - Asset Complexity (Business ownership, Foreign property)
- **Output**: Generates a "Question Path" (enabling specific modules) and early escalation flags.

### 3.2. Intake Questionnaire (The "Wizard")

- **Design Principle**: One question at a time, fast controls ("I'm not sure", "Save for later").
- **Modules**:
    1. **Personal Profile**: Identity, family structure.
    2. **Executor Selection**: Primaries and alternates.
    3. **Beneficiaries**: Specific gifts, residue distribution, contingencies.
    4. **Guardianship**: For minor children (includes trustee designation).
    5. **Assets Overview**: Categorical checks (not full financial audit).
- **Features**:
  - "People Directory": Define a person once, reuse them as executor/beneficiary/guardian.

### 3.3. AI Guidance Layer

- **Role**: Explains questions, suggests phrasing, clarifies ambiguities.
- **Constraints**:
  - CANNOT provide tax/estate advice.
  - CANNOT draft final legal clauses.
  - CANNOT hallucinate client facts.

### 3.4. Escalation Engine (Deterministic)

- **Function**: Analyzes intake data for risk factors.
- **Triggers**:
  - **Hard Flags** (Mandatory Review): Blended families, disinheritance, capacity signals.
  - **Soft Flags** (Attention Items): Unclear separation status, minor beneficiaries without trust provisions.

### 3.5. Lawyer Console

- **Views**:
  - **Matter Summary**: High-level view of client intakes.
  - **Review Interface**: See Q/A pairs, AI follow-ups, and flagged issues.
  - **Disposition**: Mark as Accepted, Needs Follow-up, or Schedule Call.

### 3.6. Output Generation

- **Format**: DOCX (Standardized).
- **Contents**:
  - Client IDs & Consents.
  - Structured Answers.
  - Assumptions & Unknowns.
  - Audit Trail Reference.

## 4. Security & Compliance

- **RBAC**: Roles for Client and Lawyer.
- **Audit Logs**: Immutable record of all intake actions.
- **Data Privacy**: Encrypted storage, least-privilege access.

## 5. Non-Goals (MVP)

- Generating the final Will document (legal drafting).
- Multi-province support (Ontario only).
- Deep tax optimization logic.
- E-signatures or Payment processing.
