import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { getFirebaseApp } from './firebase-client';
import type { WorkTeam, WorkTask } from '@/types/student';

const db = getFirestore(getFirebaseApp());
const TEAMS_WORK_COLLECTION = 'workTeams';
const TASKS_WORK_COLLECTION = 'workTasks';

// --- Gestión de Equipos ---

export const findWorkTeamByName = async (name: string): Promise<WorkTeam | null> => {
  const q = query(collection(db, TEAMS_WORK_COLLECTION), where('name', '==', name), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0].data();
  return { id: snapshot.docs[0].id, ...docData } as WorkTeam;
};

export const createWorkTeam = async (name: string, accessCode: string): Promise<WorkTeam> => {
  const existing = await findWorkTeamByName(name);
  if (existing) throw new Error("Ya existe un equipo con ese nombre.");
  
  const docRef = await addDoc(collection(db, TEAMS_WORK_COLLECTION), {
    name,
    accessCode,
    createdAt: Timestamp.now()
  });
  
  const createdTeam = { id: docRef.id, name, accessCode, createdAt: new Date() };
  return createdTeam as any;
};

// --- Gestión de Tareas ---

export const getWorkTasks = async (teamId: string): Promise<WorkTask[]> => {
  // Eliminamos el orderBy de aquí para evitar que Firebase pida un índice compuesto (que causa error)
  // El ordenamiento lo haremos en el cliente (TeamWorkPanel.tsx)
  const q = query(
    collection(db, TASKS_WORK_COLLECTION), 
    where('teamId', '==', teamId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkTask));
};

export const addWorkTask = async (task: Omit<WorkTask, 'id' | 'createdAt'>): Promise<void> => {
  await addDoc(collection(db, TASKS_WORK_COLLECTION), {
    ...task,
    createdAt: Timestamp.now()
  });
};

export const updateWorkTask = async (id: string, updates: Partial<WorkTask>): Promise<void> => {
  const docRef = doc(db, TASKS_WORK_COLLECTION, id);
  await updateDoc(docRef, updates);
};

export const deleteWorkTask = async (id: string): Promise<void> => {
  const docRef = doc(db, TASKS_WORK_COLLECTION, id);
  await deleteDoc(docRef);
};
