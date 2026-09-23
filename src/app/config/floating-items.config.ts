import { FloatingItemConfig } from '../models/floating-item.model';

/*
 * Configuración de los objetos flotantes de la escena "Sobre mí".
 * Añadir uno nuevo es tan simple como añadir un objeto a este array.
 */
export const FLOATING_ITEM_CONFIGS: FloatingItemConfig[] = [
  {
    id: 'book',
    url: '/wheat.glb',
    position: [0.8, 0.5, 0],
    scale: 0.3,
    // rotation: [-Math.PI / 2, 0, 0],
    floatHeight: 0.3,
    speed: 0.0015,
    info: {
      title: 'Lectura',
      description: 'Me encanta aprender cosas nuevas leyendo libros de tecnología y ficción.',
    },
  },
  {
    id: 'wheat',
    url: '/tree2.glb',
    position: [-0.8, 0.5, 0],
    scale: 0.3,
    floatHeight: 0.3,
    speed: 0.0015,
    info: {
      title: 'Naturaleza',
      description: 'Disfruto del aire libre y de los paisajes de campo para desconectar.',
    },
  },
  {
    id: 'sport',
    url: '/sport.glb',
    position: [0, 0.5, 0.8],
    scale: 0.3,
    floatHeight: 0.3,
    speed: 0.0015,
    info: {
      title: 'Deporte',
      description: 'Practicar deporte me ayuda a mantener el equilibrio entre cuerpo y mente.',
    },
  },
];
