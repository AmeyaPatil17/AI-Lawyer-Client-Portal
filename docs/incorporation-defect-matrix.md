# Incorporation Wizard Defect Matrix

Legend: `tag | severity | trigger/repro | broken data path | fix area | status`

## JurisdictionName.vue
1. `data-loss | P1 | Switch named -> numbered after entering name data | preIncorporation.proposedName/legalEnding/nuansReport persisted while hidden | local sanitizer + buildStepData hidden-field clearing | fixed`
2. `validation | P1 | Create named corporation without confirming final name | preIncorporation.nameConfirmed not enforced consistently | shared validation + local validateLocal | fixed`
3. `validation | P1 | Enter whitespace-only proposed name | preIncorporation.proposedName saved as truthy but invalid | normalizeText + inline validation | fixed`
4. `validation | P1 | Leave legal ending empty for named corp | preIncorporation.legalEnding omitted without blocking completion | shared validator + inline error | fixed`
5. `validation | P1 | Named corp with no NUANS date | preIncorporation.nuansReport.reportDate missing while step marked complete elsewhere | shared rules + local validation | fixed`
6. `validation | P1 | Enter future NUANS date | preIncorporation.nuansReport.reportDate accepted | shared date rule + inline error | fixed`
7. `validation | P1 | Use NUANS older than 90 days | preIncorporation.nuansReport.reportDate only warned in review, not blocked in step | shared validator + review gating | fixed`
8. `validation | P1 | Mark NUANS conflict but leave details blank | preIncorporation.nuansReport.conflictDetails missing | local validation + shared rules | fixed`
9. `data-loss | P2 | Clear NUANS conflict flag after entering details | preIncorporation.nuansReport.conflictDetails leaked in payload while field hidden | sanitizer/buildStepData | fixed`
10. `cross-step | P2 | Toggle jurisdiction away from CBCA after entering bilingual name | preIncorporation.bilingualName persisted while hidden | jurisdiction-specific clearing | fixed`
11. `UX | P2 | Validation message appears only in modal after continue | local error state not reflected inline | real inline error wiring | fixed`
12. `validation | P2 | Numbered company path without confirmation | preIncorporation.nameConfirmed not required for numbered path | shared validator + local validation | fixed`
13. `data-loss | P2 | Switch numbered -> named after confirming numbered path | stale numbered confirmation carried forward without named requirements | sanitize + validateLocal | fixed`
14. `cross-step | P2 | Corporate name preview built ad hoc instead of canonical helper | review/articles could show different name than step 1 | buildCorporateName adoption | fixed`
15. `data-loss | P1 | Navigate immediately after editing | pending debounce left store stale during route change | commitStep + shell flush before nav | fixed`
16. `data-loss | P1 | Undo/redo with unsaved local edits | store snapshot excluded latest local state | shell commit before undo/redo | fixed`
17. `cross-step | P1 | Re-enter step after another step save | per-step fetch rehydrated stale server state over local store | one-time shell load + no per-step fetch | fixed`
18. `validation | P2 | Hidden bilingual/name-only fields counted in completion | sidebar/review completion drifted from visible requirements | shared validation source | fixed`
19. `validation | P2 | NUANS reviewed checkbox omitted for named corp | preIncorporation.nuansReviewed not consistently required | shared validator | fixed`
20. `cross-step | P2 | Legacy root notes/submission fields mixed with section data | review/submit logic read inconsistent pre-inc state snapshots | canonical normalization path introduced globally | fixed`

