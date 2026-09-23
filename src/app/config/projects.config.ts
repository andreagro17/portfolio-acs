import { Project } from '../models/project.model';

/*
 * Proyectos del portfolio (basados en la experiencia real del CV).
 * Añadir uno nuevo es tan simple como añadir un objeto a este array.
 */
export const PROJECTS: Project[] = [
  {
    name: 'Aplicación Microfrontend Angular',
    client: 'BASF',
    sector: 'Sector químico',
    description:
      'Desarrollo de una aplicación de microfrontends en Angular, trabajando sobre repositorios de reglas de negocio, backend y base de datos, con apoyo de agentes de IA.',
    tags: ['Angular', 'Microfrontends', 'AI Agents', 'Git', 'Agile'],
    featured: true,
  },
  {
    name: 'Aplicaciones de negocio SAP',
    client: 'BASF',
    sector: 'Sector químico',
    description:
      'Desarrollo de aplicaciones SAP Fiori UI5 (Freestyle) y Vue.js 3 integradas con los sistemas corporativos de SAP, con foco en el módulo QM.',
    tags: ['SAP Fiori UI5', 'Vue.js 3', 'SAP', 'Azure', 'Git'],
    featured: true,
  },
  {
    name: 'Repsol · Upstream',
    client: 'Minsait (Indra Group)',
    sector: 'Industria energética',
    description:
      'Desarrollo de aplicaciones web para la división Upstream con Vue.js 3 y Node.js/NestJS, visualización de datos y mapas interactivos con Leaflet.',
    tags: ['Vue.js', 'Node.js', 'NestJS', 'Leaflet', 'Azure'],
    featured: true,
  },
  {
    name: 'Iberdrola',
    client: 'Minsait (Indra Group)',
    sector: 'Industria energética',
    description:
      'Desarrollo web con Vue.js y despliegues CI/CD en Azure, trabajando en equipo con metodologías ágiles y control de calidad con SonarQube.',
    tags: ['Vue.js', 'CI/CD', 'Azure', 'SonarQube'],
  },
  {
    name: 'Ecoembes',
    client: 'Minsait (Indra Group)',
    sector: 'Reciclaje',
    description:
      'Aplicaciones web con Vue.js y visualización geográfica mediante mapas interactivos con Leaflet.',
    tags: ['Vue.js', 'Leaflet', 'Git'],
  },
  {
    name: 'Instituto Cervantes',
    client: 'Minsait (Indra Group)',
    sector: 'Educación',
    description:
      'Desarrollo de interfaces web con Vue.js y Node.js, colaborando con perfiles UX en Figma y control de versiones con Git.',
    tags: ['Vue.js', 'Node.js', 'Figma', 'Git'],
  },
];
