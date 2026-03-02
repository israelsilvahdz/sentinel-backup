
import type { Subject, WeightingScheme } from "@/types/student";

// Helper to find the matching scheme for a subject
function findSchemeForSubject(subjectName: string, schemes: WeightingScheme[]): WeightingScheme | undefined {
    return schemes.find(scheme => scheme.subjectNames.includes(subjectName));
}

/**
 * Gets the specific score for an activity by name or label, avoiding index-shifting bugs.
 * @param subject The subject object containing all activities found in Excel.
 * @param activity The activity definition from the Weighting Scheme.
 */
export function getActivityScore(subject: Subject, activity: { name: string; label?: string }): number | string | null {
    const nameUpper = activity.name.toUpperCase();
    const labelUpper = (activity.label || '').toUpperCase();
    const activities = subject.activities || {};

    // 1. Priority: Match by Label (Intermedio or Final) using special keys from parser
    if (labelUpper.includes('INTERMEDIO') || labelUpper.includes('PARCIAL')) {
        if (activities['EXAMEN_INTERMEDIO'] !== undefined && activities['EXAMEN_INTERMEDIO'] !== '') return activities['EXAMEN_INTERMEDIO'];
    }
    if (labelUpper.includes('FINAL')) {
        if (activities['EXAMEN_FINAL'] !== undefined && activities['EXAMEN_FINAL'] !== '') return activities['EXAMEN_FINAL'];
    }

    // 2. Secondary: Match "Actividad X" to "AX" column
    const actMatch = nameUpper.match(/ACTIVIDAD\s*(\d+)/);
    if (actMatch) {
        const key = `A${actMatch[1]}`;
        if (activities[key] !== undefined && activities[key] !== '') return activities[key];
    }

    // 3. Fallback: Direct key match
    if (activities[activity.name] !== undefined && activities[activity.name] !== '') return activities[activity.name];
    if (activity.label && activities[activity.label] !== undefined && activities[activity.label] !== '') return activities[activity.label];

    // Return 'SC' if column exists but is empty, or null if it doesn't seem to exist for this subject
    return 'SC';
}

/**
 * Calculates the final grade for a subject based on a list of available weighting schemes.
 */
export function calculateFinalGrade(subject: Subject, schemes: WeightingScheme[]): number {
    const scheme = findSchemeForSubject(subject.name, schemes);
    if (!scheme) {
        return NaN; 
    }

    let totalScore = 0;

    scheme.activities.forEach((activity) => {
        const rawScore = getActivityScore(subject, activity);
        
        // Treat 'SC', 'NE', or empty/null as 0 for sum calculation if we want current progress.
        const score = (rawScore === null || typeof rawScore === 'string' && (rawScore.toUpperCase() === 'SC' || rawScore.toUpperCase() === 'NE' || rawScore.trim() === '')) ? 0 : Number(rawScore);
        
        if (!isNaN(score)) {
            totalScore += (score / 100) * activity.weight;
        }
    });

    return totalScore;
}


/**
 * Gets a list of activities with their scores and weights for a specific subject.
 */
export function getActivityList(subject: Subject, schemes: WeightingScheme[]): { name: string; score: number | string; weight: number; label?: string; }[] {
    const scheme = findSchemeForSubject(subject.name, schemes);
    if (!scheme) {
        return [];
    }

    const activityItems: { name: string; score: number | string; weight: number; label?: string }[] = [];

    scheme.activities.forEach((activity) => {
        const rawScore = getActivityScore(subject, activity) ?? 'SC';
        activityItems.push({
            name: activity.name,
            score: rawScore,
            weight: activity.weight,
            label: activity.label
        });
    });

    return activityItems;
}
