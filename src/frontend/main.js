import { createApp } from 'vue';
import { router } from './app';
import App from './App.vue';
import './app/styles/index.css';

const app = createApp(App);
app.use(router);
app.mount('#app');

