
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
  where,
  arrayUnion
} from 'firebase/firestore';
import { getFirebaseApp } from './firebase-client';
import type { TeamTask, StudentContact, ProfessorContact, Team, Student, Change, WeightingScheme, ContinuityComment, ContinuityLocalStatus, VocationalDiagnosis, RiasecDiagnosis, ContinuityTrackingInfo, CareerOption, CareerChoiceSurvey } from '@/types/student';

// Obtiene la instancia de Firestore del singleton del lado del cliente
const db = getFirestore(getFirebaseApp());
const TEAM_TASKS_COLLECTION = 'teamTasks';
const CONTACTS_COLLECTION = 'contacts';
const PROFESSOR_CONTACTS_COLLECTION = 'professorContacts';
const TEAMS_COLLECTION = 'teams';
const CHANGE_LOG_COLLECTION = 'studentChangeLog';
const WEIGHTING_SCHEMES_COLLECTION = 'weightingSchemes';
const CONTINUITY_STATUS_COLLECTION = 'continuityStatus';
const CAREER_CATALOG_COLLECTION = 'careerCatalog';


/**
 * Guarda una serie de cambios de alumnos en Firestore.
 * @param changes - Un array de objetos de cambio.
 */
export const addStudentChanges = async (changes: Change[]): Promise<void> => {
  if (changes.length === 0) return;
  try {
    const batch = writeBatch(db);
    changes.forEach(change => {
      const docRef = doc(collection(db, CHANGE_LOG_COLLECTION));
      // Ensure date is a Firestore Timestamp
      const changeData = { ...change, date: Timestamp.fromDate(new Date(change.date)) };
      batch.set(docRef, changeData);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error al guardar cambios de alumnos en lote: ", error);
    throw new Error("No se pudieron guardar los cambios en la base de datos.");
  }
};

/**
 * Obtiene todo el historial de cambios de Firestore, agrupado por studentId.
 * @returns Un objeto donde la clave es el studentId y el valor es un array de cambios.
 */
export const getAllStudentChanges = async (): Promise<Record<string, Change[]>> => {
  try {
    const q = query(collection(db, CHANGE_LOG_COLLECTION), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const history: Record<string, Change[]> = {};
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const change = { 
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(), // Convert timestamp to string for client
      } as Change;

      if (!history[change.studentId]) {
        history[change.studentId] = [];
      }
      history[change.studentId].push(change);
    });
    return history;
  } catch (error) {
    console.error("Error al obtener el historial de cambios de Firestore: ", error);
    return {};
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

/**
 * Obtiene el contacto de un solo alumno por su ID.
 * @returns El objeto de contacto o null si no se encuentra.
 */
export const getContact = async (studentId: string): Promise<StudentContact | null> => {
    try {
        const docRef = doc(db, CONTACTS_COLLECTION, studentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as StudentContact;
        }
        return null;
    } catch (error) {
        console.error(`Error al obtener contacto para ${studentId}: `, error);
        return null; // Return null on error to not break the flow
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

// --- Funciones para Esquemas de Ponderación ---

export const getWeightingSchemes = async (): Promise<WeightingScheme[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, WEIGHTING_SCHEMES_COLLECTION));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightingScheme));
    } catch (error) {
        console.error("Error getting weighting schemes:", error);
        return [];
    }
};

export const addOrUpdateWeightingScheme = async (scheme: WeightingScheme): Promise<string> => {
    try {
        const { id, ...schemeData } = scheme;
        if (id) {
            const docRef = doc(db, WEIGHTING_SCHEMES_COLLECTION, id);
            await setDoc(docRef, schemeData, { merge: true });
            return id;
        } else {
            const docRef = await addDoc(collection(db, WEIGHTING_SCHEMES_COLLECTION), schemeData);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error adding/updating weighting scheme:", error);
        throw error;
    }
};

export const deleteWeightingScheme = async (schemeId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, WEIGHTING_SCHEMES_COLLECTION, schemeId));
    } catch (error) {
        console.error("Error deleting weighting scheme:", error);
        throw error;
    }
};

// --- Funciones para Continuidad ---

export const getContinuityLocalStatus = async (studentId: string): Promise<ContinuityLocalStatus | null> => {
  try {
    const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ContinuityLocalStatus;
    }
    return null;
  } catch (error) {
    console.error("Error getting continuity status:", error);
    return null;
  }
};

export const updateContinuityIndeciso = async (studentId: string, isIndeciso: boolean): Promise<void> => {
  try {
    const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
    await setDoc(docRef, { isIndeciso }, { merge: true });
  } catch (error) {
    console.error("Error updating indeciso status:", error);
  }
};

export const updateContinuityWorkshopAttended = async (studentId: string, workshopAttended: boolean): Promise<void> => {
  try {
    const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
    await setDoc(docRef, { workshopAttended }, { merge: true });
  } catch (error) {
    console.error("Error updating workshop status:", error);
  }
};

