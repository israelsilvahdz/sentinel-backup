import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { StudentData } from '@/types/student';

const MONITORED_IDS_DOC = 'monitoredStudents';
const DATA_COLLECTION = 'dailyData';

export async function getMonitoredStudentIds(): Promise<{ids: string[], idsString: string}> {
  try {
    const docRef = doc(db, DATA_COLLECTION, MONITORED_IDS_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ids: data.ids || [],
        idsString: data.idsString || ''
      };
    }
    return { ids: [], idsString: '' };
  } catch (error) {
    console.error("Error fetching monitored IDs from Firestore:", error);
    return { ids: [], idsString: '' };
  }
}

export async function saveMonitoredStudentIds(ids: string[], idsString: string): Promise<void> {
  try {
    const docRef = doc(db, DATA_COLLECTION, MONITORED_IDS_DOC);
    await setDoc(docRef, { ids, idsString });
  } catch (error) {
    console.error("Error saving monitored IDs to Firestore:", error);
    throw error;
  }
}

export async function getStudentData(dateKey: string): Promise<StudentData | null> {
    try {
        const docRef = doc(db, DATA_COLLECTION, dateKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as StudentData;
        }
        return null;
    } catch (error) {
        console.error("Error fetching student data from Firestore:", error);
        return null;
    }
}

export async function saveStudentData(dateKey: string, data: StudentData): Promise<void> {
    try {
        const docRef = doc(db, DATA_COLLECTION, dateKey);
        await setDoc(docRef, data);
    } catch (error) {
        console.error("Error saving student data to Firestore:", error);
        throw error;
    }
}