## StructureOwnership.vue
1. `cross-step | P1 | Rename a share class after adding shareholders | initialShareholders linked by class name and drifted on rename | shareClassId persistence + dropdown binding | fixed`
2. `cross-step | P1 | Remove a share class with assigned holders | initialShareholders.shareClass became dangling text | removeShareClass cascade by shareClassId | fixed`
3. `validation | P1 | Enter duplicate class names with case/spacing differences | structureOwnership.shareClasses accepted duplicates | normalizeText uniqueness check | fixed`
4. `validation | P1 | Issue shares across two holders beyond class max | aggregate limit checked per row, not per class total | buildClassTotals aggregate validation | fixed`
5. `validation | P2 | Leave shareholder share class unselected | initialShareholders.shareClassId missing but row persisted | shared validator + dropdown sync | fixed`
6. `validation | P2 | Enter zero or negative shares | initialShareholders.numberOfShares invalid but saved | numeric sanitization + validator | fixed`
7. `validation | P2 | Enter negative max shares | shareClasses.maxShares allowed invalid values | shared validator | fixed`
8. `validation | P1 | Director row with missing address | structureOwnership.directors[].address omitted but downstream steps depend on it | shared validator | fixed`
9. `validation | P1 | OBCA office outside Ontario | structureOwnership.registeredOfficeProvince inconsistent with jurisdiction | shared validator | fixed`
10. `validation | P1 | Missing registered office province | structureOwnership.registeredOfficeProvince absent but step could complete | local/shared validation | fixed`
11. `validation | P1 | CBCA corporation without records office address | structureOwnership.recordsOfficeAddress missing | CBCA-only validator | fixed`
12. `data-loss | P2 | Switch from CBCA to OBCA after entering records office | structureOwnership.recordsOfficeAddress leaked while hidden | local sanitizer/buildStepData | fixed`
13. `validation | P2 | Enter invalid MM-DD fiscal year | structureOwnership.fiscalYearEnd accepted malformed dates | shared fiscal year rule | fixed`
14. `validation | P2 | Enter whitespace-only shareholder or class names | structureOwnership stored truthy invalid strings | normalizeText sanitation | fixed`
15. `cross-step | P1 | Shareholder sync into issuance relied on ephemeral row ids | downstream agreements broke across revisit/save cycles | persisted id fields for classes/holders/directors | fixed`
16. `data-loss | P1 | Navigate before debounce fires | structureOwnership local edits not flushed to store/server | useIncorpStepSave commit hook + shell flush | fixed`
17. `cross-step | P1 | Per-step mount refetch after store edits | structureOwnership local state overwritten with older server payload | shell ensureLoaded + removed step fetch | fixed`
18. `validation | P2 | CBCA residency warning computed ad hoc | structureOwnership residency issues not visible until lawyer review | local warning + server flags continue to surface | fixed`
19. `UX | P2 | Class dropdown stored display text only | shareholder row could show stale class label after edits | shareClassId + syncShareholderClass | fixed`
20. `cross-step | P2 | Articles/post-inc/share issuance needed stable directors/shareholders | nested arrays had no persisted ids | schema/store normalization for ids | fixed`

