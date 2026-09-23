import { Routes } from '@angular/router';
import { About } from './about/about';
import { Projects } from './projects/projects';
import { Contact } from './contact/contact';

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
        path: 'contact',
        component: Contact
    },
    {
        path: 'about',
        redirectTo: '',
        pathMatch: 'full'
    }
];