export const updateContinuityTrackingInfo = async (studentId: string, info: ContinuityTrackingInfo): Promise<void> => {
  try {
    const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
    await setDoc(docRef, { trackingInfo: info }, { merge: true });
  } catch (error) {
    console.error("Error updating tracking info:", error);
    throw error;
  }
};

export const addContinuityComment = async (studentId: string, text: string, author: string): Promise<void> => {
  try {
    const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
    const comment: ContinuityComment = {
      id: Math.random().toString(36).substring(7),
      text,
      author,
      createdAt: Timestamp.now()
    };
    await setDoc(docRef, {
      comments: arrayUnion(comment)
    }, { merge: true });
  } catch (error) {
    console.error("Error adding continuity comment:", error);
  }
};

export const getAllContinuityStatuses = async (): Promise<Record<string, ContinuityLocalStatus>> => {
  try {
    const snapshot = await getDocs(collection(db, CONTINUITY_STATUS_COLLECTION));
    const statuses: Record<string, ContinuityLocalStatus> = {};
    snapshot.forEach(doc => {
      statuses[doc.id] = doc.data() as ContinuityLocalStatus;
    });
    return statuses;
  } catch (error) {
    console.error("Error getting all continuity statuses:", error);
    return {};
  }
};

export const bulkUpdateContinuityVocational = async (
  diagnoses: Record<string, VocationalDiagnosis>, 
  indecisosIds: Set<string>
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Process all diagnoses
    Object.entries(diagnoses).forEach(([studentId, diagnosis]) => {
      const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
      const updateData: any = { 
        vocationalDiagnosis: {
          ...diagnosis,
          lastUpdated: Timestamp.now()
        }
      };
      
      // If student is also in the indecisos set, mark them as such
      if (indecisosIds.has(studentId)) {
        updateData.isIndeciso = true;
      } else {
        updateData.isIndeciso = false;
      }

      batch.set(docRef, updateData, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error bulk updating vocational diagnoses:", error);
    throw error;
  }
};

export const bulkUpdateRiasecDiagnoses = async (diagnoses: Record<string, RiasecDiagnosis>): Promise<void> => {
  try {
    const batch = writeBatch(db);
    Object.entries(diagnoses).forEach(([studentId, diagnosis]) => {
      const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
      batch.set(docRef, { 
        riasecDiagnosis: {
          ...diagnosis,
          lastUpdated: Timestamp.now()
        }
      }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error bulk updating RIASEC diagnoses:", error);
    throw error;
  }
};

/**
 * Obtiene el catálogo maestro de carreras de Firestore.
 */
export const getCareerCatalog = async (): Promise<CareerOption[]> => {
  try {
    const docRef = doc(db, CAREER_CATALOG_COLLECTION, 'master');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().options || [];
    }
    return [];
  } catch (error) {
    console.error("Error al obtener catálogo de carreras:", error);
    return [];
  }
};

/**
 * Actualiza el catálogo maestro de carreras en Firestore.
 */
export const updateCareerCatalog = async (options: CareerOption[]): Promise<void> => {
  try {
    const docRef = doc(db, CAREER_CATALOG_COLLECTION, 'master');
    await setDoc(docRef, { options, lastUpdated: Timestamp.now() });
  } catch (error) {
    console.error("Error al actualizar catálogo de carreras:", error);
    throw error;
  }
};

/**
 * Actualiza masivamente los datos de la encuesta de elección de carrera.
 */
export const bulkUpdateCareerSurvey = async (
  surveys: Record<string, CareerChoiceSurvey>,
  officialStatuses: Record<string, string>
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    Object.entries(surveys).forEach(([studentId, survey]) => {
      const docRef = doc(db, CONTINUITY_STATUS_COLLECTION, studentId);
      
      const officialStatus = officialStatuses[studentId] || '';
      const declaredUni = (survey.universidadElegida || '').toLowerCase();
      const isTecmilenio = declaredUni.includes('tecmilenio');
      const isOfficialInscribed = officialStatus.toLowerCase().includes('inscrit');
      const choseCareer = (survey.yaEligioCareer || survey.yaEligioCarrera || '').toLowerCase().trim().includes('si');
      
      const updateData: any = {
        encuestaEleccionReciente: survey,
        lastSurveyUpdate: Timestamp.now(),
        isIndeciso: !choseCareer
      };

      // ULTRA STRICT ALERT TRIGGER:
      // Only trigger if:
      // 1. Declared Tecmilenio.
      // 2. Official status is NOT inscribed.
      // 3. AND the stage is EXACTLY one of the final enrollment markers.
      const surveyStage = (survey.etapaProceso || '').toLowerCase().trim();
      const isFinalEnrollmentStage = 
        surveyStage === 'inscrito' || 
        surveyStage === 'inscrita' || 
        surveyStage === 'declara inscrito';

      if (isTecmilenio && !isOfficialInscribed && isFinalEnrollmentStage) {
        updateData.alertaFalsaInscripcion = true;
      } else {
        updateData.alertaFalsaInscripcion = false;
      }

      batch.set(docRef, updateData, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error bulk updating career survey:", error);
    throw error;
  }
};
