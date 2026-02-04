
import type { Subject, WeightingScheme } from "@/types/student";

// Helper to find the matching scheme for a subject
function findSchemeForSubject(subjectName: string, schemes: WeightingScheme[]): WeightingScheme | undefined {
    // This finds the first scheme that includes the subject name.
    // Assumes a subject is only in one scheme.
    return schemes.find(scheme => scheme.subjectNames.includes(subjectName));
}

// Helper to get sorted activity scores from a subject
export function getSortedScores(subject: Subject): (number | string)[] {
    // Filters for keys like A1, A2, etc., sorts them numerically, and returns their values.
    return Object.entries(subject.activities)
        .filter(([key]) => /^A\d+$/.test(key))
        .sort(([keyA], [keyB]) => {
            const numA = parseInt(keyA.substring(1), 10);
            const numB = parseInt(keyB.substring(1), 10);
            return numA - numB;
        })
        .map(([, value]) => value);
}

/**
 * Calculates the final grade for a subject based on a list of available weighting schemes.
 * @param subject The subject object with its activities.
 * @param schemes An array of all available WeightingScheme objects.
 * @returns The calculated final grade, or NaN if no scheme is found for the subject.
 */
export function calculateFinalGrade(subject: Subject, schemes: WeightingScheme[]): number {
    const scheme = findSchemeForSubject(subject.name, schemes);
    if (!scheme) {
        return NaN; // Indicate that no scheme was found
    }

    const sortedScores = getSortedScores(subject);
    let totalScore = 0;

    scheme.activities.forEach((activity, index) => {
        const rawScore = sortedScores[index] ?? 0;
        // Treat 'SC', 'NE', or empty strings as 0 for calculation.
        const score = (typeof rawScore === 'string' && (rawScore.toUpperCase() === 'SC' || rawScore.toUpperCase() === 'NE' || rawScore.trim() === '')) ? 0 : Number(rawScore);
        
        if (!isNaN(score)) {
            totalScore += (score / 100) * activity.weight;
        }
    });

    return totalScore;
}


/**
 * Gets a list of activities with their scores and weights for a specific subject, based on the new scheme system.
 * @param subject The subject object.
 * @param schemes An array of all available WeightingScheme objects.
 * @returns An array of activity breakdown items, or an empty array if no scheme is found.
 */
export function getActivityList(subject: Subject, schemes: WeightingScheme[]): { name: string; score: number | string; weight: number }[] {
    const scheme = findSchemeForSubject(subject.name, schemes);
    if (!scheme) {
        return [];
    }

    const sortedScores = getSortedScores(subject);
    const activityItems: { name: string; score: number | string; weight: number }[] = [];

    scheme.activities.forEach((activity, index) => {
        const rawScore = sortedScores[index] ?? 'SC'; // Default to 'SC' if no score is present
        activityItems.push({
            name: activity.name,
            score: rawScore,
            weight: activity.weight
        });
    });

    return activityItems;
}
