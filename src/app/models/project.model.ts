/*
 * Project representa un trabajo del portfolio.
 *
 * - name: nombre del proyecto o aplicación.
 * - client: cliente o empresa para la que se desarrolló.
 * - sector: sector del cliente.
 * - description: qué se hizo y aportó.
 * - tags: tecnologías usadas (sirven también para filtrar).
 * - featured: si debe destacarse.
 */
export interface Project {
  name: string;
  client: string;
  sector: string;
  description: string;
  tags: string[];
  featured?: boolean;
}