## ArticlesOfIncorp.vue
1. `cross-step | P1 | Step 1 name changed after articles drafted | articles.corporateName drifted from canonical corporate name | buildCorporateName sync until override | fixed`
2. `data-loss | P2 | User intentionally edits corporate name | later sync overwrote manual value on revisit | corporateNameOverridden flag | fixed`
3. `cross-step | P1 | Step 2 office changed after articles drafted | articles.registeredAddress drifted from structureOwnership.registeredOfficeAddress | syncedAddress watcher until override | fixed`
4. `data-loss | P2 | User intentionally edits registered address | upstream sync wiped manual article-specific address | registeredAddressOverridden flag | fixed`
5. `validation | P1 | Enter PO Box in registered address | articles.registeredAddress accepted non-physical office | shared PO box rule + inline error | fixed`
6. `validation | P1 | Leave director count mode unset | articles.directorCountType missing but step could continue | local/shared validator | fixed`
7. `validation | P1 | Toggle fixed -> range or range -> fixed | stale directorCountFixed/min/max values leaked together | watcher clearing mutually exclusive fields | fixed`
8. `validation | P1 | Enter max below min for range | articles.directorCountMin/directorCountMax invalid | range validation | fixed`
9. `validation | P2 | Blur fixed count after invalid text | articles.directorCountFixed persisted NaN | sanitizeCount on blur + buildStepData guards | fixed`
10. `validation | P1 | Leave share capital description blank | articles.shareCapitalDescription whitespace passed | normalizeText + required rule | fixed`
11. `validation | P1 | Mark certificate received without corporation number | articles.corporationNumber missing while certificateReceived true | local/shared validator | fixed`
12. `validation | P1 | Mark certificate received without date | articles.certificateDate missing while certificateReceived true | shared validator | fixed`
13. `validation | P1 | Enter future certificate date | articles.certificateDate accepted future dates | shared future-date rule | fixed`
14. `validation | P1 | Pick wrong filing method for jurisdiction | articles.filingMethod not constrained by OBCA/CBCA | shared validator | fixed`
15. `data-loss | P1 | Navigate immediately after editing articles | latest article edits stayed local only | commitStep + shell flush | fixed`
16. `cross-step | P1 | Revisit step after server save from another section | per-step fetch clobbered normalized store state | removed fetch + shell loading | fixed`
17. `data-loss | P2 | Numbered corporation kept stale custom corporateName | articles.corporateName should not persist for numbered path | buildStepData clears named-only value | fixed`
18. `cross-step | P2 | Review summary built article name ad hoc | review and articles could disagree on corporate name | canonical helper in review/articles | fixed`
19. `validation | P2 | Registered office hidden requirements diverged across step/sidebar/review | completion logic came from multiple sources | shared validation source | fixed`
20. `cross-step | P2 | Submission timestamp/legacy fields mixed around articles payload | articles review state could load inconsistent submission metadata | normalized submissionDate globally | fixed`

## PostIncorpOrg.vue
1. `cross-step | P1 | Director renamed in step 2 after consent list existed | postIncorpOrg.directorConsents linked by free-text name only | directorId persistence in consents | fixed`
2. `cross-step | P1 | Director removed in step 2 | stale consent row remained unmatched | shared ids + validator enforcing director list match | fixed`
3. `cross-step | P2 | Saved consent merge on revisit matched by array order | consent rows drifted after add/remove | consent id persistence | fixed`
4. `UX | P2 | Consent rows keyed by index | DOM row reuse mixed signatures/dates after deletion | id-based keys | fixed`
5. `validation | P1 | Sign consent without date | directorConsents[].consentDate missing | local/shared validator | fixed`
6. `validation | P1 | Enter date without signed flag | directorConsents[] inconsistent | local/shared validator | fixed`
7. `validation | P1 | Leave general by-law draft unchecked | postIncorpOrg.generalByLawDrafted not enforced | local/shared validator | fixed`
8. `validation | P1 | Leave organizational resolutions unchecked | postIncorpOrg.orgResolutionsPrepared not enforced | local/shared validator | fixed`
9. `validation | P1 | Leave office resolution unchecked | postIncorpOrg.officeResolutionPassed not enforced | local/shared validator | fixed`
10. `data-loss | P2 | Turn off separate banking by-law after checking child | bankingByLawDrafted persisted while hidden | watcher + buildStepData clearing | fixed`
11. `UX | P2 | Audit waiver gave no unanimity guidance | postIncorpOrg.auditWaiverResolution easy to misread for multi-holder corps | shareholder-count warning | fixed`
12. `cross-step | P2 | Auto-populate consents only from director names | downstream review could not distinguish renamed vs new directors | directorId added | fixed`
13. `cross-step | P2 | Directors changed while post-inc step stayed open | postIncorpOrg.directorConsents could drift until remount | live reconcile watcher keyed by directorId | fixed`
14. `data-loss | P1 | Navigate away before debounce fires | consent changes lost from store/server | commitStep + shell flush | fixed`
15. `cross-step | P1 | Per-step fetch after store updates | post-inc local state overwritten by older server payload | removed fetch + shell load-once | fixed`
16. `validation | P2 | Empty consent names could persist from manual add | directorConsents[].directorName invalid | shared validator | fixed`
17. `cross-step | P2 | Review/sidebar completion logic diverged from step rules | post-inc could look complete in one place and incomplete in another | shared validator source | fixed`
18. `data-loss | P2 | Saved consent rows lacked stable ids server-side | merge/persistence churned rows on every save | schema/store/server ids | fixed`
19. `UX | P2 | Manual add or remove of consent rows allowed off-list directors | consent list drifted from the directors source of truth | synced read-only consent rows managed from Step 2 | fixed`
20. `cross-step | P2 | Hidden bank by-law child state leaked into review/submit | step payload did not omit hidden child fields | buildStepData conditional clearing | fixed`

