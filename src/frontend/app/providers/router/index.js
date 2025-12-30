import { createRouter, createWebHistory } from 'vue-router';
import { PDAPage } from '../../../pages/pda';
import { HomePage } from '../../../pages/home';
import ExpLoggerPage from '../../../pages/exp-logger';
import DebugPage from '../../../pages/debug';
import AlertsPage from '../../../pages/alerts';
import ViewersCountPage from '../../../pages/viewers-count';

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
    },
    {
        path: '/debug',
        name: 'Debug',
        component: DebugPage
    },
    {
        path: '/alerts',
        name: 'Alerts',
        component: AlertsPage
    },
    {
        path: '/viewers-count',
        name: 'ViewersCount',
        component: ViewersCountPage
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

