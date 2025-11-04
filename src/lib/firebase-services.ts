

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
  writeBatch,
  getDoc,
  where
} from 'firebase/firestore';
import { getFirebaseApp } from './firebase-client';
import type { BitacoraEntry, TeamTask, StudentContact, SeguimientoEntry, ProfessorContact, Team, Student } from '@/types/student';

// Obtiene la instancia de Firestore del singleton del lado del cliente
const db = getFirestore(getFirebaseApp());
const BITACORA_COLLECTION = 'bitacora';
const TEAM_TASKS_COLLECTION = 'teamTasks';
const CONTACTS_COLLECTION = 'contacts';
const PROFESSOR_CONTACTS_COLLECTION = 'professorContacts';
const SEGUIMIENTOS_K_COLLECTION = 'seguimientosK';
const SEGUIMIENTOS_PILOT_COLLECTION = 'seguimientosPilot';
const TEAMS_COLLECTION = 'teams';


/**
 * Añade una nueva entrada a la bitácora en Firestore.
 * @param entry - El objeto de la entrada de la bitácora sin el timestamp.
 */
export const addBitacoraEntry = async (entry: Omit<BitacoraEntry, 'timestamp' | 'id'>): Promise<void> => {
  try {
    const { eventDate, ...rest } = entry;
    const docData: any = {
        ...rest,
        eventDate: Timestamp.fromDate(eventDate as Date),
        timestamp: Timestamp.now(),
    };
    
    // Clean up undefined fields before sending to Firestore
    Object.keys(docData).forEach(key => docData[key as keyof typeof docData] === undefined && delete docData[key as keyof typeof docData]);

    await addDoc(collection(db, BITACORA_COLLECTION), docData);

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
    const docRef = doc(db, BITACORA_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar documento de Firestore: ", error);
    throw new Error("No se pudo eliminar el registro de la base de datos.");
  }
};


// --- Funciones para Tareas de Equipo ---

/**
 * Añade una nueva tarea al reporte de seguimiento.
 */
export const addTeamTask = async (task: Omit<TeamTask, 'id' | 'createdAt' | 'status'>): Promise<void> => {
  try {
    await addDoc(collection(db, TEAM_TASKS_COLLECTION), {
      ...task,
      status: 'pendiente',
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error al añadir tarea de equipo: ", error);
    throw new Error("No se pudo guardar la tarea.");
  }
};


/**
 * Obtiene todas las tareas de equipo, ordenadas por fecha de creación.
 */
export const getTeamTasks = async (): Promise<TeamTask[]> => {
  try {
    const tasksQuery = query(collection(db, TEAM_TASKS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(tasksQuery);
    
    const tasks: TeamTask[] = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({
            id: doc.id,
            ...data,
        } as TeamTask);
    });
    return tasks;

  } catch (error) {
    console.error("Error al obtener tareas de equipo: ", error);
    return [];
  }
};


/**
 * Actualiza el estado de una tarea de equipo.
 */
export const updateTeamTaskStatus = async (id: string, status: 'pendiente' | 'completado', completionNotes?: string): Promise<void> => {
    try {
        const docRef = doc(db, TEAM_TASKS_COLLECTION, id);
        const updateData: any = { status };
        if (status === 'completado') {
            updateData.completedAt = Timestamp.now();
            updateData.completionNotes = completionNotes || null;
        } else {
            updateData.completedAt = null;
            updateData.completionNotes = null;
        }
        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error("Error al actualizar estado de la tarea: ", error);
        throw new Error("No se pudo actualizar el estado de la tarea.");
    }
};


/**
 * Elimina una tarea de equipo por su ID.
 */
export const deleteTeamTask = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, TEAM_TASKS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar tarea de equipo: ", error);
    throw new Error("No se pudo eliminar la tarea de la base de datos.");
  }
};


// --- Funciones para Directorio de Contactos de Alumnos---

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
 * Guarda múltiples contactos de alumnos en un solo lote para mayor eficiencia.
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
 * Obtiene todos los contactos de alumnos de Firestore.
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

// --- Funciones para Contactos de Profesores ---

/**
 * Añade o actualiza la información de contacto de un profesor.
 * @param contact El objeto de contacto del profesor.
 */
export const addOrUpdateProfessorContact = async (contact: ProfessorContact): Promise<void> => {
  try {
    const docRef = doc(db, PROFESSOR_CONTACTS_COLLECTION, contact.id);
    await setDoc(docRef, contact, { merge: true });
  } catch (error) {
    console.error("Error al guardar el contacto del profesor: ", error);
    throw new Error("No se pudo guardar la información de contacto del profesor.");
  }
};

/**
 * Guarda múltiples contactos de profesores en un solo lote para mayor eficiencia.
 * @param contacts Objeto donde la clave es el ID del profesor y el valor es el ProfessorContact.
 */
export const bulkAddOrUpdateProfessorContacts = async (contacts: Record<string, ProfessorContact>): Promise<void> => {
  try {
    const batch = writeBatch(db);
    Object.values(contacts).forEach(contact => {
      if (contact.id) {
        const docRef = doc(db, PROFESSOR_CONTACTS_COLLECTION, contact.id);
        batch.set(docRef, contact, { merge: true });
      }
    });
    await batch.commit();
  } catch (error) {
    console.error("Error al guardar contactos de profesores en lote en Firestore: ", error);
    throw new Error("No se pudieron guardar los contactos de profesores en la base de datos.");
  }
};

/**
 * Obtiene todos los contactos de profesores de Firestore.
 * @returns Un objeto donde la clave es el nombre normalizado y el valor es la información de contacto.
 */
export const getProfessorContacts = async (): Promise<Record<string, ProfessorContact>> => {
    try {
        const querySnapshot = await getDocs(collection(db, PROFESSOR_CONTACTS_COLLECTION));
        const contacts: Record<string, ProfessorContact> = {};
        querySnapshot.forEach(doc => {
            contacts[doc.id] = doc.data() as ProfessorContact;
        });
        return contacts;
    } catch (error) {
        console.error("Error al obtener contactos de profesores de Firestore: ", error);
        return {};
    }
};

// --- Funciones para Seguimientos Kanban ---

export const addSeguimientoEntry = async (entry: Omit<SeguimientoEntry, 'id' | 'createdAt'>): Promise<void> => {
  try {
    await addDoc(collection(db, SEGUIMIENTOS_K_COLLECTION), {
      ...entry,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error al añadir seguimiento: ", error);
    throw new Error("No se pudo guardar el registro de seguimiento.");
  }
};

export const getSeguimientoEntries = async (): Promise<Record<string, SeguimientoEntry[]>> => {
  try {
    const q = query(collection(db, SEGUIMIENTOS_K_COLLECTION), orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    const entriesByStudent: Record<string, SeguimientoEntry[]> = {};
    querySnapshot.forEach(doc => {
      const entry = { id: doc.id, ...doc.data() } as SeguimientoEntry;
      if (!entriesByStudent[entry.studentId]) {
        entriesByStudent[entry.studentId] = [];
      }
      entriesByStudent[entry.studentId].push(entry);
    });
    return entriesByStudent;
  } catch (error) {
    console.error("Error al obtener seguimientos: ", error);
    return {};
  }
};

export const updateSeguimientoEntry = async (id: string, data: Partial<Omit<SeguimientoEntry, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, SEGUIMIENTOS_K_COLLECTION, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error al actualizar seguimiento: ", error);
    throw new Error("No se pudo actualizar el registro de seguimiento.");
  }
};

export const deleteSeguimientoEntry = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, SEGUIMIENTOS_K_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar seguimiento: ", error);
    throw new Error("No se pudo eliminar el registro de seguimiento.");
  }
};


// --- Funciones para Seguimientos (Piloto) ---
export interface SeguimientoPilotEntry {
  id?: string;
  createdAt: any;
  studentId: string;
  studentName: string;
  attendedBy: string;
  topic: string;
  notes?: string;
  parentsContacted: boolean;
  absencesAtFollowUp: number;
  missedAssignmentsAtFollowUp: number;
}

export const addSeguimientoPilotEntry = async (entry: Omit<SeguimientoPilotEntry, 'id' | 'createdAt'>): Promise<void> => {
  try {
    await addDoc(collection(db, SEGUIMIENTOS_PILOT_COLLECTION), {
      ...entry,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error al añadir seguimiento piloto: ", error);
    throw new Error("No se pudo guardar el registro de seguimiento piloto.");
  }
};

export const getSeguimientoPilotEntries = async (): Promise<SeguimientoPilotEntry[]> => {
  try {
    const q = query(collection(db, SEGUIMIENTOS_PILOT_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const entries: SeguimientoPilotEntry[] = [];
    querySnapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() } as SeguimientoPilotEntry);
    });
    return entries;
  } catch (error) {
    console.error("Error al obtener seguimientos piloto: ", error);
    return [];
  }
};

// --- Teams Management Functions ---

export const getTeams = async (): Promise<Team[]> => {
    try {
        const teamsQuerySnapshot = await getDocs(collection(db, TEAMS_COLLECTION));
        const teams = teamsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        return teams;
    } catch (error) {
        console.error("Error getting teams:", error);
        return [];
    }
};

export const addOrUpdateTeam = async (team: Omit<Team, 'id'> & { id?: string }): Promise<string> => {
    try {
        const teamData = {
            name: team.name,
            type: team.type,
            members: team.members || [],
        };
        
        if (team.id) {
            const docRef = doc(db, TEAMS_COLLECTION, team.id);
            await setDoc(docRef, teamData, { merge: true });
            return team.id;
        } 
        
        const q = query(collection(db, TEAMS_COLLECTION), where("name", "==", team.name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            await updateDoc(existingDoc.ref, { 
              type: team.type,
              members: team.members 
            });
            return existingDoc.id;
        } else {
            const docRef = await addDoc(collection(db, TEAMS_COLLECTION), teamData);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error adding/updating team:", error);
        throw error;
    }
};


export const bulkAddOrUpdateTeams = async (teamsFromExcel: Team[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const existingTeamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION));
    const existingTeamsMap = new Map(existingTeamsSnapshot.docs.map(doc => [doc.data().name, { id: doc.id, ...doc.data() } as Team]));

    for (const newTeam of teamsFromExcel) {
        const existingTeam = existingTeamsMap.get(newTeam.name);
        
        const membersToAdd = newTeam.members || [];
        
        if (existingTeam) {
            // El equipo ya existe, fusionar miembros
            const existingMembersMap = new Map((existingTeam.members || []).map(m => [m.id, m]));
            
            membersToAdd.forEach(newMember => {
                if (!existingMembersMap.has(newMember.id)) {
                    existingTeam.members.push(newMember);
                }
            });

            const docRef = doc(db, TEAMS_COLLECTION, existingTeam.id);
            batch.set(docRef, { 
                name: existingTeam.name, 
                type: 'deportivo', // Assume excel teams are 'deportivo'
                members: existingTeam.members 
            }, { merge: true });
        } else {
            // El equipo es nuevo, créalo
            const docRef = doc(collection(db, TEAMS_COLLECTION));
            batch.set(docRef, { 
                name: newTeam.name, 
                type: 'deportivo',
                members: membersToAdd
            });
        }
    }
    
    await batch.commit();
  } catch (error) {
      console.error("Error in bulkAddOrUpdateTeams:", error);
      throw new Error("Failed to bulk update teams in Firestore.");
  }
};


export const deleteTeam = async (teamId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
    } catch (error) {
        console.error("Error deleting team:", error);
        throw error;
    }
};

export const removeStudentFromTeam = async (team: Team, studentId: string): Promise<void> => {
    try {
        const updatedMembers = (team.members || []).filter(member => member.id !== studentId);
        await updateDoc(doc(db, TEAMS_COLLECTION, team.id), { members: updatedMembers });
    } catch (error) {
        console.error("Error removing student from team:", error);
        throw error;
    }
};
  










