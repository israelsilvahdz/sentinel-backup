
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
  collectionGroup,
} from 'firebase/firestore';
import type { Student, Subject, Change, StudentData, UploadHistory, SubjectSummary } from '@/types/student';

const ALUMNOS_COLLECTION = 'alumnos';
const HISTORIAL_COLLECTION = 'historialCambios';
const UPLOADS_COLLECTION = 'cargas';

/**
 * Processes data from Excel, compares it with Firestore, and updates/creates documents using efficient batch operations.
 * @param studentData Parsed data from the Excel file.
 * @param fileName The name of the uploaded file.
 */
export async function processAndSaveData(studentData: StudentData, fileName: string): Promise<{ processed: number, changes: number }> {
  let processedCount = 0;
  let changesCount = 0;

  const batch = writeBatch(db);
  const changesToWrite: Change[] = [];

  // 1. Pre-fetch all existing student and subject data in memory to avoid reads inside the loop.
  const existingStudents = new Map<string, Student>();
  const studentsSnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
  studentsSnapshot.docs.forEach(doc => {
    existingStudents.set(doc.id, doc.data() as Student);
  });

  const existingSubjects = new Map<string, Subject>(); // Key: studentId-subjectId
  const subjectsSnapshot = await getDocs(collectionGroup(db, 'materias'));
  subjectsSnapshot.docs.forEach(doc => {
    const subject = doc.data() as Subject;
    const studentId = doc.ref.parent.parent?.id;
    if (studentId && subject.id) {
       existingSubjects.set(`${studentId}-${subject.id}`, subject);
    }
  });


  // 2. Iterate through incoming data and prepare batch writes.
  for (const studentId in studentData) {
    const incomingStudent = studentData[studentId];
    if (!incomingStudent || !incomingStudent.id) continue;

    const studentDocRef = doc(db, ALUMNOS_COLLECTION, studentId);
    const existingStudent = existingStudents.get(studentId);

    const subjectSummaries: SubjectSummary[] = (incomingStudent.subjects || []).map(s => ({
        id: s.id,
        name: s.name,
        absences: s.absences,
        absenceLimit: s.absenceLimit,
        missedAssignments: s.missedAssignments,
        missedAssignmentLimit: s.missedAssignmentLimit,
        grade: s.grade,
        finalGrade: s.finalGrade,
    }));

    const studentInfo: Student = {
      id: incomingStudent.id,
      name: incomingStudent.name,
      leader: incomingStudent.leader,
      tutor: incomingStudent.tutor,
      isGraduationCandidate: incomingStudent.isGraduationCandidate,
      subjectSummaries,
    };
    
    // Set or Update student document
    batch.set(studentDocRef, studentInfo);

    if (incomingStudent.subjects) {
      for (const incomingSubject of incomingStudent.subjects) {
        if (!incomingSubject.id) continue;

        const subjectDocRef = doc(db, ALUMNOS_COLLECTION, studentId, 'materias', incomingSubject.id);
        const existingSubject = existingSubjects.get(`${studentId}-${incomingSubject.id}`);
        const newSubjectData: Subject = { ...incomingSubject };

        if (existingSubject) {
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
           batch.set(subjectDocRef, newSubjectData, { merge: true });
        } else {
           changesToWrite.push({
             date: Timestamp.now(), studentId, subjectId: incomingSubject.id,
             fieldName: 'materia', oldValue: null, newValue: 'materia creada',
           });
           batch.set(subjectDocRef, newSubjectData);
        }
      }
    }
    processedCount++;
  }

  // 3. Add all detected changes to the batch.
  if (changesToWrite.length > 0) {
    changesCount = changesToWrite.length;
    changesToWrite.forEach(change => {
        const historyDocRef = doc(collection(db, HISTORIAL_COLLECTION));
        batch.set(historyDocRef, change);
    });
  }

  // 4. Add the upload history record.
  const uploadDocRef = doc(collection(db, UPLOADS_COLLECTION));
  batch.set(uploadDocRef, { fileName, uploadedAt: Timestamp.now() });

  // 5. Commit the entire batch at once.
  await batch.commit();

  return { processed: processedCount, changes: changesCount };
}

/**
 * Gets all students and their subject summaries. This is now efficient.
 */
export async function getAllStudents(): Promise<Student[]> {
    const studentsSnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
    return studentsSnapshot.docs.map(doc => doc.data() as Student);
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
      return {
          id: doc.id,
          fileName: data.fileName,
          uploadedAt: data.uploadedAt.toDate().toISOString(),
      } as UploadHistory;
  });
}
