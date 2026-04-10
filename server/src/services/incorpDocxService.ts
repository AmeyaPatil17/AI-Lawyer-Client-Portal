import {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType,
} from 'docx';
import fs from 'fs';
import path from 'path';

// Helper: Create a styled table cell
const createCell = (text: string, bold = false, width = 4500) => {
    return new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Times New Roman", size: 24 })] })],
        width: { size: width, type: WidthType.DXA },
    });
};

const statusIcon = (done?: boolean) => done ? '✅' : '☐';

/**
 * Generates a DOCX incorporation checklist document.
 * Part I: Incorporation Summary Memo
 * Part II: Completion Status Checklist (all 8 sections)
 */
export const generateIncorpDoc = async (intakeRecord: any, outputDir: string): Promise<string> => {
    const data = intakeRecord.data || {};
    const pre = data.preIncorporation || {};
    const so = data.structureOwnership || {};
    const art = data.articles || {};
    const postOrg = data.postIncorpOrg || {};
    const si = data.shareIssuance || {};
    const cr = data.corporateRecords || {};
    const reg = data.registrations || {};
    const bank = data.bankingSetup || {};

    const jurisdiction = (pre.jurisdiction || 'unknown').toUpperCase();
    const corpName = pre.nameType === 'numbered'
        ? '[Numbered Company]'
        : (pre.proposedName || 'TBD') + ' ' + (pre.legalEnding || '');

    const sections = [];

    // --- COVER PAGE ---
    sections.push({
        properties: {},
        children: [
            new Paragraph({ text: "\n\n\n\n\n", spacing: { after: 400 } }),
            new Paragraph({
                text: "INCORPORATION CHECKLIST",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: `CORPORATION: ${corpName.toUpperCase()}`,
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
                text: `Jurisdiction: ${jurisdiction}`,
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 }
            }),
            new Paragraph({
                text: `File ID: ${intakeRecord._id}`,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: `Date Generated: ${new Date().toLocaleDateString()}`,
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 }
            }),
        ]
    });

    // --- PART I: SUMMARY MEMO ---
    const summaryChildren: any[] = [
        new Paragraph({ text: "PART I — INCORPORATION SUMMARY", heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),

        // Jurisdiction & Name
        new Paragraph({ text: "1. Jurisdiction & Name", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
        new Table({
            rows: [
                new TableRow({ children: [createCell("Jurisdiction", true), createCell(jurisdiction)] }),
                new TableRow({ children: [createCell("Name Type", true), createCell(pre.nameType || 'Not specified')] }),
                new TableRow({ children: [createCell("Corporate Name", true), createCell(corpName)] }),
                new TableRow({ children: [createCell("NUANS Report", true), createCell(pre.nuansReport?.reportDate ? `Dated ${pre.nuansReport.reportDate}` : 'N/A')] }),
            ],
            width: { size: 9000, type: WidthType.DXA },
        }),

        // Directors
        new Paragraph({ text: "2. Directors", heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
    ];

    const directors = so.directors || [];
    if (directors.length > 0) {
        summaryChildren.push(
            new Table({
                rows: [
                    new TableRow({
                        children: [
                            createCell("Name", true, 3000),
                            createCell("Address", true, 3500),
                            createCell("CDN Resident", true, 2500),
                        ]
                    }),
                    ...directors.map((d: any) => new TableRow({
                        children: [
                            createCell(d.fullName || '', false, 3000),
                            createCell(d.address || '', false, 3500),
                            createCell(d.isCanadianResident ? 'Yes' : 'No', false, 2500),
                        ]
                    }))
                ],
                width: { size: 9000, type: WidthType.DXA },
            })
        );
    } else {
        summaryChildren.push(new Paragraph({ text: "No directors listed.", spacing: { after: 200 } }));
    }

    // Share Classes
    summaryChildren.push(
        new Paragraph({ text: "3. Share Structure", heading: HeadingLevel.HEADING_2, spacing: { before: 300 } })
    );
    const shareClasses = so.shareClasses || [];
    if (shareClasses.length > 0) {
        summaryChildren.push(
            new Table({
                rows: [
                    new TableRow({
                        children: [
                            createCell("Class", true, 2000),
                            createCell("Voting", true, 1500),
                            createCell("Dividends", true, 1500),
                            createCell("Max Shares", true, 2000),
                            createCell("Par Value", true, 2000),
                        ]
                    }),
                    ...shareClasses.map((sc: any) => new TableRow({
                        children: [
                            createCell(sc.className || '', false, 2000),
                            createCell(sc.votingRights ? 'Yes' : 'No', false, 1500),
                            createCell(sc.dividendRights ? 'Yes' : 'No', false, 1500),
                            createCell(sc.maxShares === 0 ? 'Unlimited' : String(sc.maxShares || 'N/A'), false, 2000),
                            createCell(sc.parValue ? `$${sc.parValue}` : 'No par', false, 2000),
                        ]
                    }))
                ],
                width: { size: 9000, type: WidthType.DXA },
            })
        );
    }

    // Key Details
    summaryChildren.push(
        new Paragraph({ text: "4. Key Details", heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
        new Table({
            rows: [
                new TableRow({ children: [createCell("Registered Office", true), createCell(so.registeredOfficeAddress || 'Not specified')] }),
                new TableRow({ children: [createCell("Fiscal Year End", true), createCell(so.fiscalYearEnd || 'Not specified')] }),
                new TableRow({ children: [createCell("USA Required", true), createCell(so.requiresUSA ? 'Yes' : 'No')] }),
                new TableRow({ children: [createCell("s.85 Rollover", true), createCell(so.requiresS85Rollover ? 'Yes' : 'No')] }),
                new TableRow({ children: [createCell("Corporation Number", true), createCell(art.corporationNumber || 'Pending')] }),
            ],
            width: { size: 9000, type: WidthType.DXA },
        })
    );

    sections.push({ properties: {}, children: summaryChildren });

    // --- PART II: COMPLETION CHECKLIST ---
    const checklistItems = [
        { section: '§1 Pre-Incorporation', items: [
            { label: 'Jurisdiction selected', done: !!pre.jurisdiction },
            { label: 'Name type decided', done: !!pre.nameType },
            { label: 'NUANS report obtained (named)', done: pre.nameType !== 'named' || !!pre.nuansReport?.reportDate },
            { label: 'Name confirmed', done: !!pre.nameConfirmed },
        ]},
        { section: '§2 Structure & Ownership', items: [
            { label: 'Share classes defined', done: shareClasses.length > 0 },
            { label: 'Directors appointed', done: directors.length > 0 },
            { label: 'Registered office address', done: !!so.registeredOfficeAddress },
            { label: 'Fiscal year-end set', done: !!so.fiscalYearEnd },
        ]},
        { section: '§3 Articles of Incorporation', items: [
            { label: 'Director count specified', done: !!art.directorCountType },
            { label: 'Share capital described', done: !!art.shareCapitalDescription },
            { label: 'Filing fee paid', done: !!art.filingFeePaid },
            { label: 'Certificate received', done: !!art.certificateReceived },
        ]},
        { section: '§4 Post-Incorporation', items: [
            { label: 'General By-Law No. 1', done: !!postOrg.generalByLawDrafted },
            { label: 'Organization resolutions', done: !!postOrg.orgResolutionsPrepared },
            { label: 'Shareholder confirmation', done: !!postOrg.shareholderResolutionPrepared },
        ]},
        { section: '§5 Share Issuance', items: [
            { label: 'Subscription agreements prepared', done: (si.subscriptionAgreements || []).length > 0 },
            { label: 'Securities register complete', done: !!si.securitiesRegisterComplete },
            { label: 'Consideration collected', done: !!si.considerationCollected },
        ]},
        { section: '§6 Corporate Records', items: [
            { label: 'Articles & Certificate filed', done: !!cr.hasArticlesAndCertificate },
            { label: 'By-laws in minute book', done: !!cr.hasByLaws },
            { label: 'Securities register in minute book', done: !!cr.hasSecuritiesRegister },
            { label: 'ISC register', done: !!cr.hasISCRegister },
        ]},
        { section: '§7 Registrations', items: [
            { label: 'CRA Business Number', done: !!reg.craRegistered },
            { label: 'HST/GST account', done: !!reg.hstGstRegistered },
            { label: 'Payroll deductions', done: !!reg.payrollAccountRegistered },
        ]},
        { section: '§8 Banking & Setup', items: [
            { label: 'Bank account opened', done: !!bank.bankAccountOpened },
            { label: 'Minute book setup', done: !!bank.minuteBookSetup },
        ]},
    ];

    const checklistChildren: any[] = [
        new Paragraph({ text: "PART II — COMPLETION CHECKLIST", heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
    ];

    for (const group of checklistItems) {
        checklistChildren.push(
            new Paragraph({ text: group.section, heading: HeadingLevel.HEADING_2, spacing: { before: 200 } })
        );
        for (const item of group.items) {
            checklistChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `${statusIcon(item.done)}  ${item.label}`, font: "Times New Roman", size: 24 }),
                    ],
                    spacing: { after: 80 },
                })
            );
        }
    }

    // Flags
    const flags = intakeRecord.flags || [];
    if (flags.length > 0) {
        checklistChildren.push(
            new Paragraph({ text: "FLAGS & WARNINGS", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
        );
        for (const flag of flags) {
            checklistChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `[${flag.type.toUpperCase()}] `, bold: true, font: "Times New Roman", size: 24, color: flag.type === 'hard' ? 'CC0000' : 'CC8800' }),
                        new TextRun({ text: flag.message, font: "Times New Roman", size: 24 }),
                    ],
                    spacing: { after: 100 },
                })
            );
        }
    }

    sections.push({ properties: {}, children: checklistChildren });

    // --- BUILD DOCUMENT ---
    const doc = new Document({ sections });
    const buffer = await Packer.toBuffer(doc);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const sanitizedName = corpName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const filename = `Incorporation_${sanitizedName}_${intakeRecord._id}.docx`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, buffer);

    return filename;
};
