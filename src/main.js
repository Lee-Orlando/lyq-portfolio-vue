import { createApp } from 'vue';
import App from './App.vue';
import { fadeIn } from './directives/fade';
import './styles.css';

createApp(App)
    .directive('fade-in', fadeIn)
    .mount('#app');
