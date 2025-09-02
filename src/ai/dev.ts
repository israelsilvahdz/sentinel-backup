import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-student-changes.ts';
import '@/ai/flows/generate-list-of-monitored-students.ts';