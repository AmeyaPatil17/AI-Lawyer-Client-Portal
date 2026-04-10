/**
 * Shared client-side representation of an Intake document returned from the API.
 * Mirrors the IIntake interface on the server (server/src/models/Intake.ts)
 * so that Dashboard.vue and related components have full type safety.
 */
export interface ClientIntake {
    _id: string;
    type: 'will' | 'incorporation';
    status: 'started' | 'submitted' | 'reviewing' | 'completed';
    data: Record<string, any>;
    clientName?: string;
    flags?: Array<{
        type: 'hard' | 'soft';
        message: string;
        code: string;
    }>;
    logicWarnings?: Array<{
        code: string;
        message: string;
        severity: 'warning' | 'info';
    }>;
    /** AI-generated plain-English summary (cached server-side) */
    aiSummary?: string;
    // ── Production fields added in database redesign ──────────────────
    /** Lawyer assigned to review this intake */
    assignedLawyerId?: string;
    /** Set when status transitions to 'submitted' */
    submittedAt?: string;
    /** Set when status transitions to 'completed' */
    completedAt?: string;
    /** Updated on every save — tracks last wizard activity */
    lastActivityAt?: string;
    /** When the last reminder nudge was sent */
    reminderSentAt?: string;
    /** Number of reminder nudges sent */
    reminderCount?: number;
    /** Calculated priority score for lawyer triage (0–100) */
    priorityScore?: number;
    // ── Timestamps ────────────────────────────────────────────────────
    createdAt: string;   // ISO date string from server (timestamps: true)
    updatedAt: string;   // ISO date string from server (timestamps: true)
}
