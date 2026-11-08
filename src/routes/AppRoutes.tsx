import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AcademicPage } from '@/pages/AcademicPage'
import { AcademicTermsPage } from '@/pages/AcademicTermsPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { AnnouncementsPage } from '@/pages/AnnouncementsPage'
import { AttendancePage } from '@/pages/AttendancePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FacultyPage } from '@/pages/FacultyPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { SchedulingPage } from '@/pages/SchedulingPage'
import { SectionsPage } from '@/pages/SectionsPage'
import { StudentsPage } from '@/pages/StudentsPage'
import { StudentScheduleConflictsPage } from '@/pages/StudentScheduleConflictsPage'
import { SubjectsPage } from '@/pages/SubjectsPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { UsersPage } from '@/pages/UsersPage'
import { YearLevelsPage } from '@/pages/YearLevelsPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import type { RouteHandle } from '@/routes/types'

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
            handle: { title: 'Dashboard' } satisfies RouteHandle,
          },
          {
            path: 'users',
            element: <UsersPage />,
            handle: { title: 'Users & access' } satisfies RouteHandle,
          },
          {
            path: 'academic',
            element: <AcademicPage />,
            handle: { title: 'Academic programs' } satisfies RouteHandle,
          },
          {
            path: 'academic/terms',
            element: <AcademicTermsPage />,
            handle: { title: 'Academic terms' } satisfies RouteHandle,
          },
          {
            path: 'academic/year-levels',
            element: <YearLevelsPage />,
            handle: { title: 'Year levels' } satisfies RouteHandle,
          },
          {
            path: 'academic/sections',
            element: <SectionsPage />,
            handle: { title: 'Sections' } satisfies RouteHandle,
          },
          {
            path: 'scheduling',
            element: <SchedulingPage />,
            handle: { title: 'Scheduling' } satisfies RouteHandle,
          },
          {
            path: 'student-schedule-conflicts',
            element: <StudentScheduleConflictsPage />,
            handle: { title: 'Student schedule conflicts' } satisfies RouteHandle,
          },
          {
            path: 'faculty',
            element: <FacultyPage />,
            handle: { title: 'Faculty records' } satisfies RouteHandle,
          },
          {
            path: 'students',
            element: <StudentsPage />,
            handle: { title: 'Student directory' } satisfies RouteHandle,
          },
          {
            path: 'subjects',
            element: <SubjectsPage />,
            handle: { title: 'Subject catalog' } satisfies RouteHandle,
          },
          {
            path: 'rooms',
            element: <RoomsPage />,
            handle: { title: 'Room inventory' } satisfies RouteHandle,
          },
          {
            path: 'attendance',
            element: <AttendancePage />,
            handle: { title: 'Attendance' } satisfies RouteHandle,
          },
          {
            path: 'announcements',
            element: <AnnouncementsPage />,
            handle: { title: 'Announcements' } satisfies RouteHandle,
          },
          {
            path: 'activities',
            element: <ActivitiesPage />,
            handle: { title: 'Activities' } satisfies RouteHandle,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]

export const router = createBrowserRouter(routes)