## ShareIssuance.vue
1. `cross-step | P1 | Shareholder renamed in step 2 after issuance started | subscriptionAgreements matched by name/class text and drifted | shareholderId/shareClassId reconciliation | fixed`
2. `cross-step | P1 | Shareholder removed/reordered | agreements keyed by index and reused wrong rows | agreement id persistence + keyed rendering | fixed`
3. `cross-step | P1 | Revisit issuance after changing step 2 | saved extras failed to reattach to current shareholders | id-first merge with fallback matching | fixed`
4. `data-loss | P1 | Subscriber addresses entered for register disappeared on save/load | shareIssuance.subscriptionAgreements[].subscriberAddress missing from schema path | schema/store/server parity added | fixed`
5. `validation | P1 | Aggregate share issuance exceeded class max across subscribers | class-cap check evaluated one row at a time | buildClassTotals aggregate validation | fixed`
6. `validation | P1 | Leave certificate type unset | shareIssuance.certificateType missing but step could continue | local/shared validator | fixed`
7. `validation | P1 | Leave securities register unchecked | shareIssuance.securitiesRegisterComplete not enforced | local/shared validator | fixed`
8. `validation | P1 | Leave consideration collected unchecked | shareIssuance.considerationCollected not enforced | local/shared validator | fixed`
9. `validation | P1 | Requires s.85 rollover but docs toggle unchecked | shareIssuance.s85DocumentsComplete not enforced | local/shared validator | fixed`
10. `data-loss | P2 | Toggle out of s.85 scenario | stale s85DocumentsComplete persisted while hidden | conditional buildStepData clearing | fixed`
11. `validation | P1 | Leave subscriber address blank | securities register could be marked complete with missing addresses | local/shared validator | fixed`
12. `validation | P2 | Negative consideration amount entered | subscriptionAgreements[].considerationAmount not guarded | shared validator | fixed`
13. `validation | P1 | Agreement count drifted from shareholder list | review could miss or duplicate holders | shared validator on counts | fixed`
14. `validation | P1 | Agreement missing shareholderId after migration | subscriptionAgreements orphaned from source holder | shared validator + normalized ids | fixed`
15. `cross-step | P2 | Share class names changed after issuance extras saved | text-only match lost linkage | shareClassId persistence | fixed`
16. `data-loss | P1 | Navigate before debounce fires | recent issuance edits stayed local only | commitStep + shell flush | fixed`
17. `cross-step | P1 | Per-step fetch after other section save | issuance local edits overwritten by older response | removed fetch + shell load-once | fixed`
18. `UX | P2 | Step displayed synced holder fields as mutable source-of-truth data | downstream drift risk if users expected edits here to update step 2 | readonly synced fields + explicit source note | fixed`
19. `cross-step | P2 | Review summary ignored canonical agreement data | review could show stale step 2 holders instead of finalized issuance | review now prefers subscriptionAgreements | fixed`
20. `cross-step | P2 | Certificate/share-certificate banking logic needed canonical issuance state | downstream banking validation lacked reliable certificateType source | shared rule usage + normalized schema | fixed`

