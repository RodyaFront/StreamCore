import { createRouter, createWebHistory } from 'vue-router';
import { PDAPage } from '../../../pages/pda';
import { HomePage } from '../../../pages/home';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomePage
    },
    {
        path: '/pda',
        name: 'PDA',
        component: PDAPage
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

