import { ExperienceItem, SkillGroup } from '../models/about.model';

/* Texto de presentación. */
export const ABOUT_BIO: string[] = [
  'Soy Andrea Castro, desarrolladora front-end especializada en Angular y Vue.js. Disfruto construyendo interfaces cuidadas, accesibles y con buen rendimiento.',
  'He trabajado en proyectos para grandes clientes de sectores como el químico, la energía y la educación, combinando desarrollo web moderno con integraciones empresariales (SAP) y visualización de datos.',
];

/* Competencias agrupadas por área. */
export const SKILL_GROUPS: SkillGroup[] = [
  {
    category: 'Front-end',
    items: ['Angular', 'Vue.js 3', 'TypeScript', 'JavaScript', 'HTML', 'SCSS'],
  },
  {
    category: 'Back-end e integración',
    items: ['Node.js', 'NestJS', 'SAP Fiori UI5', 'REST'],
  },
  {
    category: 'Cloud y herramientas',
    items: ['Azure', 'CI/CD', 'Git', 'SonarQube', 'Leaflet', 'Figma'],
  },
  {
    category: 'Metodología',
    items: ['Agile / Scrum', 'AI Agents', 'Trabajo en equipo'],
  },
];

/* Experiencia profesional. */
export const EXPERIENCE: ExperienceItem[] = [
  {
    role: 'Desarrolladora Front-end',
    company: 'BASF',
    description:
      'Desarrollo de aplicaciones de microfrontends en Angular y de soluciones SAP Fiori UI5 y Vue.js integradas con los sistemas corporativos, con apoyo de agentes de IA.',
    tags: ['Angular', 'Microfrontends', 'SAP Fiori UI5', 'Vue.js 3'],
  },
  {
    role: 'Desarrolladora Front-end',
    company: 'Minsait (Indra Group)',
    description:
      'Desarrollo web con Vue.js y Node.js/NestJS para clientes como Repsol, Iberdrola, Ecoembes e Instituto Cervantes, con despliegues CI/CD en Azure y mapas interactivos con Leaflet.',
    tags: ['Vue.js', 'Node.js', 'Azure', 'Leaflet'],
  },
];
