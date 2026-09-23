import type * as THREE from 'three';

/*
 * ItemInfo describe el texto que se mostrará en el popup
 * cuando el usuario haga clic sobre un objeto 3D.
 */
export interface ItemInfo {
  title: string;
  description: string;
}

/*
 * FloatingItemConfig es la "receta" de cada objeto flotante.
 *
 * Definir cada objeto como datos (y no como código repetido)
 * permite añadir o quitar objetos cambiando solo este array.
 *
 * - id: identificador único del objeto.
 * - url: ruta del modelo .glb dentro de /public.
 * - position: posición [x, y, z] en la escena.
 * - scale: tamaño final (dimensión mayor) al que se normaliza.
 * - rotation: orientación estática opcional [x, y, z] en radianes.
 * - floatHeight: cuánto sube el objeto durante su entrada.
 * - speed: velocidad de la animación de entrada.
 * - info: texto del popup.
 */
export interface FloatingItemConfig {
  id: string;
  url: string;
  position: [number, number, number];
  scale: number;
  rotation?: [number, number, number];
  floatHeight?: number;
  speed?: number;
  info: ItemInfo;
}

/*
 * FloatingItem representa un objeto ya cargado y en escena.
 *
 * Guarda su configuración original, el grupo 3D que lo contiene,
 * la escala objetivo calculada y el progreso de su animación (0 a 1).
 */
export interface FloatingItem {
  config: FloatingItemConfig;
  group: THREE.Group;
  model: THREE.Object3D;
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  targetScale: number;
  progress: number;
}
