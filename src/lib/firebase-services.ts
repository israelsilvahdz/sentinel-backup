

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import type { BitacoraEntry, SeguimientoEntry, StudentContact } from '@/types/student';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPkqLHSfu5eHfKWb2eC0dbcM2kbbb65pk",
  authDomain: "tecmilenio-mdea.firebaseapp.com",
  databaseURL: "https://tecmilenio-mdea-default-rtdb.firebaseio.com",
  projectId: "tecmilenio-mdea",
  storageBucket: "tecmilenio-mdea.appspot.com",
  messagingSenderId: "576664692340",
  appId: "1:576664692340:web:6669b709986d62d94d5321"
};


// Inicializa Firebase de forma segura
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}


const db = getFirestore(app);
const BITACORA_COLLECTION = 'bitacora';
const SEGUIMIENTO_COLLECTION = 'seguimiento';
const CONTACTS_COLLECTION = 'contacts';


/**
 * Añade una nueva entrada a la bitácora en Firestore.
 * @param entry - El objeto de la entrada de la bitácora sin el timestamp.
 */
export const addBitacoraEntry = async (entry: Omit<BitacoraEntry, 'timestamp' | 'id'>): Promise<void> => {
  try {
    const { eventDate, ...rest } = entry;
    await addDoc(collection(db, BITACORA_COLLECTION), {
      ...rest,
      eventDate: Timestamp.fromDate(eventDate as Date),
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error al añadir documento a Firestore: ", error);
    throw new Error("No se pudo guardar el registro en la base de datos.");
  }
};

/**
 * Obtiene todas las entradas de la bitácora de Firestore, ordenadas por fecha descendente.
 * @returns Un array de entradas de la bitácora.
 */
export const getBitacoraEntries = async (): Promise<BitacoraEntry[]> => {
  try {
    const bitacoraQuery = query(collection(db, BITACORA_COLLECTION), orderBy('eventDate', 'desc'));
    const querySnapshot = await getDocs(bitacoraQuery);
    
    const entries: BitacoraEntry[] = [];
    querySnapshot.forEach(doc => {
        entries.push({
            id: doc.id,
            ...doc.data()
        } as BitacoraEntry);
    });
    return entries;

  } catch (error) {
    console.error("Error al obtener documentos de Firestore: ", error);
    if (error instanceof Error && error.message.includes("Failed to get document because the client is offline")) {
        console.warn("Firestore está offline. Verifica la configuración y la conexión a internet.");
    }
    return [];
  }
};

/**
 * Elimina una entrada de la bitácora por su ID.
 * @param id - El ID del documento de Firestore a eliminar.
 */
export const deleteBitacoraEntry = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, BITACora_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar documento de Firestore: ", error);
    throw new Error("No se pudo eliminar el registro de la base de datos.");
  }
};


// --- Funciones para Reporte de Seguimiento ---

/**
 * Añade un nuevo caso al reporte de seguimiento.
 */
export const addSeguimientoEntry = async (entry: Omit<SeguimientoEntry, 'id' | 'createdAt' | 'status'>): Promise<void> => {
  try {
    await addDoc(collection(db, SEGUIMIENTO_COLLECTION), {
      ...entry,
      status: 'pendiente',
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error al añadir caso de seguimiento: ", error);
    throw new Error("No se pudo guardar el caso de seguimiento.");
  }
};


/**
 * Obtiene todos los casos de seguimiento, ordenados por fecha de creación.
 */
export const getSeguimientoEntries = async (): Promise<SeguimientoEntry[]> => {
  try {
    const seguimientoQuery = query(collection(db, SEGUIMIENTO_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(seguimientoQuery);
    
    const entries: SeguimientoEntry[] = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        entries.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt, // Mantener como Timestamp por ahora
        } as SeguimientoEntry);
    });
    return entries;

  } catch (error) {
    console.error("Error al obtener casos de seguimiento: ", error);
    return [];
  }
};


/**
 * Actualiza el estado de un caso de seguimiento.
 */
export const updateSeguimientoStatus = async (id: string, status: 'pendiente' | 'completado', completionNotes?: string): Promise<void> => {
    try {
        const docRef = doc(db, SEGUIMIENTO_COLLECTION, id);
        const updateData: any = { status };
        if (status === 'completado') {
            updateData.completedAt = Timestamp.now();
            if (completionNotes) {
                updateData.completionNotes = completionNotes;
            }
        } else {
             // Si se vuelve a poner como pendiente, opcionalmente limpiar los campos de completado
            updateData.completedAt = null;
            updateData.completionNotes = null;
        }
        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error("Error al actualizar estado de seguimiento: ", error);
        throw new Error("No se pudo actualizar el estado del caso.");
    }
};


/**
 * Elimina un caso de seguimiento por su ID.
 */
export const deleteSeguimientoEntry = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, SEGUIMIENTO_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar caso de seguimiento: ", error);
    throw new Error("No se pudo eliminar el caso de la base de datos.");
  }
};


// --- Funciones para Directorio de Contactos ---

/**
 * Añade o actualiza la información de contacto de un alumno.
 * @param contact El objeto de contacto del alumno.
 */
export const addOrUpdateContact = async (contact: StudentContact): Promise<void> => {
  try {
    // Usamos el studentId como el ID del documento para evitar duplicados.
    const docRef = doc(db, CONTACTS_COLLECTION, contact.studentId);
    await setDoc(docRef, contact, { merge: true });
  } catch (error) {
    console.error("Error al guardar el contacto en Firestore: ", error);
    throw new Error("No se pudo guardar la información de contacto.");
  }
};

/**
 * Guarda múltiples contactos en un solo lote para mayor eficiencia.
 * @param contacts Objeto donde la clave es el studentId y el valor es el StudentContact.
 */
export const bulkAddOrUpdateContacts = async (contacts: Record<string, StudentContact>): Promise<void> => {
  try {
    const batch = writeBatch(db);
    Object.values(contacts).forEach(contact => {
      const docRef = doc(db, CONTACTS_COLLECTION, contact.studentId);
      batch.set(docRef, contact, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error al guardar contactos en lote en Firestore: ", error);
    throw new Error("No se pudieron guardar los contactos en la base de datos.");
  }
};


/**
 * Obtiene todos los contactos de Firestore.
 * @returns Un objeto donde la clave es el studentId y el valor es la información de contacto.
 */
export const getContacts = async (): Promise<Record<string, StudentContact>> => {
    try {
        const querySnapshot = await getDocs(collection(db, CONTACTS_COLLECTION));
        const contacts: Record<string, StudentContact> = {};
        querySnapshot.forEach(doc => {
            contacts[doc.id] = doc.data() as StudentContact;
        });
        return contacts;
    } catch (error) {
        console.error("Error al obtener contactos de Firestore: ", error);
        return {};
    }
};
