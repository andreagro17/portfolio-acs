/* Contenido textual de la sección "Sobre mí". */

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface ExperienceItem {
  role: string;
  company: string;
  description: string;
  tags: string[];
}
