import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  writeBatch,
  collection,
  Timestamp,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import type { Student, Subject, Change, StudentData } from '@/types/student';

// --- Colecciones Principales ---
const ALUMNOS_COLLECTION = 'alumnos';
const HISTORIAL_COLLECTION = 'historialCambios';

/**
 * Procesa los datos del Excel, los compara con Firestore y actualiza/crea los documentos necesarios.
 * @param studentData Los datos parseados del archivo Excel.
 */
export async function processAndSaveData(studentData: StudentData): Promise<{ processed: number, changes: number }> {
  let processedCount = 0;
  let changesCount = 0;

  const changesToWrite: Change[] = [];

  for (const studentId in studentData) {
    const incomingStudent = studentData[studentId];

    await runTransaction(db, async (transaction) => {
      const studentDocRef = doc(db, ALUMNOS_COLLECTION, studentId);
      const studentDoc = await transaction.get(studentDocRef);

      // 1. Actualizar o crear datos del alumno
      const studentInfo = {
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

      // 2. Procesar materias del alumno
      if (incomingStudent.subjects) {
        for (const incomingSubject of incomingStudent.subjects) {
          const subjectDocRef = doc(db, ALUMNOS_COLLECTION, studentId, 'materias', incomingSubject.id);
          const subjectDoc = await transaction.get(subjectDocRef);

          const newSubjectData: Subject = { ...incomingSubject };
          
          if (subjectDoc.exists()) {
            const existingSubject = subjectDoc.data() as Subject;

            // Comparar campos para detectar cambios
            const fieldsToCompare: (keyof Subject)[] = ['absences', 'missedAssignments', 'grade', 'finalGrade', 'statusDescription'];
            
            fieldsToCompare.forEach(field => {
              if (existingSubject[field] !== newSubjectData[field]) {
                changesToWrite.push({
                  date: Timestamp.now(),
                  studentId: studentId,
                  subjectId: incomingSubject.id,
                  fieldName: field,
                  oldValue: existingSubject[field],
                  newValue: newSubjectData[field],
                });
                changesCount++;
              }
            });
            
            // Comparar mapa de actividades
            for(const activityKey in newSubjectData.activities) {
                if(existingSubject.activities?.[activityKey] !== newSubjectData.activities[activityKey]) {
                     changesToWrite.push({
                      date: Timestamp.now(),
                      studentId: studentId,
                      subjectId: incomingSubject.id,
                      fieldName: `activities.${activityKey}`,
                      oldValue: existingSubject.activities?.[activityKey] || null,
                      newValue: newSubjectData.activities[activityKey],
                    });
                    changesCount++;
                }
            }
            
            transaction.update(subjectDocRef, { ...newSubjectData });

          } else {
            // Es una materia nueva para el alumno, se registra el historial de su creación
            changesToWrite.push({
                date: Timestamp.now(),
                studentId: studentId,
                subjectId: incomingSubject.id,
                fieldName: 'materia',
                oldValue: null,
                newValue: 'materia creada',
            });
            changesCount++;
            transaction.set(subjectDocRef, newSubjectData);
          }
        }
      }
    });
    processedCount++;
  }

  // Escribir todos los cambios detectados en un solo batch
  if(changesToWrite.length > 0) {
      const batch = writeBatch(db);
      changesToWrite.forEach(change => {
          const historyDocRef = doc(collection(db, HISTORIAL_COLLECTION));
          batch.set(historyDocRef, change);
      });
      await batch.commit();
  }

  return { processed: processedCount, changes: changesCount };
}


/**
 * Obtiene todos los alumnos de la colección principal.
 */
export async function getAllStudents(): Promise<Student[]> {
    const querySnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Student);
}


/**
 * Obtiene las materias de un alumno específico.
 * @param studentId La matrícula del alumno.
 */
export async function getStudentSubjects(studentId: string): Promise<Subject[]> {
    const subjectsRef = collection(db, ALUMNOS_COLLECTION, studentId, 'materias');
    const querySnapshot = await getDocs(subjectsRef);
    return querySnapshot.docs.map(doc => doc.data() as Subject);
}


/**
 * Obtiene el historial de cambios de un alumno.
 * @param studentId La matrícula del alumno.
 */
export async function getStudentHistory(studentId: string): Promise<Change[]> {
    // Esta función podría ser más compleja, por ahora la dejamos así
    // y en el futuro se pueden añadir filtros por fecha, etc.
    // La consulta real se haría en el componente que lo necesite.
    return [];
}


/**
 * Borra TODOS los datos de las colecciones 'alumnos' e 'historialCambios'.
 * Función de alto riesgo para usar solo en entornos de prueba.
 */
export async function deleteAllData(): Promise<void> {
    const batch = writeBatch(db);

    // Borrar colección 'alumnos' y sus sub-colecciones
    const alumnosSnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION));
    for (const studentDoc of alumnosSnapshot.docs) {
        const materiasSnapshot = await getDocs(collection(db, ALUMNOS_COLLECTION, studentDoc.id, 'materias'));
        materiasSnapshot.forEach(materiaDoc => {
            batch.delete(materiaDoc.ref);
        });
        batch.delete(studentDoc.ref);
    }
    
    // Borrar colección 'historialCambios'
    const historialSnapshot = await getDocs(collection(db, HISTORIAL_COLLECTION));
    historialSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}
