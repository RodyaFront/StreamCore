import { createRouter, createWebHistory } from 'vue-router';
import { PDAPage } from '../../../pages/pda';
import { HomePage } from '../../../pages/home';
import ExpLoggerPage from '../../../pages/exp-logger';

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
    },
    {
        path: '/exp-logger',
        name: 'ExpLogger',
        component: ExpLoggerPage
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

