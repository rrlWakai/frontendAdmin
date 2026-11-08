# CCSync Admin

Administrative console for CCSync. React 19, TypeScript, Vite 8, Tailwind CSS 4.

Local URL: http://localhost:5173

## Commands

```powershell
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## API configuration

```dotenv
VITE_APP_NAME="CCSync Admin"
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

If `VITE_API_BASE_URL` is unset, the client uses the local API URL above. Set an
absolute API URL for other environments. The API CORS allowlist must include the
frontend origin.

## Authentication and scope

Admin login accepts administrator and department-personnel roles. Authentication uses
Sanctum HttpOnly session cookies, CSRF protection, session restoration, and server
logout. API errors during session restoration are shown with a retry action. No bearer
token or auth state is stored in localStorage.

User and account management is implemented for Administrators and Department Personnel.
Administrators can create accounts and assign roles; Student and Professor accounts
include their required profile data. Department Personnel can edit and
activate/deactivate Professor and Student accounts only. Account roles cannot be changed
after creation.

User/account, academic structure, Student, Faculty, Scheduling, and Stage 6 Attendance
management are implemented. Announcements and activity workflows remain deferred.

See the repository [README](../../README.md), [authentication guide](../../docs/authentication.md),
and [development guide](../../docs/development.md).
