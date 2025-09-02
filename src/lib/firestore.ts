
// This file is now intended for server-side use only.
// Client components should interact with these functions via Server Actions.
import { db } from './firebase';
import {
  doc,
  getDocs,
  writeBatch,
  collection,
  Timestamp,
  runTransaction,
  query,
  where,
  deleteDoc,
  getDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import type { Student, Subject, Change, StudentData, UploadHistory } from '@/types/student';

const ALUMNOS_COLLECTION = 'alumnos';
const HISTORIAL_COLLECTION = 'historialCambios';
const UPLOADS_COLLECTION = 'cargas';

/**
 * Processes data from Excel, compares it with Firestore, and updates/creates documents.
 * @param studentData Parsed data from the Excel file.
 * @param fileName The name of the uploaded file.
 */
export async function processAndSaveData(studentData: StudentData, fileName: string): Promise<{ processed: number, changes: number }> {
  let processedCount = 0;
  let changesCount = 0;
  
  const historyBatch = writeBatch(db);

  for (const studentId in studentData) {
    const incomingStudent = studentData[studentId];
    if (!incomingStudent || !incomingStudent.id) continue;

    await runTransaction(db, async (transaction) => {
      const studentDocRef = doc(db, ALUMNOS_COLLECTION, studentId);
      
      // --- 1. ALL READS FIRST ---
      const studentDoc = await transaction.get(studentDocRef);
      const existingStudentData = studentDoc.exists() ? studentDoc.data() as Student : null;

      const subjectDocsReads = new Map<string, any>();
      if (incomingStudent.subjects) {
          for (const incomingSubject of incomingStudent.subjects) {
              if (incomingSubject.id) { // incomingSubject.id is CRN
                  const subjectDocRef = doc(db, ALUMNOS_COLLECTION, studentId, 'materias', incomingSubject.id);
                  const subjectDoc = await transaction.get(subjectDocRef);
                  subjectDocsReads.set(incomingSubject.id, subjectDoc);
              }
          }
      }
      
      // --- 2. NOW PREPARE AND EXECUTE ALL WRITES ---
      const changesToWrite: Change[] = [];
      const studentInfo: Omit<Student, 'subjects'> = {
        id: incomingStudent.id,
        name: incomingStudent.name,
        leader: incomingStudent.leader,
        tutor: incomingStudent.tutor,
        isGraduationCandidate: incomingStudent.isGraduationCandidate,
      };

      if (existingStudentData) {
        transaction.update(studentDocRef, studentInfo);
      } else {
        transaction.set(studentDocRef, studentInfo);
      }
      
      if (incomingStudent.subjects) {
        for (const incomingSubject of incomingStudent.subjects) {
          if (!incomingSubject.id) continue;

          const subjectDoc = subjectDocsReads.get(incomingSubject.id);
          const newSubjectData: Subject = { ...incomingSubject };

          if (subjectDoc && subjectDoc.exists()) {
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
             transaction.update(subjectDoc.ref, { ...newSubjectData });
          } else {
             changesToWrite.push({
               date: Timestamp.now(), studentId, subjectId: incomingSubject.id,
               fieldName: 'materia', oldValue: null, newValue: 'materia creada',
             });
             const newSubjectDocRef = doc(db, ALUMNOS_COLLECTION, studentId, 'materias', incomingSubject.id);
             transaction.set(newSubjectDocRef, newSubjectData);
          }
        }
      }
      
       if(changesToWrite.length > 0) {
          changesCount += changesToWrite.length;
          changesToWrite.forEach(change => {
              const historyDocRef = doc(collection(db, HISTORIAL_COLLECTION));
              historyBatch.set(historyDocRef, change);
          });
      }
    });
    processedCount++;
  }
  
  // Record the upload after all transactions
  const uploadDocRef = doc(collection(db, UPLOADS_COLLECTION));
  historyBatch.set(uploadDocRef, { fileName, uploadedAt: Timestamp.now() });
  
  await historyBatch.commit();
  return { processed: processedCount, changes: changesCount };
}

/**
 * Gets all students from the main collection.
 */
export async function getAllStudents(): Promise<Student[]> {
  const querySnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
  return querySnapshot.docs.map(doc => doc.data() as Student);
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
    
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const change: Change = {
            ...data,
            date: data.date.toDate().toISOString(),
        } as Change;
        return change;
    });
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

  await deleteCollection(HISTORIAL_COLLECTION);
  await deleteCollection(UPLOADS_COLLECTION);
  
  const alumnosSnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
  for (const studentDoc of alumnosSnapshot.docs) {
    await deleteCollection(`${ALUMNOS_COLLECTION}/${studentDoc.id}/materias`);
    await deleteDoc(doc(db, ALUMNOS_COLLECTION, studentDoc.id));
  }
}

/**
 * Gets the history of uploaded files.
 */
export async function getUploadHistory(): Promise<UploadHistory[]> {
  const q = query(collection(db, UPLOADS_COLLECTION), orderBy("uploadedAt", "desc"), limit(10));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Firestore Timestamps must be converted to a serializable format (like an ISO string)
      // before being sent to the client.
      return {
          id: doc.id,
          fileName: data.fileName,
          uploadedAt: data.uploadedAt.toDate().toISOString(),
      } as UploadHistory;
  });
}