## CorporateRecords.vue
1. `cross-step | P1 | Step mounted after another save and refetched entire intake | corporateRecords local state overwritten by older server payload | removed per-step fetch + shell ensureLoaded | fixed`
2. `data-loss | P1 | Navigate away before debounce fires | latest checkbox changes not committed | commitStep + shell flush | fixed`
3. `data-loss | P2 | Reporting issuer toggle becomes true upstream | corporateRecords.hasISCRegister remained persisted while hidden | buildStepData + watcher clearing hidden ISC state | fixed`
4. `data-loss | P2 | USA requirement removed upstream | corporateRecords.hasUSACopy remained persisted while hidden | buildStepData + watcher clearing hidden USA state | fixed`
5. `cross-step | P2 | Certificate received in articles but minute-book checkbox left stale | corporateRecords.hasArticlesAndCertificate drifted from articles.certificateReceived | upstream sync watcher + mount sync | fixed`
6. `cross-step | P2 | By-law drafted in post-inc but records checklist stayed stale | corporateRecords.hasByLaws drifted from postIncorpOrg.generalByLawDrafted | upstream sync watcher + mount sync | fixed`
7. `cross-step | P2 | Securities register completed in issuance but records checklist stale | corporateRecords.hasSecuritiesRegister drifted from shareIssuance.securitiesRegisterComplete | upstream sync watcher + mount sync | fixed`
8. `validation | P1 | Hidden ISC/USA items still counted in completion | corporateRecords step looked incomplete for invisible fields | shared rules + dynamic progress list | fixed`
9. `validation | P1 | recordsLocationConfirmed unchecked | minute-book section could still appear done | local/shared validator | fixed`
10. `validation | P1 | Missing director register | corporateRecords.hasDirectorRegister not enforced | local/shared validator | fixed`
11. `validation | P1 | Missing officer register | corporateRecords.hasOfficerRegister not enforced | local/shared validator | fixed`
12. `validation | P1 | Missing written resolutions/director/shareholder minutes | checklist completeness drifted from visible boxes | local/shared validator | fixed`
13. `UX | P2 | Progress counter counted hidden items | completion percentage misleading for reporting issuers/no-USA cases | allFields computed from visible requirements | fixed`
14. `UX | P2 | Certificate warning was disconnected from upstream article state | users could not see why records were risky | certificateReceived warning bound to articles | fixed`
15. `cross-step | P2 | Shared validation source was not used by sidebar/review | records step status diverged across UI | shared validator adoption | fixed`
16. `data-loss | P2 | Hidden fields saved wholesale via spread payload | stale booleans leaked back on next hydration | explicit buildStepData mapping | fixed`
17. `cross-step | P2 | Review submit gating ignored records-specific blockers | incomplete records could still reach submit path | review now uses shared blocking rules | fixed`
18. `UX | P2 | Step exposed no commit hook to shell | route/back/undo could bypass latest local state | defineExpose commitStep | fixed`
19. `UX | P2 | Step exposed no local validator | shell had to rely on stale store-only validation | defineExpose validateLocal | fixed`
20. `cross-step | P2 | ISC note/regime handling varied by issuer and jurisdiction | user guidance drifted from visibility rules | conditional note + hidden-field clearing | fixed`

