import component from './src/index';

component.install = Vue => {
    Vue.component(component.name, component);
};

export default component;
