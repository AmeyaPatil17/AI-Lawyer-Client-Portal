/**
 * Field-level helper content for the incorporation wizard.
 * This is the canonical source of truth for incorporation FieldHelper badges.
 */

export const INCORP_AI_STEPS = [
  'preIncorporation',
  'structureOwnership',
  'articles',
  'postIncorpOrg',
  'shareIssuance',
  'corporateRecords',
  'registrations',
  'bankingSetup',
] as const;

export type IncorpAiStep = (typeof INCORP_AI_STEPS)[number];

export interface IncorpHelperAskAi {
  step: IncorpAiStep;
  prompt: string;
}

export interface IncorpFieldHelperConfig {
  example?: string;
  why?: string;
  legal?: string;
  askAi?: IncorpHelperAskAi;
}

export interface IncorpHelperRegistry {
  jurisdiction: {
    jurisdiction: IncorpFieldHelperConfig;
    nameType: IncorpFieldHelperConfig;
    proposedName: IncorpFieldHelperConfig;
    legalEnding: IncorpFieldHelperConfig;
    nuansReportDate: IncorpFieldHelperConfig;
    nuansFileReference: IncorpFieldHelperConfig;
    nuansConflictDetails: IncorpFieldHelperConfig;
    bilingualName: IncorpFieldHelperConfig;
    nameConfirmed: IncorpFieldHelperConfig;
  };
  structureOwnership: {
    shareClassName: IncorpFieldHelperConfig;
    maxShares: IncorpFieldHelperConfig;
    shareRights: IncorpFieldHelperConfig;
    shareholderName: IncorpFieldHelperConfig;
    shareholderEmail: IncorpFieldHelperConfig;
    numberOfShares: IncorpFieldHelperConfig;
    considerationType: IncorpFieldHelperConfig;
    considerationAmount: IncorpFieldHelperConfig;
    directorFullName: IncorpFieldHelperConfig;
    directorAddress: IncorpFieldHelperConfig;
    canadianResident: IncorpFieldHelperConfig;
    registeredOfficeAddress: IncorpFieldHelperConfig;
    registeredOfficeProvince: IncorpFieldHelperConfig;
    recordsOfficeAddress: IncorpFieldHelperConfig;
    fiscalYearEnd: IncorpFieldHelperConfig;
    corporateFlags: IncorpFieldHelperConfig;
  };
  articles: {
    corporateName: IncorpFieldHelperConfig;
    registeredAddress: IncorpFieldHelperConfig;
    directorCountType: IncorpFieldHelperConfig;
    directorFixedRange: IncorpFieldHelperConfig;
    shareCapitalDescription: IncorpFieldHelperConfig;
    transferRestrictions: IncorpFieldHelperConfig;
    businessRestrictions: IncorpFieldHelperConfig;
    otherProvisions: IncorpFieldHelperConfig;
    filingFeeCert: IncorpFieldHelperConfig;
  };
  postIncorpOrg: {
    generalByLaw: IncorpFieldHelperConfig;
    bankingByLaw: IncorpFieldHelperConfig;
    orgResolutions: IncorpFieldHelperConfig;
    shareholderResolution: IncorpFieldHelperConfig;
    auditWaiver: IncorpFieldHelperConfig;
    officeResolution: IncorpFieldHelperConfig;
    directorConsents: IncorpFieldHelperConfig;
  };
  shareIssuance: {
    considerationAmount: IncorpFieldHelperConfig;
    subscriberAddress: IncorpFieldHelperConfig;
    agreementExecuted: IncorpFieldHelperConfig;
    certificateType: IncorpFieldHelperConfig;
    securitiesRegisterComplete: IncorpFieldHelperConfig;
    s85Documents: IncorpFieldHelperConfig;
  };
  corporateRecords: {
    minuteBookChecklist: IncorpFieldHelperConfig;
    iscRegister: IncorpFieldHelperConfig;
  };
  registrations: {
    craBusinessNumber: IncorpFieldHelperConfig;
    hstGstRegistered: IncorpFieldHelperConfig;
    payroll: IncorpFieldHelperConfig;
    bnaRegistration: IncorpFieldHelperConfig;
    extraProvincial: IncorpFieldHelperConfig;
    extraProvincialProvinces: IncorpFieldHelperConfig;
    wsib: IncorpFieldHelperConfig;
    wsibAccountNumber: IncorpFieldHelperConfig;
    eht: IncorpFieldHelperConfig;
    municipalLicences: IncorpFieldHelperConfig;
    importExport: IncorpFieldHelperConfig;
  };
  bankingSetup: {
    bankAccount: IncorpFieldHelperConfig;
    bankName: IncorpFieldHelperConfig;
    bankNameOther: IncorpFieldHelperConfig;
    corporateSeal: IncorpFieldHelperConfig;
    insurance: IncorpFieldHelperConfig;
    insuranceTypes: IncorpFieldHelperConfig;
    agreements: IncorpFieldHelperConfig;
    agreementTypes: IncorpFieldHelperConfig;
  };
}

