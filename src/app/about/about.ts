/*
 * Importaciones de Angular:
 *
 * - AfterViewInit / OnDestroy: hooks del ciclo de vida del componente.
 * - Component / ChangeDetectionStrategy: para declarar el componente.
 * - ElementRef / ViewChild: para acceder a un elemento del HTML.
 * - signal: estado reactivo (usamos uno para el popup de información).
 * - Inject / PLATFORM_ID: para saber si estamos en navegador o servidor.
 */
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, signal, OnDestroy, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/*
 * Three.js y sus utilidades:
 *
 * - THREE: librería principal de gráficos 3D.
 * - GLTFLoader / GLTF: para cargar modelos 3D en formato .glb.
 * - OrbitControls: permite girar y hacer zoom con el ratón.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * ItemInfo describe el texto que se mostrará en el popup
 * cuando el usuario haga clic sobre un objeto 3D.
 */
interface ItemInfo {
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
interface FloatingItemConfig {
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
interface FloatingItem {
  config: FloatingItemConfig;
  group: THREE.Group;
  targetScale: number;
  progress: number;
}



@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About implements AfterViewInit, OnDestroy {

  /*
   * @ViewChild busca en about.html el elemento marcado con #avatarContainer.
   * Ahí dentro insertaremos el <canvas> que genera Three.js.
   * El símbolo ! indica a TypeScript que Angular lo inicializará a tiempo.
   */
  @ViewChild('avatarContainer', { static: true })
  avatarContainer!: ElementRef<HTMLDivElement>;

  // Objetos principales de Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  // Controles de órbita: girar y hacer zoom con el ratón
  private controls!: OrbitControls;

  // Avatar central y el progreso de su vuelta inicial (0 a 1)
  private avatar?: THREE.Object3D;
  private avatarProgress = 0;

  // Lista de objetos flotantes ya cargados en la escena
  private floatingItems: FloatingItem[] = [];

  /*
   * Raycaster + pointer se usan para detectar clics sobre los objetos 3D.
   * El raycaster lanza un "rayo" desde la cámara hacia donde apunta el ratón.
   */
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  // Identificador del bucle de animación, para poder detenerlo al destruir
  private animationId?: number;

  /*
   * selectedInfo es un signal que guarda la info del objeto pulsado.
   * Cuando tiene valor, el HTML muestra el popup; cuando es null, se oculta.
   */
  readonly selectedInfo = signal<ItemInfo | null>(null);

  /*
   * Configuración de los objetos flotantes.
   * Añadir uno nuevo es tan simple como añadir un objeto a este array.
   */
  private readonly itemConfigs: FloatingItemConfig[] = [
    {
      id: 'book',
      url: '/wheat.glb',
      position: [1.2, 0.5, 0],
      scale: 0.5,
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
      position: [-1.2, 0.5, 0],
      scale: 0.5,
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
      scale: 0.5,
      floatHeight: 0.3,
      speed: 0.0015,
      info: {
        title: 'Deporte',
        description: 'Practicar deporte me ayuda a mantener el equilibrio entre cuerpo y mente.',
      },
    },
  ];


  /*
   * Inyectamos PLATFORM_ID para poder distinguir entre:
   * - Navegador: existe WebGL, window y document.
   * - Servidor (SSR): no existen, así que evitamos ejecutar Three.js.
   */
  constructor(@Inject(PLATFORM_ID) private platformId: object) { }

  /*
   * ngAfterViewInit se ejecuta cuando Angular ya creó el HTML.
   * Es el momento correcto para acceder a #avatarContainer.
   */
  ngAfterViewInit(): void {
    // Durante SSR no hay WebGL: salimos sin inicializar Three.js.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // 1) Preparar escena, cámara, renderer, luces y controles
    this.initThree();
    // 2) Cargar el avatar central
    this.loadAvatar();
    // 3) Cargar los objetos flotantes definidos en itemConfigs
    this.loadItems();
    // 4) Arrancar el bucle de animación
    this.animate();
    // 5) Escuchar clics sobre el canvas para mostrar el popup
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
    console.log('Componente About view inicializado');
  }

  /*
   * ngOnDestroy libera recursos cuando el componente desaparece,
   * para evitar fugas de memoria y procesos en segundo plano.
   */
  ngOnDestroy(): void {
    // Detener el bucle de animación
    if (this.animationId !== undefined) {
      cancelAnimationFrame(this.animationId);
    }
    // Quitar el listener de clics y liberar controles y renderer
    this.renderer?.domElement.removeEventListener('click', this.onCanvasClick);
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  /*
   * initThree crea los elementos básicos de una escena 3D:
   * escena, cámara, renderer, controles de ratón y luces.
   */
  private initThree(): void {
    // Elemento HTML donde insertaremos el canvas
    const container = this.avatarContainer.nativeElement;

    // La escena contiene todos los objetos, luces y cámaras
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f3f4f6');

    /*
     * Cámara en perspectiva. Parámetros:
     * - 45: campo de visión (grados)
     * - aspect: proporción ancho/alto del contenedor
     * - 0.1 y 100: distancias mínima y máxima visibles
     */
    this.camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 1.4, 3)

    /*
     * El renderer dibuja la escena en un <canvas>.
     * alpha: true permite fondo transparente si se desea.
     */
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    // El canvas ocupa el tamaño del contenedor
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    // Limitamos el pixel ratio para no sobrecargar la GPU en pantallas Retina
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Insertamos el canvas generado por Three.js en el HTML
    container.appendChild(this.renderer.domElement);

    /*
     * OrbitControls permite girar el modelo y hacer zoom con el ratón.
     * - enableDamping: movimiento suave con inercia.
     * - enablePan: desactivado para que solo rote y haga zoom.
     * - target: punto al que mira la cámara (el centro).
     */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);

    // Luz ambiental: ilumina todo por igual, sin sombras
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);

