import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AcademicTermsPage } from '@/pages/AcademicTermsPage'
import { AcademicYearsPage } from '@/pages/AcademicYearsPage'
import { CurriculumRequirementsPage } from '@/pages/CurriculumRequirementsPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FacultyPage } from '@/pages/FacultyPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { SchedulingPage } from '@/pages/SchedulingPage'
import { SectionsPage } from '@/pages/SectionsPage'
import { StudentsPage } from '@/pages/StudentsPage'
import { SubjectOfferingsPage } from '@/pages/SubjectOfferingsPage'
import { SubjectsPage } from '@/pages/SubjectsPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { UsersPage } from '@/pages/UsersPage'
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
            element: <Navigate to="/academic/sections" replace />,
          },
          {
            path: 'academic/academic-years',
            element: <AcademicYearsPage />,
            handle: { title: 'Academic years' } satisfies RouteHandle,
          },
          {
            path: 'academic/curriculum',
            element: <CurriculumRequirementsPage />,
            handle: { title: 'Curriculum' } satisfies RouteHandle,
          },
          {
            path: 'academic/terms',
            element: <AcademicTermsPage />,
            handle: { title: 'Academic terms' } satisfies RouteHandle,
          },
          {
            path: 'academic/sections',
            element: <SectionsPage />,
            handle: { title: 'Sections' } satisfies RouteHandle,
          },
          {
            path: 'academic/subject-offerings',
            element: <SubjectOfferingsPage />,
            handle: { title: 'Class assignments' } satisfies RouteHandle,
          },
          {
            path: 'scheduling',
            element: <SchedulingPage />,
            handle: { title: 'Intelligent Scheduling' } satisfies RouteHandle,
          },
          {
            path: 'faculty',
            element: <FacultyPage />,
            handle: { title: 'Faculty' } satisfies RouteHandle,
          },
          {
            path: 'students',
            element: <StudentsPage />,
            handle: { title: 'Students' } satisfies RouteHandle,
          },
          {
            path: 'subjects',
            element: <SubjectsPage />,
            handle: { title: 'Subjects' } satisfies RouteHandle,
          },
          {
            path: 'rooms',
            element: <RoomsPage />,
            handle: { title: 'Rooms' } satisfies RouteHandle,
          },
          {
            path: 'announcements',
            element: <Navigate to="/activities?view=announcements" replace />,
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
