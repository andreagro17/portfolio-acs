import { Routes } from '@angular/router';
import { About } from './about/about';

export const routes: Routes = [
    {
        path: '',
        component: About
    },
    {
        path: 'about',
        redirectTo: '',
        pathMatch: 'full'
    }
];
