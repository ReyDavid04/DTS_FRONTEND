import { Routes } from '@angular/router';

export const HistorialRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./historial').then(m => m.Historial),
    },
];
