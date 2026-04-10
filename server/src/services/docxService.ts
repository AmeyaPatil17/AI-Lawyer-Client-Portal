import {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak
} from 'docx';
import fs from 'fs';
import path from 'path';
import { formatAssetOwnershipLabel, getAssetCategoryLabel, inferAssetCategory, normalizeAssets } from './assetListService';

// Helper: Create a styled table cell
const createCell = (text: string, bold = false, width = 3000) => {
    return new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Times New Roman", size: 24 })] })],
        width: { size: width, type: WidthType.DXA },
    });
};

export const formatAssetValueLabel = (value?: number | null) =>
    value === undefined || value === null
        ? "-"
        : `$${value.toLocaleString('en-CA')}`;

export const generateIntakeDoc = async (intakeRecord: any, outputDir: string) => {
    const intakeData = intakeRecord.data || {};
    const flags = intakeRecord.flags || [];

    const profile = intakeData.personalProfile || {};
    const executors = intakeData.executors || {};
    const beneficiaries = intakeData.beneficiaries || {};
    const family = intakeData.family || {};
    const assets = intakeData.assets || {};

    const sections = [];

    // --- COVER PAGE ---
    sections.push({
        properties: {},
        children: [
            new Paragraph({ text: "\n\n\n\n\n", spacing: { after: 400 } }),
            new Paragraph({
                text: "ESTATE PLANNING FILE",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: `CLIENT: ${profile.fullName ? profile.fullName.toUpperCase() : "UNKNOWN"}`,
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
                text: `File ID: ${intakeRecord._id}`,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: `Date Generated: ${new Date().toLocaleDateString()}`,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                children: [
                    new PageBreak()
                ]
            })
        ]
    });

    // --- PART I: CLIENT MEMO (SUMMARY) ---
    const memoChildren: (Paragraph | Table)[] = [
        new Paragraph({
            text: "PART I: CLIENT SUMMARY MEMO",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
    ];

    // 1. Risk Analysis
    memoChildren.push(new Paragraph({ text: "1. RISK ANALYSIS", heading: HeadingLevel.HEADING_2 }));
    if (flags.length > 0) {
        flags.forEach((flag: any) => {
            memoChildren.push(new Paragraph({
                children: [
                    new TextRun({ text: `[${(flag.type || 'soft').toUpperCase()}] ${flag.code}`, bold: true, color: flag.type === 'hard' ? "FF0000" : "FF8C00" }),
                    new TextRun({ text: `: ${flag.message}` })
                ],
                bullet: { level: 0 }
            }));
        });
    } else {
        memoChildren.push(new Paragraph({ text: "No automatic risk flags detected." }));
    }
    memoChildren.push(new Paragraph({ text: "\n" }));

    // 2. Family Table
    memoChildren.push(new Paragraph({ text: "2. FAMILY OVERVIEW", heading: HeadingLevel.HEADING_2 }));
    if (family.children && family.children.length > 0) {
        const familyRows = [
            new TableRow({
                children: [createCell("Name", true), createCell("DOB", true, 2000), createCell("Parentage", true)]
            }),
            ...family.children.map((c: any) => new TableRow({
                children: [
                    createCell(c.fullName),
                    createCell(c.dateOfBirth || "N/A", false, 2000),
                    createCell(c.parentage === 'previous' ? "Previous Relationship" : "Current Relationship")
                ]
            }))
        ];
        memoChildren.push(new Table({ rows: familyRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    } else {
        memoChildren.push(new Paragraph({ text: "No children listed." }));
    }
    memoChildren.push(new Paragraph({ text: "\n" }));

    // 3. Asset Summary Table
    memoChildren.push(new Paragraph({ text: "3. ASSET SUMMARY", heading: HeadingLevel.HEADING_2 }));

    const normalizedAssets = normalizeAssets(assets);
    const allAssets = normalizedAssets.list;
    const liabilities = normalizedAssets.liabilities || [];

    if (allAssets.length > 0) {
        const assetRows = [
            new TableRow({
                children: [createCell("Type", true, 2000), createCell("Description", true, 4000), createCell("Owner", true, 2000), createCell("Value", true, 2000)]
            }),
            ...allAssets.map((a: any) => new TableRow({
                children: [
                    createCell(getAssetCategoryLabel(inferAssetCategory(a)).toUpperCase(), false, 2000),
                    createCell(a.description || "", false, 4000),
                    createCell(formatAssetOwnershipLabel(a), false, 2000),
                    createCell(formatAssetValueLabel(a.value), false, 2000)
                ]
            }))
        ];
        memoChildren.push(new Table({ rows: assetRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    } else {
        memoChildren.push(new Paragraph({
            text: normalizedAssets.confirmedNoSignificantAssets
                ? "Client confirmed that there are no significant assets or liabilities to list at this stage."
                : "No specific assets listed."
        }));
    }

    if (liabilities.length > 0) {
        memoChildren.push(new Paragraph({ text: "Liabilities", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
        const liabilityRows = [
            new TableRow({
                children: [createCell("Description", true, 6000), createCell("Amount", true, 2000)]
            }),
            ...liabilities.map((liability) => new TableRow({
                children: [
                    createCell(liability.description || "", false, 6000),
                    createCell(formatAssetValueLabel(liability.amount), false, 2000),
                ]
            }))
        ];
        memoChildren.push(new Table({ rows: liabilityRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    }

    if (normalizedAssets.hasShareholderAgreement) {
        memoChildren.push(new Paragraph({
            text: "Shareholder agreement noted for the listed business interests.",
            spacing: { before: 200 }
        }));
    }

    if (allAssets.length > 0 || liabilities.length > 0) {
        memoChildren.push(new Paragraph({
            text: `Estimated asset value: ${formatAssetValueLabel(normalizedAssets.totalEstimatedValue || 0)}`,
            spacing: { before: 200 }
        }));
        if (liabilities.length > 0) {
            const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.amount || 0), 0);
            memoChildren.push(new Paragraph({ text: `Estimated liabilities: ${formatAssetValueLabel(totalLiabilities)}` }));
            memoChildren.push(new Paragraph({
                text: `Estimated net estate: ${formatAssetValueLabel((normalizedAssets.totalEstimatedValue || 0) - totalLiabilities)}`
            }));
        }
    }

    memoChildren.push(new Paragraph({ children: [new PageBreak()] }));


    // --- PART II: DRAFT WILL ---
    sections.push({
        properties: {},
        children: [
            ...memoChildren, // Add Memo first

            new Paragraph({
                text: "PART II: PRELIMINARY DRAFT WILL",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 }
            }),

            new Paragraph({
                text: `THIS IS THE LAST WILL AND TESTAMENT of me, ${profile.fullName ? profile.fullName.toUpperCase() : "CLIENT NAME"}, of the City of ${profile.city || "_______"}, in the Province of Ontario.`,
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 200 }
            }),

            // 1. REVOCATION
            new Paragraph({ text: "1. REVOCATION", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                text: "I HEREBY REVOKE all Wills and Testamentary dispositions of every nature and kind whatsoever by me heretofore made.",
                alignment: AlignmentType.JUSTIFIED,
            }),

            // 2. EXECUTORS
            new Paragraph({ text: "2. APPOINTMENT OF EXECUTORS", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({
                children: [
                    new TextRun({ text: "I NOMINATE, CONSTITUTE AND APPOINT ", font: "Times New Roman" }),
                    new TextRun({ text: executors.primary?.fullName ? executors.primary.fullName.toUpperCase() : "________", bold: true }),
                    new TextRun({ text: " to be the Estate Trustee, Executor and Trustee of this my Will." })
                ],
                alignment: AlignmentType.JUSTIFIED,
            }),
            ...(executors.alternates?.length > 0 ? [
                new Paragraph({
                    text: `IF my said Primary Executor should predecease me, or renounce, or generally be unable to act, THEN I NOMINATE ${executors.alternates[0].fullName.toUpperCase()} to be my Estate Trustee in their place and stead.`,
                    spacing: { before: 100 }
                })
            ] : []),

            // 3. RESIDUE
            new Paragraph({ text: "3. DISTRIBUTION OF RESIDUE", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({
                text: "I GIVE, DEVISE AND BEQUEATH all my property of every nature and kind and wheresoever situate, including any property over which I may have a general power of appointment, to my Trustees upon the following trusts, namely:",
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 100 }
            }),

            // Logic for residue
            ...(family.maritalStatus === 'Married' || family.maritalStatus === 'Common Law' ? [
                new Paragraph({
                    text: "(a) To transfer the residue of my estate to my spouse, if they survive me by thirty (30) days, for their own use absolutely.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "(b) If my spouse does not survive me, to divide the residue of my estate equally among my children who survive me.",
                    bullet: { level: 0 }
                })
            ] : [
                new Paragraph({
                    text: "(a) To divide the residue of my estate equally among my children who survive me.",
                    bullet: { level: 0 }
                })
            ]),

            // 4. STANDARD POWERS
            new Paragraph({ text: "4. POWERS OF TRUSTEES", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({
                text: "I GIVE to my Trustees the following powers and discretions, to be exercised in their absolute uncontrolled discretion:",
                alignment: AlignmentType.JUSTIFIED
            }),
            new Paragraph({
                text: "To sell, partition, exchange or otherwise dispose of the whole or any part of my estate, in such manner and at such times as my Trustees may deem advisable.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "To make any election or election under the Income Tax Act (Canada) or any similar legislation.",
                bullet: { level: 0 }
            }),

            // 5. FOREIGN WILL CLAUSE (Conditional)
            ...(intakeData.priorWills?.hasForeignWill === 'yes' ? [
                new Paragraph({ text: "5. FOREIGN ASSETS RESTRICTION", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "I HEREBY DECLARE ", bold: true }),
                        new TextRun({ text: "that this Will is intended to dispose of my property situated within Canada ONLY, and shall not revoke any Will I may have made or will make regarding my property situated in " }),
                        new TextRun({ text: intakeData.priorWills.foreignWillLocation || "Foreign Jurisdiction", bold: true }),
                        new TextRun({ text: "." })
                    ],
                    alignment: AlignmentType.JUSTIFIED
                })
            ] : []),

            new Paragraph({
                text: "\n\nIN WITNESS WHEREOF I have to this my Last Will and Testament subscribed my name this _____ day of _______________, 20___.",
                spacing: { before: 800 }
            }),
            new Paragraph({
                text: "SIGNED, PUBLISHED AND DECLARED...",
                spacing: { before: 200 }
            }),
        ]
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Times New Roman",
                        size: 24, // 12pt
                    },
                    paragraph: {
                        spacing: {
                            line: 276, // 1.15 spacing
                            after: 120 // 6pt after
                        }
                    }
                }
            }
        },
        sections: sections,
    });

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `DraftWill_${profile.fullName || 'Client'}_${Date.now()}.docx`;
    const filePath = path.join(outputDir, filename);

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    return filename;
};
