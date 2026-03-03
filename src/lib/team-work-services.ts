
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
  limit
} from 'firebase/firestore';
import { getFirebaseApp } from './firebase-client';
import type { WorkTeam, WorkTask, DailyRoute, TaskStatus, TaskPriority } from '@/types/student';

const db = getFirestore(getFirebaseApp());
const TEAMS_WORK_COLLECTION = 'workTeams';
const TASKS_WORK_COLLECTION = 'workTasks';
const DAILY_ROUTES_COLLECTION = 'dailyRoutes';

// --- Gestión de Equipos ---

export const findWorkTeamByName = async (name: string): Promise<WorkTeam | null> => {
  const q = query(collection(db, TEAMS_WORK_COLLECTION), where('name', '==', name), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WorkTeam;
};

export const createWorkTeam = async (name: string, accessCode: string): Promise<WorkTeam> => {
  const existing = await findWorkTeamByName(name);
  if (existing) throw new Error("Ya existe un equipo con ese nombre.");
  
  const docRef = await addDoc(collection(db, TEAMS_WORK_COLLECTION), {
    name,
    accessCode,
    createdAt: Timestamp.now()
  });
  
  return { id: docRef.id, name, accessCode, createdAt: new Date() } as any;
};

// --- Gestión de Tareas ---

export const getWorkTasks = async (teamId: string): Promise<WorkTask[]> => {
  const q = query(
    collection(db, TASKS_WORK_COLLECTION), 
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
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
  await deleteDoc(doc(db, TASKS_WORK_COLLECTION, id));
};

// --- Rutas Diarias ---

export const getDailyRoute = async (teamId: string, date: string): Promise<DailyRoute | null> => {
  const q = query(
    collection(db, DAILY_ROUTES_COLLECTION), 
    where('teamId', '==', teamId),
    where('date', '==', date),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DailyRoute;
};

export const saveDailyRoute = async (teamId: string, date: string, taskIds: string[]): Promise<void> => {
  const existing = await getDailyRoute(teamId, date);
  if (existing) {
    await updateDoc(doc(db, DAILY_ROUTES_COLLECTION, existing.id), { taskIds });
  } else {
    await addDoc(collection(db, DAILY_ROUTES_COLLECTION), {
      teamId,
      date,
      taskIds,
      createdAt: Timestamp.now()
    });
  }
};