## Registrations.vue
1. `cross-step | P1 | Step refetched intake on mount | registrations local edits could be clobbered by older server data | removed fetch + shell load-once | fixed`
2. `data-loss | P1 | Immediate navigation after edit | debounced registration edits not flushed | commitStep + shell flush | fixed`
3. `validation | P1 | CRA BN field accepted RT account suffix in primary BN slot | registrations.craBusinessNumber stored wrong canonical identifier | shared isValidBusinessNumber usage | fixed`
4. `validation | P1 | HST/GST toggle on with malformed RT number | registrations.hstGstNumber not format-validated | shared isValidProgramAccount('RT') | fixed`
5. `validation | P1 | Payroll toggle on with malformed RP number | registrations.payrollAccountNumber not format-validated | shared isValidProgramAccount('RP') | fixed`
6. `data-loss | P2 | Turn off CRA toggle after entering BN | registrations.craBusinessNumber persisted while hidden | watcher + conditional buildStepData | fixed`
7. `data-loss | P2 | Turn off HST/GST toggle | registrations.hstGstNumber persisted while hidden | watcher + conditional buildStepData | fixed`
8. `data-loss | P2 | Turn off payroll toggle | registrations.payrollAccountNumber persisted while hidden | watcher + conditional buildStepData | fixed`
9. `data-loss | P2 | Turn off WSIB toggle | registrations.wsibAccountNumber persisted while hidden | watcher + conditional buildStepData | fixed`
10. `data-loss | P2 | Disable extra-provincial registration | registrations.extraProvincialProvinces leaked in payload while hidden | watcher + conditional buildStepData | fixed`
11. `validation | P1 | CBCA extra-provincial enabled with no provinces | registrations.extraProvincialProvinces missing but step could continue | local/shared validator | fixed`
12. `data-loss | P2 | Jurisdiction switches from CBCA to OBCA | registrations.extraProvincialRegistered remained set for hidden section | isCBCA watcher clearing | fixed`
13. `UX | P2 | Province list omitted NT/NU/YT | extra-provincial registration options incomplete | expanded province list | fixed`
14. `UX | P2 | Municipal licence rows keyed by index | row state jumped after deletion/reorder | persisted id + keyed rendering | fixed`
15. `cross-step | P2 | Municipal licences had no stable ids server-side | save/rehydrate churned rows and diff logic | schema/store/server id support | fixed`
16. `validation | P2 | Blank municipality saved | registrations.municipalLicences[].municipality not enforced | local/shared validator | fixed`
17. `validation | P2 | Blank licence type saved | registrations.municipalLicences[].licenceType not enforced | local/shared validator | fixed`
18. `UX | P2 | Step exposed no local validator | shell could only validate stale store snapshot | defineExpose validateLocal | fixed`
19. `UX | P2 | Step exposed no commit hook | route/back/undo could miss pending input | defineExpose commitStep | fixed`
20. `cross-step | P2 | Shared validation and review gating were out of sync with visible fields | registrations completion differed across wizard UI | shared validator adoption | fixed`

## BankingSetup.vue
1. `cross-step | P1 | Step refetched intake on mount | banking local edits could be replaced by older payload | removed fetch + shell load-once | fixed`
2. `data-loss | P1 | Navigate before debounce fires | recent banking edits never reached store/server | commitStep + shell flush | fixed`
3. `data-loss | P2 | Turn off bank account toggle after entering bank name | bankingSetup.bankName persisted while hidden | watcher + conditional buildStepData | fixed`
4. `validation | P1 | Bank account opened with blank bank name | bankingSetup.bankName not enforced | local/shared validator | fixed`
5. `data-loss | P2 | Turn off accountant toggle after entering firm | bankingSetup.accountantName persisted while hidden | watcher + conditional buildStepData | fixed`
6. `validation | P1 | Accountant engaged with blank name | bankingSetup.accountantName not enforced | local/shared validator | fixed`
7. `data-loss | P2 | Turn off insurance toggle after selecting types | bankingSetup.insuranceTypes persisted while hidden | watcher + conditional buildStepData | fixed`
8. `validation | P1 | Insurance enabled with no selected type | bankingSetup.insuranceTypes not required | local/shared validator | fixed`
9. `data-loss | P2 | Turn off agreements toggle after selecting types | bankingSetup.agreementTypes persisted while hidden | watcher + conditional buildStepData | fixed`
10. `validation | P1 | Agreements enabled with no selected type | bankingSetup.agreementTypes not required | local/shared validator | fixed`
11. `cross-step | P1 | Issuance set to uncertificated but banking still allowed certificates | bankingSetup.shareCertificatesOrdered inconsistent with shareIssuance.certificateType | shared validator + watcher clearing | fixed`
12. `cross-step | P2 | Change issuance certificateType after banking already set | stale shareCertificatesOrdered value persisted | certificateType watcher + conditional payload | fixed`
13. `cross-step | P2 | Corporate records marked ready but banking minute-book state stayed stale | bankingSetup.minuteBookSetup drifted from records workflow | upstream sync from corporateRecords.recordsLocationConfirmed | fixed`
14. `validation | P1 | Minute book not confirmed | bankingSetup.minuteBookSetup not enforced consistently | local/shared validator | fixed`
15. `cross-step | P2 | Shared validation source not used everywhere | banking completion disagreed across sidebar/review | shared validator adoption | fixed`
16. `UX | P2 | Step exposed no commit hook | nav/undo/review submit could bypass latest local state | defineExpose commitStep | fixed`
17. `UX | P2 | Step exposed no local validator | shell could only see debounced store state | defineExpose validateLocal | fixed`
18. `data-loss | P2 | Hidden detail fields saved wholesale via object spread | stale sub-options reappeared after reload | explicit buildStepData mapping | fixed`
19. `cross-step | P2 | Review submit gating ignored uncertificated/share-certificate conflict | invalid banking setup could still submit | shared blocking rules in review | fixed`
20. `UX | P3 | Optional seal/trademark items could confuse completion expectations | completion logic needed to ignore non-required options | shared validator keeps optional fields out of hard-stop rules | fixed`

