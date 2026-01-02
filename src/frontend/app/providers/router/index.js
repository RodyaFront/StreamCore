import { createRouter, createWebHistory } from 'vue-router';
import { PDAPage } from '../../../pages/pda';
import { HomePage } from '../../../pages/home';
import ExpLoggerPage from '../../../pages/exp-logger';
import DebugPage from '../../../pages/debug';
import AlertsPage from '../../../pages/alerts';
import ViewersCountPage from '../../../pages/viewers-count';
import ChatPage from '../../../pages/chat';
import ItemsThrowerPage from '../../../pages/items-thrower';
import ExperienceElixirPage from '../../../pages/experience-elixir';

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
    },
    {
        path: '/chat',
        name: 'Chat',
        component: ChatPage
    },
    {
        path: '/items-thrower',
        name: 'ItemsThrower',
        component: ItemsThrowerPage
    },
    {
        path: '/experience-elixir',
        name: 'ExperienceElixir',
        component: ExperienceElixirPage
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

