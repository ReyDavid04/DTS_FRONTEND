import { Routes } from '@angular/router';
import { authGuard } from './core/infrastructure/guards/auth.guard';
import { rootRedirectGuard } from './core/infrastructure/guards/root-redirect.guard';

export const routes: Routes = [
    {
        path: '',
        canActivate: [rootRedirectGuard],
        children: []
    },
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AuthRoutes)
    },
    {
        path: 'dts',
        canActivate: [authGuard],
        loadComponent: () => import('./shared/layouts/layout-template/layout-template').then(m => m.LayoutTemplate),
        children: [
            {
                path: 'home',
                loadChildren: () => import('./features/home/home.routes').then(m => m.HomeRoutes)
            },
            {
                path: 'profile',
                loadChildren: () => import('./features/profile/profile.routes').then(m => m.ProfileRoutes)
            },
            {
                path: 'register',
                loadChildren: () => import ('./features/downtime-register/downtime-register.routes').then(r => r.DownTimeRegisterRoutes)

            },
            {
                path: 'users',
                loadChildren: () => import('./features/users/users.routes').then(m => m.UsersRoutes)
            },
            {
                path: 'lines',
                loadChildren: () => import('./features/lines/lines.routes').then(m => m.AdminLinesRoutes)
            },
            {
                path: 'departments',
                loadChildren: () => import('./features/departments/departments.routes').then(m => m.DepartmentRoutes)
            },
            {
                path: 'shifts',
                loadChildren: () => import('./features/shifts/shifts.routes').then(m => m.ShiftsRoutes)
            },
            {
                path: 'trends',
                loadChildren: () => import('./features/trends/trends.routes').then(m => m.TrendsRoutes)
            },
            {
                path: 'reports',
                loadChildren: () => import('./features/reports/reports.routes').then(m => m.ReportsRoutes)
            },
            {
                path: 'historial',
                loadChildren: () => import('./features/historial/historial.routes').then(m => m.HistorialRoutes)
            },
            {
                path: '',
                redirectTo: 'home',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '**',
        redirectTo: '/dts'
    }
];