    // Luz direccional: da volumen y un lado más iluminado
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(2, 3, 4);
    this.scene.add(directionalLight);
  }

  /*
   * loadAvatar carga el modelo principal (el avatar) y coloca
   * la cámara a una distancia adecuada según su tamaño.
   */
  private loadAvatar(): void {
    const loader = new GLTFLoader();

    loader.load(
      '/avatar.glb',
      (gltf: GLTF) => {
        const avatar = gltf.scene;

        avatar.position.set(0, 0, 0);
        avatar.scale.setScalar(1.5);

        // La caja envolvente nos da centro y tamaño del modelo
        const box = new THREE.Box3().setFromObject(avatar);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Restamos el centro para dejar el modelo centrado en el origen
        avatar.position.sub(center);

        this.avatar = avatar;
        this.scene.add(avatar);

        // Distancia de cámara proporcional al tamaño del modelo
        const maxSize = Math.max(size.x, size.y, size.z);
        const distance = maxSize * 2.2;

        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);
      },
      undefined,
      (error: unknown) => {
        console.error('No se pudo cargar el avatar:', error);
      }
    );
  }

  /*
   * loadItems recorre itemConfigs y carga cada modelo .glb.
   * Para cada uno: lo centra, lo orienta, normaliza su tamaño,
   * lo mete en un grupo con una esfera de cristal y lo añade a la escena.
   */
  private loadItems(): void {
    const loader = new GLTFLoader();

    // Un mismo cargador sirve para todos los modelos
    for (const config of this.itemConfigs) {
      loader.load(
        config.url,
        (gltf: GLTF) => {
          const model = gltf.scene;

          // Caja envolvente: centro y tamaño del modelo
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          // Centrar el modelo en su propio origen
          model.position.sub(center);

          // Orientación estática opcional (si la config la define)
          if (config.rotation) {
            model.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
          }

          /*
           * Normalizamos el tamaño: dividimos la escala deseada entre la
           * dimensión mayor para que todos los objetos midan lo mismo,
           * sin importar el tamaño original del .glb.
           */
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = maxDim > 0 ? config.scale / maxDim : config.scale;

          /*
           * Envolvemos el modelo en un grupo. Así podemos escalar, mover
           * y girar el grupo en la animación sin romper el centrado interno.
           */
          const group = new THREE.Group();
          group.add(model);

          // Esfera de cristal translúcida que contiene el objeto
          const bubbleRadius = maxDim * 0.75;
          const bubble = new THREE.Mesh(
            new THREE.SphereGeometry(bubbleRadius, 32, 32),
            new THREE.MeshStandardMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.15,
              roughness: 0.05,
              metalness: 0,
            })
          );
          group.add(bubble);

          // Colocamos el grupo y lo empezamos casi invisible (crecerá al animar)
          group.position.set(config.position[0], config.position[1], config.position[2]);
          group.scale.setScalar(0.001);

          this.scene.add(group);
          // Guardamos el item para animarlo y detectar clics después
          this.floatingItems.push({ config, group, targetScale, progress: 0 });
        },
        undefined,
        (error: unknown) => {
          console.error(`No se pudo cargar ${config.url}:`, error);
        }
      );
    }
  }

  /*
   * onCanvasClick detecta si el usuario ha pulsado un objeto 3D.
   * Es una función flecha para conservar el 'this' al usarla como listener.
   */
  private onCanvasClick = (event: MouseEvent): void => {
    // Convertimos la posición del ratón a coordenadas normalizadas (-1 a 1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Lanzamos un rayo desde la cámara a través del puntero
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Comprobamos qué grupos de objetos cruza el rayo
    const groups = this.floatingItems.map((item) => item.group);
    const intersects = this.raycaster.intersectObjects(groups, true);

    // Si no golpea nada, no hacemos nada
    if (intersects.length === 0) {
      return;
    }

    /*
     * El rayo golpea una malla interna; subimos por la jerarquía
     * (parent) hasta encontrar el grupo que pertenece a un item.
     */
    let object: THREE.Object3D | null = intersects[0].object;
    while (object) {
      const hit = this.floatingItems.find((item) => item.group === object);
      if (hit) {
        // Guardamos su info en el signal: el HTML mostrará el popup
        this.selectedInfo.set(hit.config.info);
        return;
      }
      object = object.parent;
    }
  };

  // closeInfo pone el signal a null y así se oculta el popup
  closeInfo(): void {
    this.selectedInfo.set(null);
  }

  /*
   * animate es el bucle que se ejecuta en cada frame (~60 veces/seg).
   * Aquí actualizamos animaciones y volvemos a dibujar la escena.
   */
  private animate(): void {
    // Programamos el siguiente frame y guardamos su id para poder cancelarlo
    this.animationId = requestAnimationFrame(() => this.animate());

    // Animación de entrada de cada objeto flotante (de progress 0 a 1)
    for (const item of this.floatingItems) {
      if (item.progress < 1) {
        // Avanzamos el progreso según su velocidad, sin pasar de 1
        item.progress = Math.min(item.progress + (item.config.speed ?? 0.0015), 1);

        // Suavizamos el progreso con una curva de aceleración/desaceleración
        const progress = this.easeInOutCubic(item.progress);

        // Crece, flota hacia arriba y da una vuelta completa al entrar
        item.group.scale.setScalar(progress * item.targetScale);
        item.group.position.y = item.config.position[1] + progress * (item.config.floatHeight ?? 0.3);
        item.group.rotation.y = progress * Math.PI * 2;
      }
    }

    // El avatar da una sola vuelta suave al inicio y luego se queda quieto
    if (this.avatar && this.avatarProgress < 1) {
      this.avatarProgress = Math.min(this.avatarProgress + 0.005, 1);
      this.avatar.rotation.y = this.easeInOutCubic(this.avatarProgress) * Math.PI * 2;
    }
    // Actualizamos los controles (necesario por el damping) y renderizamos
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /*
   * easeInOutCubic transforma un valor lineal (0 a 1) en una curva
   * que arranca y termina despacio, para animaciones más naturales.
   */
  private easeInOutCubic(value: number): number {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }
}
