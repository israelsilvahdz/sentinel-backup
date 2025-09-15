
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

// =================================================================================
// --- ¡ACCIÓN REQUERIDA! ---
// =================================================================================
//
// REEMPLAZA LA SIGUIENTE CONFIGURACIÓN CON LA DE TU PROPIO PROYECTO DE FIREBASE.
//
// Para encontrar esta información:
// 1. Ve a la Consola de Firebase (https://console.firebase.google.com/).
// 2. Selecciona tu proyecto.
// 3. Haz clic en el ícono de engranaje (⚙️) y ve a "Project settings".
// 4. En la pestaña "General", baja a la sección "Your apps".
// 5. Busca tu aplicación web y haz clic en "</>" para ver la configuración del SDK.
// 6. Copia el objeto `firebaseConfig` y pégalo aquí.
//
// =================================================================================
const firebaseConfig = {
  apiKey: "TU_API_KEY", // Reemplazar
  authDomain: "TU_AUTH_DOMAIN", // Reemplazar
  projectId: "TU_PROJECT_ID", // Reemplazar
  storageBucket: "TU_STORAGE_BUCKET", // Reemplazar
  messagingSenderId: "TU_MESSAGING_SENDER_ID", // Reemplazar
  appId: "TU_APP_ID" // Reemplazar
};

// Inicializa Firebase de forma segura
let app: FirebaseApp;
try {
  if (!getApps().length) {
    // Verifica si el projectId es el de marcador de posición
    if (firebaseConfig.projectId === "TU_PROJECT_ID") {
      console.warn("ADVERTENCIA: La configuración de Firebase no ha sido actualizada. La bitácora no funcionará. Por favor, edita `src/lib/firebase-services.ts` con la configuración de tu proyecto.");
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error("Error al inicializar Firebase. Asegúrate de que la configuración en `src/lib/firebase-services.ts` es correcta.", error);
}


const db = getFirestore(app);
const BITACORA_COLLECTION = 'bitacora';

/**
 * Añade una nueva entrada a la bitácora en Firestore.
 * @param entry - El objeto de la entrada de la bitácora sin el timestamp.
 */
export const addBitacoraEntry = async (entry: Omit<BitacoraEntry, 'timestamp' | 'id'>): Promise<void> => {
  // Previene la escritura si la configuración no ha cambiado
  if (firebaseConfig.projectId === "TU_PROJECT_ID") {
    alert("La bitácora no está conectada. Revisa las instrucciones en la consola y en `src/lib/firebase-services.ts`.");
    throw new Error("Configuración de Firebase no actualizada.");
  }
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
  // Previene la lectura si la configuración no ha cambiado
  if (firebaseConfig.projectId === "TU_PROJECT_ID") {
    return [];
  }
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
  if (firebaseConfig.projectId === "TU_PROJECT_ID") {
    alert("La bitácora no está conectada. Revisa las instrucciones en la consola y en `src/lib/firebase-services.ts`.");
    throw new Error("Configuración de Firebase no actualizada.");
  }
  try {
    const docRef = doc(db, BITACORA_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar documento de Firestore: ", error);
    throw new Error("No se pudo eliminar el registro de la base de datos.");
  }
};
