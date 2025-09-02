
'use server';

import {
  processAndSaveData as processAndSaveDataFS,
  getAllStudents as getAllStudentsFS,
  getStudentSubjects as getStudentSubjectsFS,
  getStudentHistory as getStudentHistoryFS,
  deleteAllData as deleteAllDataFS,
} from '@/lib/firestore';
import type { Student, Subject, Change, StudentData } from '@/types/student';

// This file contains server actions that wrap Firestore functions.
// Client components will call these actions, ensuring that all Firestore
// operations are executed securely on the server.

export async function processAndSaveData(studentData: StudentData): Promise<{ processed: number, changes: number }> {
  return processAndSaveDataFS(studentData);
}

export async function getAllStudents(): Promise<Student[]> {
  return getAllStudentsFS();
}

export async function getStudentSubjects(studentId: string): Promise<Subject[]> {
  return getStudentSubjectsFS(studentId);
}

export async function getStudentHistory(studentId: string): Promise<Change[]> {
  return getStudentHistoryFS(studentId);
}

export async function deleteAllData(): Promise<void> {
  return deleteAllDataFS();
}
