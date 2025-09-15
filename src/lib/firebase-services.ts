
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
  deleteDoc
} from 'firebase/firestore';
import type { BitacoraEntry } from '@/types/student';

// --- IMPORTANTE ---
// REEMPLAZA ESTA CONFIGURACIÓN CON LA DE TU PROYECTO DE FIREBASE
// Puedes encontrarla en la configuración de tu proyecto en la consola de Firebase.
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
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

/**
 * Añade una nueva entrada a la bitácora en Firestore.
 * @param entry - El objeto de la entrada de la bitácora sin el timestamp.
 */
export const addBitacoraEntry = async (entry: Omit<BitacoraEntry, 'timestamp' | 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, BITACORA_COLLECTION), {
      ...entry,
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
    const bitacoraQuery = query(collection(db, BITACORA_COLLECTION), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(bitacoraQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as BitacoraEntry));

  } catch (error) {
    console.error("Error al obtener documentos de Firestore: ", error);
    // Si la base de datos no está configurada, es mejor devolver un array vacío
    // para no romper la UI. El error ya se muestra en la consola.
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
    const docRef = doc(db, BITACORA_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar documento de Firestore: ", error);
    throw new Error("No se pudo eliminar el registro de la base de datos.");
  }
};