## IncorpReview.vue
1. `cross-step | P1 | Review gate checked only expired NUANS logic | submit allowed other blocking defects through | shared getBlockingIssues gating | fixed`
2. `cross-step | P1 | Checklist text said users could submit with incomplete steps | review policy diverged from hard-stop validation | checklist messaging updated to block submit | fixed`
3. `data-loss | P1 | Submit clicked while notes debounce pending | incorpNotes.clientNotes not guaranteed to persist before submit | flushNotes before submit endpoint | fixed`
4. `data-loss | P1 | Navigate away from review with unsaved notes | notes existed only in local textarea | defineExpose commitStep for notes flush | fixed`
5. `cross-step | P1 | Review mounted and refetched intake again | stale server payload could overwrite normalized store state | removed review fetch; use existing store state | fixed`
6. `cross-step | P1 | Corporate name summary built ad hoc from step 1 text | review could show stale/non-canonical name | buildCorporateName helper in review | fixed`
7. `cross-step | P1 | Shareholder summary always read step 2 holders | finalized issuance data with addresses/amounts ignored | review prefers subscriptionAgreements when present | fixed`
8. `data-loss | P1 | Client notes saved to legacy root field | review notes and submit endpoint read different paths | canonical incorpNotes.clientNotes helpers | fixed`
9. `cross-step | P1 | Submit response used old submittedAt naming | client and server submission timestamp contracts drifted | submissionDate canonicalization | fixed`
10. `cross-step | P2 | Store did not retain server flags after fetch/save | review could not surface rules-engine results | intake store metadata refs for flags/logicWarnings | fixed`
11. `cross-step | P2 | Review hid server logic warnings entirely | cross-section inconsistencies invisible to client before submit | server warning card in review | fixed`
12. `cross-step | P2 | Review hid server flags entirely | lawyer-facing flags were not surfaced back to client | server flag card in review | fixed`
13. `UX | P2 | Blocking issues were not linked back to step routes | users had to guess where to fix failures | context-to-path navigation actions | fixed`
14. `validation | P1 | Confirm modal opened even when submission blocked | users could reach misleading final action state | confirmSubmit early return on blockers | fixed`
15. `data-loss | P2 | Notes timer kept running after unmount | orphan save timers risked duplicate/stale requests | onUnmounted timeout cleanup | fixed`
16. `cross-step | P2 | Review shell could not flush current step before submit | active step contract missing for review | commitStep expose + shell flush | fixed`
17. `cross-step | P2 | Pre-inc summary only showed hard-coded NUANS state | actual blocking reason could be name confirmation/legal ending/conflict details | preIncorpIssue derived from shared blockers | fixed`
18. `cross-step | P2 | Local submit success path did not stage submitted/submissionDate | dashboard/navigation could lag until refetch | stageIncorpStep after submit | fixed`
19. `cross-step | P2 | Review checklist completion used different rule source than wizard shell | inconsistent step states across UI | shared validation source | fixed`
20. `UX | P3 | Print/export and summary actions had no awareness of canonical server metadata | review omitted critical context from final audit screen | server flags/warnings + canonical summaries added | fixed`
