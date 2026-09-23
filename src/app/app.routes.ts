import { Routes } from '@angular/router';
import { About } from './about/about';
import { Projects } from './projects/projects';

export const routes: Routes = [
    {
        path: '',
        component: About
    },
    {
        path: 'projects',
        component: Projects
    },
    {
        path: 'about',
        redirectTo: '',
        pathMatch: 'full'
    }
];
