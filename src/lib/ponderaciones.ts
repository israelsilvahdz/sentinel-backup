import type { Subject, WeightingScheme } from "@/types/student";

// Helper to find the matching scheme for a subject
function findSchemeForSubject(subjectName: string, schemes: WeightingScheme[]): WeightingScheme | undefined {
    return schemes.find(scheme => scheme.subjectNames.includes(subjectName));
}

/**
 * Gets the specific score for an activity by name or label, strictly following the A1, A2, A3... pattern.
 */
export function getActivityScore(subject: Subject, activity: { name: string; label?: string }): number | string | null {
    const nameUpper = activity.name.toUpperCase();
    const labelUpper = (activity.label || '').toUpperCase();
    const activities = subject.activities || {};

    // 1. STRICT MAPPING: If name is "Actividad X", MUST use column "AX"
    const actMatch = nameUpper.match(/ACTIVIDAD\s*(\d+)/);
    if (actMatch) {
        const key = `A${actMatch[1]}`;
        if (activities[key] !== undefined && activities[key] !== '') return activities[key];
    }

    // 2. EXAM MAPPING: If label contains "FINAL", use EXAMEN_FINAL column
    if (labelUpper.includes('FINAL') || nameUpper.includes('FINAL')) {
        if (activities['EXAMEN_FINAL'] !== undefined && activities['EXAMEN_FINAL'] !== '') return activities['EXAMEN_FINAL'];
    }

    // 3. INTERMEDIATE MAPPING: Only if not an "Actividad X" and has intermediate label
    if (labelUpper.includes('INTERMEDIO') || labelUpper.includes('PARCIAL')) {
        if (activities['EXAMEN_INTERMEDIO'] !== undefined && activities['EXAMEN_INTERMEDIO'] !== '') return activities['EXAMEN_INTERMEDIO'];
    }

    // 4. Fallback: Direct key match
    if (activities[activity.name] !== undefined && activities[activity.name] !== '') return activities[activity.name];
    
    return 'SC';
}

/**
 * Calculates the final grade for a subject based on a list of available weighting schemes.
 * This should match the "Ponderado" column in Excel if schemes are correct.
 */
export function calculateFinalGrade(subject: Subject, schemes: WeightingScheme[]): number {
    const scheme = findSchemeForSubject(subject.name, schemes);
    if (!scheme) {
        return subject.grade || 0; // Fallback to provided grade
    }

    let totalEarnedPoints = 0;

    scheme.activities.forEach((activity) => {
        const rawScore = getActivityScore(subject, activity);
        
        // NE (No Entregó) counts as 0 points earned.
        // SC (Sin Calificar) counts as 0 points earned for current total.
        const score = (rawScore === null || typeof rawScore === 'string' && (rawScore.toUpperCase() === 'SC' || rawScore.toUpperCase() === 'NE' || rawScore.trim() === '')) ? 0 : Number(rawScore);
        
        if (!isNaN(score)) {
            totalEarnedPoints += (score / 100) * activity.weight;
        }
    });

    return totalEarnedPoints;
}


/**
 * Gets a list of activities with their scores and weights for a specific subject.
 * Guaranteed to follow the scheme's intended order.
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