export const incorpHelpers: IncorpHelperRegistry = {
  jurisdiction: {
    jurisdiction: {
      example:
        'Ontario (OBCA) is common for businesses operating only in Ontario. Federal (CBCA) is better if you plan to operate across multiple provinces.',
      why:
        'The jurisdiction determines which corporate statute applies, affecting naming rules, annual filings, and director residency requirements.',
      askAi: {
        step: 'preIncorporation',
        prompt:
          'What are the main differences between incorporating under the OBCA (Ontario) versus the CBCA (Federal)?',
      },
    },
    nameType: {
      example: "Named: 'Acme Technologies Inc.' | Numbered: '1234567 Ontario Inc.'",
      why:
        'Named corporations support branding but require name clearance. Numbered corporations are faster to set up when branding is not a priority.',
      askAi: {
        step: 'preIncorporation',
        prompt:
          'Should I choose a named corporation or a numbered corporation? What are the pros and cons?',
      },
    },
    proposedName: {
      example: 'Blue Heron Consulting Inc.',
      why:
        'This is the exact legal name that will appear on the Certificate of Incorporation and all official records. It must match the NUANS results exactly.',
      askAi: {
        step: 'preIncorporation',
        prompt:
          'What makes a corporate name distinguishable? Are there specific naming rules for Ontario or Federal corporations?',
      },
    },
    legalEnding: {
      example: 'Inc., Ltd., Corp., Incorporated, Limited, or Corporation',
      why:
        'Canadian corporate law requires a legal element at the end of the name to show the entity has limited liability.',
    },
    nuansReportDate: {
      example: '2024-05-15',
      why:
        'A NUANS report is only valid for 90 days. If it expires before filing, the incorporation can be rejected and a new report may be required.',
      askAi: {
        step: 'preIncorporation',
        prompt: 'What is a NUANS report and why is it only valid for 90 days?',
      },
    },
    nuansFileReference: {
      example: 'Reservation #12345678',
      why:
        'Use the exact reservation or report reference so counsel can match the final filing package to the correct name search.',
    },
    nuansConflictDetails: {
      example:
        "The name 'Apex Consulting' was flagged, but our proposed name is 'Apex Tech Consulting Inc.' and the business operates in a different industry.",
      why:
        "If the NUANS report shows similar names, this context helps your lawyer assess whether the proposed name is still distinguishable and commercially safe.",
      askAi: {
        step: 'preIncorporation',
        prompt:
          'I found a similar name on my NUANS report. What are the legal risks of incorporating with a similar name?',
      },
    },
    bilingualName: {
      example: 'Les Technologies Acme Inc.',
      why:
        'Under the CBCA, a corporation can have an English, French, or bilingual name so both official versions can be used legally.',
    },
    nameConfirmed: {
      why:
        'This confirmation tells your lawyer the filing name has been proofread and is the version you are ready to use in the incorporation.',
    },
  },

  structureOwnership: {
    shareClassName: {
      example: 'Common, Preferred, Class A Voting, or Class B Non-Voting',
      why:
        'Each share class carries a bundle of rights. A simple company may need only one Common class, while more complex companies use multiple classes for control and economics.',
      askAi: {
        step: 'structureOwnership',
        prompt: 'What is the difference between Common Shares and Preferred Shares?',
      },
    },
    maxShares: {
      example: 'Enter 0 for unlimited. Enter 1000 if the class should be capped.',
      why:
        'Unlimited is the modern default for private corporations because it avoids unnecessary amendment work later if more shares need to be issued.',
      askAi: {
        step: 'structureOwnership',
        prompt:
          "Why do most modern corporations authorize an 'unlimited' number of shares instead of a fixed amount?",
      },
    },
    shareRights: {
      example:
        'A standard Common share usually includes voting rights, dividend rights, and rights to share in property on liquidation.',
      why:
        'These rights determine control, profit participation, and what happens if the corporation is wound up. At least one class must cover all three core rights.',
      askAi: {
        step: 'structureOwnership',
        prompt:
          'What are the three fundamental rights that must be attached to at least one class of shares?',
      },
    },
    shareholderName: {
      example: 'Jane Smith or Acme Holding Corp.',
      why:
        'Use the full legal name of the shareholder exactly as it should appear on subscription agreements and the securities register.',
    },
    shareholderEmail: {
      example: 'jane.smith@example.com',
      why:
        'This lets your lawyer send subscription agreements and other formation documents for signature and review.',
    },
    numberOfShares: {
      example: '100, 1000, or 1000000',
      why:
        'The number of shares issued determines ownership percentages. Many private corporations use larger numbers to leave flexibility for future issuances and splits.',
      askAi: {
        step: 'structureOwnership',
        prompt: 'How many initial shares should I issue to the founders of my company?',
      },
    },
    considerationType: {
      example: 'Cash, property, or past services.',
      why:
        'Shares must be issued for valid consideration. Cash is the simplest; non-cash consideration requires more careful tax and recordkeeping analysis.',
      askAi: {
        step: 'structureOwnership',
        prompt: "Can I issue shares for 'future services' (sweat equity)? What are the rules?",
      },
    },
    considerationAmount: {
      example: '$100.00',
      why:
        'This is the total amount paid to the corporation for the shares being issued, for example 100 shares at $1.00 per share.',
    },
    directorFullName: {
      example: 'John Doe',
      why:
        'Use each director’s full legal name exactly as it should appear in the minute book and any public registry filings.',
    },
    directorAddress: {
      example: '123 Main St, Toronto, ON M1M 1M1',
      why:
        'The registry and minute book require a director address. For many jurisdictions this address becomes part of the official corporate record.',
    },
    canadianResident: {
      why:
        'CBCA corporations must satisfy resident Canadian director requirements. OBCA private corporations no longer have that residency rule.',
      askAi: {
        step: 'structureOwnership',
        prompt: 'What are the Canadian residency requirements for directors of a corporation?',
      },
    },
    registeredOfficeAddress: {
      example: '100 King St W, Suite 1000, Toronto, ON M5X 1A9',
      why:
        'This must be a physical street address where legal documents can be served. P.O. boxes are not enough for the registered office.',
    },
    registeredOfficeProvince: {
      example: 'ON for Ontario, BC for British Columbia',
      why:
        'The province must match the registered office location. For OBCA corporations it should remain Ontario; for CBCA corporations it reflects the chosen registered office province.',
    },
    recordsOfficeAddress: {
      example: '100 King St W, Suite 1200, Toronto, ON M5X 1A9',
      why:
        'CBCA corporations must also keep corporate records at a designated records office. This can match the registered office, but it still needs to be recorded explicitly.',
    },
    fiscalYearEnd: {
      example: 'Use MM-DD, for example 12-31 or 09-30.',
      why:
        'The fiscal year-end drives the corporation’s tax and accounting cycle. The value entered here must use the exact MM-DD format accepted by the form.',
      askAi: {
        step: 'structureOwnership',
        prompt: 'How should I choose a fiscal year-end for my new corporation?',
      },
    },
    corporateFlags: {
      why:
        'These options flag more complex governance or tax structures, such as a unanimous shareholders agreement or a section 85 rollover.',
      askAi: {
        step: 'structureOwnership',
        prompt:
          "What is a Unanimous Shareholders' Agreement (USA) and when would I need one? What about a Section 85 rollover?",
      },
    },
  },

  articles: {
    corporateName: {
      example: 'Acme Technologies Inc.',
      why:
        'The name in the Articles must exactly match the cleared corporate name or the filing can be rejected.',
    },
    registeredAddress: {
      example: '123 Business Rd, Toronto, ON M4C 1A2',
      why: 'The Articles require the corporation’s exact registered office address.',
    },
    directorCountType: {
      why:
        'A range is usually more flexible than a fixed number because directors can be added or removed later without amending the Articles each time.',
      askAi: {
        step: 'articles',
        prompt:
          'Why is it usually better to use a minimum/maximum range for the number of directors instead of a fixed number?',
      },
    },
    directorFixedRange: {
      example: 'Min 1, Max 10',
      why:
        'A typical private corporation uses a flexible range so the board can grow without an Article amendment.',
    },
    shareCapitalDescription: {
      example:
        'The Corporation is authorized to issue an unlimited number of Common shares and an unlimited number of Preferred shares...',
      why:
        'This is the legal foundation of the corporation’s share structure and must accurately describe each class and its rights.',
      askAi: {
        step: 'articles',
        prompt:
          'Can you help me draft a share capital description for a corporation with unlimited voting Common shares and unlimited non-voting Preferred shares?',
      },
      legal:
        'This wording goes directly into the Articles. Poor drafting can require a formal amendment later, including legal time and filing fees.',
    },
    transferRestrictions: {
      example:
        'No shares in the capital of the Corporation shall be transferred without either: (a) the consent of the directors expressed by a resolution passed by the board; or (b) the consent of the holders of more than 50% of the voting shares...',
      why:
        'Private corporations typically need transfer restrictions to preserve private-issuer treatment under securities law.',
      askAi: {
        step: 'articles',
        prompt:
          'What is a standard share transfer restriction clause for a private closely held corporation?',
      },
      legal:
        "Private companies rely on these restrictions for securities-law exemptions. Omitting them can create avoidable regulatory friction when shares are issued or transferred.",
    },
    businessRestrictions: {
      example: 'None',
      why:
        'Most private corporations leave this blank so the company can carry on any lawful business unless a profession-specific rule requires restrictions.',
      askAi: {
        step: 'articles',
        prompt:
          'Why would a corporation ever put restrictions on the business it may carry on in its Articles?',
      },
      legal:
        'Professional corporations and regulated businesses sometimes need explicit restrictions in their Articles.',
    },
    otherProvisions: {
      example:
        'The directors may borrow money upon the credit of the Corporation; issue, reissue, sell or pledge debt obligations...',
      why:
        'These clauses often cover borrowing powers, indemnities, and other operational authorities that banks and counsel may look for later.',
      askAi: {
        step: 'articles',
        prompt:
          "What are common 'other provisions' included in Articles of Incorporation, such as borrowing powers?",
      },
      legal:
        'These provisions help define corporate authority up front and can reduce amendment pressure later.',
    },
    filingFeeCert: {
      example: 'Check these off after the filing is accepted and the Certificate of Incorporation is issued.',
      why: 'Without the Certificate of Incorporation, the corporation does not yet exist legally.',
    },
  },

  postIncorpOrg: {
    generalByLaw: {
      example: 'General By-Law No. 1',
      why:
        'By-laws supplement the Articles by setting out the corporation’s internal administrative rules, such as meeting procedures, quorum, officer roles, and signing authority.',
      askAi: {
        step: 'postIncorpOrg',
        prompt: 'What is the purpose of General By-Law No. 1 and what should it cover?',
      },
      legal:
        'By-laws govern day-to-day corporate administration. They are adopted by directors and typically confirmed by shareholders.',
    },
    bankingByLaw: {
      example: 'A separate banking or borrowing by-law authorizing accounts, cheques, and loan authority.',
      why:
        'Some banks want a distinct banking resolution or by-law even when similar authority already appears in the general by-law.',
    },
    orgResolutions: {
      example: 'Resolutions of the first directors in lieu of a meeting.',
      why:
        'These resolutions adopt the initial governance documents, appoint officers, approve share issuances, and transition the corporation into operation.',
      askAi: {
        step: 'postIncorpOrg',
        prompt:
          'What specific items must be approved in the organizational resolutions of the first directors?',
      },
    },
    shareholderResolution: {
      example: 'Shareholders confirming the General By-Law.',
      why:
        'Director-enacted by-laws are typically confirmed by shareholders to complete the corporation’s organizational record properly.',
    },
    auditWaiver: {
      example: 'Unanimous resolution waiving the appointment of an auditor.',
      why:
        'Private corporations often waive the auditor requirement to save cost, but doing so requires unanimous shareholder agreement.',
      askAi: {
        step: 'postIncorpOrg',
        prompt: 'Why do private companies waive the appointment of an auditor, and who must agree to it?',
      },
    },
    officeResolution: {
      example: 'Resolution establishing the address of the registered office.',
      why: 'This confirms the registered office formally in the minute book.',
    },
    directorConsents: {
      example: 'Consent to Act as a First Director.',
      why:
        'A person should not be left on the corporate record as a director without a signed consent to act.',
      askAi: {
        step: 'postIncorpOrg',
        prompt:
          "What happens if someone is named a director but hasn't signed a consent to act as director?",
      },
    },
  },

  shareIssuance: {
    considerationAmount: {
      example: '$100.00, for example 100 shares at $1.00 per share.',
      why:
        'Shares should not be issued until the consideration for those shares is fixed and collected.',
    },
    subscriberAddress: {
      example: '123 Shareholder Way, Suite 4, Toronto, ON',
      why:
        'The securities register should record the address of each shareholder together with their subscribed shares.',
    },
    agreementExecuted: {
      why:
        'This confirms the subscription agreement has actually been signed and accepted, not merely drafted.',
    },
    certificateType: {
      example: 'Choose certificated if the corporation will issue share certificates. Choose uncertificated for book-entry ownership only.',
      why:
        'Modern private corporations often operate uncertificated to reduce certificate administration, but some clients still want traditional share certificates.',
      askAi: {
        step: 'shareIssuance',
        prompt:
          'Should my company issue share certificates or operate as uncertificated?',
      },
    },
    securitiesRegisterComplete: {
      why:
        'The securities register is a required corporate record showing who owns what shares, when they were issued, and what consideration was paid.',
    },
    s85Documents: {
      why:
        'If assets are being transferred to the corporation on a rollover basis, the supporting section 85 documents must be prepared correctly.',
      askAi: {
        step: 'shareIssuance',
        prompt:
          'What is a section 85 rollover and what documentation is required to complete it?',
      },
    },
  },

  corporateRecords: {
    minuteBookChecklist: {
      why:
        'The minute book is the corporation’s legal memory. Financing, diligence, and future transactions often depend on it being complete and organized.',
    },
    iscRegister: {
      why:
        "Private corporations generally need a register of Individuals with Significant Control (ISC), which identifies people with more than 25% ownership or comparable control.",
      askAi: {
        step: 'corporateRecords',
        prompt:
          'What is the Register of Individuals with Significant Control (ISC), and who must be listed on it?',
      },
    },
  },

  registrations: {
    craBusinessNumber: {
      example: '123456789',
      why: 'The CRA Business Number is the corporation’s 9-digit federal tax identifier.',
    },
    hstGstRegistered: {
      example:
        'Registration is generally required once taxable revenues exceed $30,000 over the relevant threshold period, but voluntary registration can happen earlier.',
      why:
        'HST/GST registration determines when the corporation must charge, collect, and remit sales tax, and when it can claim input tax credits.',
      askAi: {
        step: 'registrations',
        prompt:
          'When is a corporation required to register for GST/HST, and why might it register voluntarily before reaching the threshold?',
      },
    },
    payroll: {
      why:
        'If the corporation will pay salary or wages, it may need a payroll account to remit source deductions such as CPP, EI, and income tax.',
    },
    bnaRegistration: {
      example: "If 'Acme Inc.' does business as 'Acme Consulting', the trade name should be registered.",
      why:
        'Operating under a name other than the exact legal corporate name can trigger a Business Names Act or trade-name registration requirement.',
    },
    extraProvincial: {
      example:
        'A CBCA corporation may still need extra-provincial registration in Ontario and any other province where it carries on business.',
      why:
        'Federal incorporation does not replace the provincial registration rules that apply where the business actually operates.',
      askAi: {
        step: 'registrations',
        prompt:
          'If I incorporate federally, do I still need extra-provincial registration? How does that work?',
      },
    },
    extraProvincialProvinces: {
      example: 'Select each province where the corporation has an office, employees, or regular operations.',
      why:
        'Each province has its own registration fees and compliance steps, so the exact provinces matter for the post-incorporation filing plan.',
    },
    wsib: {
      example:
        'WSIB registration is common in construction and other Ontario industries with mandatory coverage.',
      why:
        'WSIB obligations depend on the industry and workforce. This toggle records whether the corporation has entered that registration process.',
    },
    wsibAccountNumber: {
      example: 'WSIB employer account number issued after registration.',
      why:
        'Once the corporation is registered with WSIB, record the assigned account number so the compliance file matches the regulator’s records.',
    },
    eht: {
      why:
        'Employer Health Tax usually becomes relevant only after the corporation’s Ontario payroll exceeds the applicable exemption threshold.',
    },
    municipalLicences: {
      example: 'City of Toronto business licence, short-term rental licence, or restaurant licence.',
      why:
        'Municipal licences are often business-specific and can be required in addition to federal and provincial registrations.',
    },
    importExport: {
      example: 'Register if the corporation will import goods into Canada or export goods abroad.',
      why:
        'Import/export activity often requires a CRA program account so customs and tax reporting can be tracked properly.',
      askAi: {
        step: 'registrations',
        prompt:
          'When does a corporation need to register for an import/export account with the CRA?',
      },
    },
  },

  bankingSetup: {
    bankAccount: {
      example:
        'Confirm this once the corporation has its own business bank account and the initial share consideration can be deposited into it.',
      why:
        'Corporate funds should stay separate from personal funds. The account also supports clean bookkeeping and post-incorporation banking records.',
    },
    bankName: {
      example: 'Choose the financial institution where the corporation opened its account.',
      why:
        'Recording the actual bank helps align the incorporation records with the banking package and any related resolutions.',
    },
    bankNameOther: {
      example: 'Coast Capital Savings',
      why:
        'Use this when the bank is not in the preset list so the saved record still matches the actual institution.',
    },
    corporateSeal: {
      example: 'A physical corporate seal or stamp.',
      why:
        'Corporate seals are usually optional in Canada now, but some institutions or foreign counterparties still ask for them.',
    },
    insurance: {
      example: "General Liability, Professional Liability (E&O), Cyber Liability, or Directors' and Officers' coverage.",
      why:
        'Incorporation limits personal liability in some situations, but the corporation still needs insurance to protect its own operations and assets.',
      askAi: {
        step: 'bankingSetup',
        prompt: 'What types of insurance should a newly incorporated startup consider getting?',
      },
    },
    insuranceTypes: {
      example: "General Liability, Professional Liability (E&O), Cyber Liability, or Directors' and Officers' coverage.",
      why:
        'Select the policy types that have been obtained or are being arranged so the file accurately reflects the corporation’s risk planning.',
    },
    agreements: {
      example: 'NDAs, employment agreements, customer contracts, or shareholder agreements.',
      why:
        'Once the corporation exists, it should contract through the company rather than the founders personally wherever possible.',
      askAi: {
        step: 'bankingSetup',
        prompt:
          'What are the most essential commercial contracts a new corporation should put in place?',
      },
    },
    agreementTypes: {
      example: 'Shareholder Agreement, NDA, Employment Agreement, or customer contract.',
      why:
        'Identify which agreements are already drafted or prioritized so the post-incorporation package reflects the actual operational setup.',
    },
  },
};
