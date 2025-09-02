// This file is now a server-only module.
// All client-side components should interact with these functions
// via the server action defined in 'app/actions/firestoreActions.ts'.
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  writeBatch,
  collection,
  Timestamp,
  runTransaction,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import type { Student, Subject, Change, StudentData } from '@/types/student';

const ALUMNOS_COLLECTION = 'alumnos';
const HISTORIAL_COLLECTION = 'historialCambios';

/**
 * Processes data from Excel, compares it with Firestore, and updates/creates documents.
 * @param studentData Parsed data from the Excel file.
 */
export async function processAndSaveData(studentData: StudentData): Promise<{ processed: number, changes: number }> {
  let processedCount = 0;
  let changesCount = 0;
  const batch = writeBatch(db);

  for (const studentId in studentData) {
    const incomingStudent = studentData[studentId];
    if (!incomingStudent || !incomingStudent.id) continue;

    await runTransaction(db, async (transaction) => {
      const studentDocRef = doc(db, ALUMNOS_COLLECTION, studentId);
      const studentDoc = await transaction.get(studentDocRef);
      const changesToWrite: Change[] = [];

      const studentInfo: Omit<Student, 'subjects'> = {
        id: incomingStudent.id,
        name: incomingStudent.name,
        leader: incomingStudent.leader,
        tutor: incomingStudent.tutor,
        isGraduationCandidate: incomingStudent.isGraduationCandidate,
      };

      if (studentDoc.exists()) {
        transaction.update(studentDocRef, studentInfo);
      } else {
        transaction.set(studentDocRef, studentInfo);
      }
      
      if (incomingStudent.subjects) {
        for (const incomingSubject of incomingStudent.subjects) {
          if (!incomingSubject.id) continue;
          const subjectDocRef = doc(db, ALUMNOS_COLLECTION, studentId, 'materias', incomingSubject.id);
          const subjectDoc = await transaction.get(subjectDocRef);

          const newSubjectData: Subject = { ...incomingSubject };

          if (subjectDoc.exists()) {
            const existingSubject = subjectDoc.data() as Subject;
            const fieldsToCompare: (keyof Subject)[] = ['absences', 'missedAssignments', 'grade', 'finalGrade', 'statusDescription'];

            fieldsToCompare.forEach(field => {
              if (existingSubject[field] !== newSubjectData[field]) {
                changesToWrite.push({
                  date: Timestamp.now(), studentId, subjectId: incomingSubject.id,
                  fieldName: field, oldValue: existingSubject[field], newValue: newSubjectData[field],
                });
              }
            });

            for (const activityKey in newSubjectData.activities) {
              if (existingSubject.activities?.[activityKey] !== newSubjectData.activities[activityKey]) {
                changesToWrite.push({
                  date: Timestamp.now(), studentId, subjectId: incomingSubject.id,
                  fieldName: `activities.${activityKey}`,
                  oldValue: existingSubject.activities?.[activityKey] ?? null,
                  newValue: newSubjectData.activities[activityKey],
                });
              }
            }
             transaction.update(subjectDocRef, { ...newSubjectData });
          } else {
             changesToWrite.push({
               date: Timestamp.now(), studentId, subjectId: incomingSubject.id,
               fieldName: 'materia', oldValue: null, newValue: 'materia creada',
             });
            transaction.set(subjectDocRef, newSubjectData);
          }
        }
      }
      
       if(changesToWrite.length > 0) {
          changesCount += changesToWrite.length;
          changesToWrite.forEach(change => {
              const historyDocRef = doc(collection(db, HISTORIAL_COLLECTION));
              // Note: This write is now part of the transaction, which is not ideal for batching across transactions.
              // For simplicity, we will keep it this way, but for larger scale, it should be handled outside.
              transaction.set(historyDocRef, change);
          });
      }
    });
    processedCount++;
  }

  return { processed: processedCount, changes: changesCount };
}

/**
 * Gets all students from the main collection.
 */
export async function getAllStudents(): Promise<Student[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    console.error("Error getting all students:", error);
    return [];
  }
}

/**
 * Gets the subjects for a specific student.
 * @param studentId The student's ID.
 */
export async function getStudentSubjects(studentId: string): Promise<Subject[]> {
  const subjectsRef = collection(db, ALUMNOS_COLLECTION, studentId, 'materias');
  const querySnapshot = await getDocs(subjectsRef);
  return querySnapshot.docs.map(doc => doc.data() as Subject);
}

/**
 * Gets the change history for a student.
 * @param studentId The student's ID.
 */
export async function getStudentHistory(studentId: string): Promise<Change[]> {
  const q = query(collection(db, HISTORIAL_COLLECTION), where("studentId", "==", studentId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Change);
}

/**
 * Deletes ALL data from the 'alumnos' and 'historialCambios' collections.
 * High-risk function intended for testing environments only.
 */
export async function deleteAllData(): Promise<void> {
  async function deleteCollection(collectionPath: string) {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  // Delete all history
  await deleteCollection(HISTORIAL_COLLECTION);
  
  // Delete all students and their subcollections
  const alumnosSnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
  for (const studentDoc of alumnosSnapshot.docs) {
    await deleteCollection(`${ALUMNOS_COLLECTION}/${studentDoc.id}/materias`);
    await deleteDoc(doc(db, ALUMNOS_COLLECTION, studentDoc.id));
  }
}
