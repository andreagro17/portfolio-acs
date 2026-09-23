import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Hero } from './hero/hero';
import { About } from './about/about';

export const routes: Routes = [
    {
        path: '',
        component: Home
    },
    {
        path: 'hero',
        component: Hero
    },
    {
        path: 'about',
        component: About
    }
];
