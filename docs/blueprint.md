# **App Name**: Academic Sentinel

## Core Features:

- CSV Data Upload and Storage: Allows tutors to upload daily student reports in CSV format. Data is stored locally using the upload date as the key.
- Monitored Students Filter: Enables tutors to filter student data based on a list of student IDs, with the filter list saved locally for future sessions. The tool will use the list to make the right judgement about which student records should be displayed.
- Data Comparison and Alerting: Compares newly uploaded data with previous data to detect changes in student performance (attendance, assignments, grades).
- Student Summary Cards: Displays summary cards for each monitored student, highlighting recent changes in their academic status.
- Detailed Subject Table: Presents a table with detailed information about each student's subjects, including attendance, assignments, and grades.
- Risk Assessment KPIs: Shows key performance indicators (KPIs) such as 'Students at Critical Risk,' 'Students Under Observation,' and 'Total Changes Today'.
- Interactive Risk Matrix: Provides an interactive scatter plot visualizing student risk levels based on attendance and assignment completion rates.

## Style Guidelines:

- Primary color: Navy blue (#2E4A62) for a sense of stability and focus.
- Background color: Light gray (#F0F4F8), a desaturated near-white for comfortable readability.
- Accent color: Teal (#30948B) to draw attention to key data points.
- Body and headline font: 'Inter' (sans-serif) for a modern and readable interface.
- Use minimalist icons to represent different types of changes and alerts.
- Responsive layout using Tailwind CSS to ensure adaptability across different devices.
- Subtle transitions and animations to enhance user experience when loading data and displaying changes.